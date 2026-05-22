package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"backend/pkg/db"
)

type UsgsResponse struct {
	Features []struct {
		ID         string `json:"id"`
		Properties struct {
			Mag   float64 `json:"mag"`
			Place string  `json:"place"`
			Time  int64   `json:"time"` // Epoch ms
		} `json:"properties"`
		Geometry struct {
			Coordinates []float64 `json:"coordinates"` // [lng, lat, depth]
		} `json:"geometry"`
	} `json:"features"`
}

func (m *Manager) runEarthquakePoller() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	// Run immediately on startup
	m.fetchAndStoreEarthquakes()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.fetchAndStoreEarthquakes()
		}
	}
}

func (m *Manager) fetchAndStoreEarthquakes() {
	start := time.Now()
	log.Println("Ingesting USGS Seismic feed...")

	resp, err := http.Get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
	if err != nil {
		UpdateSourceStatus("usgs-earthquakes", err, time.Since(start))
		log.Printf("USGS Seismic fetch error: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("unexpected HTTP status: %d", resp.StatusCode)
		UpdateSourceStatus("usgs-earthquakes", err, time.Since(start))
		log.Println(err)
		return
	}

	var data UsgsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		UpdateSourceStatus("usgs-earthquakes", err, time.Since(start))
		log.Printf("Failed to parse USGS GeoJSON: %v", err)
		return
	}

	ctx := context.Background()
	insertedCount := 0

	for _, feat := range data.Features {
		if len(feat.Geometry.Coordinates) < 2 {
			continue
		}

		lng := feat.Geometry.Coordinates[0]
		lat := feat.Geometry.Coordinates[1]
		depth := 0.0
		if len(feat.Geometry.Coordinates) >= 3 {
			depth = feat.Geometry.Coordinates[2]
		}

		mag := feat.Properties.Mag
		place := feat.Properties.Place
		t := time.UnixMilli(feat.Properties.Time)

		// Determine severity classification
		severity := "info"
		if mag >= 6.0 {
			severity = "critical"
		} else if mag >= 5.0 {
			severity = "high"
		} else if mag >= 4.0 {
			severity = "moderate"
		} else if mag >= 2.5 {
			severity = "low"
		}

		label := fmt.Sprintf("M %.1f - %s", mag, place)

		// Spatial Upsert in database
		_, err := db.Pool.Exec(ctx, `
			INSERT INTO earthquakes (id, magnitude, place, time, coordinates, depth, severity, label)
			VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9)
			ON CONFLICT (id) DO UPDATE SET
				magnitude = EXCLUDED.magnitude,
				place = EXCLUDED.place,
				time = EXCLUDED.time,
				coordinates = EXCLUDED.coordinates,
				depth = EXCLUDED.depth,
				severity = EXCLUDED.severity,
				label = EXCLUDED.label;
		`, feat.ID, mag, place, t, lng, lat, depth, severity, label)
		if err != nil {
			log.Printf("Failed to insert earthquake %s: %v", feat.ID, err)
			continue
		}
		insertedCount++
	}

	UpdateSourceStatus("usgs-earthquakes", nil, time.Since(start))
	log.Printf("USGS Seismic ingestion verified: %d records updated", insertedCount)
}
