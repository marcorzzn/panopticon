package ingestion

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
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

type RSS struct {
	Channel Channel `xml:"channel"`
}

type Channel struct {
	Title string `xml:"title"`
	Items []Item `xml:"item"`
}

type Item struct {
	Title       string `xml:"title"`
	Description string `xml:"description"`
	Link        string `xml:"link"`
	PubDate     string `xml:"pubDate"`
}

func (m *Manager) runNewsWirePoller() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

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
	log.Printf("OSINT News Wire Poller: Ingesting dispatches from %d live RSS feeds...", len(RssFeeds))

	client := &http.Client{Timeout: 10 * time.Second}
	
	// Select a rotating random subset of 15 feeds per poll to avoid IP blocks
	maxFeeds := 15
	selectedFeeds := make([]string, 0, maxFeeds)
	if len(RssFeeds) > maxFeeds {
		perm := rand.Perm(len(RssFeeds))
		for i := 0; i < maxFeeds; i++ {
			selectedFeeds = append(selectedFeeds, RssFeeds[perm[i]])
		}
	} else {
		selectedFeeds = RssFeeds
	}

	for _, feedURL := range selectedFeeds {
		go func(url string) {
			req, err := http.NewRequest("GET", url, nil)
			if err != nil {
				return
			}
			req.Header.Set("User-Agent", "Panopticon-RSS-Ingestor/1.0")
			
			resp, err := client.Do(req)
			if err != nil {
				return
			}
			defer resp.Body.Close()
			
			if resp.StatusCode != 200 {
				return
			}
			
			var rss RSS
			import "encoding/xml"
			if err := xml.NewDecoder(resp.Body).Decode(&rss); err != nil {
				return
			}
			
			for i, item := range rss.Channel.Items {
				if i >= 3 {
					break // Take top 3 articles per feed
				}
				processRSSItem(ctx, item.Title, item.Description, url, item.Link, rss.Channel.Title)
				time.Sleep(4 * time.Second) // rate limit protection for Gemini API
			}
		}(feedURL)
		time.Sleep(1 * time.Second)
	}
}

// cleanJSONResponse strips out Markdown formatting if present
func cleanJSONResponse(rawText string) string {
	cleaned := strings.TrimSpace(rawText)
	cleaned = strings.ReplaceAll(cleaned, "```json", "")
	cleaned = strings.ReplaceAll(cleaned, "```", "")
	return strings.TrimSpace(cleaned)
}

func processRSSItem(ctx context.Context, title, desc, feedURL, link, sourceName string) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("[AI ERROR] GEMINI_API_KEY not configured. Skipping Gemini ingestion.")
		return
	}

	if sourceName == "" {
		sourceName = feedURL
	}

	prompt := fmt.Sprintf(`You are a GIS intelligence analyst. Read the following news dispatch.
Extract the exact location (city, region, or country) where the event is taking place.
Categorize the event into exactly one of these 8 categories:
- Conflict & Hybrid Warfare
- Terrorism & Internal Security
- Cyber & Information Warfare
- Political Crises & Geopolitics
- Geophysical & Climate Events
- Biological, Health & Ecological
- Economic, Financial & Strategic Resources
- Industrial & Infrastructure Disasters

Assign a severity level ("low", "moderate", "high", "critical").
Provide the exact GPS coordinates (Latitude, Longitude) of the event's location. If the location cannot be geocoded precisely, return null for both lat and lng. NO wild guesses.
Provide a short summary in English.
Translate the raw text to English if it is not in English.
Set source reliability to "unverified" for anything that isn't a trusted node. If the source is known to be highly trusted, set to "verified".
Determine the event type: "hub", "spoke", "instant", or "persistent".

Return EXACTLY and ONLY a JSON object using this schema:
{
  "lat": number | null,
  "lng": number | null,
  "category": string,
  "severity": string,
  "short_summary": string,
  "exact_location_name": string,
  "raw_english_translation": string,
  "source_reliability": string,
  "event_type": string
}

Title: %s
Description: %s
Source: %s`, title, desc, sourceName)

	geminiReqBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(geminiReqBody)
	if err != nil {
		log.Printf("[AI ERROR] Error marshalling request: %v", err)
		return
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey)
	
	reqCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(reqCtx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("[AI ERROR] HTTP request error: %v", err)
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("[AI ERROR] Gemini API call execution error: %v", err)
		return
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(httpResp.Body)
		log.Printf("[AI ERROR] Gemini API returned status %d. Details: %s", httpResp.StatusCode, string(respBytes))
		return
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(httpResp.Body).Decode(&geminiResp); err != nil {
		log.Printf("[AI ERROR] Gemini response decode error: %v", err)
		return
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		log.Println("[AI ERROR] Gemini returned empty parts")
		return
	}

	rawResult := geminiResp.Candidates[0].Content.Parts[0].Text
	cleaned := cleanJSONResponse(rawResult)

	type GeminiProcessResponse struct {
		Lat                 *float64 `json:"lat"`
		Lng                 *float64 `json:"lng"`
		Category            string   `json:"category"`
		Severity            string   `json:"severity"`
		ShortSummary        string   `json:"short_summary"`
		ExactLocationName   string   `json:"exact_location_name"`
		RawEnglishTranslate string   `json:"raw_english_translation"`
		SourceReliability   string   `json:"source_reliability"`
		EventType           string   `json:"event_type"`
	}

	var res GeminiProcessResponse
	if err := json.Unmarshal([]byte(cleaned), &res); err != nil {
		log.Printf("[AI ERROR] JSON unmarshal error: %v. Raw text: %s", err, cleaned)
		return
	}

	resolvedLat := 0.0
	resolvedLon := 0.0
	if res.Lat != nil && res.Lng != nil {
		resolvedLat = *res.Lat
		resolvedLon = *res.Lng
	}

	articleID := fmt.Sprintf("news-rss-%d", time.Now().UnixNano()%1000000)

	event := OsintEvent{
		ID:            articleID,
		Headline:      title,
		EventCategory: res.Category,
		Severity:      res.Severity,
		Coordinates:   [2]float64{resolvedLon, resolvedLat},
		EventTime:     time.Now().UTC(),
		SourceTier:    -2,
		AssociatedSources: []AssociatedSource{
			{
				SourceID:         articleID,
				SourceURL:        link,
				Snippet:          res.ShortSummary,
				CredibilityScore: 0.85,
				Timestamp:        time.Now().UTC(),
			},
		},
		AuditLog: map[string]any{
			"geocoding_match":         res.ExactLocationName,
			"ner_extracted":           true,
			"wire_publisher":          sourceName,
			"raw_english_translation": res.RawEnglishTranslate,
			"source_reliability":      res.SourceReliability,
			"event_type":              res.EventType,
		},
	}

	resolvedID, clustered, err := UpsertOsintEvent(ctx, event)
	if err != nil {
		log.Printf("OSINT News Wire: Ingest transaction failed: %v", err)
		return
	}

	if clustered {
		log.Printf("OSINT News Wire: Deduplication matched existing event cluster %s.", resolvedID)
	} else {
		log.Printf("OSINT News Wire: Registered new consolidated event %s at [%f, %f] (%s)", resolvedID, resolvedLon, resolvedLat, res.ExactLocationName)
	}
}
