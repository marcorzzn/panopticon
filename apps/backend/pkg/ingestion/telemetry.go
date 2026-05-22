package ingestion

import (
	"context"
	"fmt"
	"log"
	"math"
	"math/rand"
	"sync"
	"time"

	"backend/pkg/db"
)

// LiveTelemetry represents a highly compacted state packet: [id, lat, lon, heading, speed, altitude]
type LiveTelemetry struct {
	ID        string    `json:"id"`
	Lat       float64   `json:"lat"`
	Lon       float64   `json:"lon"`
	Heading   float64   `json:"heading"`
	Speed     float64   `json:"speed"`
	Altitude  float64   `json:"altitude"`
	Type      string    `json:"type"` // "air" or "sea"
	UpdatedAt time.Time `json:"updated_at"`
}

type TelemetryStore struct {
	mu       sync.RWMutex
	Aircraft map[string]LiveTelemetry
	Vessels  map[string]LiveTelemetry
}

var GlobalTelemetryStore = &TelemetryStore{
	Aircraft: make(map[string]LiveTelemetry),
	Vessels:  make(map[string]LiveTelemetry),
}

// Ingestion telemetry generator loop simulating real streams (ADS-B and AIS)
func (m *Manager) runTelemetryIngestion() {
	// Initialize simulated trackers
	initSimulatedTelemetry()

	ticker := time.NewTicker(2 * time.Second) // Update positions every 2 seconds
	defer ticker.Stop()

	flushTicker := time.NewTicker(5 * time.Second) // Flush to DB every 5 seconds
	defer flushTicker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			updateSimulatedTelemetry()
		case <-flushTicker.C:
			m.flushTelemetryToDB()
		}
	}
}

// GetLiveTelemetry returns flat arrays based on query parameter
func GetLiveTelemetry(telemetryType string) []LiveTelemetry {
	GlobalTelemetryStore.mu.RLock()
	defer GlobalTelemetryStore.mu.RUnlock()

	var result []LiveTelemetry
	if telemetryType == "air" || telemetryType == "all" {
		for _, item := range GlobalTelemetryStore.Aircraft {
			result = append(result, item)
		}
	}
	if telemetryType == "sea" || telemetryType == "all" {
		for _, item := range GlobalTelemetryStore.Vessels {
			result = append(result, item)
		}
	}
	return result
}

func initSimulatedTelemetry() {
	GlobalTelemetryStore.mu.Lock()
	defer GlobalTelemetryStore.mu.Unlock()

	// Seed 25 simulated commercial aircraft routes
	for i := 1; i <= 25; i++ {
		id := fmt.Sprintf("A-%03d", i)
		GlobalTelemetryStore.Aircraft[id] = LiveTelemetry{
			ID:        id,
			Lat:       30.0 + rand.Float64()*15.0,
			Lon:       120.0 + rand.Float64()*25.0,
			Heading:   float64(rand.Intn(360)),
			Speed:     700.0 + rand.Float64()*200.0,
			Altitude:  30000.0 + rand.Float64()*8000.0,
			Type:      "air",
			UpdatedAt: time.Now(),
		}
	}

	// Seed 15 simulated maritime vessels
	for i := 1; i <= 15; i++ {
		id := fmt.Sprintf("V-%03d", i)
		GlobalTelemetryStore.Vessels[id] = LiveTelemetry{
			ID:        id,
			Lat:       15.0 + rand.Float64()*15.0,
			Lon:       115.0 + rand.Float64()*20.0,
			Heading:   float64(rand.Intn(360)),
			Speed:     12.0 + rand.Float64()*18.0,
			Altitude:  0.0, // Sea level
			Type:      "sea",
			UpdatedAt: time.Now(),
		}
	}
}

func updateSimulatedTelemetry() {
	GlobalTelemetryStore.mu.Lock()
	defer GlobalTelemetryStore.mu.Unlock()

	// Update Aircraft coordinates based on heading and speed
	for id, craft := range GlobalTelemetryStore.Aircraft {
		headingRad := craft.Heading * math.Pi / 180.0
		// Speed in km/h to degrees shift approx (very simplified grid movement)
		distanceDegree := (craft.Speed / 3600.0 * 2.0) / 111.0 // 2 seconds delta
		newLon := craft.Lon + distanceDegree*math.Sin(headingRad)
		newLat := craft.Lat + distanceDegree*math.Cos(headingRad)

		// Border wrapping bounds check for West Pac domain
		if newLon < 100 || newLon > 160 {
			craft.Heading = 360 - craft.Heading
		}
		if newLat < 10 || newLat > 55 {
			craft.Heading = 180 - craft.Heading
		}

		if craft.Heading < 0 {
			craft.Heading += 360
		}
		craft.Heading = math.Mod(craft.Heading, 360)

		craft.Lon = newLon
		craft.Lat = newLat
		craft.UpdatedAt = time.Now()
		GlobalTelemetryStore.Aircraft[id] = craft
	}

	// Update vessels coordinates (much slower movement)
	for id, vessel := range GlobalTelemetryStore.Vessels {
		headingRad := vessel.Heading * math.Pi / 180.0
		distanceDegree := (vessel.Speed * 1.852 / 3600.0 * 2.0) / 111.0 // 2 seconds delta (knots to km/h)
		newLon := vessel.Lon + distanceDegree*math.Sin(headingRad)
		newLat := vessel.Lat + distanceDegree*math.Cos(headingRad)

		if newLon < 105 || newLon > 150 {
			vessel.Heading = 360 - vessel.Heading
		}
		if newLat < 5 || newLat > 40 {
			vessel.Heading = 180 - vessel.Heading
		}

		if vessel.Heading < 0 {
			vessel.Heading += 360
		}
		vessel.Heading = math.Mod(vessel.Heading, 360)

		vessel.Lon = newLon
		vessel.Lat = newLat
		vessel.UpdatedAt = time.Now()
		GlobalTelemetryStore.Vessels[id] = vessel
	}
}

// Bulk flush active telemetry state into PostgreSQL DB
func (m *Manager) flushTelemetryToDB() {
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()

	GlobalTelemetryStore.mu.RLock()
	aircraftCopy := make([]LiveTelemetry, 0, len(GlobalTelemetryStore.Aircraft))
	for _, a := range GlobalTelemetryStore.Aircraft {
		aircraftCopy = append(aircraftCopy, a)
	}
	GlobalTelemetryStore.mu.RUnlock()

	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		log.Printf("Telemetry DB Flush: failed to begin transaction: %v", err)
		return
	}
	defer tx.Rollback(ctx)

	for _, a := range aircraftCopy {
		_, err := tx.Exec(ctx, `
			INSERT INTO aircraft (icao24, callsign, origin_country, time_position, coordinates, baro_altitude, velocity, true_track, updated_at)
			VALUES ($1, $1, 'Simulated Sector', $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8)
			ON CONFLICT (icao24) DO UPDATE SET
				coordinates = EXCLUDED.coordinates,
				baro_altitude = EXCLUDED.baro_altitude,
				velocity = EXCLUDED.velocity,
				true_track = EXCLUDED.true_track,
				updated_at = EXCLUDED.updated_at;
		`, a.ID, a.UpdatedAt, a.Lon, a.Lat, a.Altitude, a.Speed, a.Heading, a.UpdatedAt)
		if err != nil {
			log.Printf("Telemetry DB Flush error: %v", err)
		}
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Printf("Telemetry DB Flush: transaction commit failed: %v", err)
	}
}
