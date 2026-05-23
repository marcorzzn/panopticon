import type { AircraftEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchAircraft(): Promise<AircraftEntity[]> {
	const rawTargetUrl = 'https://opensky-network.org/api/states/all'
	const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawTargetUrl)}`
	
	try {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`OpenSky API proxy returned status ${response.status}`)
		}
		
		const data = await response.json()
		if (!data || !Array.isArray(data.states)) {
			return []
		}
		
		// Map top 300 active flights to maintain high map telemetry performance
		return data.states.slice(0, 300).map((row: any[], index: number) => {
			const icao24 = row[0] ? String(row[0]).trim() : `ac-${index}`
			const callsign = row[1] ? String(row[1]).trim() : 'UNKNOWN'
			const originCountry = row[2] ? String(row[2]).trim() : 'International'
			
			const lon = row[5]
			const lat = row[6]
			if (lon === null || lat === null || isNaN(lon) || isNaN(lat)) {
				return null
			}
			
			const altitude = row[7] !== null ? parseFloat(row[7]) : 0
			const velocity = row[9] !== null ? parseFloat(row[9]) : 0
			const heading = row[10] !== null ? parseFloat(row[10]) : 0
			const verticalRate = row[11] !== null ? parseFloat(row[11]) : 0
			
			return {
				id: `opensky-${icao24}`,
				coordinates: [lon, lat] as [number, number],
				domain: IntelligenceDomain.AVIATION,
				timestamp: Date.now(),
				label: `${callsign} [${icao24.toUpperCase()}]`,
				callsign,
				originCountry,
				baroAltitude: altitude,
				velocity,
				trueTrack: heading,
				verticalRate,
			}
		}).filter((f: any): f is AircraftEntity => f !== null)
		
	} catch (err) {
		console.warn("OpenSky aviation feed unreachable. Returning empty data:", err)
		return []
	}
}
