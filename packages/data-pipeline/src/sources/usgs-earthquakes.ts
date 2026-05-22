import type { EarthquakeEntity, SeverityLevel } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

function getSeverity(magnitude: number): SeverityLevel {
  if (magnitude >= 7.0) return 'critical' as SeverityLevel
  if (magnitude >= 6.0) return 'high' as SeverityLevel
  if (magnitude >= 4.5) return 'moderate' as SeverityLevel
  if (magnitude >= 3.0) return 'low' as SeverityLevel
  return 'info' as SeverityLevel
}

export async function fetchEarthquakes(): Promise<EarthquakeEntity[]> {
  const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`USGS Earthquakes API returned status ${response.status}`)
  }
  const data = await response.json()

  if (!data || !Array.isArray(data.features)) {
    throw new Error('USGS Earthquakes API returned invalid geojson structure')
  }

  return data.features.map((feature: any) => {
    const props = feature.properties || {}
    const geom = feature.geometry || {}
    const coords = geom.coordinates || [0, 0, 0]

    // GeoJSON coordinate order: [longitude, latitude, depth]
    const longitude = coords[0] ?? 0
    const latitude = coords[1] ?? 0
    const depth = coords[2] ?? 0 // depth in km

    const magnitude = props.mag ?? 0
    const place = props.place ?? 'Unknown Location'
    const timestamp = props.time ?? Date.now()
    const tsunamiAlert = props.tsunami === 1
    const felt = props.felt ?? null
    const detailUrl = props.url ?? ''

    return {
      id: feature.id || `eq-${timestamp}-${longitude}-${latitude}`,
      coordinates: [longitude, latitude],
      domain: IntelligenceDomain.CLIMATE,
      timestamp,
      label: `M ${magnitude.toFixed(1)} - ${place}`,
      severity: getSeverity(magnitude),
      magnitude,
      depth,
      place,
      tsunamiAlert,
      felt,
      url: detailUrl,
    }
  })
}
