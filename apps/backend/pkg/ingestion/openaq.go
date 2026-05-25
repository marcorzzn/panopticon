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

type OpenAQResponse struct {
	Results []struct {
		Location    string  `json:"location"`
		Parameter   string  `json:"parameter"`
		Value       float64 `json:"value"`
		Unit        string  `json:"unit"`
		LastUpdated string  `json:"lastUpdated"`
		Coordinates struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"coordinates"`
	} `json:"results"`
}

func (m *Manager) runAirQualityPoller() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	m.fetchAndStoreAirQuality()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.fetchAndStoreAirQuality()
		}
	}
}

func (m *Manager) fetchAndStoreAirQuality() {
	start := time.Now()
	log.Println("Ingesting OpenAQ air quality parameters...")

	apiURL := "https://api.openaq.org/v2/latest?limit=100&parameter=pm25"
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(apiURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		var code int
		if resp != nil {
			code = resp.StatusCode
			_ = resp.Body.Close()
		}
		if err == nil {
			err = fmt.Errorf("openaq returned HTTP status %d", code)
		}
		UpdateSourceStatus("openaq-airquality", err, time.Since(start))
		log.Printf("OpenAQ unavailable; air-quality layer remains empty until live measurements return: %v", err)
		return
	}
	defer resp.Body.Close()

	var data OpenAQResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		UpdateSourceStatus("openaq-airquality", err, time.Since(start))
		log.Printf("OpenAQ decode failure: %v", err)
		return
	}

	ctx := context.Background()
	insertedCount := 0

	for i, r := range data.Results {
		if r.Coordinates.Latitude == 0 && r.Coordinates.Longitude == 0 {
			continue
		}
		if r.Location == "" || r.Value < 0 {
			continue
		}

		id := fmt.Sprintf("aq-api-%d-%s", i, r.Parameter)
		lastUpdated, err := time.Parse(time.RFC3339, r.LastUpdated)
		if err != nil {
			lastUpdated = time.Now()
		}

		_, err = db.Pool.Exec(ctx, `
			INSERT INTO air_quality (id, location, parameter, value, unit, coordinates, last_updated)
			VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8)
			ON CONFLICT (id) DO UPDATE SET
				location = EXCLUDED.location,
				parameter = EXCLUDED.parameter,
				value = EXCLUDED.value,
				unit = EXCLUDED.unit,
				coordinates = EXCLUDED.coordinates,
				last_updated = EXCLUDED.last_updated;
		`, id, r.Location, r.Parameter, r.Value, r.Unit, r.Coordinates.Longitude, r.Coordinates.Latitude, lastUpdated)
		if err != nil {
			log.Printf("OpenAQ upsert failure for %s: %v", id, err)
			continue
		}
		insertedCount++
	}

	UpdateSourceStatus("openaq-airquality", nil, time.Since(start))
	log.Printf("OpenAQ ingestion verified: %d monitoring stations loaded from API", insertedCount)
}
