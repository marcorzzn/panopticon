package api

import (
	"compress/gzip"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backend/pkg/db"
	"backend/pkg/ingestion"
	"backend/pkg/models"
)

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}

// 1. Get Sources Operational Status
// Actual handler implementation supporting chi Signature: func(w http.ResponseWriter, r *http.Request)
func GetSourcesHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, name, status, last_success_at, last_error_at, last_error, consecutive_failures, avg_response_ms
		FROM data_sources
		ORDER BY id ASC;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var sources []models.DataSource
	for rows.Next() {
		var s models.DataSource
		err := rows.Scan(
			&s.ID, &s.Name, &s.Status, &s.LastSuccessAt, &s.LastErrorAt, &s.LastError, &s.ConsecutiveFailures, &s.AvgResponseMs,
		)
		if err != nil {
			http.Error(w, "Error scanning database row", http.StatusInternalServerError)
			return
		}
		sources = append(sources, s)
	}

	writeJSON(w, http.StatusOK, sources)
}

// 2. Get Live Earthquakes
func GetEarthquakesHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, magnitude, place, time, ST_X(coordinates), ST_Y(coordinates), depth, severity, label
		FROM earthquakes
		ORDER BY time DESC
		LIMIT 500;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var earthquakes []models.Earthquake
	for rows.Next() {
		var eq models.Earthquake
		var lng, lat float64
		err := rows.Scan(
			&eq.ID, &eq.Magnitude, &eq.Place, &eq.Time, &lng, &lat, &eq.Depth, &eq.Severity, &eq.Label,
		)
		if err != nil {
			http.Error(w, "Error scanning database row", http.StatusInternalServerError)
			return
		}
		eq.Coordinates = [2]float64{lng, lat}
		earthquakes = append(earthquakes, eq)
	}

	writeJSON(w, http.StatusOK, earthquakes)
}

// 3. Get Geopolitical Events (GDELT)
func GetGdeltEventsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, label, actor1, actor2, goldstein_scale, avg_tone, ST_X(coordinates), ST_Y(coordinates), source_url, time
		FROM gdelt_events
		ORDER BY time DESC
		LIMIT 200;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var events []models.GdeltEvent
	for rows.Next() {
		var ev models.GdeltEvent
		var lng, lat float64
		err := rows.Scan(
			&ev.ID, &ev.Label, &ev.Actor1, &ev.Actor2, &ev.GoldsteinScale, &ev.AvgTone, &lng, &lat, &ev.SourceURL, &ev.Time,
		)
		if err != nil {
			http.Error(w, "Error scanning database row", http.StatusInternalServerError)
			return
		}
		ev.Coordinates = [2]float64{lng, lat}
		events = append(events, ev)
	}

	writeJSON(w, http.StatusOK, events)
}

// 3.5. Get OSINT Events (Gemini processed news)
func GetOsintEventsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, headline, event_category, severity, ST_X(geom::geometry), ST_Y(geom::geometry), event_time, associated_sources, audit_log
		FROM osint_events
		ORDER BY event_time DESC
		LIMIT 100;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var events []map[string]interface{}
	for rows.Next() {
		var id, headline, category, severity string
		var lng, lat float64
		var eventTime time.Time
		var sourcesJSON []byte
		var auditJSON []byte

		err := rows.Scan(&id, &headline, &category, &severity, &lng, &lat, &eventTime, &sourcesJSON, &auditJSON)
		if err != nil {
			http.Error(w, "Error scanning database row", http.StatusInternalServerError)
			return
		}
		
		var auditLog map[string]interface{}
		if len(auditJSON) > 0 {
			_ = json.Unmarshal(auditJSON, &auditLog)
		}

		var sources []ingestion.AssociatedSource
		if len(sourcesJSON) > 0 {
			_ = json.Unmarshal(sourcesJSON, &sources)
		}

		sourceName := "Unknown"
		sourceURL := ""
		shortSummary := ""
		if len(sources) > 0 {
			sourceURL = sources[0].SourceURL
			shortSummary = sources[0].Snippet
		}
		if publisher, ok := auditLog["wire_publisher"].(string); ok {
			sourceName = publisher
		}

		eventType := "instant"
		if et, ok := auditLog["event_type"].(string); ok && et != "" {
			eventType = et
		}

		var coords []float64
		if lat != 0.0 || lng != 0.0 {
			coords = []float64{lng, lat}
		}

		event := map[string]interface{}{
			"id":          id,
			"title":       headline,
			"category":    category,
			"severity":    severity,
			"coordinates": coords,
			"timestamp":   eventTime.Format(time.RFC3339),
			"source":      sourceName,
			"url":         sourceURL,
			"summary":     shortSummary,
			"eventType":   eventType,
		}

		if parentHubId, ok := auditLog["parent_hub_id"].(string); ok && parentHubId != "" {
			event["parentHubId"] = parentHubId
		}

		if rawEng, ok := auditLog["raw_english_translation"].(string); ok && rawEng != "" {
			event["raw_english_translation"] = rawEng
		}

		if reliability, ok := auditLog["source_reliability"].(string); ok && reliability != "" {
			event["source_reliability"] = reliability
		}

		events = append(events, event)
	}

	if events == nil {
		events = make([]map[string]interface{}, 0)
	}

	writeJSON(w, http.StatusOK, events)
}

