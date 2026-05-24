import type { NewsFeedItem, NewsCategory } from '@panopticon/core/stores'
import countryCentroids from '../../../core/src/data/country-centroids.json'

// 26 verified CORS-accessible feeds (Phase 17D)
export const RSS_FEEDS = [
  // Global generalist
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'geopolitical' as NewsCategory, name: 'Reuters World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'geopolitical' as NewsCategory, name: 'Al Jazeera' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'geopolitical' as NewsCategory, name: 'BBC World' },
  { url: 'https://rss.dw.com/xml/rss-en-world', category: 'geopolitical' as NewsCategory, name: 'Deutsche Welle' },
  { url: 'https://www.france24.com/en/rss', category: 'geopolitical' as NewsCategory, name: 'France 24' },
  { url: 'https://feeds.npr.org/1004/rss.xml', category: 'geopolitical' as NewsCategory, name: 'NPR World' },
  
  // Conflict & security specific
  { url: 'https://www.crisisgroup.org/rss.xml', category: 'geopolitical' as NewsCategory, name: 'ICG Crisis Group' },
  { url: 'https://acleddata.com/feed/', category: 'geopolitical' as NewsCategory, name: 'ACLED Blog' },
  { url: 'https://www.bellingcat.com/feed/', category: 'geopolitical' as NewsCategory, name: 'Bellingcat' },
  { url: 'https://theintercept.com/feed/?rss', category: 'geopolitical' as NewsCategory, name: 'The Intercept' },
  
  // Humanitarian
  { url: 'https://reliefweb.int/updates/rss.xml', category: 'geopolitical' as NewsCategory, name: 'ReliefWeb' },
  { url: 'https://www.unhcr.org/rss/news.xml', category: 'geopolitical' as NewsCategory, name: 'UNHCR' },
  { url: 'https://www.icrc.org/en/rss', category: 'geopolitical' as NewsCategory, name: 'ICRC' },
  
  // Cyber
  { url: 'https://feeds.feedburner.com/TheHackersNews', category: 'cyber' as NewsCategory, name: 'The Hacker News' },
  { url: 'https://krebsonsecurity.com/feed/', category: 'cyber' as NewsCategory, name: 'Krebs on Security' },
  { url: 'https://www.cisa.gov/uscert/ncas/alerts.xml', category: 'cyber' as NewsCategory, name: 'CISA Alerts' },
  
  // Maritime
  { url: 'https://www.maritime-executive.com/rss', category: 'maritime' as NewsCategory, name: 'Maritime Executive' },
  { url: 'https://gcaptain.com/feed/', category: 'maritime' as NewsCategory, name: 'gCaptain' },
  
  // Natural hazards
  { url: 'https://volcano.si.edu/news/rss.xml', category: 'hazard' as NewsCategory, name: 'Smithsonian Volcanoes' },
  { url: 'https://www.gdacs.org/xml/rss.xml', category: 'hazard' as NewsCategory, name: 'GDACS Disasters' },
  
  // Drug trafficking / organized crime
  { url: 'https://insightcrime.org/feed/', category: 'geopolitical' as NewsCategory, name: 'InSight Crime' },
  { url: 'https://www.unodc.org/rss/news_en.xml', category: 'geopolitical' as NewsCategory, name: 'UNODC' },
  
  // Regional
  { url: 'https://www.middleeasteye.net/rss', category: 'geopolitical' as NewsCategory, name: 'Middle East Eye' },
  { url: 'https://africanarguments.org/feed/', category: 'geopolitical' as NewsCategory, name: 'African Arguments' },
  { url: 'https://www.scmp.com/rss/91/feed', category: 'geopolitical' as NewsCategory, name: 'SCMP Asia' },
  { url: 'https://latamnews.lat/feed/', category: 'geopolitical' as NewsCategory, name: 'LatAm News' },
]

/**
 * Centroid match helper
 * Loop through our country database and scan for country names/codes in title or summary
 */
function findCountryCentroid(title: string, summary: string): [number, number] | undefined {
  const t = title.toLowerCase()
  const s = summary.toLowerCase()
  
  const entries = Object.entries(countryCentroids) as [string, { name: string; lat: number; lon: number; code3: string }][]
  for (const [_, info] of entries) {
    const cName = info.name.toLowerCase()
    const c3 = info.code3.toLowerCase()
    
    // Check full name matches first (highest accuracy)
    if (t.includes(cName) || s.includes(cName)) {
      return [info.lon, info.lat]
    }
    
    // Check ISO3 code matches as whole words
    const codeRegex = new RegExp(`\\b${c3}\\b`, 'i')
    if (codeRegex.test(title) || codeRegex.test(summary)) {
      return [info.lon, info.lat]
    }
  }
  return undefined
}

