import type { AirQualityEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

function shouldBypassFetch(): boolean {
	if (typeof window === 'undefined') return false
	const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
	
	// If we are on a remote deployment (e.g. GitHub Pages) and don't have a secure production backend configured,
	// we bypass fetch and immediately trigger the client-side simulation.
	if (!isLocal) {
		if (!backendUrl || !backendUrl.startsWith('https://')) {
			return true
		}
	}
	return false
}

export async function fetchAirQuality(): Promise<AirQualityEntity[]> {
	if (shouldBypassFetch()) {
		return getMockAirQuality()
	}

	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'
	
	try {
		const response = await fetch(`${backendUrl}/environmental/airquality`)
		if (!response.ok) {
			throw new Error(`Go Backend API returned status ${response.status}`)
		}
		
		const res = await response.json()
		if (!res || !Array.isArray(res.data)) {
			return []
		}
		
		const fields = res.fields || []
		const idxId = fields.indexOf("id")
		const idxLocation = fields.indexOf("location")
		const idxLat = fields.indexOf("lat")
		const idxLon = fields.indexOf("lon")
		const idxParameter = fields.indexOf("parameter")
		const idxValue = fields.indexOf("value")
		const idxUnit = fields.indexOf("unit")
		
		return res.data.map((row: any[], index: number) => {
			const id = row[idxId] || `sim-aq-${index}`
			const location = row[idxLocation] || 'Monitoring Station'
			const lat = row[idxLat] ?? 0
			const lon = row[idxLon] ?? 0
			const parameter = row[idxParameter] || 'pm25'
			const value = row[idxValue] ?? 0
			const unit = row[idxUnit] || 'µg/m³'
			
			return {
				id,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.CLIMATE,
				timestamp: res.timestamp * 1000,
				label: `${location} AQI Indicator [${value.toFixed(1)} ${unit}]`,
				location,
				parameter,
				value,
				unit,
			}
		})
	} catch (err) {
		console.warn("Air Quality telemetry backend unreachable. Engaging client-side simulation fallback:", err)
		return getMockAirQuality()
	}
}

function getMockAirQuality(): AirQualityEntity[] {
	const baseAirQuality = [
		{ id: "aq-1", location: "Beijing Central Monitoring", lat: 39.9042, lon: 116.4074, parameter: "pm25", value: 145.2, unit: "µg/m³" },
		{ id: "aq-2", location: "Tokyo Shinjuku Stn", lat: 35.6895, lon: 139.6917, parameter: "pm25", value: 24.8, unit: "µg/m³" },
		{ id: "aq-3", location: "Los Angeles Basin Sensor", lat: 34.0522, lon: -118.2437, parameter: "pm25", value: 58.1, unit: "µg/m³" },
		{ id: "aq-4", location: "London Westminster Station", lat: 51.5074, lon: -0.1278, parameter: "pm25", value: 32.4, unit: "µg/m³" },
		{ id: "aq-5", location: "Milan Duomo Node", lat: 45.4642, lon: 9.1900, parameter: "pm25", value: 72.5, unit: "µg/m³" }
	]
	
	return baseAirQuality.map((aq) => ({
		id: aq.id,
		coordinates: [aq.lon, aq.lat],
		domain: IntelligenceDomain.CLIMATE,
		timestamp: Date.now(),
		label: `${aq.location} AQI Indicator [${aq.value.toFixed(1)} ${aq.unit}]`,
		location: aq.location,
		parameter: aq.parameter,
		value: aq.value,
		unit: aq.unit,
	}))
}