// 4. Highly Compacted Aviation states stream: [ [icao24, lat, lon, heading, alt, vel], ... ]
type CompactAviationResponse struct {
	Timestamp int64           `json:"timestamp"`
	Count     int             `json:"count"`
	Fields    []string        `json:"fields"`
	Data      [][]interface{} `json:"data"`
}

func GetAviationStatesHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT icao24, callsign, ST_Y(coordinates), ST_X(coordinates), true_track, baro_altitude, velocity
		FROM aircraft
		ORDER BY updated_at DESC;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var data [][]interface{}
	for rows.Next() {
		var icao, callsign string
		var lat, lon, heading, alt, vel float64
		err := rows.Scan(&icao, &callsign, &lat, &lon, &heading, &alt, &vel)
		if err != nil {
			http.Error(w, "Error scanning aircraft row", http.StatusInternalServerError)
			return
		}
		
		// Map into lightweight flat payload array
		// icao24, callsign, lat, lon, heading, altitude, velocity
		data = append(data, []interface{}{
			icao, callsign, lat, lon, heading, alt, vel,
		})
	}

	res := CompactAviationResponse{
		Timestamp: time.Now().Unix(),
		Count:     len(data),
		Fields:    []string{"icao24", "callsign", "lat", "lon", "heading", "altitude", "velocity"},
		Data:      data,
	}

	writeJSON(w, http.StatusOK, res)
}

// 5. Highly Compacted Wildfires stream: [ [id, lat, lon, frp, confidence], ... ]
type CompactWildfireResponse struct {
	Timestamp int64           `json:"timestamp"`
	Count     int             `json:"count"`
	Fields    []string        `json:"fields"`
	Data      [][]interface{} `json:"data"`
}

func GetWildfiresHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, ST_Y(coordinates), ST_X(coordinates), frp, confidence
		FROM wildfires
		ORDER BY acq_time DESC;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var data [][]interface{}
	for rows.Next() {
		var id, confidence string
		var lat, lon, frp float64
		err := rows.Scan(&id, &lat, &lon, &frp, &confidence)
		if err != nil {
			http.Error(w, "Error scanning wildfire row", http.StatusInternalServerError)
			return
		}
		
		// Map into lightweight flat array
		// id, lat, lon, frp, confidence
		data = append(data, []interface{}{
			id, lat, lon, frp, confidence,
		})
	}

	res := CompactWildfireResponse{
		Timestamp: time.Now().Unix(),
		Count:     len(data),
		Fields:    []string{"id", "lat", "lon", "frp", "confidence"},
		Data:      data,
	}

	writeJSON(w, http.StatusOK, res)
}

// 6. Compact Air Quality Stream: [ [id, location, lat, lon, parameter, value, unit], ... ]
type CompactAirQualityResponse struct {
	Timestamp int64           `json:"timestamp"`
	Count     int             `json:"count"`
	Fields    []string        `json:"fields"`
	Data      [][]interface{} `json:"data"`
}

func GetAirQualityHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, location, ST_Y(coordinates), ST_X(coordinates), parameter, value, unit
		FROM air_quality
		ORDER BY last_updated DESC;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var data [][]interface{}
	for rows.Next() {
		var id, location, parameter, unit string
		var lat, lon, value float64
		err := rows.Scan(&id, &location, &lat, &lon, &parameter, &value, &unit)
		if err != nil {
			http.Error(w, "Error scanning air quality row", http.StatusInternalServerError)
			return
		}

		data = append(data, []interface{}{
			id, location, lat, lon, parameter, value, unit,
		})
	}

	res := CompactAirQualityResponse{
		Timestamp: time.Now().Unix(),
		Count:     len(data),
		Fields:    []string{"id", "location", "lat", "lon", "parameter", "value", "unit"},
		Data:      data,
	}

	writeJSON(w, http.StatusOK, res)
}

// 7. Compact ACLED Geopolitical Conflicts Stream: [ [id, event_type, actor1, actor2, lat, lon, fatalities, notes, event_date], ... ]
type CompactAcledResponse struct {
	Timestamp int64           `json:"timestamp"`
	Count     int             `json:"count"`
	Fields    []string        `json:"fields"`
	Data      [][]interface{} `json:"data"`
}

func GetAcledEventsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, event_type, actor1, actor2, ST_Y(coordinates), ST_X(coordinates), fatalities, notes, event_date
		FROM acled_events
		ORDER BY event_date DESC
		LIMIT 500;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var data [][]interface{}
	for rows.Next() {
		var id, eventType, actor1, actor2, notes string
		var lat, lon float64
		var fatalities int
		var eventDate time.Time

		err := rows.Scan(&id, &eventType, &actor1, &actor2, &lat, &lon, &fatalities, &notes, &eventDate)
		if err != nil {
			http.Error(w, "Error scanning conflict event row", http.StatusInternalServerError)
			return
		}

		data = append(data, []interface{}{
			id, eventType, actor1, actor2, lat, lon, fatalities, notes, eventDate.Unix(),
		})
	}

	res := CompactAcledResponse{
		Timestamp: time.Now().Unix(),
		Count:     len(data),
		Fields:    []string{"id", "event_type", "actor1", "actor2", "lat", "lon", "fatalities", "notes", "event_date"},
		Data:      data,
	}

	writeJSON(w, http.StatusOK, res)
}

// 8. Historical Search Range Query Handler
type HistoricalQueryResponse struct {
	Timestamp int64           `json:"timestamp"`
	Type      string          `json:"type"`
	Count     int             `json:"count"`
	Fields    []string        `json:"fields"`
	Data      [][]interface{} `json:"data"`
}

func GetHistoricalHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	startStr := q.Get("start")
	endStr := q.Get("end")
	qType := q.Get("type") // "aviation", "wildfires", "conflicts"

	var start, end time.Time
	var err error

	if startStr != "" {
		start, err = time.Parse(time.RFC3339, startStr)
	}
	if err != nil || startStr == "" {
		start = time.Now().Add(-24 * time.Hour)
	}

	if endStr != "" {
		end, err = time.Parse(time.RFC3339, endStr)
	}
	if err != nil || endStr == "" {
		end = time.Now()
	}

	if qType == "" {
		qType = "aviation"
	}

	var fields []string
	var data [][]interface{}

	switch qType {
	case "aviation":
		fields = []string{"icao24", "callsign", "lat", "lon", "heading", "altitude", "velocity", "timestamp"}
		data = queryHistoricalAviation(start, end)

	case "wildfires":
		fields = []string{"id", "lat", "lon", "frp", "confidence", "timestamp"}
		data = queryHistoricalWildfires(start, end)

	case "conflicts":
		fields = []string{"id", "event_type", "actor1", "actor2", "lat", "lon", "fatalities", "notes", "event_date"}
		data = queryHistoricalConflicts(start, end)

	default:
		http.Error(w, "Invalid historical telemetry type requested", http.StatusBadRequest)
		return
	}

	res := HistoricalQueryResponse{
		Timestamp: time.Now().Unix(),
		Type:      qType,
		Count:     len(data),
		Fields:    fields,
		Data:      data,
	}

	writeJSON(w, http.StatusOK, res)
}

func getArchiveDirectory() string {
	paths := []string{
		"./data/archive",
		"../data/archive",
		"./apps/backend/data/archive",
	}

	for _, p := range paths {
		if stat, err := os.Stat(p); err == nil && stat.IsDir() {
			return p
		}
	}
	return "./data/archive"
}

