import type { AirQualityEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchAirQuality(): Promise<AirQualityEntity[]> {
	const url = 'https://api.openaq.org/v3/locations?limit=250&radius=10000000'
	
	try {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`OpenAQ API returned status ${response.status}`)
		}
		
		const data = await response.json()
		if (!data || !Array.isArray(data.results)) {
			return []
		}
		
		return data.results.map((item: any) => {
			const id = item.id ? String(item.id) : `aq-${Math.random()}`
			const location = item.name || 'Air Quality Monitoring Station'
			
			const lat = item.coordinates?.latitude
			const lon = item.coordinates?.longitude
			if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
				return null
			}
			
			// Find PM2.5 or standard parameter
			let sensor = item.sensors?.find((s: any) => s.parameter?.name?.toLowerCase() === 'pm25')
			if (!sensor && item.sensors && item.sensors.length > 0) {
				sensor = item.sensors[0]
			}
			
			const parameter = sensor?.parameter?.name || 'pm25'
			const value = sensor?.latest?.value ?? 0
			const unit = sensor?.latest?.unit || 'µg/m³'
			
			return {
				id: `openaq-${id}`,
				coordinates: [lon, lat] as [number, number],
				domain: IntelligenceDomain.CLIMATE,
				timestamp: Date.now(),
				label: `${location} AQI Indicator [${value.toFixed(1)} ${unit}]`,
				location,
				parameter,
				value,
				unit,
			}
		}).filter((item: any): item is AirQualityEntity => item !== null)
		
	} catch (err) {
		console.warn("OpenAQ air quality feed unreachable. Returning empty data:", err)
		return []
	}
}
