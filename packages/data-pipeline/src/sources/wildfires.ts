import type { WildfireEntity } from '@panopticon/core/types'
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

export async function fetchWildfires(): Promise<WildfireEntity[]> {
	if (shouldBypassFetch()) {
		return getMockWildfires()
	}

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
		console.warn("Wildfire telemetry backend unreachable. Engaging client-side simulation fallback:", err)
		return getMockWildfires()
	}
}

function getMockWildfires(): WildfireEntity[] {
	const wildfiresSim = [
		{ id: "wf-1", lat: 37.7749, lon: -119.5332, frp: 180.5, conf: "high", name: "Yosemite Border Fire" }, // Yosemite/California
		{ id: "wf-2", lat: -3.4653, lon: -62.2159, frp: 340.2, conf: "high", name: "Amazon Rainforest Basin Fire" }, // Amazon
		{ id: "wf-3", lat: -33.8688, lon: 151.2093, frp: 95.4, conf: "nominal", name: "New South Wales Scrub Fire" }, // Sydney/Australia
		{ id: "wf-4", lat: 40.7128, lon: 14.2681, frp: 120.1, conf: "nominal", name: "Vesuvius Slope Hotspot" }, // Italy
		{ id: "wf-5", lat: 34.0522, lon: -118.2437, frp: 210.8, conf: "high", name: "LA Canyon Wildfire" }, // LA California
	]
	
	return wildfiresSim.map((w) => ({
		id: w.id,
		coordinates: [w.lon, w.lat],
		domain: IntelligenceDomain.CLIMATE,
		timestamp: Date.now(),
		label: `${w.name} [FRP: ${w.frp.toFixed(1)}]`,
		brightness: 320,
		confidence: w.conf,
		frp: w.frp,
		satellite: 'MODIS/VIIRS',
	}))
}

