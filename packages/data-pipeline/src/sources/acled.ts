import type { AcledEventEntity } from '@panopticon/core/types'

/**
 * ACLED API calls are prohibited in client-side applications due to CORS blocks 
 * and Terms of Service restricting API key exposures.
 * The Geopolitical layer relies exclusively on persistent-conflicts.json and real-time GDELT CAMEO monitors.
 */
export async function fetchAcledEvents(): Promise<AcledEventEntity[]> {
	return []
}
