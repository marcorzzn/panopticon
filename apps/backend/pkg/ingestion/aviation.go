package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"backend/pkg/db"
	"backend/pkg/models"
)

type OpenSkyResponse struct {
	Time   int64           `json:"time"`
	States [][]interface{} `json:"states"`
}

func (m *Manager) runAviationPoller() {
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()

	m.fetchAndStoreAviation()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.fetchAndStoreAviation()
		}
	}
}

func (m *Manager) fetchAndStoreAviation() {
	start := time.Now()
	log.Println("Ingesting OpenSky flight state vectors...")

	apiURL := "https://opensky-network.org/api/states/all?lamin=35.0&lomin=-15.0&lamax=65.0&lomax=35.0"
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		UpdateSourceStatus("opensky-aviation", err, time.Since(start))
		log.Printf("Aviation setup error: %v", err)
		return
	}

	if m.cfg.OpenSkyUsername != "" && m.cfg.OpenSkyPassword != "" {
		req.SetBasicAuth(m.cfg.OpenSkyUsername, m.cfg.OpenSkyPassword)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		var code int
		if resp != nil {
			code = resp.StatusCode
			_ = resp.Body.Close()
		}
		if err == nil {
			err = fmt.Errorf("opensky returned HTTP status %d", code)
		}
		UpdateSourceStatus("opensky-aviation", err, time.Since(start))
		log.Printf("OpenSky unavailable; aviation layer remains empty until live telemetry returns: %v", err)
		return
	}
	defer resp.Body.Close()

	var data OpenSkyResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		UpdateSourceStatus("opensky-aviation", err, time.Since(start))
		log.Printf("OpenSky JSON decode failed; aviation layer remains empty: %v", err)
		return
	}

	ctx := context.Background()
	insertedCount := 0

	for _, state := range data.States {
		if len(state) < 12 {
			continue
		}

		icao24, _ := state[0].(string)
		if icao24 == "" {
			continue
		}

		callsign, _ := state[1].(string)
		originCountry, _ := state[2].(string)
		callsign = strings.TrimSpace(callsign)

		timePos := time.Now()
		if tp, ok := state[3].(float64); ok {
			timePos = time.Unix(int64(tp), 0)
		}

		lng, ok1 := state[5].(float64)
		lat, ok2 := state[6].(float64)
		if !ok1 || !ok2 || lat == 0 || lng == 0 {
			continue
		}

		baroAlt := parseNumber(state[7])
		velocity := parseNumber(state[9])
		trueTrack := parseNumber(state[10])
		vertRate := parseNumber(state[11])

		_, err := db.Pool.Exec(ctx, `
			INSERT INTO aircraft (icao24, callsign, origin_country, time_position, coordinates, baro_altitude, velocity, true_track, vertical_rate, updated_at)
			VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, NOW())
			ON CONFLICT (icao24) DO UPDATE SET
				callsign = EXCLUDED.callsign,
				origin_country = EXCLUDED.origin_country,
				time_position = EXCLUDED.time_position,
				coordinates = EXCLUDED.coordinates,
				baro_altitude = EXCLUDED.baro_altitude,
				velocity = EXCLUDED.velocity,
				true_track = EXCLUDED.true_track,
				vertical_rate = EXCLUDED.vertical_rate,
				updated_at = NOW();
		`, icao24, callsign, originCountry, timePos, lng, lat, baroAlt, velocity, trueTrack, vertRate)
		if err != nil {
			log.Printf("Aircraft upsert failure: %v", err)
			continue
		}

		select {
		case FlightArchiveChan <- &models.AircraftState{
			Icao24:        icao24,
			Callsign:      callsign,
			OriginCountry: originCountry,
			TimePosition:  timePos,
			Coordinates:   [2]float64{lng, lat},
			BaroAltitude:  baroAlt,
			Velocity:      velocity,
			TrueTrack:     trueTrack,
			VerticalRate:  vertRate,
			UpdatedAt:     time.Now(),
		}:
		default:
		}

		insertedCount++
	}

	UpdateSourceStatus("opensky-aviation", nil, time.Since(start))
	log.Printf("OpenSky ingestion verified: %d live flights updated", insertedCount)
}

func parseNumber(val interface{}) float64 {
	if val == nil {
		return 0.0
	}
	if f, ok := val.(float64); ok {
		return f
	}
	return 0.0
}
