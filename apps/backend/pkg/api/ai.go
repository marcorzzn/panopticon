package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// IPRateLimiter is a thread-safe sliding window rate limiter
type IPRateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	window   time.Duration
	maxLimit int
}

// NewIPRateLimiter creates a new rate limiter instance
func NewIPRateLimiter(window time.Duration, maxLimit int) *IPRateLimiter {
	return &IPRateLimiter{
		requests: make(map[string][]time.Time),
		window:   window,
		maxLimit: maxLimit,
	}
}

// Allow checks if a request from the given IP is allowed
func (l *IPRateLimiter) Allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-l.window)

	// Clean up old requests for this IP
	var validRequests []time.Time
	for _, t := range l.requests[ip] {
		if t.After(cutoff) {
			validRequests = append(validRequests, t)
		}
	}

	if len(validRequests) >= l.maxLimit {
		l.requests[ip] = validRequests
		return false
	}

	validRequests = append(validRequests, now)
	l.requests[ip] = validRequests
	return true
}

// Global thread-safe rate limiter protecting Gemini API quotas (5 requests per minute per IP)
var aiRateLimiter = NewIPRateLimiter(60*time.Second, 5)

// getClientIP extracts the client IP address considering reverse proxies
func getClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	if xip := r.Header.Get("X-Real-IP"); xip != "" {
		return xip
	}
	ip := r.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

// cleanJSONResponse strips out Markdown formatting if present
func cleanJSONResponse(rawText string) string {
	cleaned := strings.TrimSpace(rawText)
	cleaned = strings.ReplaceAll(cleaned, "```json", "")
	cleaned = strings.ReplaceAll(cleaned, "```", "")
	return strings.TrimSpace(cleaned)
}

// Structures for daily briefing proxy
type NewsFeedItem struct {
	ID          string    `json:"id"`
	Domain      string    `json:"domain"`
	Category    string    `json:"category"`
	Severity    string    `json:"severity"`
	Source      string    `json:"source"`
	Title       string    `json:"title"`
	Summary     string    `json:"summary"`
	Link        string    `json:"link"`
	Coordinates []float64 `json:"coordinates"`
	Time        time.Time `json:"time"`
}

type GenerateBriefRequest struct {
	Events []NewsFeedItem `json:"events"`
}

type GenerateBriefResponse struct {
	Brief string `json:"brief"`
}

// GenerateBriefHandler processes global threat feeds and compiles daily briefs using server-side Gemini
func GenerateBriefHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Validate Rate Limiting strictly before calling Gemini
	ip := getClientIP(r)
	if !aiRateLimiter.Allow(ip) {
		log.Printf("[RATE LIMIT] GenerateBrief blocked for IP: %s", ip)
		http.Error(w, "AI quota exceeded: Too many requests. Please try again later.", http.StatusTooManyRequests)
		return
	}

	// 2. Read environment API key securely
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("[AI ERROR] GEMINI_API_KEY environment variable is not configured")
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	// Decode request body
	var req GenerateBriefRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Events) == 0 {
		writeJSON(w, http.StatusOK, GenerateBriefResponse{
			Brief: "No active threat events are currently loaded. Cannot compile intelligence brief.",
		})
		return
	}

	// Formulate prompt
	var eventsSummary strings.Builder
	limit := len(req.Events)
	if limit > 20 {
		limit = 20
	}
	for i := 0; i < limit; i++ {
		ev := req.Events[i]
		fmt.Fprintf(&eventsSummary, "[%d] Category: %s | Severity: %s | Source: %s\nTitle: %s\nSummary: %s\n\n",
			i+1, strings.ToUpper(ev.Category), strings.ToUpper(ev.Severity), ev.Source, ev.Title, ev.Summary)
	}

	prompt := fmt.Sprintf(`You are a Senior OSINT Geopolitical Analyst preparing a Geostrategic Daily Situational Intelligence Brief.
Compile a highly professional, cohesive executive summary analyzing the top 20 geopolitical, security, cyber, and logistics events from the past 24 hours.

Include:
1. EXECUTIVE SUMMARY: A 2-paragraph geostrategic summary identifying core global trends, active escalation channels (e.g. Red Sea, Ukraine, South Asia), and logistical impacts.
2. CRITICAL SECTORS: 3 bullet points highlighting high-risk areas (e.g. cybersecurity routing, Suez container bottlenecks, active warfare).
3. CYBER TELEMETRY FORECAST: A brief analysis of network threats and SCADA/infrastructure risks based on active indicators.

Events Data:
%s

Write in highly technical, dry, objective geostrategic terminology. Use markdown headers. Do not use generic filler words.`, eventsSummary.String())

	// 3. Strict Timeout Protection: 30-second context timeout limit
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// 4. Invoke Gemini API securely
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
		log.Printf("[AI ERROR] Error marshalling brief request: %v", err)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("[AI ERROR] Error creating HTTP request to Gemini: %v", err)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("[AI ERROR] Error executing call to Gemini API: %v", err)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(httpResp.Body)
		log.Printf("[AI ERROR] Gemini API returned status %d. Details: %s", httpResp.StatusCode, string(respBytes))
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
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
		log.Printf("[AI ERROR] Error decoding Gemini response: %v", err)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		log.Println("[AI ERROR] Gemini returned empty response parts")
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	briefText := geminiResp.Candidates[0].Content.Parts[0].Text
	writeJSON(w, http.StatusOK, GenerateBriefResponse{Brief: briefText})
}

