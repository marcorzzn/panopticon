package ingestion

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"backend/pkg/db"
)

type GdeltResponse struct {
	Features []struct {
		Geometry struct {
			Coordinates []float64 `json:"coordinates"` // [lng, lat]
		} `json:"geometry"`
		Properties map[string]interface{} `json:"properties"`
	} `json:"features"`
}

func (m *Manager) runGdeltPoller() {
	ticker := time.NewTicker(15 * time.Minute) // 15 mins GDELT update speed
	defer ticker.Stop()

	// Run immediately on startup
	m.fetchAndStoreGdelt()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.fetchAndStoreGdelt()
		}
	}
}

func (m *Manager) fetchAndStoreGdelt() {
	start := time.Now()
	log.Printf("Ingesting GDELT geopolitical feed (Query: %s)...", m.cfg.GdeltQuery)

	apiURL := fmt.Sprintf("https://api.gdeltproject.org/api/v2/geo/geo?query=%s&format=GeoJSON", url.QueryEscape(m.cfg.GdeltQuery))
	resp, err := http.Get(apiURL)
	if err != nil {
		UpdateSourceStatus("gdelt", err, time.Since(start))
		log.Printf("GDELT fetch error: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("unexpected GDELT HTTP status: %d", resp.StatusCode)
		UpdateSourceStatus("gdelt", err, time.Since(start))
		log.Println(err)
		return
	}

	var response GdeltResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		UpdateSourceStatus("gdelt", err, time.Since(start))
		log.Printf("Failed to decode GDELT JSON: %v", err)
		return
	}

	ctx := context.Background()
	insertedCount := 0

	for _, feat := range response.Features {
		if len(feat.Geometry.Coordinates) < 2 {
			continue
		}

		lng := feat.Geometry.Coordinates[0]
		lat := feat.Geometry.Coordinates[1]

		props := feat.Properties
		sourceURL, _ := props["url"].(string)
		if sourceURL == "" {
			continue
		}

		// Clean title from properties["html"] or properties["name"]
		htmlString, _ := props["html"].(string)
		title := cleanGdeltTitle(htmlString)
		if title == "" {
			title, _ = props["name"].(string)
			if title == "" {
				title = "Geopolitical Event Dispatch"
			}
		}

		actor1, _ := props["actor1"].(string)
		actor2, _ := props["actor2"].(string)

		goldstein := parseInterfaceFloat(props["goldstein"])
		avgTone := parseInterfaceFloat(props["avgtone"])

		// Generate stable hash ID from source URL
		hasher := sha256.New()
		hasher.Write([]byte(sourceURL + fmt.Sprintf("%.4f,%.4f", lng, lat)))
		eventID := "g-" + hex.EncodeToString(hasher.Sum(nil))[:16]

		_, err := db.Pool.Exec(ctx, `
			INSERT INTO gdelt_events (id, label, actor1, actor2, goldstein_scale, avg_tone, coordinates, source_url, time)
			VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326), $9, $10)
			ON CONFLICT (id) DO UPDATE SET
				label = EXCLUDED.label,
				actor1 = EXCLUDED.actor1,
				actor2 = EXCLUDED.actor2,
				goldstein_scale = EXCLUDED.goldstein_scale,
				avg_tone = EXCLUDED.avg_tone,
				coordinates = EXCLUDED.coordinates,
				source_url = EXCLUDED.source_url,
				time = EXCLUDED.time;
		`, eventID, title, actor1, actor2, goldstein, avgTone, lng, lat, sourceURL, time.Now())
		if err != nil {
			log.Printf("Failed to insert GDELT event %s: %v", eventID, err)
			continue
		}
		insertedCount++
	}

	UpdateSourceStatus("gdelt", nil, time.Since(start))
	log.Printf("GDELT Ingestion verified: %d records updated", insertedCount)
}

func parseInterfaceFloat(val interface{}) float64 {
	if val == nil {
		return 0.0
	}
	switch v := val.(type) {
	case float64:
		return v
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return 0.0
}

func cleanGdeltTitle(html string) string {
	if html == "" {
		return ""
	}
	// GDELT geo properties.html contains anchor tag: <a href="...">Title</a>
	re := regexp.MustCompile(`<a[^>]*>([^<]+)</a>`)
	matches := re.FindStringSubmatch(html)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	return strings.TrimSpace(html)
}
