import type { WildfireEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchWildfires(): Promise<WildfireEntity[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

  try {
    const response = await fetch(`${backendUrl}/api/v1/environmental/wildfires`)
    if (!response.ok) {
      throw new Error(`backend wildfire stream returned status ${response.status}`)
    }

    const payload = await response.json()
    const rows = Array.isArray(payload?.data) ? payload.data : []

    return rows.map((row: any[]): WildfireEntity | null => {
      const [id, lat, lon, frp, confidence] = row
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return null
      }

      return {
        id: String(id),
        coordinates: [lon, lat],
        domain: IntelligenceDomain.CLIMATE,
        timestamp: Number(payload.timestamp || Date.now() / 1000) * 1000,
        label: `NASA FIRMS wildfire [FRP: ${Number(frp || 0).toFixed(1)}]`,
        brightness: 0,
        confidence: String(confidence || ''),
        frp: Number(frp || 0),
        satellite: 'NASA FIRMS',
      }
    }).filter((item: WildfireEntity | null): item is WildfireEntity => item !== null)
  } catch (err) {
    console.warn('Backend wildfire stream unavailable. Returning empty data:', err)
    return []
  }
}
