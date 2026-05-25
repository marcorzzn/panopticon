import type { NewsFeedItem, NewsCategory } from '@panopticon/core/stores'

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
  { url: 'https://en.trend.az/rss/', category: 'geopolitical' as NewsCategory, name: 'Trend News Agency' },
  
  // --- PHASE 8 ADDITIONS ---
  { url: 'https://www.unhcr.org/rss/news.xml', category: 'geopolitical' as NewsCategory, name: 'UNHCR Refugee Briefs' },
  { url: 'https://promedmail.org/feed/', category: 'health' as NewsCategory, name: 'ProMED Disease Outbreaks' },
  { url: 'https://www.icc-ccs.org/index.php/piracy-reporting-centre/live-piracy-report?format=feed&type=rss', category: 'maritime' as NewsCategory, name: 'IMB Piracy Reports' },
  { url: 'https://aviation-safety.net/rss/rss.php', category: 'aviation' as NewsCategory, name: 'ASN Aviation Safety' },
  { url: 'https://www.start.umd.edu/gtd/rss/', category: 'terrorism' as NewsCategory, name: 'Global Terrorism Database (GTD)' }
]

export async function fetchRssFeed(_feed?: any): Promise<NewsFeedItem[]> {
  return [] // Obsolete: backend now handles RSS feed fetching and Gemini AI processing
}

/**
 * Fetch Gemini-processed OSINT events from the Panopticon backend
 */
export async function fetchRssEvents(): Promise<NewsFeedItem[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
  try {
    const response = await fetch(`${backendUrl}/api/v1/osint`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.warn(`[OSINT ERROR] Backend returned status ${response.status}`)
      return []
    }
    
    const data = await response.json()
    if (!data || !Array.isArray(data)) {
      return []
    }
    
    const parsed: NewsFeedItem[] = data.map((item: any) => {
      let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low'
      if (['low', 'moderate', 'high', 'critical'].includes(item.severity)) {
        severity = item.severity
      }

      return {
        id: item.id,
        category: item.category as NewsCategory,
        source: item.source || 'Intelligence Wire',
        title: item.title || 'OSINT Dispatch',
        summary: item.summary || '',
        timestamp: item.timestamp || new Date().toISOString(),
        coordinates: item.coordinates,
        url: item.url,
        severity,
        eventType: item.eventType || 'instant',
        parentHubId: item.parentHubId,
        raw_english_translation: item.raw_english_translation,
        source_reliability: item.source_reliability,
      } as NewsFeedItem
    })
    
    return parsed
  } catch (e) {
    console.error('[OSINT ERROR] Failed to fetch OSINT events from backend:', e)
    return []
  }
}
