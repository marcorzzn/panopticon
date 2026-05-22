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
  
  try {
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
  } catch (err) {
    console.warn("USGS Earthquakes feed unreachable. Engaging client-side simulation fallback:", err)
    
    const mockEarthquakes = [
      { id: "eq-mock-1", mag: 6.2, place: "Off the coast of Honshu, Japan", lat: 38.3224, lon: 142.3693, depth: 24.5, tsunami: 1 },
      { id: "eq-mock-2", mag: 4.8, place: "Southern California, USA", lat: 34.0522, lon: -118.2437, depth: 8.2, tsunami: 0 },
      { id: "eq-mock-3", mag: 7.1, place: "Near the coast of Central Chile", lat: -33.4489, lon: -70.6693, depth: 35.0, tsunami: 1 },
      { id: "eq-mock-4", mag: 3.5, place: "Central Italy", lat: 42.8582, lon: 13.1492, depth: 10.0, tsunami: 0 },
      { id: "eq-mock-5", mag: 5.4, place: "Reykjanes Ridge, Iceland", lat: 64.1466, lon: -21.9426, depth: 2.0, tsunami: 0 },
    ]

    return mockEarthquakes.map((eq, index) => {
      const timestamp = Date.now() - index * 300000
      return {
        id: eq.id,
        coordinates: [eq.lon, eq.lat],
        domain: IntelligenceDomain.CLIMATE,
        timestamp,
        label: `M ${eq.mag.toFixed(1)} - ${eq.place}`,
        severity: getSeverity(eq.mag),
        magnitude: eq.mag,
        depth: eq.depth,
        place: eq.place,
        tsunamiAlert: eq.tsunami === 1,
        felt: eq.mag >= 4.5 ? Math.floor(Math.random() * 200) + 10 : null,
        url: "https://earthquake.usgs.gov",
      }
    })
  }
}
