import type { GeoEntity, SeverityLevel } from './geo'

export type EventCategory = 
  | 'armed-conflict'
  | 'protest-unrest'
  | 'crime-organized'
  | 'drug-trafficking'
  | 'terrorism'
  | 'maritime-incident'
  | 'aviation-incident'
  | 'earthquake'
  | 'wildfire'
  | 'extreme-weather'
  | 'air-quality'
  | 'cyber-attack'
  | 'infrastructure'
  | 'humanitarian-crisis'
  | 'political-event'
  | 'economic-event'
  | 'space-event'
  | 'news-event';

export interface PanopticonEvent extends GeoEntity {
  source: string;                // e.g. "GDELT", "USGS", "NASA_FIRMS"
  sourceUrl: string;             // Direct URL to the original record — MANDATORY
  sourceDisplayName: string;     // Human-readable: "GDELT Project"
  
  lat: number;                   // Precise decimal degrees — from source data, never generated
  lon: number;                   // Precise decimal degrees — from source data, never generated
  locationName: string;          // e.g. "Kharkiv, Ukraine"
  
  title: string;                 // Headline or event name
  description: string;           // 1-3 sentence summary — from source, not invented
  category: EventCategory;       
  severity: SeverityLevel;
  
  publishedAt: string;           // ISO 8601 timestamp from source
  fetchedAt: string;             // ISO 8601 timestamp when we retrieved it
  expiresAt: string;             // ISO 8601 — when to remove this marker (see lifecycle rules)
  
  isPersistent: boolean;         // true = long-term event, false = time-bounded
  persistentGroupId?: string;    // links to a parent PersistentConflict if applicable
  
  additionalSources?: string[];  // Optional: 1-3 more corroborating source URLs
  tags?: string[];               // e.g. ["armed-conflict", "civilian-casualties"]
}

export interface PersistentConflict {
  id: string;
  name: string;                  // e.g. "Russo-Ukrainian War"
  sourceUrl: string;             // Primary reference URL
  lat: number;
  lon: number;
  startDate: string;             // ISO 8601
  lastUpdated: string;           // ISO 8601
  description: string;
  category: 'armed-conflict' | 'crime-organized' | 'drug-trafficking';
  intensity: 'HIGH' | 'MEDIUM' | 'LOW';
  childEventIds: string[];       // IDs of time-bounded events under this conflict
}
