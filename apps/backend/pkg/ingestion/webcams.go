package ingestion

import (
	"context"
	"log"
	"math/rand"
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
	{"cam-01", "Tokyo Shibuya Crossing", 35.6595, 139.7005, "https://example.com/cams/shibuya.m3u8"},
	{"cam-02", "New York Times Square", 40.7580, -73.9855, "https://example.com/cams/timessquare.m3u8"},
	{"cam-03", "London Piccadilly Circus", 51.5101, -0.1349, "https://example.com/cams/piccadilly.m3u8"},
	{"cam-04", "Sydney Harbour Bridge", -33.8523, 151.2108, "https://example.com/cams/sydneybridge.m3u8"},
	{"cam-05", "Panama Canal Miraflores Locks", 8.9973, -79.5910, "https://example.com/cams/panamacanal.m3u8"},
	{"cam-06", "Cape Town Table Mountain", -33.9628, 18.4241, "https://example.com/cams/capetown.m3u8"},
	{"cam-07", "Paris Eiffel Tower Cam", 48.8584, 2.2945, "https://example.com/cams/eiffel.m3u8"},
	{"cam-08", "Venice Rialto Bridge", 45.4380, 12.3359, "https://example.com/cams/venice.m3u8"},
	{"cam-09", "Cairo Giza Pyramids View", 29.9773, 31.1325, "https://example.com/cams/pyramids.m3u8"},
	{"cam-10", "Rio de Janeiro Copacabana", -22.9714, -43.1823, "https://example.com/cams/copacabana.m3u8"},
	{"cam-11", "Moscow Red Square", 55.7539, 37.6208, "https://example.com/cams/redsquare.m3u8"},
	{"cam-12", "Reykjavik Harbor Cam", 64.1500, -21.9400, "https://example.com/cams/reykjavik.m3u8"},
	{"cam-13", "Gibraltar Airport Crossing", 36.1512, -5.3497, "https://example.com/cams/gibraltar.m3u8"},
	{"cam-14", "Rome Colosseum Outer Cam", 41.8902, 12.4922, "https://example.com/cams/rome.m3u8"},
	{"cam-15", "Singapore Marina Bay Sands", 1.2828, 103.8609, "https://example.com/cams/singapore.m3u8"},
}

func (m *Manager) runWebcamPoller() {
	// Initialize / seed webcams in database
	m.seedWebcams()

	ticker := time.NewTicker(300 * time.Second) // Check/Update status every 5 minutes
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

	// Status states
	states := []string{"healthy", "healthy", "healthy", "healthy", "degraded", "offline"}

	for _, cam := range simWebcams {
		// Random status to simulate real-world uptime shifts
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
