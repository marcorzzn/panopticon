package api

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
)

// CongestionPoint represents a grid cell: [lat, lon, density_score]
type CongestionPoint [3]float64

// GetCongestionGridHandler generates and serves the global ground transit density matrix
func GetCongestionGridHandler(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	bboxStr := r.URL.Query().Get("bbox")
	if bboxStr == "" {
		// Fallback default WestPac view if no bbox provided
		bboxStr = "115.0,15.0,145.0,45.0"
	}

	// Parse bbox: xmin, ymin, xmax, ymax (lonMin, latMin, lonMax, latMax)
	parts := strings.Split(bboxStr, ",")
	if len(parts) != 4 {
		http.Error(w, "Invalid bbox format. Use 'xmin,ymin,xmax,ymax'", http.StatusBadRequest)
		return
	}

	var xmin, ymin, xmax, ymax float64
	var err error
	if xmin, err = strconv.ParseFloat(parts[0], 64); err != nil {
		http.Error(w, "Invalid xmin", http.StatusBadRequest)
		return
	}
	if ymin, err = strconv.ParseFloat(parts[1], 64); err != nil {
		http.Error(w, "Invalid ymin", http.StatusBadRequest)
		return
	}
	if xmax, err = strconv.ParseFloat(parts[2], 64); err != nil {
		http.Error(w, "Invalid xmax", http.StatusBadRequest)
		return
	}
	if ymax, err = strconv.ParseFloat(parts[3], 64); err != nil {
		http.Error(w, "Invalid ymax", http.StatusBadRequest)
		return
	}

	// Dynamic grid step size based on bbox size to prevent memory explosion
	// Keep grid size around 15x15 to 30x30 points
	lonSpan := xmax - xmin
	latSpan := ymax - ymin

	// Cap spans to prevent infinite loops
	if lonSpan < 0 {
		lonSpan = -lonSpan
	}
	if latSpan < 0 {
		latSpan = -latSpan
	}

	if lonSpan > 360 {
		lonSpan = 360
	}
	if latSpan > 180 {
		latSpan = 180
	}

	steps := 25
	lonStep := lonSpan / float64(steps)
	latStep := latSpan / float64(steps)

	var points []CongestionPoint

	// Generate deterministic traffic density grid simulating populated urban centers
	for i := 0; i <= steps; i++ {
		currLon := xmin + float64(i)*lonStep
		for j := 0; j <= steps; j++ {
			currLat := ymin + float64(j)*latStep

			// Deterministic pseudo-noise formula using multi-octave trig waves
			// Simulates highway branches and metropolitan centers
			val1 := math.Sin(currLon*2.5) * math.Cos(currLat*2.5)
			val2 := math.Sin(currLon*8.0) * math.Cos(currLat*8.0) * 0.4
			val3 := math.Sin(currLon*20.0) * math.Cos(currLat*20.0) * 0.15

			densityFloat := (val1 + val2 + val3 + 1.0) / 2.0 // Scale to 0..1
			densityScore := math.Floor(densityFloat * 4.9)   // Scale to integer 0..4

			// Add additional weight near known metropolitan centers (Tokyo, Taipei, Manila)
			if isNearUrbanHub(currLon, currLat) {
				densityScore = math.Min(4.0, densityScore+1.5)
			}

			// Return points with traffic density > 0 to save payload bandwidth
			if densityScore > 0 {
				points = append(points, CongestionPoint{currLat, currLon, densityScore})
			}
		}
	}

	_ = json.NewEncoder(w).Encode(points)
}

// Helper to simulate city center density boost
func isNearUrbanHub(lon, lat float64) bool {
	hubs := []struct {
		Lon float64
		Lat float64
	}{
		{139.7, 35.6}, // Tokyo
		{121.5, 25.0}, // Taipei
		{121.0, 14.6}, // Manila
		{103.8, 1.3},  // Singapore
		{126.9, 37.6}, // Seoul
	}

	for _, h := range hubs {
		dist := math.Sqrt(math.Pow(lon-h.Lon, 2) + math.Pow(lat-h.Lat, 2))
		if dist < 1.2 { // Close to center (approx 130 km range)
			return true
		}
	}
	return false
}
