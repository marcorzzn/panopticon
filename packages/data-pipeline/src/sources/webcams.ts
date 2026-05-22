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
		console.warn("Webcams backend unreachable. Standard client-side fallback engaged:", err)
		return []
	}
}
