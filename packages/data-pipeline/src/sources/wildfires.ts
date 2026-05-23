import type { WildfireEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchWildfires(): Promise<WildfireEntity[]> {
	const url = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv'
	
	try {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`NASA FIRMS API returned status ${response.status}`)
		}
		
		const csvText = await response.text()
		if (!csvText || csvText.trim() === '') {
			return []
		}
		
		const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
		if (lines.length < 2) {
			return []
		}
		
		const headers = lines[0]!.split(',')
		const idxLat = headers.indexOf('latitude')
		const idxLon = headers.indexOf('longitude')
		const idxFrp = headers.indexOf('frp')
		const idxConf = headers.indexOf('confidence')
		const idxSat = headers.indexOf('satellite')
		const idxBright = headers.indexOf('brightness')
		const idxDate = headers.indexOf('acq_date')
		const idxTime = headers.indexOf('acq_time')
		
		if (idxLat === -1 || idxLon === -1) {
			throw new Error('CSV missing critical latitude/longitude coordinates')
		}
		
		// Parse up to 300 fires to maintain top UI performance, and sort or slice
		const firesData = lines.slice(1, 301)
		
		return firesData.map((rowText, index) => {
			const cols = rowText.split(',')
			const latVal = cols[idxLat] ?? ''
			const lonVal = cols[idxLon] ?? ''
			const lat = parseFloat(latVal)
			const lon = parseFloat(lonVal)
			
			if (isNaN(lat) || isNaN(lon)) {
				return null
			}
			
			const frpVal = idxFrp !== -1 ? (cols[idxFrp] ?? '') : ''
			const frp = frpVal ? parseFloat(frpVal) : 0.0

			const confidenceVal = idxConf !== -1 ? (cols[idxConf] ?? '') : ''
			const confidence = confidenceVal || 'nominal'

			const satVal = idxSat !== -1 ? (cols[idxSat] ?? '') : ''
			const satellite = satVal || 'MODIS'

			const brightVal = idxBright !== -1 ? (cols[idxBright] ?? '') : ''
			const brightness = brightVal ? parseFloat(brightVal) : 320
			
			let timestamp = Date.now()
			const dateStr = cols[idxDate]
			const timeStr = cols[idxTime]
			if (idxDate !== -1 && idxTime !== -1 && dateStr && timeStr) {
				try {
					// acq_date is YYYY-MM-DD, acq_time is HHMM (UTC)
					const timeVal = timeStr.padStart(4, '0')
					const hh = timeVal.slice(0, 2)
					const mm = timeVal.slice(2, 4)
					timestamp = new Date(`${dateStr}T${hh}:${mm}:00Z`).getTime()
				} catch {
					// fallback to current
				}
			}
			
			return {
				id: `firms-${index}-${lat.toFixed(3)}-${lon.toFixed(3)}`,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.CLIMATE,
				timestamp,
				label: `Active Environmental Hotspot [FRP: ${frp.toFixed(1)}]`,
				brightness,
				confidence: `${confidence}%`,
				frp,
				satellite,
			}
		}).filter((f): f is WildfireEntity => f !== null)
		
	} catch (err) {
		console.warn("NASA FIRMS wildfires feed unreachable. Returning empty data:", err)
		return []
	}
}
