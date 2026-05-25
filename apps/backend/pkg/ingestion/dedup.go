package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"backend/pkg/db"
)

// AssociatedSource represents a source validation report attached to an event
type AssociatedSource struct {
	SourceID         string    `json:"source_id"`
	SourceURL        string    `json:"source_url"`
	Snippet          string    `json:"snippet"`
	CredibilityScore float64   `json:"credibility_score"`
	Timestamp        time.Time `json:"timestamp"`
}

// OsintEvent represents a consolidated/deduplicated intelligence alert
type OsintEvent struct {
	ID                string             `json:"id"`
	Headline          string             `json:"headline"`
	EventCategory     string             `json:"event_category"`
	Severity          string             `json:"severity"`
	Coordinates       [2]float64         `json:"coordinates"` // [lng, lat]
	EventTime         time.Time          `json:"event_time"`
	AssociatedSources []AssociatedSource `json:"associated_sources"`
	RedundancyCount   int                `json:"redundancy_count"`
	IntegrityScore    float64            `json:"integrity_score"`
	SourceTier        int                `json:"source_tier"` // Tier 0, -1, -2
	AuditLog          map[string]any     `json:"audit_log"`
	CreatedAt         time.Time          `json:"created_at"`
}

// CalculateIntegrityScore computes the Bayesian probability of the event being true
// based on multiple independent sources reporting it.
func CalculateIntegrityScore(sources []AssociatedSource, baseTier int) float64 {
	// Base trust by source tier
	// Tier 0 (Satellites, direct sensors): 0.92
	// Tier -1 (Verified state/UN feeds): 0.88
	// Tier -2 (Media wire services): 0.70
	var baseTrust float64
	switch baseTier {
	case 0:
		baseTrust = 0.92
	case -1:
		baseTrust = 0.88
	case -2:
		baseTrust = 0.70
	default:
		baseTrust = 0.50
	}

	if len(sources) == 0 {
		return baseTrust
	}

	// Bayesian fusion: P(True | S1, S2, ...) = Product(p_i) / (Product(p_i) + Product(1 - p_i))
	// To prevent numerical issues under flow, we accumulate using a robust log-odds formula
	var logOddsSum float64
	// Add base tier prior log odds
	logOddsSum += math.Log(baseTrust / (1.0 - baseTrust + 1e-9))

	for _, src := range sources {
		cred := src.CredibilityScore
		if cred <= 0 {
			cred = 0.5 // Neutral prior if credibility score is unrated
		}
		if cred >= 1.0 {
			cred = 0.999 // Cap to prevent divide by zero
		}
		logOddsSum += math.Log(cred / (1.0 - cred))
	}

	// Convert back to probability
	finalProb := 1.0 / (1.0 + math.Exp(-logOddsSum))
	return math.Round(finalProb*100) / 100 // Round to 2 decimal places
}

