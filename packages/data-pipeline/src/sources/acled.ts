import type { AcledEventEntity } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'
import { fetchRssFeed } from './news'

export async function fetchAcledEvents(): Promise<AcledEventEntity[]> {
	try {
		const items = await fetchRssFeed({ url: 'https://acleddata.com/feed/', category: 'geopolitical', name: 'ACLED' })
		return items.map((item, idx) => ({
			id: `acled-${idx}`,
			coordinates: item.coordinates || [0, 0],
			domain: IntelligenceDomain.GEOPOLITICAL,
			timestamp: new Date(item.timestamp).getTime(),
			label: item.title,
			eventType: 'Armed Conflict',
			subEventType: 'Clash',
			actor1: 'Unknown',
			actor2: 'Unknown',
			country: 'Global',
			location: 'Unknown',
			fatalities: 0,
			notes: item.summary,
			source: 'ACLED',
			url: item.url,
		}))
	} catch (e) {
		console.warn('Failed to fetch ACLED', e)
		return []
	}
}
