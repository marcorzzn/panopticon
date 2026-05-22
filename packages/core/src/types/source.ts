import type { IntelligenceDomain } from './domain'

// ---------------------------------------------------------------------------
// Source classification
// ---------------------------------------------------------------------------

export enum SourceTier {
  /** Tier 0: Government and intergovernmental organisations */
  GOVERNMENT = 0,
  /** Tier 1: Research institutions and NGOs */
  RESEARCH = 1,
  /** Tier 2: Specialised public APIs */
  SPECIALIZED = 2,
  /** Tier 3: Community-driven and aggregated sources */
  COMMUNITY = 3,
}

export enum SourceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown',
}

// ---------------------------------------------------------------------------
// Source configuration (static, compile-time)
// ---------------------------------------------------------------------------

export interface DataSourceConfig {
  /** Unique source identifier (e.g. "usgs-earthquakes") */
  id: string
  /** Human-readable name */
  name: string
  /** Trust/reliability tier */
  tier: SourceTier
  /** Primary intelligence domain */
  domain: IntelligenceDomain
  /** API base URL */
  baseUrl: string
  /** How often to re-fetch (milliseconds) */
  refreshIntervalMs: number
  /** Whether authentication is required */
  requiresAuth: boolean
  /** Authentication mechanism, if any */
  authType?: 'none' | 'api-key' | 'oauth2' | 'cookie'
  /** Response data format */
  format: 'json' | 'geojson' | 'csv' | 'xml' | 'rss'
  /** Description of what this source provides */
  description: string
  /** Attribution / credit line for the data provider */
  attribution: string
  /** Implementation phase this source belongs to */
  phase: number
}

// ---------------------------------------------------------------------------
// Source health (runtime state — flat primitives only)
// ---------------------------------------------------------------------------

export interface SourceHealthState {
  /** Source this health record belongs to */
  sourceId: string
  /** Current operational status */
  status: SourceStatus
  /** Timestamp of last successful fetch (epoch ms), null if never */
  lastSuccessAt: number | null
  /** Timestamp of last error (epoch ms), null if never */
  lastErrorAt: number | null
  /** Description of last error, null if none */
  lastError: string | null
  /** How many fetches in a row have failed */
  consecutiveFailures: number
  /** Rolling average response time in milliseconds */
  avgResponseMs: number
  /** Age of the most recent data point in milliseconds */
  dataFreshnessMs: number
}
