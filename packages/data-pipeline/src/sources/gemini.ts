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
