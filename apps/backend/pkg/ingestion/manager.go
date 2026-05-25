package ingestion

import (
	"context"
	"database/sql"
	"log"
	"sync"
	"time"

	"backend/pkg/config"
	"backend/pkg/db"
)

type Manager struct {
	cfg *config.Config
	ctx context.Context
	cancel context.CancelFunc
}

var GlobalManager *Manager

func NewManager(cfg *config.Config) *Manager {
	ctx, cancel := context.WithCancel(context.Background())
	mgr := &Manager{
		cfg:    cfg,
		ctx:    ctx,
		cancel: cancel,
	}
	GlobalManager = mgr
	return mgr
}

func (m *Manager) TriggerManualRefresh() {
	log.Println("[REFRESH] Triggering manual, non-cached situational updates refresh...")
	var wg sync.WaitGroup
	refreshJobs := []func(){
		m.fetchAndStoreEarthquakes,
		m.fetchAndStoreWildfires,
		m.fetchAndStoreAviation,
		m.fetchAndStoreAirQuality,
		m.fetchAndStoreAcled,
		m.pollNewsWires,
	}
	for _, job := range refreshJobs {
		wg.Add(1)
		go func(run func()) {
			defer wg.Done()
			run()
		}(job)
	}
	wg.Wait()
}

func (m *Manager) Start() {
	log.Println("Starting Ingestion Manager...")

	// 1. Register base sources in DB
	m.initializeSourceMetadata()
	m.removeMockSeedData()

	// 1b. Initialize and start Cold Storage Telemetry Archiver
	StartArchiver()

	// 2. Start pollers as parallel goroutines
	go m.runEarthquakePoller()
	go m.runGdeltPoller()
	go m.runAviationPoller()
	go m.runWildfirePoller()
	go m.runAirQualityPoller()
	go m.runAcledPoller()
	go m.runNewsWirePoller()

	// 3. Start stale telemetry pruning daemon
	go m.runPruningDaemon()
}

func (m *Manager) Stop() {
	log.Println("Stopping Ingestion Manager...")
	StopArchiver()
	m.cancel()
}

func (m *Manager) removeMockSeedData() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cleanupStatements := []string{
		"DELETE FROM aircraft WHERE origin_country = 'Simulated Sector' OR icao24 LIKE 'A-%';",
		"DELETE FROM wildfires WHERE satellite = 'SIMULATED' OR id LIKE 'sf-%';",
		"DELETE FROM acled_events WHERE id LIKE 'acled-0%';",
		"DELETE FROM air_quality WHERE id LIKE 'aq-%';",
		"DELETE FROM webcams WHERE id LIKE 'cam-%';",
		"DELETE FROM satellites WHERE id IN ('iss','usa-224','usa-245','hubble','starlink-3045','starlink-3046','noaa-20','sentinel-1a','envisat','sl-12-rb','cosmos-2251-deb','iridium-33-deb');",
	}

	for _, stmt := range cleanupStatements {
		if _, err := db.Pool.Exec(ctx, stmt); err != nil {
			log.Printf("Mock-data cleanup skipped for statement %q: %v", stmt, err)
		}
	}
}

