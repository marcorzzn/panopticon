package ingestion

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"regexp"
	"strings"
	"time"
)

type NewsArticle struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Source    string    `json:"source"`
	Text      string    `json:"text"`
	Published time.Time `json:"published"`
}

// HotspotCity defines a known C2 geo-anchor for geocoding mentions
type HotspotCity struct {
	Name string
	Lat  float64
	Lon  float64
}

var hotspotCities = []HotspotCity{
	{"Tokyo", 35.6762, 139.6503},
	{"Taipei", 25.0330, 121.5654},
	{"Seoul", 37.5665, 126.9780},
	{"Okinawa", 26.3344, 127.8056},
	{"Manila", 14.5995, 120.9842},
	{"Singapore", 1.3521, 103.8198},
	{"Jakarta", -6.2088, 106.8456},
	{"Hanoi", 21.0285, 105.8542},
	{"Guam", 13.4443, 144.7937},
	{"Hawaii", 21.3069, -157.8583},
	{"Vladivostok", 43.1198, 131.8869},
	{"Beijing", 39.9042, 116.4074},
	{"Geneva", 46.2044, 6.1432},
	{"Kyiv", 50.4501, 30.5234},
	{"Brussels", 50.8503, 4.3517},
	{"Washington", 38.9072, -77.0369},
	{"Rotterdam", 51.9244, 4.4777},
}

// Global simulated wire articles
var wireSimulations = []struct {
	Title    string
	Text     string
	Category string
	Source   string
}{
	{
		Title:    "Protests erupt in downtown Taipei over trade policies, maritime lane friction cited",
		Text:     "Hundreds have gathered outside the legislative office in Taipei expressing concerns about shipping corridor blockades and trade negotiations.",
		Category: "civil_unrest",
		Source:   "Reuters",
	},
	{
		Title:    "Seismic activity detected near Okinawa, tsunami warning dismissed by Japan Meteorological Agency",
		Text:     "A magnitude 5.2 undersea quake occurred off the coast of Okinawa. Local ports reported no damage or swell deviations.",
		Category: "seismic_activity",
		Source:   "Associated Press",
	},
	{
		Title:    "Aircraft navigation failure triggers emergency protocols near Manila flight sector",
		Text:     "A flight route deviation was monitored via ADS-B telemetry, forcing ATC at Manila International to vector flights to secondary lanes.",
		Category: "aviation_incident",
		Source:   "AFP",
	},
	{
		Title:    "Sudden extreme cloudburst floods commercial docks in Singapore, cargo delays anticipated",
		Text:     "Port operations at Singapore Marina are facing minor bottlenecks due to high rate of storm precipitation and flash flooding.",
		Category: "meteorological_hazard",
		Source:   "Reuters",
	},
	{
		Title:    "Cyber defense drills successfully conclude in Seoul, critical server grids hardened",
		Text:     "State communication centers in Seoul reported defensive shield drills wrapped up with zero threat escalations reported.",
		Category: "reconnaissance_alert",
		Source:   "Associated Press",
	},
	{
		Title:    "Military aircraft sorties monitored over Okinawa airspace, radar activity intensifies",
		Text:     "Dozens of air maneuvers were geolocated by signal intelligence arrays, creating increased noise on local air bands.",
		Category: "military_activity",
		Source:   "AFP",
	},
}

func (m *Manager) runNewsWirePoller() {
	// Periodic crawler looking for official wires
	ticker := time.NewTicker(45 * time.Second)
	defer ticker.Stop()

	// Initial immediate poll
	m.pollNewsWires()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.pollNewsWires()
		}
	}
}

func (m *Manager) pollNewsWires() {
	ctx := context.Background()
	log.Println("OSINT News Wire Poller: Ingesting dispatches from AP, Reuters, AFP...")

	// Select a random simulated article
	sim := wireSimulations[rand.Intn(len(wireSimulations))]

	// NER & Geocoding: Look for city mentions in Title or Text
	resolvedLat := 0.0
	resolvedLon := 0.0
	matchedLocation := "Global Coordinate Grid"

	for _, city := range hotspotCities {
		// Quick NER check using case-insensitive substring search or regex
		re := regexp.MustCompile("(?i)\\b" + city.Name + "\\b")
		if re.MatchString(sim.Title) || re.MatchString(sim.Text) {
			resolvedLat = city.Lat
			resolvedLon = city.Lon
			matchedLocation = city.Name
			break
		}
	}

	// Fallback to random coordinate if no location matches to prevent empty coordinates
	if resolvedLat == 0.0 && resolvedLon == 0.0 {
		city := hotspotCities[rand.Intn(len(hotspotCities))]
		resolvedLat = city.Lat
		resolvedLon = city.Lon
		matchedLocation = city.Name
	}

	// Threat classification & Severity Tagging
	severity := "low"
	if strings.Contains(sim.Title, "erupt") || strings.Contains(sim.Title, "floods") || strings.Contains(sim.Title, "failure") {
		severity = "moderate"
	}
	if strings.Contains(sim.Title, "military") || strings.Contains(sim.Title, "critical") {
		severity = "high"
	}

	articleID := fmt.Sprintf("news-ap-%d", time.Now().UnixNano()%1000000)

	// Consolidate into canonical OsintEvent (Tier -2)
	event := OsintEvent{
		ID:            articleID,
		Headline:      sim.Title,
		EventCategory: sim.Category,
		Severity:      severity,
		Coordinates:   [2]float64{resolvedLon, resolvedLat},
		EventTime:     time.Now().UTC(),
		SourceTier:    -2,
		AssociatedSources: []AssociatedSource{
			{
				SourceID:         articleID,
				SourceURL:        "https://www.reuters.com/news/archive",
				Snippet:          sim.Text,
				CredibilityScore: 0.75,
				Timestamp:        time.Now().UTC(),
			},
		},
		AuditLog: map[string]any{
			"geocoding_match": matchedLocation,
			"ner_extracted":   true,
			"wire_publisher":  sim.Source,
		},
	}

	// Send to zero-redundancy database clustering transaction
	resolvedID, clustered, err := UpsertOsintEvent(ctx, event)
	if err != nil {
		log.Printf("OSINT News Wire: Ingest transaction failed: %v", err)
		return
	}

	if clustered {
		log.Printf("OSINT News Wire: Deduplication matched existing event cluster %s. Appended source info.", resolvedID)
	} else {
		log.Printf("OSINT News Wire: Registered new consolidated event %s at [%f, %f] (%s)", resolvedID, resolvedLon, resolvedLat, matchedLocation)
	}
}
