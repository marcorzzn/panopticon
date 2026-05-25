package ingestion

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"backend/pkg/db"
)

// AssociatedSource represents a source validation report attached to an event
type AssociatedSource struct {
	SourceID         string    `json:"source_id"`
	SourceName       string    `json:"source_name"`
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
	ParentHubID       string             `json:"parent_hub_id"`
	LifecycleStatus   string             `json:"lifecycle_status"`
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
	var currentParentHubID sql.NullString
	var currentLifecycleStatus sql.NullString
	var currentAuditJSON []byte

	// Since we don't know if pg_trgm is enabled, we'll select all candidates matching criteria 1-3,
	// and apply criteria 4 (Semantic Similarity) in Go to guarantee it works.
	rows, err := tx.Query(ctx, `
		SELECT id, headline, associated_sources, redundancy_count, source_tier, parent_hub_id, lifecycle_status, audit_log
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
		if err := rows.Scan(&matchedID, &existingHeadline, &currentSourcesJSON, &currentRedundancy, &currentTier, &currentParentHubID, &currentLifecycleStatus, &currentAuditJSON); err != nil {
			continue
		}
		
		// Criterion 4: Semantic Similarity
		if isSemanticallySimilar(input.Headline, existingHeadline) {
			foundMatch = true
			break
		}
	}
	rows.Close()

	// If a matching cluster is found, consolidate the event (Data Fusion Subsystem)
	if foundMatch {
		var sources []AssociatedSource
		if len(currentSourcesJSON) > 0 {
			_ = json.Unmarshal(currentSourcesJSON, &sources)
		}

		// Check if this source is already present to prevent duplicate logging
		newSource := AssociatedSource{
			SourceID:         input.ID,
			SourceName:       sourceNameFromAudit(input.AuditLog),
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

		// Parse existing audit log
		var auditLog map[string]any
		if len(currentAuditJSON) > 0 {
			_ = json.Unmarshal(currentAuditJSON, &auditLog)
		}
		if auditLog == nil {
			auditLog = make(map[string]any)
		}

		// Recalculate integrity score based on the new aggregated sources
		resolvedTier := strongerSourceTier(currentTier, input.SourceTier)

		var updateGeom bool
		var resolvedLon, resolvedLat float64
		var resolvedHeadline string = existingHeadline

		// Fusion Rule B: News First (currentTier < 0), API Later (input.SourceTier == 0)
		// Upgrade coordinates to high-precision API coordinates and upgrade title/severity
		if input.SourceTier == 0 && currentTier < 0 {
			updateGeom = true
			resolvedLon = input.Coordinates[0]
			resolvedLat = input.Coordinates[1]
			resolvedHeadline = input.Headline
			resolvedTier = 0
			auditLog["detailed_description"] = "Fused via Deterministic API validation: " + input.Headline
			auditLog["fusion_rule"] = "news_first_api_later"
		}

		// Fusion Rule A: API First (currentTier == 0), News Later (input.SourceTier < 0)
		// Append semantic details to description and compound chronological updates timeline log
		if input.SourceTier < 0 && currentTier == 0 {
			desc, _ := auditLog["detailed_description"].(string)
			if desc != "" {
				desc += "\n\n" + input.Headline
			} else {
				desc = input.Headline
			}
			auditLog["detailed_description"] = desc

			// Compound timeline updates log inside audit_log["updates"]
			var updates []any
			if u, ok := auditLog["updates"].([]any); ok {
				updates = u
			}
			newUpdate := map[string]any{
				"timestamp": input.EventTime.Format(time.RFC3339),
				"text":      input.Headline,
				"source":    newSource.SourceID,
			}
			updates = append(updates, newUpdate)
			auditLog["updates"] = updates
			auditLog["fusion_rule"] = "api_first_news_later"
		}

		integrity := CalculateIntegrityScore(sources, resolvedTier)
		sourcesJSON, _ := json.Marshal(sources)
		auditJSON, _ := json.Marshal(auditLog)

		redundancy := currentRedundancy
		if !duplicate {
			redundancy++
		}

		resolvedParentHubID := currentParentHubID.String
		if input.ParentHubID != "" {
			resolvedParentHubID = input.ParentHubID
		}

		resolvedLifecycleStatus := currentLifecycleStatus.String
		if input.LifecycleStatus != "" {
			resolvedLifecycleStatus = input.LifecycleStatus
		}

		// Update the existing event (Optionally re-syncing PostGIS spatial geometry)
		if updateGeom {
			_, err = tx.Exec(ctx, `
				UPDATE osint_events
				SET headline = $1,
					associated_sources = $2,
					redundancy_count = $3,
					integrity_score = $4,
					source_tier = $5,
					audit_log = $6,
					parent_hub_id = $7,
					lifecycle_status = $8,
					geom = ST_SetSRID(ST_MakePoint($9, $10), 4326)
				WHERE id = $11;
			`, resolvedHeadline, sourcesJSON, redundancy, integrity, resolvedTier, auditJSON,
				sql.NullString{String: resolvedParentHubID, Valid: resolvedParentHubID != ""},
				sql.NullString{String: resolvedLifecycleStatus, Valid: resolvedLifecycleStatus != ""},
				resolvedLon, resolvedLat, matchedID)
		} else {
			_, err = tx.Exec(ctx, `
				UPDATE osint_events
				SET associated_sources = $1,
					redundancy_count = $2,
					integrity_score = $3,
					source_tier = $4,
					audit_log = $5,
					parent_hub_id = $6,
					lifecycle_status = $7
				WHERE id = $8;
			`, sourcesJSON, redundancy, integrity, resolvedTier, auditJSON,
				sql.NullString{String: resolvedParentHubID, Valid: resolvedParentHubID != ""},
				sql.NullString{String: resolvedLifecycleStatus, Valid: resolvedLifecycleStatus != ""},
				matchedID)
		}

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
			SourceName:       sourceNameFromAudit(input.AuditLog),
			SourceURL:        "",
			Snippet:          input.Headline,
			CredibilityScore: CalculateBaseCredibility(input.SourceTier),
			Timestamp:        input.EventTime,
		})
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
	
	// Set default lifecycle status to concluded for instant event types if ended
	if input.LifecycleStatus != "" {
		auditLog["lifecycle_status"] = input.LifecycleStatus
	}
	
	auditJSON, _ := json.Marshal(auditLog)

	parentHubVal := sql.NullString{String: input.ParentHubID, Valid: input.ParentHubID != ""}
	lifecycleVal := sql.NullString{String: input.LifecycleStatus, Valid: input.LifecycleStatus != ""}

	_, err = tx.Exec(ctx, `
		INSERT INTO osint_events (
			id, headline, event_category, severity, geom, event_time, 
			associated_sources, redundancy_count, integrity_score, source_tier, audit_log, parent_hub_id, lifecycle_status
		) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11, $12, $13, $14)
	`, input.ID, input.Headline, input.EventCategory, input.Severity, input.Coordinates[0], input.Coordinates[1],
		input.EventTime, sourcesJSON, 0, integrity, input.SourceTier, auditJSON, parentHubVal, lifecycleVal)

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

func sourceNameFromAudit(auditLog map[string]any) string {
	if auditLog == nil {
		return ""
	}
	if name, ok := auditLog["wire_publisher"].(string); ok {
		return name
	}
	return ""
}

func strongerSourceTier(current, incoming int) int {
	rank := func(tier int) int {
		switch tier {
		case 0:
			return 3
		case -1:
			return 2
		case -2:
			return 1
		default:
			return 0
		}
	}
	if rank(incoming) > rank(current) {
		return incoming
	}
	return current
}

// PerformDailyMaintenanceSweep runs the deep 24-hour database maintenance tasks
func PerformDailyMaintenanceSweep(ctx context.Context) error {
	log.Println("[MAINTENANCE] Initiating deep database maintenance sweep...")

	// 1. Drop dead ephemeral instant entries that have transitioned to 'concluded' or are ended
	resPurged, err := db.Pool.Exec(ctx, `
		DELETE FROM osint_events
		WHERE (lifecycle_status = 'concluded' OR (audit_log->>'is_ended')::boolean = true)
		  AND event_time < NOW() - interval '24 hours';
	`)
	if err != nil {
		log.Printf("[MAINTENANCE ERROR] Failed to purge dead ephemeral entries: %v", err)
	} else {
		log.Printf("[MAINTENANCE] Ephemeral sweep complete: purged %d dead entries", resPurged.RowsAffected())
	}

	// 2. Query persistent continuous events to compile chronological logs
	rows, err := db.Pool.Query(ctx, `
		SELECT id, associated_sources, audit_log, source_tier
		FROM osint_events
		WHERE lifecycle_status = 'active' OR audit_log->>'event_type' = 'persistent';
	`)
	if err != nil {
		return fmt.Errorf("failed to query persistent events for chronology: %w", err)
	}
	defer rows.Close()

	type sweepItem struct {
		id       string
		sources  []AssociatedSource
		auditLog map[string]any
		tier     int
	}
	var items []sweepItem

	for rows.Next() {
		var id string
		var sourcesJSON []byte
		var auditJSON []byte
		var tier int
		if err := rows.Scan(&id, &sourcesJSON, &auditJSON, &tier); err != nil {
			continue
		}
		var sources []AssociatedSource
		if len(sourcesJSON) > 0 {
			_ = json.Unmarshal(sourcesJSON, &sources)
		}
		var auditLog map[string]any
		if len(auditJSON) > 0 {
			_ = json.Unmarshal(auditJSON, &auditLog)
		}
		if auditLog == nil {
			auditLog = make(map[string]any)
		}
		items = append(items, sweepItem{id: id, sources: sources, auditLog: auditLog, tier: tier})
	}
	rows.Close()

	for _, item := range items {
		// Compile chronological updates log
		// Map sources into compiled audit_log updates if not already done
		var updates []any
		for _, src := range item.sources {
			newUpdate := map[string]any{
				"timestamp": src.Timestamp.Format(time.RFC3339),
				"text":      "Intel update: " + src.Snippet,
				"source":    src.SourceID,
			}
			updates = append(updates, newUpdate)
		}
		item.auditLog["updates"] = updates

		// 3. Update Bayesian source integrity score
		newIntegrity := CalculateIntegrityScore(item.sources, item.tier)

		auditJSON, _ := json.Marshal(item.auditLog)
		_, err = db.Pool.Exec(ctx, `
			UPDATE osint_events
			SET audit_log = $1,
				integrity_score = $2
			WHERE id = $3;
		`, auditJSON, newIntegrity, item.id)
		if err != nil {
			log.Printf("[MAINTENANCE ERROR] Failed to update persistent log for %s: %v", item.id, err)
		}
	}

	// 4. Re-allocate long-term conflict statuses
	// If a conflict hub has seen zero active tactical spokes/events in 30 days, we mark it as concluded
	resConflict, err := db.Pool.Exec(ctx, `
		UPDATE osint_events
		SET lifecycle_status = 'concluded'
		WHERE lifecycle_status = 'active'
		  AND id NOT IN (
			  SELECT DISTINCT parent_hub_id 
			  FROM osint_events 
			  WHERE parent_hub_id IS NOT NULL 
			    AND event_time >= NOW() - interval '30 days'
		  )
		  AND event_time < NOW() - interval '30 days';
	`)
	if err != nil {
		log.Printf("[MAINTENANCE ERROR] Failed to re-allocate conflict statuses: %v", err)
	} else {
		log.Printf("[MAINTENANCE] Long-term conflict re-allocation: resolved %d inactive conflicts", resConflict.RowsAffected())
	}

	log.Println("[MAINTENANCE] Deep database sweep completed successfully.")
	return nil
}
