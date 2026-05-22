import type { SatelliteEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchSatellites(): Promise<SatelliteEntity[]> {
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'
	
	try {
		const response = await fetch(`${backendUrl}/space/satellites`)
		if (!response.ok) {
			throw new Error(`Go Backend API returned status ${response.status}`)
		}
		
		const res = await response.json()
		if (!res || !Array.isArray(res.data)) {
			return []
		}
		
		const fields = res.fields || []
		const idxId = fields.indexOf("id")
		const idxName = fields.indexOf("name")
		const idxNoradId = fields.indexOf("noradId")
		const idxSatelliteType = fields.indexOf("satelliteType")
		const idxLat = fields.indexOf("lat")
		const idxLon = fields.indexOf("lon")
		const idxAltitudeKm = fields.indexOf("altitudeKm")
		const idxInclination = fields.indexOf("inclination")
		const idxVelocityKms = fields.indexOf("velocityKms")
		const idxTleLine1 = fields.indexOf("tleLine1")
		const idxTleLine2 = fields.indexOf("tleLine2")
		
		return res.data.map((row: any[], index: number) => {
			const id = row[idxId] || `sat-${index}`
			const name = row[idxName] || 'Active Satellite Tracker'
			const noradId = row[idxNoradId] ?? 0
			const satelliteType = row[idxSatelliteType] || 'telecom'
			const lat = row[idxLat] ?? 0
			const lon = row[idxLon] ?? 0
			const altitudeKm = row[idxAltitudeKm] ?? 0
			const inclination = row[idxInclination] ?? 0
			const velocityKms = row[idxVelocityKms] ?? 0
			const tleLine1 = row[idxTleLine1] || ''
			const tleLine2 = row[idxTleLine2] || ''
			
			return {
				id,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.SPACE,
				timestamp: Date.now(),
				label: `${name} [NORAD #${noradId}]`,
				noradId,
				satelliteType,
				altitudeKm,
				inclination,
				velocityKms,
				tleLine1,
				tleLine2,
			}
		})
	} catch (err) {
		console.warn("Space satellites backend unreachable. Standard client-side fallback engaged:", err)
		return []
	}
}
