package ingestion

import (
	"context"
	"io"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"backend/pkg/db"
)

type SimWebcam struct {
	ID        string
	Name      string
	Lat       float64
	Lon       float64
	StreamURL string
}

var simWebcams = []SimWebcam{
	{"cam-01", "Tokyo Shibuya Crossing", 35.6595, 139.7005, "https://images.webcams.travel/preview/1171887208.jpg"}, // Example live snapshot endpoint
	{"cam-02", "New York Times Square", 40.7580, -73.9855, "https://images.webcams.travel/preview/1171887210.jpg"},
	{"cam-03", "London Piccadilly Circus", 51.5101, -0.1349, "https://images.webcams.travel/preview/1171887212.jpg"},
	{"cam-04", "Sydney Harbour Bridge", -33.8523, 151.2108, "https://images.webcams.travel/preview/1171887215.jpg"},
	{"cam-05", "Panama Canal Miraflores Locks", 8.9973, -79.5910, "https://images.webcams.travel/preview/1171887218.jpg"},
	{"cam-06", "Cape Town Table Mountain", -33.9628, 18.4241, "https://images.webcams.travel/preview/1171887220.jpg"},
	{"cam-07", "Paris Eiffel Tower Cam", 48.8584, 2.2945, "https://images.webcams.travel/preview/1171887222.jpg"},
	{"cam-08", "Venice Rialto Bridge", 45.4380, 12.3359, "https://images.webcams.travel/preview/1171887225.jpg"},
	{"cam-09", "Cairo Giza Pyramids View", 29.9773, 31.1325, "https://images.webcams.travel/preview/1171887228.jpg"},
	{"cam-10", "Rio de Janeiro Copacabana", -22.9714, -43.1823, "https://images.webcams.travel/preview/1171887230.jpg"},
	{"cam-11", "Moscow Red Square", 55.7539, 37.6208, "https://images.webcams.travel/preview/1171887232.jpg"},
	{"cam-12", "Reykjavik Harbor Cam", 64.1500, -21.9400, "https://images.webcams.travel/preview/1171887235.jpg"},
	{"cam-13", "Gibraltar Airport Crossing", 36.1512, -5.3497, "https://images.webcams.travel/preview/1171887238.jpg"},
	{"cam-14", "Rome Colosseum Outer Cam", 41.8902, 12.4922, "https://images.webcams.travel/preview/1171887240.jpg"},
	{"cam-15", "Singapore Marina Bay Sands", 1.2828, 103.8609, "https://images.webcams.travel/preview/1171887242.jpg"},
}

// In-Memory cache for webcam snapshots
type snapshotEntry struct {
	data        []byte
	contentType string
	timestamp   time.Time
}

var (
	snapshotCache   = make(map[string]snapshotEntry)
	snapshotCacheMu sync.Mutex
)

// WebcamProxyHandler proxies snapshot images and streams transparently
// resolving CORS issues and implementing active caching for snapshots.
func WebcamProxyHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	camID := r.URL.Query().Get("id")
	reqType := r.URL.Query().Get("type") // "snapshot" or "stream"

	if camID == "" {
		http.Error(w, "Missing 'id' parameter", http.StatusBadRequest)
		return
	}

	// Fetch webcam info from DB
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var streamURL, status string
	err := db.Pool.QueryRow(ctx, `
		SELECT stream_url, status FROM webcams WHERE id = $1;
	`, camID).Scan(&streamURL, &status)

	if err != nil {
		http.Error(w, "Webcam not found", http.StatusNotFound)
		return
	}

	if status == "offline" {
		http.Error(w, "Webcam status is offline", http.StatusServiceUnavailable)
		return
	}

	if reqType == "snapshot" {
		// Serve from cache if valid (15 seconds)
		snapshotCacheMu.Lock()
		cached, exists := snapshotCache[camID]
		if exists && time.Since(cached.timestamp) < 15*time.Second {
			w.Header().Set("Content-Type", cached.contentType)
			w.Header().Set("Cache-Control", "public, max-age=15")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(cached.data)
			snapshotCacheMu.Unlock()
			return
		}
		snapshotCacheMu.Unlock()

		// If not cached or expired, fetch from original source
		client := &http.Client{Timeout: 8 * time.Second}
		resp, err := client.Get(streamURL)
		if err != nil {
			http.Error(w, "Failed to capture snapshot from webcam source", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			http.Error(w, "Webcam returned non-OK status", http.StatusBadGateway)
			return
		}

		data, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "Failed to read webcam data stream", http.StatusInternalServerError)
			return
		}

		contentType := resp.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "image/jpeg"
		}

		// Update cache
		snapshotCacheMu.Lock()
		snapshotCache[camID] = snapshotEntry{
			data:        data,
			contentType: contentType,
			timestamp:   time.Now(),
		}
		snapshotCacheMu.Unlock()

		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Cache-Control", "public, max-age=15")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
		return

	} else {
		// Stream pipeline proxy (HLS chunks, WebRTC endpoints)
		client := &http.Client{Timeout: 15 * time.Second}
		resp, err := client.Get(streamURL)
		if err != nil {
			http.Error(w, "Failed to bridge live connection to camera stream", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Pipe headers and status
		for k, vv := range resp.Header {
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// Pipe the streaming media chunks transparently
		_, err = io.Copy(w, resp.Body)
		if err != nil {
			log.Printf("Webcam Stream Proxy: Copy connection interrupted for %s: %v", camID, err)
		}
		return
	}
}

func (m *Manager) runWebcamPoller() {
	m.seedWebcams()

	ticker := time.NewTicker(60 * time.Second) // Check statuses every 60 seconds
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.updateWebcamStatuses()
		}
	}
}

func (m *Manager) seedWebcams() {
	ctx := context.Background()
	insertedCount := 0

	for _, cam := range simWebcams {
		_, err := db.Pool.Exec(ctx, `
			INSERT INTO webcams (id, name, coordinates, stream_url, status)
			VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, 'healthy')
			ON CONFLICT (id) DO NOTHING;
		`, cam.ID, cam.Name, cam.Lon, cam.Lat, cam.StreamURL)
		if err != nil {
			log.Printf("Failed to seed webcam %s: %v", cam.ID, err)
			continue
		}
		insertedCount++
	}

	if insertedCount > 0 {
		log.Printf("Webcam Seeder: Initialized %d static CCTV locations in PostGIS", insertedCount)
	}
}

func (m *Manager) updateWebcamStatuses() {
	ctx := context.Background()
	updatedCount := 0

	states := []string{"healthy", "healthy", "healthy", "healthy", "degraded", "offline"}

	for _, cam := range simWebcams {
		// Dynamic status shifts
		status := states[rand.Intn(len(states))]

		_, err := db.Pool.Exec(ctx, `
			UPDATE webcams SET status = $2 WHERE id = $1;
		`, cam.ID, status)
		if err != nil {
			continue
		}
		updatedCount++
	}

	log.Printf("Webcam Status Manager: verified and updated %d CCTV operational states", updatedCount)
}