// Ensure database has status metrics entries for all channels
func (m *Manager) initializeSourceMetadata() {
	sources := map[string]string{
		"usgs-earthquakes":  "USGS Real-Time Earthquake Feed",
		"gdelt":             "GDELT Global Event Registry",
		"opensky-aviation":  "OpenSky Aviation State Vectors",
		"nasa-firms":        "NASA FIRMS Active Wildfires",
		"openaq-airquality": "OpenAQ Global Air Quality Station Monitor",
		"acled-conflicts":   "ACLED Global Geopolitical Conflicts Registry",
		"webcams":           "Global CCTV / Webcams Network Feed",
		"space-satellites":  "NOAA SWPC Space & Orbital Satellites Grid",
		"ap-news-wire":      "OSINT AP/Reuters/AFP News Wire Service",
		"gdacs-disasters":   "GDACS Global Disaster Alerts",
		"noaa-alerts":       "NOAA/NWS Weather Alerts",
		"eonet-events":      "NASA EONET Natural Events",
		"celestrak-gp":      "CelesTrak GP Orbital Elements",
		"who-don":           "WHO Disease Outbreak News",
		"reliefweb":         "UN OCHA ReliefWeb Disasters API",
	}

	for id, name := range sources {
		_, err := db.Pool.Exec(context.Background(), `
			INSERT INTO data_sources (id, name, status, consecutive_failures, avg_response_ms)
			VALUES ($1, $2, 'unknown', 0, 0)
			ON CONFLICT (id) DO NOTHING;
		`, id, name)
		if err != nil {
			log.Printf("Failed to initialize source metadata for %s: %v", id, err)
		}
	}
}

// Log execution statistics for C2 feeds
func UpdateSourceStatus(sourceID string, err error, responseTime time.Duration) {
	ctx := context.Background()
	now := time.Now()

	status := "healthy"
	errText := sql.NullString{}
	if err != nil {
		status = "degraded"
		errText.String = err.Error()
		errText.Valid = true
	}

	// Calculate rolling average response speed
	var currentAvg int
	var failures int
	_ = db.Pool.QueryRow(ctx, "SELECT avg_response_ms, consecutive_failures FROM data_sources WHERE id = $1", sourceID).Scan(&currentAvg, &failures)

	if err != nil {
		failures++
		if failures > 3 {
			status = "down"
		}
	} else {
		failures = 0
	}

	newAvg := int(responseTime.Milliseconds())
	if currentAvg > 0 {
		newAvg = (currentAvg*4 + int(responseTime.Milliseconds())) / 5 // Rolling average
	}

	if err != nil {
		_, _ = db.Pool.Exec(ctx, `
			UPDATE data_sources SET
				status = $2,
				last_error_at = $3,
				last_error = $4,
				consecutive_failures = $5,
				avg_response_ms = $6
			WHERE id = $1;
		`, sourceID, status, now, errText, failures, newAvg)
	} else {
		_, _ = db.Pool.Exec(ctx, `
			UPDATE data_sources SET
				status = $2,
				last_success_at = $3,
				last_error = NULL,
				consecutive_failures = 0,
				avg_response_ms = $4
			WHERE id = $1;
		`, sourceID, status, now, newAvg)
	}
}

// 4. Background Pruning Loop to prevent spatial index bloat
func (m *Manager) runPruningDaemon() {
	ticker := time.NewTicker(time.Duration(m.cfg.PruneIntervalMin) * time.Minute)
	defer ticker.Stop()

	log.Printf("Pruning Daemon initialized (Pruning interval: %d mins)", m.cfg.PruneIntervalMin)

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.pruneStaleTelemetry()
		}
	}
}

func (m *Manager) pruneStaleTelemetry() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	log.Println("Pruning stale telemetry records from live operational tables...")

	// 1. Prune aircraft vectors un-updated for more than 15 minutes
	aircraftThreshold := time.Now().Add(-15 * time.Minute)
	resAir, err := db.Pool.Exec(ctx, "DELETE FROM aircraft WHERE updated_at < $1;", aircraftThreshold)
	if err != nil {
		log.Printf("Error pruning stale aircraft: %v", err)
	} else {
		log.Printf("Pruning complete: removed %d stale flight paths", resAir.RowsAffected())
	}

	// 2. Prune wildfire spots older than 24 hours
	fireThreshold := time.Now().Add(-24 * time.Hour)
	resFire, err := db.Pool.Exec(ctx, "DELETE FROM wildfires WHERE updated_at < $1;", fireThreshold)
	if err != nil {
		log.Printf("Error pruning extinguished wildfires: %v", err)
	} else {
		log.Printf("Pruning complete: removed %d stale wildfire boundary zones", resFire.RowsAffected())
	}
}
