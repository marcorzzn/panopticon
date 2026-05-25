import type { AircraftEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchAircraft(): Promise<AircraftEntity[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

  try {
    const response = await fetch(`${backendUrl}/api/v1/aviation/states`)
    if (!response.ok) {
      throw new Error(`backend aviation stream returned status ${response.status}`)
    }

    const payload = await response.json()
    const rows = Array.isArray(payload?.data) ? payload.data : []

    return rows.map((row: any[]): AircraftEntity | null => {
      const [icao24, callsign, lat, lon, heading, altitude, velocity] = row
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return null
      }

      return {
        id: `opensky-${String(icao24)}`,
        coordinates: [lon, lat],
        domain: IntelligenceDomain.AVIATION,
        timestamp: Number(payload.timestamp || Date.now() / 1000) * 1000,
        label: `${String(callsign || 'UNKNOWN').trim()} [${String(icao24).toUpperCase()}]`,
        callsign: String(callsign || '').trim(),
        originCountry: '',
        baroAltitude: Number(altitude || 0),
        velocity: Number(velocity || 0),
        trueTrack: Number(heading || 0),
        verticalRate: 0,
      }
    }).filter((item: AircraftEntity | null): item is AircraftEntity => item !== null)
  } catch (err) {
    console.warn('Backend aviation stream unavailable. Returning empty data:', err)
    return []
  }
}
