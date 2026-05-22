import type { AirQualityEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchAirQuality(): Promise<AirQualityEntity[]> {
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
		console.warn("Air Quality telemetry backend unreachable. Standard client-side fallback engaged:", err)
		return []
	}
}