/**
 * Fetch and parse a single RSS feed via AllOrigins CORS proxy
 */
async function fetchRssFeed(feed: typeof RSS_FEEDS[0]): Promise<NewsFeedItem[]> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`
  
  try {
    const response = await fetch(proxyUrl)
    if (!response.ok) return []
    
    const json = await response.json()
    const xmlText = json.contents
    if (!xmlText) return []
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'text/xml')
    const items = doc.querySelectorAll('item')
    const parsed: NewsFeedItem[] = []
    
    // Limit to top 8 items per feed to avoid UI clutter
    const topItems = Array.from(items).slice(0, 8)
    
    topItems.forEach((item, idx) => {
      const title = item.querySelector('title')?.textContent || 'Operational Intel Brief'
      const summary = (item.querySelector('description')?.textContent || item.querySelector('encoded')?.textContent || 'OSINT field dispatch logs.').replace(/<[^>]*>/g, '').trim()
      const url = item.querySelector('link')?.textContent || feed.url
      const pubDate = item.querySelector('pubDate')?.textContent || item.querySelector('date')?.textContent || new Date().toISOString()
      
      // Parse geocodes from XML namespaces
      let coordinates: [number, number] | undefined = undefined
      
      // 1. Try georss:point (Format: "lat lon")
      const georssPoint = item.getElementsByTagName('georss:point')[0]?.textContent || item.getElementsByTagNameNS('http://www.georss.org/georss', 'point')[0]?.textContent
      if (georssPoint) {
        const parts = georssPoint.trim().split(/\s+/)
        if (parts.length === 2) {
          const lat = parseFloat(parts[0]!)
          const lon = parseFloat(parts[1]!)
          if (!isNaN(lat) && !isNaN(lon)) {
            coordinates = [lon, lat]
          }
        }
      }
      
      // 2. Try geo:lat / geo:long
      if (!coordinates) {
        const latVal = item.getElementsByTagName('geo:lat')[0]?.textContent || item.getElementsByTagNameNS('http://www.w3.org/2003/01/geo/wgs84_pos#', 'lat')[0]?.textContent
        const lonVal = item.getElementsByTagName('geo:long')[0]?.textContent || item.getElementsByTagNameNS('http://www.w3.org/2003/01/geo/wgs84_pos#', 'long')[0]?.textContent
        if (latVal && lonVal) {
          const lat = parseFloat(latVal)
          const lon = parseFloat(lonVal)
          if (!isNaN(lat) && !isNaN(lon)) {
            coordinates = [lon, lat]
          }
        }
      }
      
      // 3. Fallback: Keyword Centroid Geocoding Matcher
      if (!coordinates) {
        coordinates = findCountryCentroid(title, summary)
      }
      
      // Determine severity based on keyword content
      let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low'
      const threatText = `${title} ${summary}`.toLowerCase()
      if (threatText.includes('kill') || threatText.includes('bomb') || threatText.includes('terror') || threatText.includes('die') || threatText.includes('assassinated')) {
        severity = 'critical'
      } else if (threatText.includes('clash') || threatText.includes('armed') || threatText.includes('strike') || threatText.includes('cyber') || threatText.includes('hijack')) {
        severity = 'high'
      } else if (threatText.includes('alert') || threatText.includes('warn') || threatText.includes('disaster') || threatText.includes('accident')) {
        severity = 'moderate'
      }
      
      parsed.push({
        id: `rss-${feed.name}-${idx}-${Date.now()}`,
        category: feed.category,
        source: feed.name,
        title,
        summary: summary.length > 200 ? `${summary.substring(0, 200)}...` : summary,
        timestamp: new Date(pubDate).toISOString(),
        coordinates,
        url,
        severity,
      })
    })
    
    return parsed
  } catch (e) {
    console.warn(`[RSS ERROR] Failed to fetch feed ${feed.name}:`, e)
    return []
  }
}

/**
 * Crawl all 26 verified RSS feeds in parallel and aggregate them
 */
export async function fetchRssEvents(): Promise<NewsFeedItem[]> {
  const promises = RSS_FEEDS.map((feed) => fetchRssFeed(feed))
  const resultsArray = await Promise.all(promises)
  const merged = resultsArray.flat()
  
  // Sort descending by timestamp
  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  return merged
}
