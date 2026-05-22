import { IntelligenceDomain, SourceTier } from '@panopticon/core/types'
import type { DataSourceConfig, SourceHealthState } from '@panopticon/core/types'
import { SourceStatus } from '@panopticon/core/types'

export const DATA_SOURCES: Record<string, DataSourceConfig> = {
  'usgs-earthquakes': {
    id: 'usgs-earthquakes',
    name: 'USGS Real-Time Earthquake Feed',
    tier: SourceTier.GOVERNMENT,
    domain: IntelligenceDomain.CLIMATE,
    baseUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    refreshIntervalMs: 60000, // 60s
    requiresAuth: false,
    authType: 'none',
    format: 'geojson',
    description: 'Provides real-time earthquake monitoring, magnitude levels, depths, and location details globally.',
    attribution: 'U.S. Geological Survey (USGS)',
    phase: 1,
  },
  'open-meteo': {
    id: 'open-meteo',
    name: 'Open-Meteo Global Forecast',
    tier: SourceTier.SPECIALIZED,
    domain: IntelligenceDomain.CLIMATE,
    baseUrl: 'https://api.open-meteo.com/v1/forecast',
    refreshIntervalMs: 300000, // 5 min
    requiresAuth: false,
    authType: 'none',
    format: 'json',
    description: 'High-resolution atmospheric models delivering real-time weather overlay feeds.',
    attribution: 'Open-Meteo',
    phase: 1,
  },
  'noaa-swpc': {
    id: 'noaa-swpc',
    name: 'NOAA Space Weather Prediction',
    tier: SourceTier.GOVERNMENT,
    domain: IntelligenceDomain.SPACE,
    baseUrl: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
    refreshIntervalMs: 120000, // 120s
    requiresAuth: false,
    authType: 'none',
    format: 'json',
    description: 'Real-time planetary K-index, geomagnetic storm alerts, and solar wind measurements.',
    attribution: 'NOAA Space Weather Prediction Center (SWPC)',
    phase: 1,
  },
  'gdelt': {
    id: 'gdelt',
    name: 'GDELT Global Event Registry',
    tier: SourceTier.RESEARCH,
    domain: IntelligenceDomain.GEOPOLITICAL,
    baseUrl: 'https://api.gdeltproject.org/api/v2/geo/geo',
    refreshIntervalMs: 900000, // 15 min
    requiresAuth: false,
    authType: 'none',
    format: 'geojson',
    description: 'Real-time mapping of global events, conflict scale, and social unrest mentions.',
    attribution: 'The GDELT Project',
    phase: 1,
  },
}

/** Helper to generate initial health states for all active sources */
export function getInitialHealthStates(): Record<string, SourceHealthState> {
  const states: Record<string, SourceHealthState> = {}
  Object.keys(DATA_SOURCES).forEach((id) => {
    states[id] = {
      sourceId: id,
      status: SourceStatus.UNKNOWN,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastError: null,
      consecutiveFailures: 0,
      avgResponseMs: 0,
      dataFreshnessMs: 0,
    }
  })
  return states
}
