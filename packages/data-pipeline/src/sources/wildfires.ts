import type { WildfireEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchWildfires(): Promise<WildfireEntity[]> {
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'
	
	try {
		const response = await fetch(`${backendUrl}/environmental/wildfires`)
		if (!response.ok) {
			throw new Error(`Go Backend API returned status ${response.status}`)
		}
		
		const res = await response.json()
		if (!res || !Array.isArray(res.data)) {
			return []
		}
		
		const fields = res.fields || []
		const idxId = fields.indexOf("id")
		const idxLat = fields.indexOf("lat")
		const idxLon = fields.indexOf("lon")
		const idxFrp = fields.indexOf("frp")
		const idxConf = fields.indexOf("confidence")
		
		return res.data.map((row: any[], index: number) => {
			const id = row[idxId] || `sim-fire-${index}`
			const lat = row[idxLat] ?? 0
			const lon = row[idxLon] ?? 0
			const frp = row[idxFrp] ?? 0
			const confidence = row[idxConf] || 'nominal'
			
			return {
				id: id,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.CLIMATE,
				timestamp: res.timestamp * 1000,
				label: `Active Environmental Hotspot [FRP: ${frp.toFixed(1)}]`,
				brightness: 320,
				confidence,
				frp,
				satellite: 'MODIS/VIIRS',
			}
		})
	} catch (err) {
		console.warn("Wildfire telemetry backend unreachable. Standard client-side fallback engaged:", err)
		return []
	}
}
