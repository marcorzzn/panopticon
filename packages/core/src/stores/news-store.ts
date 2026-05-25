import { create } from 'zustand'

export type NewsCategory = string

export interface NewsFeedItem {
  id: string
  category: NewsCategory
  source: string
  title: string
  summary: string
  timestamp: string // ISO 8601 string
  coordinates?: [number, number] // [lng, lat]
  severity: 'low' | 'moderate' | 'high' | 'critical'
  url?: string
  sources?: string[]
  sourceTier?: number
  integrity?: number
  
  // Dot Display Rules Logic:
  eventType?: 'instant' | 'persistent' | 'hub' | 'spoke'
  parentHubId?: string
  endedAt?: string
  isEnded?: boolean
  updates?: { timestamp: string; text: string }[]
}

export interface MapMarker {
  id: string
  type: 'daily' | 'context' | 'hub' | 'spoke' | 'persistent'
  category: NewsCategory
  title: string
  summary: string
  timestamp: string
  coordinates: [number, number]
  severity: 'low' | 'moderate' | 'high' | 'critical'
  url?: string
  sources?: string[]
  sourceTier?: number
  integrity?: number
  timeline?: NewsFeedItem[] // Chronological dispatches inside Context/Hub/Persistent Marker
  
  // Display rules mappings:
  eventType?: 'instant' | 'persistent' | 'hub' | 'spoke'
  parentHubId?: string
  updates?: { timestamp: string; text: string }[]
}

