import type { WebcamEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchWebcams(): Promise<WebcamEntity[]> {
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'
	
	try {
		const response = await fetch(`${backendUrl}/webcams`)
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
		const idxLat = fields.indexOf("lat")
		const idxLon = fields.indexOf("lon")
		const idxStreamUrl = fields.indexOf("streamUrl")
		const idxStatus = fields.indexOf("status")
		
		return res.data.map((row: any[], index: number) => {
			const id = row[idxId] || `cam-${index}`
			const name = row[idxName] || 'Global CCTV feed'
			const lat = row[idxLat] ?? 0
			const lon = row[idxLon] ?? 0
			const streamUrl = row[idxStreamUrl] || ''
			const status = row[idxStatus] || 'healthy'
			
			return {
				id,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.GEOPOLITICAL,
				timestamp: Date.now(),
				label: `CCTV: ${name} [${status.toUpperCase()}]`,
				streamUrl,
				status,
			}
		})
	} catch (err) {
		console.warn("Webcams backend unreachable. Engaging client-side simulation fallback:", err)
		
		const baseWebcams = [
			{ id: "cam-1", name: "New York - Times Square Central", lat: 40.7580, lon: -73.9855, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1173873454.jpg" },
			{ id: "cam-2", name: "Tokyo - Shibuya Crossing Feed", lat: 35.6596, lon: 139.7018, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1301984218.jpg" },
			{ id: "cam-3", name: "London - Piccadilly Circus Surveillance", lat: 51.5101, lon: -0.1349, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1402849021.jpg" },
			{ id: "cam-4", name: "Venice - Rialto Bridge Live Stream", lat: 45.4380, lon: 12.3359, status: "healthy" as const, streamUrl: "https://images.webcams.travel/preview/1502948209.jpg" },
			{ id: "cam-5", name: "Rome - Colosseum Security Camera", lat: 41.8902, lon: 12.4922, status: "degraded" as const, streamUrl: "https://images.webcams.travel/preview/1209348291.jpg" }
		]
		
		return baseWebcams.map((cam) => ({
			id: cam.id,
			coordinates: [cam.lon, cam.lat],
			domain: IntelligenceDomain.GEOPOLITICAL,
			timestamp: Date.now(),
			label: `CCTV: ${cam.name} [${cam.status.toUpperCase()}]`,
			streamUrl: cam.streamUrl,
			status: cam.status,
		}))
	}
}
