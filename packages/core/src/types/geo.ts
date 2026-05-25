import type { IntelligenceDomain } from './domain'

// ---------------------------------------------------------------------------
// Coordinate primitives
// ---------------------------------------------------------------------------

/** WGS84 coordinate [longitude, latitude] */
export type Coordinate = [longitude: number, latitude: number]

/** WGS84 coordinate with altitude [longitude, latitude, altitude] */
export type Coordinate3D = [longitude: number, latitude: number, altitude: number]

/** Bounding box [west, south, east, north] */
export type BoundingBox = [west: number, south: number, east: number, north: number]

// ---------------------------------------------------------------------------
// Camera / viewport — FLAT primitives only (no MapLibre objects)
// ---------------------------------------------------------------------------

/** Camera/viewport state — all flat primitive numbers */
export interface ViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

/** Default viewport centered on the Atlantic for a global overview */
export const DEFAULT_VIEW_STATE: ViewState = {
  longitude: 0,
  latitude: 20,
  zoom: 2.5,
  pitch: 0,
  bearing: 0,
}

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

export enum SeverityLevel {
  INFO = 'info',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// ---------------------------------------------------------------------------
// Base geo entity
// ---------------------------------------------------------------------------

/** Base entity for anything placed on the map */
export interface GeoEntity {
  /** Unique identifier for this entity */
  id: string
  /** WGS84 coordinates [lng, lat] */
  coordinates: Coordinate
  /** Intelligence domain this entity belongs to */
  domain: IntelligenceDomain
  /** Unix epoch milliseconds of the event / observation */
  timestamp: number
  /** Human-readable label */
  label: string
  /** Optional severity classification */
  severity?: SeverityLevel
}

// ---------------------------------------------------------------------------
// Domain-specific entities
// ---------------------------------------------------------------------------

/** Earthquake-specific entity (USGS) */
export interface EarthquakeEntity extends GeoEntity {
  /** Moment magnitude */
  magnitude: number
  /** Hypocenter depth in kilometres */
  depth: number
  /** Human-readable place string from USGS */
  place: string
  /** Whether a tsunami advisory was issued */
  tsunamiAlert: boolean
  /** Number of "felt it" reports, null if unavailable */
  felt: number | null
  /** USGS detail page URL */
  url: string
}

/** Weather data point (Open-Meteo / similar) */
export interface WeatherPoint {
  /** Observation location */
  coordinates: Coordinate
  /** Temperature in °C */
  temperature: number
  /** Relative humidity percentage (0–100) */
  humidity: number
  /** Wind speed in km/h */
  windSpeed: number
  /** Wind direction in degrees (meteorological) */
  windDirection: number
  /** Precipitation in mm */
  precipitation: number
  /** WMO weather interpretation code */
  weatherCode: number
  /** Observation timestamp (Unix epoch ms) */
  timestamp: number
  /** Optional station/phenomenon name */
  name?: string
  /** Optional extreme weather indicators */
  isExtreme?: boolean
  extremeType?: 'cyclone' | 'anticyclone' | 'tornado' | ''
  description?: string
  sources?: string[]
}

/** GDELT event entity */
export interface GdeltEvent extends GeoEntity {
  /** CAMEO event code */
  eventCode: string
  /** Goldstein scale (−10 to +10, conflict → cooperation) */
  goldsteinScale: number
  /** Total number of mentions across sources */
  numMentions: number
  /** Number of distinct source outlets */
  numSources: number
  /** Number of distinct articles */
  numArticles: number
  /** Average tone of coverage (negative = hostile, positive = favorable) */
  avgTone: number
  /** URL of the primary source article */
  sourceUrl: string
  /** Primary actor name / country */
  actor1: string
  /** Secondary actor name / country */
  actor2: string
}

// ---------------------------------------------------------------------------
// Space weather
// ---------------------------------------------------------------------------

export enum GeomagneticStormLevel {
  QUIET = 'quiet',
  UNSETTLED = 'unsettled',
  STORM_G1 = 'g1',
  STORM_G2 = 'g2',
  STORM_G3 = 'g3',
  STORM_G4 = 'g4',
  STORM_G5 = 'g5',
}

/** Space weather conditions (NOAA SWPC) */
export interface SpaceWeatherData {
  /** Current planetary Kp index (0–9) */
  kpIndex: number
  /** Forecast Kp values for upcoming intervals */
  kpForecast: number[]
  /** Solar wind speed in km/s */
  solarWindSpeed: number
  /** Solar wind proton density (protons/cm³) */
  solarWindDensity: number
  /** Interplanetary magnetic field Bz component in nT */
  bz: number
  /** Derived geomagnetic storm classification */
  geomagneticStormLevel: GeomagneticStormLevel
  /** Last update timestamp (Unix epoch ms) */
  lastUpdate: number
}

// ---------------------------------------------------------------------------
// Aviation & Wildfires (Phase 2 Additions)
// ---------------------------------------------------------------------------

/** Aviation aircraft telemetry entity */
export interface AircraftEntity extends GeoEntity {
  callsign: string
  originCountry: string
  baroAltitude: number
  velocity: number
  trueTrack: number
  verticalRate: number
}

/** Active environmental wildfire entity */
export interface WildfireEntity extends GeoEntity {
  brightness: number
  confidence: string
  frp: number
  satellite: string
}

// ---------------------------------------------------------------------------
// Air Quality & ACLED Conflicts (Phase 3 Additions)
// ---------------------------------------------------------------------------

/** Air Quality monitoring station entity */
export interface AirQualityEntity extends GeoEntity {
  location: string
  parameter: string
  value: number
  unit: string
}

/** ACLED geopolitical conflict event entity */
export interface AcledEventEntity extends GeoEntity {
  eventType: string
  subEventType: string
  actor1: string
  actor2: string
  country: string
  location: string
  fatalities: number
  notes: string
  source: string
}

// ---------------------------------------------------------------------------
// Webcam & Cyber Recon (Phase 4 Additions)
// ---------------------------------------------------------------------------

/** Webcam CCTV feed entity */
export interface WebcamEntity extends GeoEntity {
  streamUrl: string
  status: 'healthy' | 'degraded' | 'offline'
  type?: 'iframe_embed' | 'static_snapshot'
  provider?: 'EarthCam' | 'AMOS' | 'Windy'
}

/** ReconScan hop details */
export interface ReconHop {
  hopNumber: number
  ip: string
  lat: number
  lon: number
  pingMs: number
  isp: string
}

/** OSINT Cyber Recon Scan entity */
export interface ReconScanEntity extends GeoEntity {
  target: string
  resolvedIp: string
  country: string
  threatScore: number
  openPorts: number[]
  dnsRecords: {
    a?: string[]
    mx?: string[]
    txt?: string[]
    ns?: string[]
    cname?: string[]
    [key: string]: any
  }
  hops: ReconHop[]
}

/** Satellite tracking entity (Phase 5 Additions) */
export interface SatelliteEntity extends GeoEntity {
  noradId: number
  satelliteType: 'recon' | 'telecom' | 'military' | 'debris'
  altitudeKm: number
  inclination: number
  velocityKms: number
  tleLine1: string
  tleLine2: string
}