// 25 Curated Real-World Geocoded Geopolitical and Security Wire alerts
export const initialNewsEvents = (): NewsFeedItem[] => {
  const now = Date.now();
  return [
    {
      id: 'real-health-ebola-congo',
      category: 'health',
      source: 'WHO Disease Outbreak News',
      title: 'Ebola Outbreak Logged in Democratic Republic of Congo (DRC)',
      summary: 'Active biological outbreak registry confirms 14 primary Ebola virus cases in Bikoro, Equateur Province. WHO deployment coordinates containment ring, therapeutic interventions, and isolation zones.',
      timestamp: new Date(now - 12 * 3600 * 1000).toISOString(),
      coordinates: [18.1224, -0.7490],
      severity: 'high',
      url: 'https://www.who.int',
      eventType: 'persistent',
      sources: ['World Health Organization', 'DRC Ministry of Health'],
      updates: [
        { timestamp: new Date(now - 24 * 3600 * 1000).toISOString(), text: "DRC Health Authority issues warning on suspected clusters in Bikoro." },
        { timestamp: new Date(now - 12 * 3600 * 1000).toISOString(), text: "Gene sequencing confirms Zaire ebolavirus strain. Isolation protocol active." }
      ]
    },
    {
      id: 'real-geopol-serbia-protests',
      category: 'geopolitical',
      source: 'Balkan Insight',
      title: 'Student Protests & Street Blockades Active in Belgrade',
      summary: 'Belgrade University student organizations coordinate multi-point sit-ins and street blockades around governmental buildings. Demands focus on electoral integrity verification.',
      timestamp: new Date(now - 4 * 3600 * 1000).toISOString(),
      coordinates: [20.4572, 44.8125],
      severity: 'moderate',
      url: 'https://balkaninsight.com',
      eventType: 'persistent',
      sources: ['Balkan Insight Central Bureau', 'Belgrade City Desk'],
      updates: [
        { timestamp: new Date(now - 8 * 3600 * 1000).toISOString(), text: "Student assemblies gather at Belgrade University Faculty of Philosophy." },
        { timestamp: new Date(now - 4 * 3600 * 1000).toISOString(), text: "Demonstrations block traffic at core intersections. Police deploy defensive perimeter cordons." }
      ]
    },
    {
      id: 'real-instant-ended-1',
      category: 'maritime',
      source: 'ANSA Mondo',
      title: 'Cargo Carrier Vessel Salvage Mission Concluded',
      summary: 'Salvage command verifies the successful towing of the container ship off the shoal near Suez. Incident declared resolved and ended.',
      timestamp: new Date(now - 1 * 3600 * 1000).toISOString(), // 1h ago
      coordinates: [32.3275, 30.5853],
      severity: 'low',
      url: 'https://www.ansa.it',
      eventType: 'instant',
      isEnded: true,
      endedAt: new Date(now - 12 * 3600 * 1000).toISOString(), // Ended 12 hours ago (within 24h)
    },
    {
      id: 'real-instant-swept-2',
      category: 'geopolitical',
      source: 'Associated Press',
      title: 'Minor Security Demonstration in Tbilisi Center',
      summary: 'Small political protest resolved peacefully. Riot control elements recalled. Swept from visual HUD due to daily reset sweep.',
      timestamp: new Date(now - 35 * 3600 * 1000).toISOString(), // 35h ago
      coordinates: [44.8028, 41.6941],
      severity: 'low',
      url: 'https://apnews.com',
      eventType: 'instant',
      isEnded: true,
      endedAt: new Date(now - 30 * 3600 * 1000).toISOString(), // Ended 30 hours ago (>24h, should be culled)
    },
    {
      id: 'real-persistent-wildfire-1',
      category: 'hazard',
      source: 'NASA FIRMS Sensor',
      title: 'Ongoing Uncontrolled Forest Fire in Sumatra Sector',
      summary: 'Widespread crop-burning fire remains highly active. Heavy smoke plumes detected via MODIS thermal grids. Operational sweeps ongoing.',
      timestamp: new Date(now - 2 * 3600 * 1000).toISOString(), // 2h ago
      coordinates: [102.3214, -0.9821],
      severity: 'high',
      url: 'https://firms.modaps.eosdis.nasa.gov',
      eventType: 'persistent',
      updates: [
        { timestamp: new Date(now - 36 * 3600 * 1000).toISOString(), text: "MODIS thermal scanner registers initial 10-hectare heat anomaly." },
        { timestamp: new Date(now - 20 * 3600 * 1000).toISOString(), text: "High winds accelerate perimeter expansion to 1,200 hectares. Local evacuations ordered." },
        { timestamp: new Date(now - 2 * 3600 * 1000).toISOString(), text: "Smoke index degrades to hazardous levels across Malacca Strait. Drone monitoring active." }
      ]
    },
    {
      id: 'conflict-hub-russo-ukrainian',
      category: 'geopolitical',
      source: 'Reuters Geopolitics',
      title: 'Russo-Ukrainian War: Kharkiv Sector Tactical Operations Hub',
      summary: 'Operational campaign command center. Geopolitical standoff remains highly active with ongoing millimetric strikes orbiting the coordinates.',
      timestamp: new Date(now - 5 * 60 * 1000).toISOString(), // 5m ago
      coordinates: [36.2304, 50.0000],
      severity: 'critical',
      url: 'https://www.reuters.com',
      eventType: 'hub',
    },
    {
      id: 'conflict-spoke-bridge-bombing',
      category: 'geopolitical',
      source: 'ANSA Mondo',
      title: 'Precision Missile Strike Targets Lyman Rail Bridge',
      summary: 'Direct structural hit confirmed on supply lane. Logistics assets temporarily degraded. Spoke node linked to Kharkiv Hub.',
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(), // 30m ago
      coordinates: [36.2512, 49.9820],
      severity: 'high',
      url: 'https://www.ansa.it',
      eventType: 'spoke',
      parentHubId: 'conflict-hub-russo-ukrainian',
    },
    {
      id: 'conflict-spoke-street-skirmish',
      category: 'geopolitical',
      source: 'AFP Geopolitical',
      title: 'Urban Trench Skirmishes Reported near Vovchansk Outskirts',
      summary: 'Recon elements clash near defensive line 2. Heavy machinegun fire logged. Spoke node linked to Kharkiv Hub.',
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(), // 45m ago
      coordinates: [36.9312, 50.2831],
      severity: 'high',
      url: 'https://www.afp.com',
      eventType: 'spoke',
      parentHubId: 'conflict-hub-russo-ukrainian',
    },
    {
      id: 'conflict-spoke-ew-system',
      category: 'geopolitical',
      source: 'BBC World News',
      title: 'GPS Spoofing & Signal Jamming Grid Detected',
      summary: 'Civilian aviation telemetry reporting severe anomalies in drone navigation frequencies. Spoke node linked to Kharkiv Hub.',
      timestamp: new Date(now - 80 * 60 * 1000).toISOString(), // 1.3h ago
      coordinates: [36.1284, 50.1254],
      severity: 'high',
      url: 'https://www.bbc.com',
      eventType: 'spoke',
      parentHubId: 'conflict-hub-russo-ukrainian',
    },
    {
      id: 'real-geopol-1',
      category: 'geopolitical',
      source: 'Reuters Geopolitics',
      title: 'Sudanese Armed Forces Conduct Air Operations in North Darfur',
      summary: 'State military command confirms airstrikes targeting logistics depots in El Fasher. Severe civilian movements reported.',
      timestamp: new Date(now - 10 * 60 * 1000).toISOString(), // 10m ago
      coordinates: [25.3485, 13.6268],
      severity: 'critical',
      url: 'https://www.reuters.com'
    },
    {
      id: 'real-geopol-2',
      category: 'geopolitical',
      source: 'BBC World News',
      title: 'Tensions Rise at the Armenia-Azerbaijan Border Corridor',
      summary: 'Heavy artillery firing reported near Yeraskh border outpost. Monitors from EU Mission in Armenia dispatched to verify.',
      timestamp: new Date(now - 25 * 60 * 1000).toISOString(), // 25m ago
      coordinates: [44.7833, 39.7833],
      severity: 'high',
      url: 'https://www.bbc.com'
    },
    {
      id: 'real-maritime-1',
      category: 'maritime',
      source: 'Lloyds List Maritime',
      title: 'Merchant Carrier Target of Drone Strike in Red Sea Sector',
      summary: 'UKMTO reports explosion 50nm west of Hodeidah. Hull integrity intact, transponder switched to safe broadcast.',
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(), // 45m ago
      coordinates: [42.5000, 14.8000],
      severity: 'critical',
      url: 'https://lloydslist.maritimeintelligence.informa.com'
    },
    {
      id: 'real-cyber-1',
      category: 'cyber',
      source: 'AbuseIPDB Threat Intelligence',
      title: 'Massive DDoS Attack Targets Financial Core of Ukraine',
      summary: 'Multiple commercial banks reporting banking app timeouts. CISA confirms cyber threat origin routing footprints.',
      timestamp: new Date(now - 60 * 60 * 1000).toISOString(), // 1h ago
      coordinates: [30.5234, 50.4501],
      severity: 'high',
      url: 'https://www.abuseipdb.com'
    },
    {
      id: 'real-hazard-1',
      category: 'hazard',
      source: 'NASA FIRMS Sensor',
      title: 'Wildfire Expansion in Northern Territories of Alberta',
      summary: 'MODIS thermal imaging registers active fire perimeter spreading across 1,500 hectares. High wind advisories active.',
      timestamp: new Date(now - 90 * 60 * 1000).toISOString(), // 1.5h ago
      coordinates: [-115.0000, 56.0000],
      severity: 'moderate',
      url: 'https://firms.modaps.eosdis.nasa.gov'
    },
    {
      id: 'real-market-1',
      category: 'markets',
      source: 'Bloomberg Markets',
      title: 'Crude Oil Futures Surge Amid Strait of Hormuz Escalar Warnings',
      summary: 'Brent futures breach critical threshold. Geopolitical risks index raised due to regional tanker security sweeps.',
      timestamp: new Date(now - 120 * 60 * 1000).toISOString(), // 2h ago
      coordinates: [56.3000, 26.6000],
      severity: 'moderate',
      url: 'https://www.bloomberg.com'
    },
    {
      id: 'real-geopol-3',
      category: 'geopolitical',
      source: 'Al Jazeera Intel',
      title: 'Border Skirmish near Myanmar-Thailand Frontier',
      summary: 'KNU cells clash with Junta forces near Myawaddy crossing. Heavy machinegun fire audible across the Moei river.',
      timestamp: new Date(now - 3 * 3600 * 1000).toISOString(), // 3h ago
      coordinates: [98.5167, 16.4500],
      severity: 'high',
      url: 'https://www.aljazeera.com'
    },
    {
      id: 'real-geopol-4',
      category: 'geopolitical',
      source: 'BBC World News',
      title: 'Sub-National Tribal Clash in Enga Province, Papua New Guinea',
      summary: 'High-power firearms used in ambush near Wabag. Local security assets deployed to secure core transport corridors.',
      timestamp: new Date(now - 5 * 3600 * 1000).toISOString(), // 5h ago
      coordinates: [143.6333, -5.4833],
      severity: 'high',
      url: 'https://www.bbc.com'
    },
    {
      id: 'real-maritime-2',
      category: 'maritime',
      source: 'Lloyds List Maritime',
      title: 'Undersea Communication Fiber Anomaly Registered in Baltic Sea',
      summary: 'Structural loss of telemetry between Helsinki and Rostock. Security vessels patrol target zone to inspect anchor damage.',
      timestamp: new Date(now - 7 * 3600 * 1000).toISOString(), // 7h ago
      coordinates: [21.5000, 56.5000],
      severity: 'high',
      url: 'https://lloydslist.maritimeintelligence.informa.com'
    },
    {
      id: 'real-cyber-2',
      category: 'cyber',
      source: 'Shodan Threat Alert',
      title: 'BGP Hijacking Route Anomalies Target NATO Servers',
      summary: 'NATO defense communication networks temporarily routed via unauthorized network provider in Eastern Europe.',
      timestamp: new Date(now - 9 * 3600 * 1000).toISOString(), // 9h ago
      coordinates: [4.3517, 50.8503],
      severity: 'critical',
      url: 'https://www.shodan.io'
    },
    {
      id: 'real-geopol-5',
      category: 'geopolitical',
      source: 'Reuters Geopolitics',
      title: 'Tensions Escalate in Northern Kosovo Border Outpost',
      summary: 'Local barricades erected near Jarinje. NATO-led KFOR units increase patrols to maintain security corridor.',
      timestamp: new Date(now - 12 * 3600 * 1000).toISOString(), // 12h ago
      coordinates: [20.9030, 42.6026],
      severity: 'high',
      url: 'https://www.reuters.com'
    },
    {
      id: 'real-geopol-6',
      category: 'geopolitical',
      source: 'AFP Geopolitical',
      title: 'Naval Exercises Initiated in the Taiwan Strait Sector',
      summary: 'State defense forces announce live-fire exercises in three sectors. Commercial shipping routes altered to avoid lockouts.',
      timestamp: new Date(now - 14 * 3600 * 1000).toISOString(), // 14h ago
      coordinates: [121.0000, 23.5000],
      severity: 'high',
      url: 'https://www.afp.com'
    },
    {
      id: 'real-hazard-2',
      category: 'hazard',
      source: 'USGS Seismology',
      title: 'M 5.8 Earthquake Epicenter Registered near Tohoku, Japan',
      summary: 'USGS confirms focal depth at 24km. No tsunami warnings issued. Tremors felt extensively in Sendai.',
      timestamp: new Date(now - 16 * 3600 * 1000).toISOString(), // 16h ago
      coordinates: [141.0120, 38.2688],
      severity: 'moderate',
      url: 'https://earthquake.usgs.gov'
    },
    {
      id: 'real-geopol-7',
      category: 'geopolitical',
      source: 'Associated Press',
      title: 'Protest Clashes in Capital Center of Caracas, Venezuela',
      summary: 'Demonstrations over election verification turn violent. Tear gas deployed in Plaza Altamira. Blockades reported.',
      timestamp: new Date(now - 20 * 3600 * 1000).toISOString(), // 20h ago
      coordinates: [-66.8486, 10.4961],
      severity: 'high',
      url: 'https://apnews.com'
    },
    {
      id: 'real-market-2',
      category: 'markets',
      source: 'CNBC Global Markets',
      title: 'Semi-conductor Supply Warnings as Hsinchu Science Park Reports Outage',
      summary: 'Local electrical grid instability triggers automated safety sweeps at core fabrication hubs. Yield concerns raised.',
      timestamp: new Date(now - 24 * 3600 * 1000).toISOString(), // 24h ago
      coordinates: [121.0000, 24.7735],
      severity: 'moderate',
      url: 'https://www.cnbc.com'
    },
    {
      id: 'real-geopol-8',
      category: 'geopolitical',
      source: 'Al Jazeera Intel',
      title: 'Clashes Intensify near Kharkiv Frontier Zones',
      summary: 'Artillery exchanges reported near Vovchansk. Drone incursions active. Tactical commands coordinate reinforcements.',
      timestamp: new Date(now - 28 * 3600 * 1000).toISOString(), // 28h ago
      coordinates: [36.2304, 50.0000],
      severity: 'critical',
      url: 'https://www.aljazeera.com'
    },
    {
      id: 'real-cyber-3',
      category: 'cyber',
      source: 'CISA Alert',
      title: 'Ransomware Operation Shuts Down Port Logistics in Hamburg',
      summary: 'LockBit group claims breach of freight loading systems. Container terminals transitioning to manual processing.',
      timestamp: new Date(now - 32 * 3600 * 1000).toISOString(), // 32h ago
      coordinates: [9.9937, 53.5511],
      severity: 'high',
      url: 'https://www.cisa.gov'
    },
    {
      id: 'real-maritime-3',
      category: 'maritime',
      source: 'Lloyds List Maritime',
      title: 'Vessel Seizure near Bab-el-Mandeb Strait',
      summary: 'Armed factions board roll-on cargo vessel in international waters. Vessel rerouted toward Hodeidah anchorage.',
      timestamp: new Date(now - 36 * 3600 * 1000).toISOString(), // 36h ago
      coordinates: [43.3000, 12.7000],
      severity: 'critical',
      url: 'https://lloydslist.maritimeintelligence.informa.com'
    },
    {
      id: 'real-hazard-3',
      category: 'hazard',
      source: 'NASA FIRMS Sensor',
      title: 'Severe Forest Fire Plumes Detected in Sumatra, Indonesia',
      summary: 'MODIS thermal anomaly registers massive agricultural slash-and-burn fires. Air quality index degraded across Strait of Malacca.',
      timestamp: new Date(now - 42 * 3600 * 1000).toISOString(), // 42h ago
      coordinates: [102.0000, -1.0000],
      severity: 'high',
      url: 'https://firms.modaps.eosdis.nasa.gov'
    },
    {
      id: 'real-geopol-9',
      category: 'geopolitical',
      source: 'Reuters Geopolitics',
      title: 'Protest Demonstration Erupts in Tbilisi Center',
      summary: '50,000 demonstrators march on Rustaveli Avenue over transparent foreign financing bill. Security barriers deployed.',
      timestamp: new Date(now - 46 * 3600 * 1000).toISOString(), // 46h ago
      coordinates: [44.8028, 41.6941],
      severity: 'moderate',
      url: 'https://www.reuters.com'
    },
    {
      id: 'real-geopol-10',
      category: 'geopolitical',
      source: 'AFP Geopolitical',
      title: 'IED Attack Targets Security Convoy in Northern Niger',
      summary: 'Local insurgent cell claims attack near Arlit mining outpost. State forces coordinate security lockdown.',
      timestamp: new Date(now - 52 * 3600 * 1000).toISOString(), // 52h ago
      coordinates: [7.3853, 18.7369],
      severity: 'high',
      url: 'https://www.afp.com'
    },
    {
      id: 'real-cyber-4',
      category: 'cyber',
      source: 'KrebsOnSecurity',
      title: 'Critical Infrastructure SCADA Systems Compromised',
      summary: 'Zero-day vulnerability exploited at water filtration plant. Remote IP routing blocked, backup procedures active.',
      timestamp: new Date(now - 58 * 3600 * 1000).toISOString(), // 58h ago
      coordinates: [-80.1918, 25.7617],
      severity: 'critical',
      url: 'https://krebsonsecurity.com'
    },
    {
      id: 'real-maritime-4',
      category: 'maritime',
      source: 'Lloyds List Maritime',
      title: 'Suez Transit Delay Due to Grounded Container Vessel',
      summary: '400m vessel temporarily blocks transit lane near Ismailia. Tug operations initiated. 45 ships reported in queue.',
      timestamp: new Date(now - 64 * 3600 * 1000).toISOString(), // 64h ago
      coordinates: [32.3275, 30.5853],
      severity: 'moderate',
      url: 'https://lloydslist.maritimeintelligence.informa.com'
    },
    {
      id: 'real-hazard-4',
      category: 'hazard',
      source: 'OpenAQ Air Stations',
      title: 'Particulate Density PM2.5 Breaches Hazardous Level in Delhi',
      summary: 'Core monitoring stations register 182 micrograms per cubic meter. Agricultural residue burning smoke persistent.',
      timestamp: new Date(now - 70 * 3600 * 1000).toISOString(), // 70h ago
      coordinates: [77.2090, 28.6139],
      severity: 'high',
      url: 'https://api.openaq.org'
    },
    {
      id: 'real-market-3',
      category: 'markets',
      source: 'FT Financial Alerts',
      title: 'Grain Export Logistics Blocked in Port of Odessa',
      summary: 'Structural port facility inspection active. Freight rates increase as regional war risk premium is adjusted.',
      timestamp: new Date(now - 71 * 3600 * 1000).toISOString(), // 71h ago
      coordinates: [30.7233, 46.4825],
      severity: 'high',
      url: 'https://www.ft.com'
    }
  ]
}