// UpsertOsintEvent implements the high-integrity spatial-temporal clustering engine.
// Returns the resolved consolidated event ID and whether it clustered with an existing event.
func UpsertOsintEvent(ctx context.Context, input OsintEvent) (string, bool, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return "", false, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Spatial-Temporal Clustering check (4 Criteria):
	// 1. Category Match
	// 2. Geographic Proximity: 50km (ST_DWithin 50000 meters)
	// 3. Temporal Window: ±24 hours
	// 4. Semantic Similarity: pg_trgm similarity(headline, input.Headline) > 0.25 OR basic substring overlap
	var matchedID string
	var currentSourcesJSON []byte
	var currentRedundancy int
	var currentTier int
	var existingHeadline string

	// Since we don't know if pg_trgm is enabled, we'll select all candidates matching criteria 1-3,
	// and apply criteria 4 (Semantic Similarity) in Go to guarantee it works.
	rows, err := tx.Query(ctx, `
		SELECT id, headline, associated_sources, redundancy_count, source_tier
		FROM osint_events
		WHERE event_category = $1
		  AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 50000)
		  AND event_time >= $4::timestamptz - interval '24 hours'
		  AND event_time <= $4::timestamptz + interval '24 hours'
		ORDER BY event_time DESC
		LIMIT 20;
	`, input.EventCategory, input.Coordinates[0], input.Coordinates[1], input.EventTime)

	if err != nil {
		return "", false, fmt.Errorf("failed to query clusters: %w", err)
	}
	defer rows.Close()

	// Semantic similarity helper using basic Jaccard index on words
	isSemanticallySimilar := func(s1, s2 string) bool {
		words1 := strings.Fields(strings.ToLower(s1))
		words2 := strings.Fields(strings.ToLower(s2))
		
		set1 := make(map[string]bool)
		for _, w := range words1 {
			if len(w) > 3 { // skip stop words
				set1[w] = true
			}
		}
		
		intersection := 0
		for _, w := range words2 {
			if len(w) > 3 && set1[w] {
				intersection++
			}
		}
		
		// If they share at least 2 significant words, consider them semantically similar for deduplication
		return intersection >= 2 || strings.Contains(strings.ToLower(s1), strings.ToLower(s2)) || strings.Contains(strings.ToLower(s2), strings.ToLower(s1))
	}

	foundMatch := false
	for rows.Next() {
		if err := rows.Scan(&matchedID, &existingHeadline, &currentSourcesJSON, &currentRedundancy, &currentTier); err != nil {
			continue
		}
		
		// Criterion 4: Semantic Similarity
		if isSemanticallySimilar(input.Headline, existingHeadline) {
			foundMatch = true
			break
		}
	}
	rows.Close()

	// If a matching cluster is found, consolidate the event
	if foundMatch {
		var sources []AssociatedSource
		if len(currentSourcesJSON) > 0 {
			_ = json.Unmarshal(currentSourcesJSON, &sources)
		}

		// Check if this source is already present to prevent duplicate logging
		newSource := AssociatedSource{
			SourceID:         input.ID,
			SourceURL:        "",
			Snippet:          input.Headline,
			CredibilityScore: CalculateBaseCredibility(input.SourceTier),
			Timestamp:        input.EventTime,
		}
		if len(input.AssociatedSources) > 0 {
			newSource = input.AssociatedSources[0]
		}

		duplicate := false
		for _, s := range sources {
			if s.SourceID == newSource.SourceID {
				duplicate = true
				break
			}
		}

		if !duplicate {
			sources = append(sources, newSource)
		}

		// Recalculate integrity score based on the new aggregated sources
		resolvedTier := currentTier
		if input.SourceTier > currentTier { // Tier 0 is "higher priority" numerically than -1, -2, but let's take the min tier index (closest to Tier 0)
			// Wait, Section 1 mentions: Tier 0 satellite/raw telemetry, Tier -1 state-level verified feeds, Tier -2 media wire reports.
			// So lower number means higher tier: 0 > -1 > -2. Let's resolve the tier as the minimum number (Tier 0 / Tier -1).
		}
		if input.SourceTier < resolvedTier {
			resolvedTier = input.SourceTier
		}

		integrity := CalculateIntegrityScore(sources, resolvedTier)
		sourcesJSON, _ := json.Marshal(sources)

		redundancy := currentRedundancy
		if !duplicate {
			redundancy++
		}

		// Update the existing event
		_, err = tx.Exec(ctx, `
			UPDATE osint_events
			SET associated_sources = $1,
				redundancy_count = $2,
				integrity_score = $3,
				source_tier = $4
			WHERE id = $5;
		`, sourcesJSON, redundancy, integrity, resolvedTier, matchedID)

		if err != nil {
			return "", false, fmt.Errorf("failed to update consolidated event: %w", err)
		}

		err = tx.Commit(ctx)
		if err != nil {
			return "", false, fmt.Errorf("failed to commit transaction: %w", err)
		}

		return matchedID, true, nil
	}

	// If no match, insert a new event
	sources := input.AssociatedSources
	if len(sources) == 0 {
		sources = append(sources, AssociatedSource{
			SourceID:         input.ID,
			SourceURL:        "",
			Snippet:          input.Headline,
			CredibilityScore: CalculateBaseCredibility(input.SourceTier),
			Timestamp:        input.EventTime,
		}...)
	}

	integrity := CalculateIntegrityScore(sources, input.SourceTier)
	sourcesJSON, _ := json.Marshal(sources)

	auditLog := input.AuditLog
	if auditLog == nil {
		auditLog = make(map[string]any)
	}
	auditLog["origin_timestamp"] = input.EventTime.Format(time.RFC3339)
	auditLog["ingestion_timestamp"] = time.Now().Format(time.RFC3339)
	auditLog["processing_pipeline"] = "osint_dedup_engine"
	auditJSON, _ := json.Marshal(auditLog)

	_, err = tx.Exec(ctx, `
		INSERT INTO osint_events (
			id, headline, event_category, severity, geom, event_time, 
			associated_sources, redundancy_count, integrity_score, source_tier, audit_log
		) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11, $12)
	`, input.ID, input.Headline, input.EventCategory, input.Severity, input.Coordinates[0], input.Coordinates[1],
		input.EventTime, sourcesJSON, 0, integrity, input.SourceTier, auditJSON)

	if err != nil {
		return "", false, fmt.Errorf("failed to insert new event: %w", err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		return "", false, fmt.Errorf("failed to commit insert transaction: %w", err)
	}

	return input.ID, false, nil
}

// CalculateBaseCredibility yields a starting weight based on source Tier
func CalculateBaseCredibility(tier int) float64 {
	switch tier {
	case 0:
		return 0.90 // Telemetry
	case -1:
		return 0.85 // Official bulletins
	case -2:
		return 0.70 // Public News Wire
	default:
		return 0.50
	}
}
