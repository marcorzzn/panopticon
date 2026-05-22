import type { AcledEventEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'

export async function fetchAcledEvents(): Promise<AcledEventEntity[]> {
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'
	
	try {
		const response = await fetch(`${backendUrl}/geopolitical/acled`)
		if (!response.ok) {
			throw new Error(`Go Backend API returned status ${response.status}`)
		}
		
		const res = await response.json()
		if (!res || !Array.isArray(res.data)) {
			return []
		}
		
		const fields = res.fields || []
		const idxId = fields.indexOf("id")
		const idxEventType = fields.indexOf("event_type")
		const idxActor1 = fields.indexOf("actor1")
		const idxActor2 = fields.indexOf("actor2")
		const idxLat = fields.indexOf("lat")
		const idxLon = fields.indexOf("lon")
		const idxFatalities = fields.indexOf("fatalities")
		const idxNotes = fields.indexOf("notes")
		const idxEventDate = fields.indexOf("event_date")
		
		return res.data.map((row: any[], index: number) => {
			const id = row[idxId] || `sim-acled-${index}`
			const eventType = row[idxEventType] || 'Conflict Event'
			const actor1 = row[idxActor1] || 'Unknown Group'
			const actor2 = row[idxActor2] || ''
			const lat = row[idxLat] ?? 0
			const lon = row[idxLon] ?? 0
			const fatalities = row[idxFatalities] ?? 0
			const notes = row[idxNotes] || 'Geopolitical incident registered.'
			const eventDateSec = row[idxEventDate] || (Date.now() / 1000)
			
			const label = `${eventType} (${actor1}${actor2 ? ' vs ' + actor2 : ''}) - Fatalities: ${fatalities}`
			
			return {
				id,
				coordinates: [lon, lat],
				domain: IntelligenceDomain.GEOPOLITICAL,
				timestamp: eventDateSec * 1000,
				label,
				eventType,
				subEventType: eventType,
				actor1,
				actor2,
				country: 'Regional',
				location: 'Operational Area',
				fatalities,
				notes,
				source: 'ACLED',
			}
		})
	} catch (err) {
		console.warn("ACLED geopolitical events backend unreachable. Engaging client-side simulation fallback:", err)
		
		const baseConflicts = [
			{ id: "c-1", type: "Explosions/Remote violence", actor1: "Military Forces of Russia", actor2: "Military Forces of Ukraine", lat: 48.3794, lon: 38.0803, fatalities: 8, notes: "Artillery exchange registered in the eastern frontline." },
			{ id: "c-2", type: "Battles", actor1: "Houthi Reformists", actor2: "Naval Forces of the US", lat: 15.0000, lon: 42.5000, fatalities: 2, notes: "Drone intercept confirmed in the southern Red Sea transit corridor." },
			{ id: "c-3", type: "Protests", actor1: "Civilians (Taiwan)", actor2: "", lat: 25.0330, lon: 121.5654, fatalities: 0, notes: "Demonstration regarding maritime security updates in Taipei." },
			{ id: "c-4", type: "Strategic developments", actor1: "Military Forces of South Korea", actor2: "Military Forces of North Korea", lat: 37.8920, lon: 126.7050, fatalities: 0, notes: "Border telemetry surveillance radar units activated near DMZ." },
			{ id: "c-5", type: "Battles", actor1: "Drug Cartel", actor2: "State Police (Mexico)", lat: 19.4326, lon: -99.1332, fatalities: 5, notes: "Armed encounter during tactical checkpoint operation." }
		]
		
		return baseConflicts.map((c) => {
			const label = `${c.type} (${c.actor1}${c.actor2 ? ' vs ' + c.actor2 : ''}) - Fatalities: ${c.fatalities}`
			return {
				id: c.id,
				coordinates: [c.lon, c.lat],
				domain: IntelligenceDomain.GEOPOLITICAL,
				timestamp: Date.now(),
				label,
				eventType: c.type,
				subEventType: c.type,
				actor1: c.actor1,
				actor2: c.actor2,
				country: 'Operational Area',
				location: 'Hotspot Zone',
				fatalities: c.fatalities,
				notes: c.notes,
				source: 'ACLED (Static Sim)',
			}
		})
	}
}
