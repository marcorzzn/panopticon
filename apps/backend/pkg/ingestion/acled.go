package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"backend/pkg/db"
)

type AcledResponse struct {
	Data []struct {
		AcledID      string `json:"data_id"`
		EventDate    string `json:"event_date"`
		EventType    string `json:"event_type"`
		SubEventType string `json:"sub_event_type"`
		Actor1       string `json:"actor1"`
		Actor2       string `json:"actor2"`
		Country      string `json:"country"`
		Location     string `json:"location"`
		Latitude     string `json:"latitude"`
		Longitude    string `json:"longitude"`
		Fatalities   string `json:"fatalities"`
		Notes        string `json:"notes"`
		Source       string `json:"source"`
	} `json:"data"`
}

func (m *Manager) runAcledPoller() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	m.fetchAndStoreAcled()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.fetchAndStoreAcled()
		}
	}
}

func (m *Manager) fetchAndStoreAcled() {
	start := time.Now()
	log.Println("Ingesting ACLED geopolitical conflict registry...")

	apiURL := "https://api.acleddata.com/acled/read/?limit=10"
	resp, err := http.Get(apiURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		var code int
		if resp != nil {
			code = resp.StatusCode
			_ = resp.Body.Close()
		}
		if err == nil {
			err = fmt.Errorf("acled returned HTTP status %d", code)
		}
		UpdateSourceStatus("acled-conflicts", err, time.Since(start))
		log.Printf("ACLED unavailable or requires credentials; conflict layer remains limited to other live sources: %v", err)
		return
	}
	defer resp.Body.Close()

	var response AcledResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		UpdateSourceStatus("acled-conflicts", err, time.Since(start))
		log.Printf("ACLED JSON decode failed: %v", err)
		return
	}

	ctx := context.Background()
	insertedCount := 0

	for _, row := range response.Data {
		lat, errLat := strconv.ParseFloat(row.Latitude, 64)
		lon, errLon := strconv.ParseFloat(row.Longitude, 64)
		if errLat != nil || errLon != nil || lat == 0 || lon == 0 {
			continue
		}

		fatalities, _ := strconv.Atoi(row.Fatalities)
		eventDate, errDate := time.Parse("2006-01-02", row.EventDate)
		if errDate != nil {
			eventDate = time.Now()
		}

		_, err = db.Pool.Exec(ctx, `
			INSERT INTO acled_events (id, event_date, event_type, sub_event_type, actor1, actor2, country, location, coordinates, fatalities, notes, source)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326), $11, $12, $13)
			ON CONFLICT (id) DO UPDATE SET
				event_date = EXCLUDED.event_date,
				event_type = EXCLUDED.event_type,
				sub_event_type = EXCLUDED.sub_event_type,
				actor1 = EXCLUDED.actor1,
				actor2 = EXCLUDED.actor2,
				country = EXCLUDED.country,
				location = EXCLUDED.location,
				coordinates = EXCLUDED.coordinates,
				fatalities = EXCLUDED.fatalities,
				notes = EXCLUDED.notes,
				source = EXCLUDED.source;
		`, row.AcledID, eventDate, row.EventType, row.SubEventType, row.Actor1, row.Actor2, row.Country, row.Location, lon, lat, fatalities, row.Notes, row.Source)
		if err != nil {
			log.Printf("ACLED upsert failure for %s: %v", row.AcledID, err)
			continue
		}
		insertedCount++
	}

	UpdateSourceStatus("acled-conflicts", nil, time.Since(start))
	log.Printf("ACLED ingestion verified: %d geopolitical events loaded from registry", insertedCount)
}