func queryHistoricalAviation(start, end time.Time) [][]interface{} {
	var results [][]interface{}

	// 1. Query active warm DB entries first
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT icao24, callsign, ST_Y(coordinates), ST_X(coordinates), true_track, baro_altitude, velocity, updated_at
		FROM aircraft
		WHERE updated_at >= $1 AND updated_at <= $2
		ORDER BY updated_at DESC;
	`, start, end)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var icao, callsign string
			var lat, lon, heading, alt, vel float64
			var upd time.Time
			if err := rows.Scan(&icao, &callsign, &lat, &lon, &heading, &alt, &vel, &upd); err == nil {
				results = append(results, []interface{}{
					icao, callsign, lat, lon, heading, alt, vel, upd.Unix(),
				})
			}
		}
	}

	// 2. Scan daily cold CSV / GZIP archives
	dir := getArchiveDirectory()
	curr := start
	for !curr.After(end) {
		dateStr := curr.Format("2006-01-02")
		
		// Attempt raw CSV or Gzipped CSV
		filenames := []string{
			filepath.Join(dir, fmt.Sprintf("aircraft_%s.csv", dateStr)),
			filepath.Join(dir, fmt.Sprintf("aircraft_%s.csv.gz", dateStr)),
		}

		for _, filename := range filenames {
			file, err := os.Open(filename)
			if err != nil {
				continue
			}

			var r io.Reader = file
			if strings.HasSuffix(filename, ".gz") {
				gz, err := gzip.NewReader(file)
				if err != nil {
					file.Close()
					continue
				}
				defer gz.Close()
				r = gz
			}

			csvReader := csv.NewReader(r)
			records, err := csvReader.ReadAll()
			file.Close()
			if err != nil {
				continue
			}

			// Parse rows, skip header
			for idx, row := range records {
				if idx == 0 {
					continue
				}
				if len(row) < 10 {
					continue
				}

				icao24 := row[0]
				callsign := row[1]
				lat, _ := strconv.ParseFloat(row[3], 64)
				lon, _ := strconv.ParseFloat(row[4], 64)
				alt, _ := strconv.ParseFloat(row[5], 64)
				vel, _ := strconv.ParseFloat(row[6], 64)
				heading, _ := strconv.ParseFloat(row[7], 64)
				timestamp, _ := strconv.ParseInt(row[9], 10, 64)

				t := time.Unix(timestamp, 0)
				if (t.Equal(start) || t.After(start)) && (t.Equal(end) || t.Before(end)) {
					results = append(results, []interface{}{
						icao24, callsign, lat, lon, heading, alt, vel, timestamp,
					})
				}
			}
		}

		curr = curr.AddDate(0, 0, 1)
	}

	return results
}

func queryHistoricalWildfires(start, end time.Time) [][]interface{} {
	var results [][]interface{}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Query active warm DB entries
	rows, err := db.Pool.Query(ctx, `
		SELECT id, ST_Y(coordinates), ST_X(coordinates), frp, confidence, acq_time
		FROM wildfires
		WHERE acq_time >= $1 AND acq_time <= $2
		ORDER BY acq_time DESC;
	`, start, end)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, confidence string
			var lat, lon, frp float64
			var acq time.Time
			if err := rows.Scan(&id, &lat, &lon, &frp, &confidence, &acq); err == nil {
				results = append(results, []interface{}{
					id, lat, lon, frp, confidence, acq.Unix(),
				})
			}
		}
	}

	// 2. Scan daily cold CSV / GZIP archives
	dir := getArchiveDirectory()
	curr := start
	for !curr.After(end) {
		dateStr := curr.Format("2006-01-02")
		
		filenames := []string{
			filepath.Join(dir, fmt.Sprintf("wildfires_%s.csv", dateStr)),
			filepath.Join(dir, fmt.Sprintf("wildfires_%s.csv.gz", dateStr)),
		}

		for _, filename := range filenames {
			file, err := os.Open(filename)
			if err != nil {
				continue
			}

			var r io.Reader = file
			if strings.HasSuffix(filename, ".gz") {
				gz, err := gzip.NewReader(file)
				if err != nil {
					file.Close()
					continue
				}
				defer gz.Close()
				r = gz
			}

			csvReader := csv.NewReader(r)
			records, err := csvReader.ReadAll()
			file.Close()
			if err != nil {
				continue
			}

			for idx, row := range records {
				if idx == 0 {
					continue
				}
				if len(row) < 8 {
					continue
				}

				id := row[0]
				lat, _ := strconv.ParseFloat(row[1], 64)
				lon, _ := strconv.ParseFloat(row[2], 64)
				confidence := row[4]
				frp, _ := strconv.ParseFloat(row[5], 64)
				timestamp, _ := strconv.ParseInt(row[7], 10, 64)

				t := time.Unix(timestamp, 0)
				if (t.Equal(start) || t.After(start)) && (t.Equal(end) || t.Before(end)) {
					results = append(results, []interface{}{
						id, lat, lon, frp, confidence, timestamp,
					})
				}
			}
		}

		curr = curr.AddDate(0, 0, 1)
	}

	return results
}

func queryHistoricalConflicts(start, end time.Time) [][]interface{} {
	var results [][]interface{}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Conflicts are stored in PostGIS warm storage exclusively
	rows, err := db.Pool.Query(ctx, `
		SELECT id, event_type, actor1, actor2, ST_Y(coordinates), ST_X(coordinates), fatalities, notes, event_date
		FROM acled_events
		WHERE event_date >= $1 AND event_date <= $2
		ORDER BY event_date DESC
		LIMIT 1000;
	`, start, end)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, eventType, actor1, actor2, notes string
			var lat, lon float64
			var fatalities int
			var eventDate time.Time

			err := rows.Scan(&id, &eventType, &actor1, &actor2, &lat, &lon, &fatalities, &notes, &eventDate)
			if err == nil {
				results = append(results, []interface{}{
					id, eventType, actor1, actor2, lat, lon, fatalities, notes, eventDate.Unix(),
				})
			}
		}
	}

	return results
}

type CompactWebcamResponse struct {
	Timestamp int64           `json:"timestamp"`
	Count     int             `json:"count"`
	Fields    []string        `json:"fields"`
	Data      [][]interface{} `json:"data"`
}

func GetWebcamsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, name, ST_Y(coordinates), ST_X(coordinates), stream_url, status
		FROM webcams
		ORDER BY id ASC;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var data [][]interface{}
	for rows.Next() {
		var id, name, streamURL, status string
		var lat, lon float64
		err := rows.Scan(&id, &name, &lat, &lon, &streamURL, &status)
		if err != nil {
			http.Error(w, "Error scanning webcam row", http.StatusInternalServerError)
			return
		}

		data = append(data, []interface{}{
			id, name, lat, lon, streamURL, status,
		})
	}

	res := CompactWebcamResponse{
		Timestamp: time.Now().Unix(),
		Count:     len(data),
		Fields:    []string{"id", "name", "lat", "lon", "streamUrl", "status"},
		Data:      data,
	}

	writeJSON(w, http.StatusOK, res)
}

type ReconTraceResponse struct {
	Timestamp   int64           `json:"timestamp"`
	Target      string          `json:"target"`
	ResolvedIP  string          `json:"resolvedIp"`
	Country     string          `json:"country"`
	ThreatScore int             `json:"threatScore"`
	OpenPorts   []int           `json:"openPorts"`
	DnsRecords  any             `json:"dnsRecords"`
	Fields      []string        `json:"fields"`
	Data        [][]interface{} `json:"data"`
}

func GetReconTraceHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	target := q.Get("target")
	if target == "" {
		http.Error(w, "Query parameter 'target' is required", http.StatusBadRequest)
		return
	}

	latStr := q.Get("lat")
	lonStr := q.Get("lon")

	var lat, lon float64
	var err error

	if latStr != "" {
		lat, err = strconv.ParseFloat(latStr, 64)
		if err != nil {
			http.Error(w, "Invalid latitude parameter", http.StatusBadRequest)
			return
		}
	}
	if lonStr != "" {
		lon, err = strconv.ParseFloat(lonStr, 64)
		if err != nil {
			http.Error(w, "Invalid longitude parameter", http.StatusBadRequest)
			return
		}
	}

	// Trigger the scan
	scan, hops, err := ingestion.RunReconScan(target, lat, lon)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to run recon scan: %v", err), http.StatusInternalServerError)
		return
	}

	res := ReconTraceResponse{
		Timestamp:   time.Now().Unix(),
		Target:      scan.Target,
		ResolvedIP:  scan.ResolvedIP,
		Country:     scan.Country,
		ThreatScore: scan.ThreatScore,
		OpenPorts:   scan.OpenPorts,
		DnsRecords:  scan.DnsRecords,
		Fields:      []string{"hop_number", "ip", "lat", "lon", "ping_ms", "isp"},
		Data:        hops,
	}

	writeJSON(w, http.StatusOK, res)
}

type CompactSatelliteResponse struct {
	Timestamp int64           `json:"timestamp"`
	Count     int             `json:"count"`
	Fields    []string        `json:"fields"`
	Data      [][]interface{} `json:"data"`
}

func GetSatellitesHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT id, name, norad_id, satellite_type, ST_Y(coordinates), ST_X(coordinates), altitude_km, inclination, velocity_kms, tle_line1, tle_line2
		FROM satellites
		ORDER BY id ASC;
	`)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var data [][]interface{}
	for rows.Next() {
		var id, name, satType, tle1, tle2 string
		var noradID int
		var lat, lon, alt, inc, vel float64
		err := rows.Scan(&id, &name, &noradID, &satType, &lat, &lon, &alt, &inc, &vel, &tle1, &tle2)
		if err != nil {
			http.Error(w, "Error scanning satellite row", http.StatusInternalServerError)
			return
		}

		data = append(data, []interface{}{
			id, name, noradID, satType, lat, lon, alt, inc, vel, tle1, tle2,
		})
	}

	res := CompactSatelliteResponse{
		Timestamp: time.Now().Unix(),
		Count:     len(data),
		Fields:    []string{"id", "name", "noradId", "satelliteType", "lat", "lon", "altitudeKm", "inclination", "velocityKms", "tleLine1", "tleLine2"},
		Data:      data,
	}

	writeJSON(w, http.StatusOK, res)
}

