import type { ReconScanEntity, ReconHop } from '@panopticon/core/types'
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

export async function fetchReconTrace(target: string, lat: number, lon: number): Promise<ReconScanEntity | null> {
	if (shouldBypassFetch()) {
		return getMockReconTrace(target, lat, lon)
	}

	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'
	
	try {
		const response = await fetch(`${backendUrl}/recon/trace?target=${encodeURIComponent(target)}&lat=${lat}&lon=${lon}`)
		if (!response.ok) {
			throw new Error(`Go Backend API returned status ${response.status}`)
		}
		
		const res = await response.json()
		if (!res) {
			return null
		}
		
		const fields = res.fields || []
		const idxHop = fields.indexOf("hop_number")
		const idxIp = fields.indexOf("ip")
		const idxLat = fields.indexOf("lat")
		const idxLon = fields.indexOf("lon")
		const idxPing = fields.indexOf("ping_ms")
		const idxIsp = fields.indexOf("isp")
		
		const hops: ReconHop[] = Array.isArray(res.data) 
			? res.data.map((row: any[]) => ({
					hopNumber: row[idxHop] || 0,
					ip: row[idxIp] || '',
					lat: row[idxLat] ?? 0,
					lon: row[idxLon] ?? 0,
					pingMs: row[idxPing] ?? 0,
					isp: row[idxIsp] || '',
				}))
			: []

		return {
			id: `scan-${target}`,
			coordinates: [lon, lat],
			domain: IntelligenceDomain.CYBER,
			timestamp: res.timestamp * 1000,
			label: `OSINT SCAN: ${target} [IP: ${res.resolvedIp}]`,
			target: res.target || target,
			resolvedIp: res.resolvedIp || '0.0.0.0',
			country: res.country || 'Unknown',
			threatScore: res.threatScore ?? 0,
			openPorts: Array.isArray(res.openPorts) ? res.openPorts : [],
			dnsRecords: res.dnsRecords || {},
			hops,
		}
	} catch (err) {
		console.warn("Recon traceroute backend unreachable. Engaging client-side simulation fallback:", err)
		return getMockReconTrace(target, lat, lon)
	}
}

function getMockReconTrace(target: string, lat: number, lon: number): ReconScanEntity {
	const mockHops: ReconHop[] = [
		{ hopNumber: 1, ip: "192.168.1.1", lat: lat, lon: lon, pingMs: 1.5, isp: "Gateway" },
		{ hopNumber: 2, ip: "10.0.0.1", lat: lat + 0.1, lon: lon - 0.1, pingMs: 8.2, isp: "Local Carrier" },
		{ hopNumber: 3, ip: "82.14.21.90", lat: lat + 2.0, lon: lon - 1.5, pingMs: 22.4, isp: "Transit Node" },
		{ hopNumber: 4, ip: "151.101.0.223", lat: lat - 5.0, lon: lon + 10.0, pingMs: 45.1, isp: "Core Backbone" },
		{ hopNumber: 5, ip: "8.8.8.8", lat: lat + 12.0, lon: lon - 18.0, pingMs: 65.8, isp: "Target ISP" }
	]
	
	return {
		id: `scan-${target}`,
		coordinates: [lon, lat],
		domain: IntelligenceDomain.CYBER,
		timestamp: Date.now(),
		label: `OSINT SCAN: ${target} [RESOLVED: 8.8.8.8]`,
		target: target,
		resolvedIp: "8.8.8.8",
		country: "Global Operational Zone",
		threatScore: 42.5,
		openPorts: [80, 443, 22, 8080],
		dnsRecords: {
			"A": ["8.8.8.8"],
			"MX": ["10 mail.target.dns"],
			"TXT": ["v=spf1 include:_spf.google.com ~all"]
		},
		hops: mockHops
	}
}

