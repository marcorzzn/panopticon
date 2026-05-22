import type { AircraftEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchAircraft(): Promise<AircraftEntity[]> {
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'
	
	try {
		const response = await fetch(`${backendUrl}/aviation/states`)
		if (!response.ok) {
			throw new Error(`Go Backend API returned status ${response.status}`)
		}
		
		const res = await response.json()
		if (!res || !Array.isArray(res.data)) {
			return []
		}
		
		const fields = res.fields || []
		const idxIcao = fields.indexOf("icao24")
		const idxCallsign = fields.indexOf("callsign")
		const idxLat = fields.indexOf("lat")
		const idxLon = fields.indexOf("lon")
		const idxHeading = fields.indexOf("heading")
		const idxAlt = fields.indexOf("altitude")
		const idxVel = fields.indexOf("velocity")
		
		return res.data.map((row: any[], index: number) => {
			const icao24 = row[idxIcao] || `sim-ac-${index}`
			const callsign = row[idxCallsign] || 'UNKNOWN'
			const lat = row[idxLat] ?? 0
			const lon = row[idxLon] ?? 0
			const heading = row[idxHeading] ?? 0
			const altitude = row[idxAlt] ?? 0
			const velocity = row[idxVel] ?? 0
			
			return {
				id: icao24,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.AVIATION,
				timestamp: res.timestamp * 1000,
				label: `${callsign} [${icao24.toUpperCase()}]`,
				callsign,
				originCountry: 'International',
				baroAltitude: altitude,
				velocity,
				trueTrack: heading,
				verticalRate: 0,
			}
		})
	} catch (err) {
		console.warn("Aviation telemetry backend unreachable. Engaging client-side simulation fallback:", err)
		
		const baseFlights = [
			{ icao24: "a80001", callsign: "UAL241", lat: 37.7749, lon: -122.4194, heading: 270, velocity: 245, altitude: 10600 }, // Pacific outbound
			{ icao24: "a80002", callsign: "DLH430", lat: 48.1351, lon: 11.5820, heading: 90, velocity: 230, altitude: 11300 }, // Europe continental
			{ icao24: "a80003", callsign: "BAW117", lat: 51.5074, lon: -0.1278, heading: 290, velocity: 250, altitude: 9800 }, // Transatlantic west
			{ icao24: "a80004", callsign: "JAL006", lat: 35.6762, lon: 139.6503, heading: 45, velocity: 260, altitude: 12100 }, // Transpacific east
			{ icao24: "a80005", callsign: "QFA012", lat: -33.8688, lon: 151.2093, heading: 180, velocity: 240, altitude: 10900 }, // Southern Ocean
			{ icao24: "a80006", callsign: "UAE201", lat: 25.2048, lon: 55.2708, heading: 320, velocity: 235, altitude: 11600 }, // Middle East inbound
		]
		
		const timeSec = Date.now() / 1000
		
		return baseFlights.map((f) => {
			// Offset coordinates slowly over time to simulate active movement
			const movementSpeed = 0.0001 * f.velocity // arbitrary scaling
			const rad = (f.heading * Math.PI) / 180.0
			const deltaLat = Math.sin(rad) * movementSpeed * (timeSec % 3600)
			const deltaLon = Math.cos(rad) * movementSpeed * (timeSec % 3600)
			
			let lat = f.lat + deltaLat
			let lon = f.lon + deltaLon
			
			// Simple wrapping
			lat = ((lat + 90) % 180) - 90
			lon = ((lon + 180) % 360) - 180
			
			return {
				id: f.icao24,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.AVIATION,
				timestamp: Date.now(),
				label: `${f.callsign} [${f.icao24.toUpperCase()}]`,
				callsign: f.callsign,
				originCountry: 'International',
				baroAltitude: f.altitude,
				velocity: f.velocity,
				trueTrack: f.heading,
				verticalRate: 0,
			}
		})
	}
}