// Structures for geocoding proxy
type GeocodeRequest struct {
	Address string `json:"address"`
}

type GeocodeResponse struct {
	Coordinates [2]float64 `json:"coordinates"`
}

// GeocodeHandler processes client-side address geocoding requests using server-side Gemini
func GeocodeHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Validate Rate Limiting strictly before calling Gemini
	ip := getClientIP(r)
	if !aiRateLimiter.Allow(ip) {
		log.Printf("[RATE LIMIT] Geocode blocked for IP: %s", ip)
		http.Error(w, "AI quota exceeded: Too many requests. Please try again later.", http.StatusTooManyRequests)
		return
	}

	// 2. Read environment API key securely
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("[AI ERROR] GEMINI_API_KEY environment variable is not configured")
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	// Decode request body
	var req GeocodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Address) == "" {
		http.Error(w, "Address parameter is required", http.StatusBadRequest)
		return
	}

	// Formulate prompt
	prompt := fmt.Sprintf(`You are a geocoding engine for an OSINT mapping platform.
Resolve the following location entity or address into precise WGS84 decimal coordinates as a JSON array: [longitude, latitude].
Be accurate and precise. Do not guess wild coordinates. If the location is completely unresolved, return null.

Target Location: "%s"

Respond ONLY with a valid JSON array [longitude, latitude] or null. Do not include markdown code blocks, comments, or explanations.`, req.Address)

	// 3. Strict Timeout Protection: 15-second context timeout limit
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Invoke Gemini API securely
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
		log.Printf("[AI ERROR] Error marshalling geocode request: %v", err)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("[AI ERROR] Error creating HTTP request to Gemini: %v", err)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("[AI ERROR] Error executing call to Gemini API: %v", err)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(httpResp.Body)
		log.Printf("[AI ERROR] Gemini API returned status %d. Details: %s", httpResp.StatusCode, string(respBytes))
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
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
		log.Printf("[AI ERROR] Error decoding Gemini response: %v", err)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		log.Println("[AI ERROR] Gemini returned empty response parts")
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	rawResult := geminiResp.Candidates[0].Content.Parts[0].Text
	cleaned := cleanJSONResponse(rawResult)

	if cleaned == "" || cleaned == "null" {
		log.Printf("[AI GEOCODE] Address '%s' could not be resolved by AI", req.Address)
		http.Error(w, "Geocoding failed to resolve address coordinates", http.StatusNotFound)
		return
	}

	var coords [2]float64
	if err := json.Unmarshal([]byte(cleaned), &coords); err != nil {
		log.Printf("[AI ERROR] Geocoding coordinates parse failure: %v. Raw text was: %s", err, cleaned)
		http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
		return
	}

	writeJSON(w, http.StatusOK, GeocodeResponse{Coordinates: coords})
}

// EnrichNewsRequest wraps incoming news title and description
type EnrichNewsRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// EnrichNewsResponse represents the structured geocoded intelligence details
type EnrichNewsResponse struct {
	Lat               float64 `json:"lat"`
	Lng               float64 `json:"lng"`
	Category          string  `json:"category"`
	Severity          int     `json:"severity"`
	ShortSummary      string  `json:"short_summary"`
	ExactLocationName string  `json:"exact_location_name"`
}

