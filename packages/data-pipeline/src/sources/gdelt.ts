import type { GdeltEvent, SeverityLevel } from '@panopticon/core/types'
import { IntelligenceDomain } from '@panopticon/core/types'
import { geocodeAddressWithGemini } from './gemini'

function getSeverityFromGoldstein(goldstein: number): SeverityLevel {
  if (goldstein <= -7.0) return 'critical' as SeverityLevel
  if (goldstein <= -4.0) return 'high' as SeverityLevel
  if (goldstein <= 0.0) return 'moderate' as SeverityLevel
  if (goldstein <= 4.0) return 'low' as SeverityLevel
  return 'info' as SeverityLevel
}
export async function fetchGdeltEvents(query: string = 'protest'): Promise<GdeltEvent[]> {
  const targetUrl = `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&maxrecords=250&mode=pointdata&timespan=LAST24H&format=json`
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  
  // Retrieve the client-side Gemini key from localStorage if available
  let geminiKey = ''
  if (typeof window !== 'undefined') {
    try {
      const persisted = localStorage.getItem('panopticon-custom-keys')
      if (persisted) {
        const parsed = JSON.parse(persisted)
        if (parsed.geminiKey) geminiKey = parsed.geminiKey
      }
    } catch (e) {}
  }

  try {
    const response = await fetch(proxyUrl)
    if (!response.ok) {
      throw new Error(`GDELT API proxy returned status ${response.status}`)
    }
    const data = await response.json()
    if (!data || !Array.isArray(data.features)) {
      throw new Error('GDELT API returned invalid structure')
    }

    const features = data.features
    const results: GdeltEvent[] = []
    let fallbackCount = 0

    for (let index = 0; index < features.length; index++) {
      const feature = features[index]
      const props = feature.properties || {}
      const geom = feature.geometry || {}
      const coords = geom.coordinates || [0, 0]

      let longitude = coords[0] ?? 0
      let latitude = coords[1] ?? 0

      const name = props.name || 'Global Event'
      
      // Hook Gemini geocoding fallback for un-geocoded nodes (coords at [0,0])
      if (longitude === 0 && latitude === 0 && name && name !== 'Global Event' && geminiKey && fallbackCount < 5) {
        try {
          console.log(`[GEMINI] Attempting geocoding fallback for: "${name}"`)
          const resolvedCoords = await geocodeAddressWithGemini(name, geminiKey)
          if (resolvedCoords) {
            longitude = resolvedCoords[0]
            latitude = resolvedCoords[1]
            console.log(`[GEMINI] Successfully geocoded "${name}" to [${longitude}, ${latitude}]`)
            fallbackCount++
          }
        } catch (e) {
          console.warn('[GEMINI] Geocoding fallback exception:', e)
        }
      }

      const html = props.html || ''
      let sourceUrl = ''
      const hrefMatch = html.match(/href="([^"]+)"/)
      if (hrefMatch && hrefMatch[1]) {
        sourceUrl = hrefMatch[1]
      }

      const goldsteinScale = props.goldstein !== undefined ? parseFloat(props.goldstein) : (props.tone ? parseFloat(props.tone) / 2 : 0)
      const avgTone = props.tone ? parseFloat(props.tone) : 0
      const numMentions = props.count ? parseInt(props.count) : 1
      const eventCode = props.cameo || '010'
      const actor1 = props.actor1 || 'Unknown Actor'
      const actor2 = props.actor2 || 'Unknown Target'

      results.push({
        id: feature.id || `gdelt-${index}-${latitude}-${longitude}`,
        coordinates: [longitude, latitude] as [number, number],
        domain: IntelligenceDomain.GEOPOLITICAL,
        timestamp: Date.now() - index * 60000,
        label: name.replace(/<[^>]*>/g, ''),
        severity: getSeverityFromGoldstein(goldsteinScale),
        eventCode,
        goldsteinScale,
        numMentions,
        numSources: Math.ceil(numMentions * 0.7),
        numArticles: numMentions,
        avgTone,
        sourceUrl: sourceUrl || 'https://www.gdeltproject.org',
        actor1,
        actor2,
      })
    }

    return results
  } catch (err) {
    console.warn("GDELT feed unreachable. Returning empty data:", err)
    return []
  }
}