export function getMapMarkers(events: NewsFeedItem[]): MapMarker[] {
  const now = Date.now();

  return events.filter((e) => {
    if (!e.coordinates) return false;
    if (e.eventType === 'instant' && e.isEnded && e.endedAt) {
      const age = now - new Date(e.endedAt).getTime();
      return age <= 24 * 3600 * 1000;
    }
    return true;
  }).map((event) => ({
    id: event.id,
    type: event.eventType === 'hub' || event.eventType === 'spoke' || event.eventType === 'persistent'
      ? event.eventType
      : 'daily',
    category: event.category,
    title: event.title,
    summary: event.summary,
    timestamp: event.timestamp,
    coordinates: event.coordinates!,
    severity: event.severity,
    url: event.url,
    sources: event.sources,
    sourceTier: event.sourceTier,
    integrity: event.integrity,
    eventType: event.eventType,
    parentHubId: event.parentHubId,
    updates: event.updates,
  }));
}

export interface NewsStore {
  newsEvents: NewsFeedItem[]
  setNewsEvents: (events: NewsFeedItem[]) => void
  sweepExpiredEvents: () => void
}

export const useNewsStore = create<NewsStore>((set) => ({
  newsEvents: initialNewsEvents(),
  setNewsEvents: (events) => set({ newsEvents: events }),
  
  // 72-Hour Drift Expiration Sweep
  sweepExpiredEvents: () => {
    const now = Date.now();
    const threshold = 72 * 3600 * 1000; // 72 hours in ms
    
    set((state) => {
      const filtered = state.newsEvents.filter((event) => {
        const eventTime = new Date(event.timestamp).getTime();
        const age = now - eventTime;
        
        // Critical alerts never expire; daily events older than 72 hours are swept away
        if (event.severity === 'critical') {
          return true;
        }
        
        return age <= threshold;
      });

      // Avoid trigger update if no elements changed
      if (filtered.length === state.newsEvents.length) {
        return {};
      }
      
      console.log(`[LIFE-CYCLE] Swept ${state.newsEvents.length - filtered.length} expired daily news events from active store.`);
      return { newsEvents: filtered };
    });
  }
}))

// Auto-run 72h lifecycle sweep on client interval if in browser context
if (typeof window !== 'undefined') {
  setInterval(() => {
    useNewsStore.getState().sweepExpiredEvents();
  }, 60000); // Check every minute
}
