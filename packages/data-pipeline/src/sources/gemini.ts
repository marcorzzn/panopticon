import type { NewsFeedItem } from '@panopticon/core/stores'

/**
 * 1. Geocode location using Go backend proxy (which queries Gemini 2.0 Flash securely)
 */
export async function geocodeAddressWithGemini(
  address: string,
  _apiKey?: string
): Promise<[longitude: number, latitude: number] | null> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'

  try {
    const response = await fetch(`${backendUrl}/ai/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-12345',
      },
      body: JSON.stringify({ address }),
    })

    if (!response.ok) {
      console.warn('[GEMINI PROXY] Geocoding API response error:', response.statusText)
      return null
    }

    const data = await response.json()
    if (data && Array.isArray(data.coordinates) && data.coordinates.length === 2) {
      return [data.coordinates[0], data.coordinates[1]]
    }
    return null
  } catch (error) {
    console.error('[GEMINI PROXY] Geocoding exception:', error)
    return null
  }
}

/**
 * 2. Classify Category and Severity of a news alert
 * Legacy method kept for structural type compatibility.
 */
export async function categorizeAndRateWithGemini(
  _title: string,
  _summary: string,
  _apiKey?: string
): Promise<{ category: string; severity: 'low' | 'moderate' | 'high' | 'critical' } | null> {
  return null
}

/**
 * 3. Generate Geostrategic Situational Daily intelligence Brief via Go backend proxy
 */
export async function generateDailyBriefWithGemini(
  events: NewsFeedItem[],
  _apiKey?: string
): Promise<string> {
  if (events.length === 0) {
    return 'No active threat events are currently loaded. Cannot compile intelligence brief.'
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api/v1'

  try {
    const response = await fetch(`${backendUrl}/ai/generate-brief`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-jwt-token-12345',
      },
      body: JSON.stringify({ events }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return 'Error generating brief: HTTP 429 Too Many Requests. AI quota rate-limit exceeded.'
      }
      return `Error generating brief: Go Backend returned status ${response.status} (${response.statusText})`
    }

    const data = await response.json()
    return data.brief || data.text || 'No brief could be compiled from the active threat indicators.'
  } catch (error: any) {
    return `Pipeline exception generating intelligence brief: ${error.message || error}`
  }
}

/**
 * 4. Daily Sync Threat Deduplication & Geocoding Logic
 * Transforms raw feeds into 8 distinct intelligence categories, deduplicating
 * overlapping events based on spatial proximity (50km) and temporal windows (12h).
 */
export type ThreatCategory = 'Cyber' | 'Maritime' | 'Space' | 'Aviation' | 'Military' | 'Geopolitical' | 'Energy' | 'Biological'

export interface ProcessedThreatEvent {
  id: string
  category: ThreatCategory
  title: string
  summary: string
  coordinates?: [number, number]
  timestamp: string
  severity: 'low' | 'moderate' | 'high' | 'critical'
  sources: string[]
}

export function deduplicateAndCategorizeThreats(rawEvents: NewsFeedItem[]): ProcessedThreatEvent[] {
  // Sort by timestamp desc
  const sorted = [...rawEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const processed: ProcessedThreatEvent[] = []
  
  // Basic categorization mapping
  const mapCategory = (cat: string, text: string): ThreatCategory => {
    const t = text.toLowerCase()
    if (cat === 'cyber' || t.includes('cyber') || t.includes('ddos') || t.includes('hack')) return 'Cyber'
    if (cat === 'maritime' || t.includes('ship') || t.includes('vessel') || t.includes('sea')) return 'Maritime'
    if (cat === 'space' || t.includes('satellite') || t.includes('orbit')) return 'Space'
    if (cat === 'aviation' || t.includes('aircraft') || t.includes('flight') || t.includes('airspace')) return 'Aviation'
    if (cat === 'energy' || t.includes('oil') || t.includes('grid') || t.includes('pipeline')) return 'Energy'
    if (cat === 'hazard' || t.includes('virus') || t.includes('disease') || t.includes('outbreak')) return 'Biological'
    if (t.includes('military') || t.includes('troops') || t.includes('army')) return 'Military'
    return 'Geopolitical'
  }

  for (const event of sorted) {
    const eventTime = new Date(event.timestamp).getTime()
    const cat = mapCategory(event.category, `${event.title} ${event.summary}`)
    
    // Look for duplicates in already processed events
    let isDuplicate = false
    for (const p of processed) {
      if (p.category !== cat) continue
      const pTime = new Date(p.timestamp).getTime()
      const timeDiff = Math.abs(eventTime - pTime)
      if (timeDiff <= 12 * 3600 * 1000) { // 12h window
        if (event.coordinates && p.coordinates) {
          const [lon1, lat1] = event.coordinates
          const [lon2, lat2] = p.coordinates
          const dist = Math.sqrt(Math.pow(lon1 - lon2, 2) + Math.pow(lat1 - lat2, 2))
          if (dist <= 0.5) { // ~50km
            isDuplicate = true
            if (!p.sources.includes(event.source)) {
              p.sources.push(event.source)
            }
            break
          }
        } else if (!event.coordinates && !p.coordinates) {
          isDuplicate = true
          if (!p.sources.includes(event.source)) {
            p.sources.push(event.source)
          }
          break
        }
      }
    }
    
    if (!isDuplicate) {
      processed.push({
        id: `ai-threat-${event.id}`,
        category: cat,
        title: event.title,
        summary: event.summary,
        coordinates: event.coordinates,
        timestamp: event.timestamp,
        severity: event.severity,
        sources: [event.source]
      })
    }
  }
  
  return processed
}
