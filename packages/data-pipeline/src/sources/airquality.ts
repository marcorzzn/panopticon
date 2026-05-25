import type { AirQualityEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchAirQuality(): Promise<AirQualityEntity[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

  try {
    const response = await fetch(`${backendUrl}/api/v1/environmental/airquality`)
    if (!response.ok) {
      throw new Error(`backend air-quality stream returned status ${response.status}`)
    }

    const payload = await response.json()
    const rows = Array.isArray(payload?.data) ? payload.data : []

    return rows.map((row: any[]): AirQualityEntity | null => {
      const [id, location, lat, lon, parameter, value, unit] = row
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return null
      }

      return {
        id: String(id),
        coordinates: [lon, lat],
        domain: IntelligenceDomain.CLIMATE,
        timestamp: Number(payload.timestamp || Date.now() / 1000) * 1000,
        label: `${location} ${parameter}: ${Number(value || 0).toFixed(1)} ${unit}`,
        location: String(location || ''),
        parameter: String(parameter || ''),
        value: Number(value || 0),
        unit: String(unit || ''),
      }
    }).filter((item: AirQualityEntity | null): item is AirQualityEntity => item !== null)
  } catch (err) {
    console.warn('Backend air-quality stream unavailable. Returning empty data:', err)
    return []
  }
}
