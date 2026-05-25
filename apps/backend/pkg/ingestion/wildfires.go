package ingestion

import (
	"context"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"backend/pkg/db"
	"backend/pkg/models"
)

func (m *Manager) runWildfirePoller() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	m.fetchAndStoreWildfires()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.fetchAndStoreWildfires()
		}
	}
}

func (m *Manager) fetchAndStoreWildfires() {
	start := time.Now()
	log.Println("Ingesting NASA FIRMS active environmental heat zones...")

	if m.cfg.NasaFirmsKey == "" {
		err := fmt.Errorf("NASA_FIRMS_KEY is not configured")
		UpdateSourceStatus("nasa-firms", err, time.Since(start))
		log.Println("NASA FIRMS key missing; wildfire layer remains empty until live credentials are configured")
		return
	}

	apiURL := fmt.Sprintf("https://firms.modaps.eosdis.nasa.gov/api/area/csv/%s/MODIS_SP/world/1", m.cfg.NasaFirmsKey)
	resp, err := http.Get(apiURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		var code int
		if resp != nil {
			code = resp.StatusCode
			_ = resp.Body.Close()
		}
		if err == nil {
			err = fmt.Errorf("NASA FIRMS returned HTTP status %d", code)
		}
		UpdateSourceStatus("nasa-firms", err, time.Since(start))
		log.Printf("NASA FIRMS unavailable; wildfire layer remains empty until live telemetry returns: %v", err)
		return
	}
	defer resp.Body.Close()

	reader := csv.NewReader(resp.Body)
	records, err := reader.ReadAll()
	if err != nil {
		UpdateSourceStatus("nasa-firms", err, time.Since(start))
		log.Printf("Failed to parse NASA FIRMS CSV: %v", err)
		return
	}

	if len(records) < 2 {
		UpdateSourceStatus("nasa-firms", nil, time.Since(start))
		log.Println("NASA FIRMS ingestion verified: feed returned no active wildfire records")
		return
	}

	header := records[0]
	idxLat, idxLon, idxBright, idxConf, idxFrp, idxSat, idxDate, idxTime := -1, -1, -1, -1, -1, -1, -1, -1
	for idx, name := range header {
		switch name {
		case "latitude":
			idxLat = idx
		case "longitude":
			idxLon = idx
		case "brightness":
			idxBright = idx
		case "confidence":
			idxConf = idx
		case "frp":
			idxFrp = idx
		case "satellite":
			idxSat = idx
		case "acq_date":
			idxDate = idx
		case "acq_time":
			idxTime = idx
		}
	}

	if idxLat < 0 || idxLon < 0 || idxDate < 0 {
		err := fmt.Errorf("NASA FIRMS CSV missing required latitude, longitude, or acq_date columns")
		UpdateSourceStatus("nasa-firms", err, time.Since(start))
		log.Println(err)
		return
	}

	ctx := context.Background()
	insertedCount := 0

	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) <= idxLat || len(row) <= idxLon || len(row) <= idxDate {
			continue
		}

		lat, _ := strconv.ParseFloat(row[idxLat], 64)
		lon, _ := strconv.ParseFloat(row[idxLon], 64)
		if lat == 0 && lon == 0 {
			continue
		}

		bright := optionalFloat(row, idxBright)
		confidence := optionalString(row, idxConf)
		frp := optionalFloat(row, idxFrp)
		satellite := optionalString(row, idxSat)
		if satellite == "" {
			satellite = "MODIS"
		}

		acqDateStr := row[idxDate]
		acqTimeStr := optionalString(row, idxTime)
		if acqTimeStr == "" {
			acqTimeStr = "0000"
		}

		var acqTime time.Time
		if len(acqTimeStr) == 4 {
			acqTime, _ = time.Parse("2006-01-02 1504", acqDateStr+" "+acqTimeStr)
		}
		if acqTime.IsZero() {
			acqTime, _ = time.Parse("2006-01-02", acqDateStr)
		}
		if acqTime.IsZero() {
			acqTime = time.Now()
		}

		hasher := sha256.New()
		hasher.Write([]byte(fmt.Sprintf("%s,%.4f,%.4f,%s", satellite, lat, lon, acqDateStr)))
		fireID := "f-" + hex.EncodeToString(hasher.Sum(nil))[:16]

		_, err := db.Pool.Exec(ctx, `
			INSERT INTO wildfires (id, coordinates, brightness, confidence, frp, satellite, acq_time, updated_at)
			VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8, NOW())
			ON CONFLICT (id) DO UPDATE SET
				coordinates = EXCLUDED.coordinates,
				brightness = EXCLUDED.brightness,
				confidence = EXCLUDED.confidence,
				frp = EXCLUDED.frp,
				satellite = EXCLUDED.satellite,
				acq_time = EXCLUDED.acq_time,
				updated_at = NOW();
		`, fireID, lon, lat, bright, confidence, frp, satellite, acqTime)
		if err != nil {
			log.Printf("Wildfire upsert failure: %v", err)
			continue
		}

		severity := "moderate"
		if frp > 100 {
			severity = "high"
		}
		osintEvent := OsintEvent{
			ID:              "wildfire-" + fireID,
			Headline:        fmt.Sprintf("NASA FIRMS: Active wildfire spot detected by %s satellite", satellite),
			EventCategory:   "Geophysical & Climate Events",
			Severity:        severity,
			Coordinates:     [2]float64{lon, lat},
			EventTime:       acqTime,
			SourceTier:      0,
			LifecycleStatus: "active",
			AuditLog: map[string]any{
				"brightness":     bright,
				"frp":            frp,
				"event_type":     "persistent",
				"wire_publisher": "NASA FIRMS Sensor",
			},
		}
		if _, _, err := UpsertOsintEvent(ctx, osintEvent); err != nil {
			log.Printf("Failed to route wildfire %s to unified ingestion: %v", fireID, err)
		}

		select {
		case FireArchiveChan <- &models.WildfireState{
			ID:          fireID,
			Coordinates: [2]float64{lon, lat},
			Brightness:  bright,
			Confidence:  confidence,
			Frp:         frp,
			Satellite:   satellite,
			AcqTime:     acqTime,
			UpdatedAt:   time.Now(),
		}:
		default:
		}

		insertedCount++
	}

	UpdateSourceStatus("nasa-firms", nil, time.Since(start))
	log.Printf("NASA FIRMS ingestion verified: %d live wildfire spots updated", insertedCount)
}

func optionalString(row []string, idx int) string {
	if idx < 0 || idx >= len(row) {
		return ""
	}
	return row[idx]
}

func optionalFloat(row []string, idx int) float64 {
	raw := optionalString(row, idx)
	if raw == "" {
		return 0
	}
	val, _ := strconv.ParseFloat(raw, 64)
	return val
}