func BulkIngestHandler(w http.ResponseWriter, r *http.Request) {
	var batch []ingestion.OsintEvent
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		http.Error(w, "Invalid JSON payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	type resultItem struct {
		ID        string `json:"id"`
		Clustered bool   `json:"clustered"`
		Error     string `json:"error,omitempty"`
	}
	results := make([]resultItem, 0, len(batch))

	for _, item := range batch {
		resID, clustered, err := ingestion.UpsertOsintEvent(r.Context(), item)
		var errStr string
		if err != nil {
			errStr = err.Error()
		}
		results = append(results, resultItem{
			ID:        resID,
			Clustered: clustered,
			Error:     errStr,
		})
	}

	writeJSON(w, http.StatusOK, results)
}

type CorrelationEdge struct {
	SourceID       string  `json:"source_id"`
	TargetID       string  `json:"target_id"`
	Category       string  `json:"category"`
	DistanceMeters float64 `json:"distance_meters"`
	TimeDiffSecs   float64 `json:"time_diff_seconds"`
}

func GetEventCorrelationHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx, `
		SELECT 
			e1.id AS source_id,
			e2.id AS target_id,
			e1.event_category AS category,
			ST_Distance(e1.geom::geography, e2.geom::geography) AS distance_meters,
			ABS(EXTRACT(EPOCH FROM (e1.event_time - e2.event_time))) AS time_diff_seconds
		FROM osint_events e1
		JOIN osint_events e2 ON e1.id < e2.id
		WHERE ST_DWithin(e1.geom::geography, e2.geom::geography, 50000)
		  AND e1.event_time >= e2.event_time - interval '6 hours'
		  AND e1.event_time <= e2.event_time + interval '6 hours'
		LIMIT 100;
	`)
	if err != nil {
		// Handled gracefully: if the table was empty, return empty list rather than 500
		writeJSON(w, http.StatusOK, []CorrelationEdge{})
		return
	}
	defer rows.Close()

	var edges []CorrelationEdge
	for rows.Next() {
		var edge CorrelationEdge
		err := rows.Scan(&edge.SourceID, &edge.TargetID, &edge.Category, &edge.DistanceMeters, &edge.TimeDiffSecs)
		if err != nil {
			http.Error(w, "Error scanning correlation row", http.StatusInternalServerError)
			return
		}
		edges = append(edges, edge)
	}

	writeJSON(w, http.StatusOK, edges)
}

func WebcamProxyHandler(w http.ResponseWriter, r *http.Request) {
	ingestion.WebcamProxyHandler(w, r)
}

func GetLiveTelemetryHandler(w http.ResponseWriter, r *http.Request) {
	t := r.URL.Query().Get("type")
	if t == "" {
		t = "all"
	}
	data := ingestion.GetLiveTelemetry(t)
	writeJSON(w, http.StatusOK, data)
}



