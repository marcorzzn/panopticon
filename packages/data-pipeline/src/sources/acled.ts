import type { AcledEventEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchAcledEvents(): Promise<AcledEventEntity[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

  try {
    const response = await fetch(`${backendUrl}/api/v1/geopolitical/acled`)
    if (!response.ok) {
      throw new Error(`backend ACLED stream returned status ${response.status}`)
    }

    const payload = await response.json()
    const rows = Array.isArray(payload?.data) ? payload.data : []

    return rows.map((row: any[]): AcledEventEntity | null => {
      const [id, eventType, actor1, actor2, lat, lon, fatalities, notes, eventDate] = row
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return null
      }

      return {
        id: String(id),
        coordinates: [lon, lat],
        domain: IntelligenceDomain.GEOPOLITICAL,
        timestamp: Number(eventDate || payload.timestamp || Date.now() / 1000) * 1000,
        label: String(eventType || 'ACLED event'),
        eventType: String(eventType || ''),
        subEventType: '',
        actor1: String(actor1 || ''),
        actor2: String(actor2 || ''),
        country: '',
        location: '',
        fatalities: Number(fatalities || 0),
        notes: String(notes || ''),
        source: 'ACLED',
      }
    }).filter((item: AcledEventEntity | null): item is AcledEventEntity => item !== null)
  } catch (err) {
    console.warn('Backend ACLED stream unavailable. Returning empty data:', err)
    return []
  }
}