// EnrichNewsHandler processes raw news dispatches and geo-enriches them via server-side Gemini
func EnrichNewsHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Validate Rate Limiting strictly
	ip := getClientIP(r)
	if !aiRateLimiter.Allow(ip) {
		log.Printf("[RATE LIMIT] EnrichNews blocked for IP: %s", ip)
		http.Error(w, "AI quota exceeded: Too many requests. Please try again later.", http.StatusTooManyRequests)
		return
	}

	// 2. Read environment API key securely
	apiKey := os.Getenv("GEMINI_API_KEY")
	
	// Decode request body
	var req EnrichNewsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Title) == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// Fallback function to execute when Gemini fails or is not configured
	executeFallback := func(reason string) {
		log.Printf("[AI ENRICH FALLBACK] Executing geocode fallback. Reason: %s", reason)
		titleLower := strings.ToLower(req.Title)
		descLower := strings.ToLower(req.Description)
		combined := titleLower + " " + descLower

		// Default values
		lng, lat := 0.0, 0.0
		locName := "Global Recon Network"
		category := "Politics"
		severity := 3

		centroids := map[string][2]float64{
			"ukraine":        {31.1656, 48.3794},
			"russia":         {105.3188, 61.5240},
			"united states":  {-95.7129, 37.0902},
			"china":          {104.1954, 35.8617},
			"taiwan":         {120.9605, 23.6978},
			"israel":         {34.8516, 31.0461},
			"gaza":           {34.45, 31.43},
			"iran":           {53.6880, 32.4279},
			"syria":          {38.9968, 34.8021},
			"lebanon":        {35.8623, 33.8547},
			"yemen":          {48.5164, 15.5527},
			"red sea":        {38.5, 20.0},
			"somalia":        {46.1996, 5.1521},
			"sudan":          {30.2186, 12.8628},
			"united kingdom": {-2.2426, 55.3781},
			"germany":        {10.4515, 51.1657},
			"france":         {2.2137, 46.2276},
			"italy":          {12.5674, 41.8719},
			"japan":          {138.2529, 36.2048},
			"south korea":    {127.7669, 35.9078},
			"north korea":    {127.5101, 40.3399},
			"venezuela":      {-66.5897, 6.4238},
			"philippines":    {121.7740, 12.8797},
			"panama":         {-80.7821, 8.5380},
			"suez":           {32.54, 29.96},
		}

		for key, coords := range centroids {
			if strings.Contains(combined, key) {
				lng, lat = coords[0], coords[1]
				locName = strings.Title(key)
				break
			}
		}

		// Quick keyword mapping for category & severity
		if strings.Contains(combined, "conflict") || strings.Contains(combined, "war") || strings.Contains(combined, "clash") || strings.Contains(combined, "strike") || strings.Contains(combined, "bomb") || strings.Contains(combined, "military") {
			category = "Conflict"
			severity = 4
		} else if strings.Contains(combined, "protest") || strings.Contains(combined, "riot") || strings.Contains(combined, "demonstr") {
			category = "Protest"
			severity = 3
		} else if strings.Contains(combined, "earthquake") || strings.Contains(combined, "flood") || strings.Contains(combined, "hurricane") || strings.Contains(combined, "storm") || strings.Contains(combined, "fire") || strings.Contains(combined, "hazard") {
			category = "Natural Disaster"
			severity = 4
		} else if strings.Contains(combined, "economy") || strings.Contains(combined, "market") || strings.Contains(combined, "trade") || strings.Contains(combined, "stock") || strings.Contains(combined, "tariff") {
			category = "Economy"
			severity = 2
		} else if strings.Contains(combined, "movie") || strings.Contains(combined, "music") || strings.Contains(combined, "entertainment") || strings.Contains(combined, "celebrity") {
			category = "Global Entertainment"
			severity = 1
		}

		shortSummary := req.Description
		if len(shortSummary) > 150 {
			shortSummary = shortSummary[:147] + "..."
		}

		writeJSON(w, http.StatusOK, EnrichNewsResponse{
			Lat:               lat,
			Lng:               lng,
			Category:          category,
			Severity:          severity,
			ShortSummary:      shortSummary,
			ExactLocationName: locName,
		})
	}

	if apiKey == "" {
		executeFallback("GEMINI_API_KEY environment variable is not configured")
		return
	}

	prompt := fmt.Sprintf(`You are a GIS intelligence analyst. Read the following news dispatch. Extract the exact location (city, region, or country) where the event is taking place. Categorize the event (Conflict, Protest, Natural Disaster, Politics, Global Entertainment, Economy). Assign a severity level from 1 to 5. Provide the GPS coordinates (Latitude, Longitude) of the event's location. Return EXACTLY and ONLY a JSON object using this schema: { "lat": number, "lng": number, "category": string, "severity": number, "short_summary": string, "exact_location_name": string }.

Title: %s
Description: %s`, req.Title, req.Description)

	// Context with strict 15-second timeout
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Prepare Gemini Request
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
		executeFallback(fmt.Sprintf("JSON marshal error: %v", err))
		return
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		executeFallback(fmt.Sprintf("HTTP request creation error: %v", err))
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		executeFallback(fmt.Sprintf("Gemini API call execution error: %v", err))
		return
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(httpResp.Body)
		executeFallback(fmt.Sprintf("Gemini API returned status %d. Details: %s", httpResp.StatusCode, string(respBytes)))
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
		executeFallback(fmt.Sprintf("Gemini response decode error: %v", err))
		return
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		executeFallback("Gemini returned empty parts")
		return
	}

	rawResult := geminiResp.Candidates[0].Content.Parts[0].Text
	cleaned := cleanJSONResponse(rawResult)

	var res EnrichNewsResponse
	if err := json.Unmarshal([]byte(cleaned), &res); err != nil {
		executeFallback(fmt.Sprintf("Error unmarshalling cleaned JSON: %v. Raw text was: %s", err, cleaned))
		return
	}

	// Just in case the LLM swaps latitude/longitude or returns coordinates that are zero
	if res.Lat == 0.0 && res.Lng == 0.0 {
		executeFallback("Gemini returned coordinates [0, 0]")
		return
	}

	writeJSON(w, http.StatusOK, res)
}
