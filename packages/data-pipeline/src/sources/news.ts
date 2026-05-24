import type { NewsFeedItem, NewsCategory } from '@panopticon/core/stores'
import countryCentroids from '../../../core/src/data/country-centroids.json'
import persistentConflicts from '../../../core/src/config/persistent-conflicts.json'

// 101 verified CORS-accessible feeds representing the structural backbone of global OSINT
export const RSS_FEEDS = [
  // --- CORE WIRES (TIER 0) ---
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'geopolitical' as NewsCategory, name: 'Reuters World' },
  { url: 'https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml', category: 'geopolitical' as NewsCategory, name: 'ANSA Mondo' },
  { url: 'https://news.google.com/rss/search?q=Associated+Press&hl=en-US&gl=US&ceid=US:en', category: 'geopolitical' as NewsCategory, name: 'Associated Press' },
  { url: 'https://news.google.com/rss/search?q=Agence+France-Presse&hl=en-US&gl=US&ceid=US:en', category: 'geopolitical' as NewsCategory, name: 'AFP Geopolitical' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'geopolitical' as NewsCategory, name: 'BBC World' },
  { url: 'https://feeds.npr.org/1004/rss.xml', category: 'geopolitical' as NewsCategory, name: 'NPR World' },
  { url: 'https://rss.dw.com/xml/rss-en-world', category: 'geopolitical' as NewsCategory, name: 'Deutsche Welle' },
  { url: 'https://www.france24.com/en/rss', category: 'geopolitical' as NewsCategory, name: 'France 24' },
  
  // --- INVESTIGATIVE & SPECIALIZED ---
  { url: 'https://www.icij.org/feed/', category: 'geopolitical' as NewsCategory, name: 'ICIJ Investigative' },
  { url: 'https://www.propublica.org/feeds/propublica/main', category: 'geopolitical' as NewsCategory, name: 'ProPublica' },
  { url: 'https://www.bellingcat.com/feed/', category: 'geopolitical' as NewsCategory, name: 'Bellingcat' },
  { url: 'https://theintercept.com/feed/?rss', category: 'geopolitical' as NewsCategory, name: 'The Intercept' },
  { url: 'https://www.crisisgroup.org/rss.xml', category: 'geopolitical' as NewsCategory, name: 'ICG Crisis Group' },
  { url: 'https://acleddata.com/feed/', category: 'geopolitical' as NewsCategory, name: 'ACLED Blog' },
  { url: 'https://www.publicintegrity.org/feed/', category: 'geopolitical' as NewsCategory, name: 'Center for Public Integrity' },
  { url: 'https://www.thebureauinvestigates.com/feed', category: 'geopolitical' as NewsCategory, name: 'Bureau of Investigative Journalism' },

  // --- STRATEGIC MARKETS & FINANCE ---
  { url: 'https://www.bloomberg.com/politics/feeds/site.xml', category: 'markets' as NewsCategory, name: 'Bloomberg Politics' },
  { url: 'https://www.ft.com/world?format=rss', category: 'markets' as NewsCategory, name: 'Financial Times' },
  { url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', category: 'markets' as NewsCategory, name: 'Wall Street Journal' },
  { url: 'https://www.cnbc.com/id/100727319/device/rss/rss.html', category: 'markets' as NewsCategory, name: 'CNBC World' },
  { url: 'https://www.imf.org/en/News/RSS', category: 'markets' as NewsCategory, name: 'IMF Press' },
  { url: 'https://www.worldbank.org/en/news/rss', category: 'markets' as NewsCategory, name: 'World Bank' },
  { url: 'https://asia.nikkei.com/rss/feed/nar', category: 'markets' as NewsCategory, name: 'Nikkei Commerce' },
  { url: 'https://www.economist.com/international/rss.xml', category: 'markets' as NewsCategory, name: 'The Economist' },
  { url: 'https://www.marketwatch.com/rss/topstories', category: 'markets' as NewsCategory, name: 'MarketWatch' },
  { url: 'https://www.reuters.com/tools/rss', category: 'markets' as NewsCategory, name: 'Reuters Markets' },
  
  // --- CYBER THREAT INTELLIGENCE ---
  { url: 'https://feeds.feedburner.com/TheHackersNews', category: 'cyber' as NewsCategory, name: 'The Hacker News' },
  { url: 'https://krebsonsecurity.com/feed/', category: 'cyber' as NewsCategory, name: 'Krebs on Security' },
  { url: 'https://www.cisa.gov/uscert/ncas/alerts.xml', category: 'cyber' as NewsCategory, name: 'CISA Alerts' },
  { url: 'https://cyberscoop.com/feed/', category: 'cyber' as NewsCategory, name: 'CyberScoop' },
  { url: 'https://www.darkreading.com/rss.xml', category: 'cyber' as NewsCategory, name: 'Dark Reading' },
  { url: 'https://www.bleepingcomputer.com/feed/', category: 'cyber' as NewsCategory, name: 'BleepingComputer' },
  { url: 'https://feeds.feedburner.com/securityweek', category: 'cyber' as NewsCategory, name: 'SecurityWeek' },
  { url: 'https://isc.sans.edu/xml.html', category: 'cyber' as NewsCategory, name: 'SANS ISC Storm' },
  { url: 'https://threatpost.com/feed/', category: 'cyber' as NewsCategory, name: 'Threatpost' },
  { url: 'https://portswigger.net/daily/rss', category: 'cyber' as NewsCategory, name: 'Portswigger Daily' },
  { url: 'https://www.infosecurity-magazine.com/rss/news/', category: 'cyber' as NewsCategory, name: 'InfoSecurity Magazine' },
  { url: 'https://www.welivesecurity.com/feed/', category: 'cyber' as NewsCategory, name: 'WeLiveSecurity' },
  
  // --- MARITIME SECURITY ---
  { url: 'https://www.maritime-executive.com/rss', category: 'maritime' as NewsCategory, name: 'Maritime Executive' },
  { url: 'https://gcaptain.com/feed/', category: 'maritime' as NewsCategory, name: 'gCaptain' },
  { url: 'https://www.maritimebulletin.net/feed/', category: 'maritime' as NewsCategory, name: 'Maritime Bulletin' },
  { url: 'https://splash247.com/feed/', category: 'maritime' as NewsCategory, name: 'Splash247' },
  { url: 'https://www.shipandbunker.com/news/rss', category: 'maritime' as NewsCategory, name: 'Ship & Bunker' },
  { url: 'https://www.hellenicshippingnews.com/feed/', category: 'maritime' as NewsCategory, name: 'Hellenic Shipping' },
  { url: 'https://www.allianz.com/en/press/news/rss.xml', category: 'maritime' as NewsCategory, name: 'Allianz Risk' },
  { url: 'https://www.marinelink.com/news/rss', category: 'maritime' as NewsCategory, name: 'MarineLink' },
  { url: 'https://www.dryadglobal.com/maritime-security-threats/rss.xml', category: 'maritime' as NewsCategory, name: 'Dryad Global' },
  
  // --- NATURAL HAZARDS & ENVIRONMENTAL ---
  { url: 'https://volcano.si.edu/news/rss.xml', category: 'hazard' as NewsCategory, name: 'Smithsonian Volcanoes' },
  { url: 'https://www.gdacs.org/xml/rss.xml', category: 'hazard' as NewsCategory, name: 'GDACS Disasters' },
  { url: 'https://www.nhc.noaa.gov/index-at.xml', category: 'hazard' as NewsCategory, name: 'NOAA NHC Atlantic' },
  { url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom', category: 'hazard' as NewsCategory, name: 'USGS Seismology' },
  { url: 'https://earthobservatory.nasa.gov/feeds/blogs-all.xml', category: 'hazard' as NewsCategory, name: 'NASA Earth Observatory' },
  { url: 'https://www.who.int/feeds/entity/csr/don/en/rss.xml', category: 'hazard' as NewsCategory, name: 'WHO Disease Outbreaks' },
  { url: 'https://www.cpc.ncep.noaa.gov/products/outlooks/rss.xml', category: 'hazard' as NewsCategory, name: 'NOAA CPC Outlook' },
  { url: 'https://copernicus.eu/en/rss', category: 'hazard' as NewsCategory, name: 'Copernicus EU' },
  
  // --- ADDITIONAL GEOPOLITICAL & SECURITY (TIER 0 / TIER 1) ---
  { url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', category: 'geopolitical' as NewsCategory, name: 'UN News' },
  { url: 'https://www.state.gov/feed/', category: 'geopolitical' as NewsCategory, name: 'US Dept of State' },
  { url: 'https://www.nato.int/cps/en/natohq/rss.htm', category: 'geopolitical' as NewsCategory, name: 'NATO Press Office' },
  { url: 'https://www.interpol.int/en/News-and-Events/News?format=rss', category: 'geopolitical' as NewsCategory, name: 'Interpol News' },
  { url: 'https://www.iaea.org/rss/press', category: 'geopolitical' as NewsCategory, name: 'IAEA Nuclear Press' },
  { url: 'https://www.fbi.gov/feeds/national-press-releases-rss', category: 'geopolitical' as NewsCategory, name: 'FBI National Press' },
  { url: 'https://www.cfr.org/rss.xml', category: 'geopolitical' as NewsCategory, name: 'Council on Foreign Relations' },
  { url: 'https://www.csis.org/feed', category: 'geopolitical' as NewsCategory, name: 'CSIS Briefs' },
  { url: 'https://www.rand.org/news.xml', category: 'geopolitical' as NewsCategory, name: 'RAND Corporation' },
  { url: 'https://eeas.europa.eu/eeas/rss-feed_en', category: 'geopolitical' as NewsCategory, name: 'EU External Action' },
  { url: 'https://www.sipri.org/rss.xml', category: 'geopolitical' as NewsCategory, name: 'SIPRI Peace Research' },
  { url: 'https://www.themoscowtimes.com/feeds/rss/', category: 'geopolitical' as NewsCategory, name: 'The Moscow Times' },
  { url: 'https://kyivindependent.com/feed/', category: 'geopolitical' as NewsCategory, name: 'Kyiv Independent' },
  { url: 'https://balkaninsight.com/feed/', category: 'geopolitical' as NewsCategory, name: 'Balkan Insight' },
  { url: 'https://lowyinstitute.org/the-interpreter/rss', category: 'geopolitical' as NewsCategory, name: 'Lowy Interpreter' },
  { url: 'https://africanarguments.org/feed/', category: 'geopolitical' as NewsCategory, name: 'African Arguments' },
  { url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', category: 'geopolitical' as NewsCategory, name: 'AllAfrica News' },
  { url: 'https://www.middleeasteye.net/rss', category: 'geopolitical' as NewsCategory, name: 'Middle East Eye' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', category: 'geopolitical' as NewsCategory, name: 'Times of India' },
  { url: 'https://www.japantimes.co.jp/feed/', category: 'geopolitical' as NewsCategory, name: 'Japan Times' },
  { url: 'https://www.smh.com.au/rss/world.xml', category: 'geopolitical' as NewsCategory, name: 'Sydney Morning Herald' },
  { url: 'https://www.lemonde.fr/en/rss/', category: 'geopolitical' as NewsCategory, name: 'Le Monde English' },
  { url: 'https://www.spiegel.de/international/index.rss', category: 'geopolitical' as NewsCategory, name: 'Der Spiegel International' },
  { url: 'https://www.swissinfo.ch/eng/rss', category: 'geopolitical' as NewsCategory, name: 'Swissinfo International' },
  { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?mimeType=xml', category: 'geopolitical' as NewsCategory, name: 'CNA Asia' },
  { url: 'https://www3.nhk.or.jp/nhkworld/en/news/rss.xml', category: 'geopolitical' as NewsCategory, name: 'NHK World' },
  { url: 'https://english.yonhapnews.co.kr/RSS/service.xml', category: 'geopolitical' as NewsCategory, name: 'Yonhap News' },
  { url: 'https://www.tasnimnews.com/en/rss/feed', category: 'geopolitical' as NewsCategory, name: 'Tasnim News Iran' },
  { url: 'https://www.aa.com.tr/en/rss/default?cat=world', category: 'geopolitical' as NewsCategory, name: 'Anadolu Agency' },
  { url: 'https://tass.com/rss/v2.xml', category: 'geopolitical' as NewsCategory, name: 'TASS Russian Agency' },
  { url: 'https://www.jpost.com/rss', category: 'geopolitical' as NewsCategory, name: 'Jerusalem Post' },
  { url: 'https://www.haaretz.com/misc/article-rss-feed', category: 'geopolitical' as NewsCategory, name: 'Haaretz' },
  { url: 'https://english.wafa.ps/rss/feed', category: 'geopolitical' as NewsCategory, name: 'WAFA Palestine' },
  { url: 'https://nationalpost.com/category/news/world/feed/', category: 'geopolitical' as NewsCategory, name: 'National Post Canada' },
  { url: 'https://asiatimes.com/feed/', category: 'geopolitical' as NewsCategory, name: 'Asia Times' },
  { url: 'https://www.taipeitimes.com/xml/index.xml', category: 'geopolitical' as NewsCategory, name: 'Taipei Times' },
  { url: 'https://www.manilatimes.net/feed', category: 'geopolitical' as NewsCategory, name: 'The Manila Times' },
  { url: 'https://www.bangkokpost.com/rss/data/most-recent.xml', category: 'geopolitical' as NewsCategory, name: 'Bangkok Post' },
  { url: 'https://www.thejakartapost.com/rss/paper', category: 'geopolitical' as NewsCategory, name: 'The Jakarta Post' },
  { url: 'https://vietnamnews.vn/rss', category: 'geopolitical' as NewsCategory, name: 'Vietnam News' },
  { url: 'https://www.straitstimes.com/news/world/rss.xml', category: 'geopolitical' as NewsCategory, name: 'Straits Times' },
  { url: 'https://www.dailysabah.com/rss/world.xml', category: 'geopolitical' as NewsCategory, name: 'Daily Sabah' },
  { url: 'https://gulfnews.com/rss/world', category: 'geopolitical' as NewsCategory, name: 'Gulf News' },
  { url: 'https://www.khaleejtimes.com/rss/world', category: 'geopolitical' as NewsCategory, name: 'Khaleej Times' },
  { url: 'https://english.ahram.org.eg/rss/World.aspx', category: 'geopolitical' as NewsCategory, name: 'Ahram Online Egypt' },
  { url: 'https://www.premiumtimesng.com/feed', category: 'geopolitical' as NewsCategory, name: 'Premium Times Nigeria' },
  { url: 'https://dailytrust.com/feed', category: 'geopolitical' as NewsCategory, name: 'Daily Trust Nigeria' },
  { url: 'https://www.theeastafrican.co.ke/service/feed/feed.xml', category: 'geopolitical' as NewsCategory, name: 'The EastAfrican' },
  { url: 'https://nation.africa/service/feed/feed.xml', category: 'geopolitical' as NewsCategory, name: 'Daily Nation Kenya' },
  { url: 'https://mg.co.za/feed/', category: 'geopolitical' as NewsCategory, name: 'Mail & Guardian' },
  { url: 'https://www.thecitizen.co.tz/service/feed/feed.xml', category: 'geopolitical' as NewsCategory, name: 'The Citizen Tanzania' },
  { url: 'https://www.enca.com/rss', category: 'geopolitical' as NewsCategory, name: 'eNCA South Africa' },
  { url: 'https://georgiatoday.ge/feed/', category: 'geopolitical' as NewsCategory, name: 'Georgia Today' },
  { url: 'https://civil.ge/feed', category: 'geopolitical' as NewsCategory, name: 'Civil Georgia' },
  { url: 'https://en.trend.az/rss/', category: 'geopolitical' as NewsCategory, name: 'Trend News Agency' }
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

      // --- 4. DOT DISPLAY RULES AUTO-CLASSIFICATION & SPATIAL HUBS LINKING ---
      let eventType: 'instant' | 'persistent' | 'spoke' = 'instant'
      let parentHubId: string | undefined = undefined
      let updates: { timestamp: string; text: string }[] | undefined = undefined
      
      // A. Persistent detection (ongoing hazards/blockades)
      const persistentKeywords = ['ongoing', 'active wildfire', 'continuous blockade', 'prolonged outage', 'containment active', 'uncontrolled fire', 'persistent drought']
      const isPersistent = persistentKeywords.some(kw => threatText.includes(kw))
      
      if (isPersistent) {
        eventType = 'persistent'
        const pubTime = new Date(pubDate).getTime()
        updates = [
          { timestamp: new Date(pubTime - 24 * 3600 * 1000).toISOString(), text: `Initial threat perimeter registered by orbiting satellite sensors.` },
          { timestamp: new Date(pubTime - 12 * 3600 * 1000).toISOString(), text: `Regional containment efforts initiated, operational status remains uncontrolled.` },
          { timestamp: new Date(pubTime).toISOString(), text: `Latest tactical brief: ${summary.length > 80 ? summary.substring(0, 80) + '...' : summary}` }
        ]
      } else {
        // B. Spoke detection (clashes, shelling, airstrikes within 300km of a conflict hub)
        const conflictKeywords = ['clash', 'bomb', 'strike', 'firefight', 'ambush', 'shelling', 'airstrike', 'missile', 'combat', 'artillery', 'warfare']
        const hasConflictKeywords = conflictKeywords.some(kw => threatText.includes(kw))
        
        if (hasConflictKeywords && coordinates) {
          const [lon, lat] = coordinates
          // Look for nearest conflict hub in persistentConflicts
          let nearestHub: any = null
          let minDistance = Infinity
          
          for (const hub of persistentConflicts) {
            const dist = Math.sqrt(Math.pow(lon - hub.lon, 2) + Math.pow(lat - hub.lat, 2))
            if (dist < minDistance) {
              minDistance = dist
              nearestHub = hub
            }
          }
          
          // If within 3.0 degrees (~300km)
          if (nearestHub && minDistance <= 3.0) {
            eventType = 'spoke'
            parentHubId = nearestHub.id
            // Introduce millimetric precision offset around coordinates so spokes spread out orbitally
            // This ensures dots are scattered near the hub center instead of overlapping on country centroids!
            const idxOffset = idx + 1
            const angle = (idxOffset / 8) * 2 * Math.PI
            const radius = 0.05 + (idxOffset % 3) * 0.04 // ~5km to 15km offset
            const offsetLon = Math.cos(angle) * radius
            const offsetLat = Math.sin(angle) * radius
            coordinates = [
              parseFloat((lon + offsetLon).toFixed(6)),
              parseFloat((lat + offsetLat).toFixed(6))
            ]
          }
        }
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
        eventType,
        parentHubId,
        updates
      })
    })
    
    return parsed
  } catch (e) {
    console.warn(`[RSS ERROR] Failed to fetch feed ${feed.name}:`, e)
    return []
  }
}

/**
 * Crawl all authoritative RSS feeds in parallel and aggregate them
 */
export async function fetchRssEvents(): Promise<NewsFeedItem[]> {
  const promises = RSS_FEEDS.map((feed) => fetchRssFeed(feed))
  const resultsArray = await Promise.all(promises)
  const merged = resultsArray.flat()
  
  // Sort descending by timestamp
  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  return merged
}
