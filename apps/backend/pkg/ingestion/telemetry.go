package ingestion

import (
	"sync"
	"time"
)

// LiveTelemetry represents a compact live packet from an authenticated stream.
type LiveTelemetry struct {
	ID        string    `json:"id"`
	Lat       float64   `json:"lat"`
	Lon       float64   `json:"lon"`
	Heading   float64   `json:"heading"`
	Speed     float64   `json:"speed"`
	Altitude  float64   `json:"altitude"`
	Type      string    `json:"type"`
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

// runTelemetryIngestion intentionally does not synthesize AIS/ADS-B traffic.
// Authenticated live adapters can populate GlobalTelemetryStore when configured.
func (m *Manager) runTelemetryIngestion() {
	<-m.ctx.Done()
}

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
	if result == nil {
		return []LiveTelemetry{}
	}
	return result
}
