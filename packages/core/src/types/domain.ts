/** All intelligence domains supported by Panopticon */
export enum IntelligenceDomain {
  GEOPOLITICAL = 'geopolitical',
  FINANCIAL = 'financial',
  CLIMATE = 'climate',
  AVIATION = 'aviation',
  SPACE = 'space',
  CYBER = 'cyber',
  HEALTH = 'health',
  MILITARY = 'military',
  HUMANITARIAN = 'humanitarian',
  ENERGY = 'energy',
  TRANSPORT = 'transport',
  MARITIME = 'maritime',
}

export interface DomainConfig {
  /** Domain identifier */
  id: IntelligenceDomain
  /** Full human-readable label */
  label: string
  /** Abbreviated label for compact UI */
  shortLabel: string
  /** Lucide icon name */
  icon: string
  /** CSS custom property name for domain color */
  color: string
  /** Brief description of the domain's scope */
  description: string
  /** Whether this domain is currently enabled */
  enabled: boolean
  /** Implementation phase (1 = MVP, 2 = next, etc.) */
  phase: number
}

/** Full configuration for every intelligence domain */
export const DOMAIN_CONFIGS: Record<IntelligenceDomain, DomainConfig> = {
  [IntelligenceDomain.GEOPOLITICAL]: {
    id: IntelligenceDomain.GEOPOLITICAL,
    label: 'Geopolitical Intelligence',
    shortLabel: 'Geopolitical',
    icon: 'globe',
    color: '--domain-geopolitical',
    description:
      'Global political events, conflicts, diplomatic relations, and governance shifts sourced from GDELT and ACLED.',
    enabled: true,
    phase: 1,
  },
  [IntelligenceDomain.FINANCIAL]: {
    id: IntelligenceDomain.FINANCIAL,
    label: 'Financial Intelligence',
    shortLabel: 'Financial',
    icon: 'trending-up',
    color: '--domain-financial',
    description:
      'Market movements, economic indicators, trade flows, and fiscal policy signals from global exchanges.',
    enabled: true,
    phase: 2,
  },
  [IntelligenceDomain.CLIMATE]: {
    id: IntelligenceDomain.CLIMATE,
    label: 'Climate & Weather Intelligence',
    shortLabel: 'Climate',
    icon: 'cloud',
    color: '--domain-climate',
    description:
      'Real-time weather, seismic activity, climate anomalies, and natural hazard monitoring from USGS and Open-Meteo.',
    enabled: true,
    phase: 1,
  },
  [IntelligenceDomain.AVIATION]: {
    id: IntelligenceDomain.AVIATION,
    label: 'Aviation Intelligence',
    shortLabel: 'Aviation',
    icon: 'plane',
    color: '--domain-aviation',
    description:
      'Live air traffic tracking, flight patterns, airspace restrictions, and aviation incident awareness.',
    enabled: true,
    phase: 2,
  },
  [IntelligenceDomain.SPACE]: {
    id: IntelligenceDomain.SPACE,
    label: 'Space & Orbital Intelligence',
    shortLabel: 'Space',
    icon: 'satellite',
    color: '--domain-space',
    description:
      'Satellite tracking, space weather, orbital debris monitoring, and launch activity from NOAA SWPC and CelesTrak.',
    enabled: true,
    phase: 1,
  },
  [IntelligenceDomain.CYBER]: {
    id: IntelligenceDomain.CYBER,
    label: 'Cyber Intelligence',
    shortLabel: 'Cyber',
    icon: 'shield',
    color: '--domain-cyber',
    description:
      'Threat intelligence feeds, vulnerability disclosures, botnet activity, and global cyber-attack patterns.',
    enabled: true,
    phase: 3,
  },
  [IntelligenceDomain.HEALTH]: {
    id: IntelligenceDomain.HEALTH,
    label: 'Health Intelligence',
    shortLabel: 'Health',
    icon: 'heart-pulse',
    color: '--domain-health',
    description:
      'Disease outbreak tracking, epidemiological data, WHO alerts, and pandemic preparedness indicators.',
    enabled: false,
    phase: 3,
  },
  [IntelligenceDomain.MILITARY]: {
    id: IntelligenceDomain.MILITARY,
    label: 'Military Intelligence',
    shortLabel: 'Military',
    icon: 'swords',
    color: '--domain-military',
    description:
      'Open-source military movements, defense posture changes, arms transfers, and conflict zone monitoring.',
    enabled: false,
    phase: 3,
  },
  [IntelligenceDomain.HUMANITARIAN]: {
    id: IntelligenceDomain.HUMANITARIAN,
    label: 'Humanitarian Intelligence',
    shortLabel: 'Humanitarian',
    icon: 'hand-helping',
    color: '--domain-humanitarian',
    description:
      'Refugee flows, humanitarian crises, aid distribution, and displacement tracking from UNHCR and ReliefWeb.',
    enabled: false,
    phase: 3,
  },
  [IntelligenceDomain.ENERGY]: {
    id: IntelligenceDomain.ENERGY,
    label: 'Energy Intelligence',
    shortLabel: 'Energy',
    icon: 'zap',
    color: '--domain-energy',
    description:
      'Global energy production, grid stability, oil/gas flows, renewable output, and infrastructure status.',
    enabled: true,
    phase: 2,
  },
  [IntelligenceDomain.TRANSPORT]: {
    id: IntelligenceDomain.TRANSPORT,
    label: 'Transport Intelligence',
    shortLabel: 'Transport',
    icon: 'truck',
    color: '--domain-transport',
    description:
      'Ground logistics, rail networks, supply chain chokepoints, and cross-border transport monitoring.',
    enabled: false,
    phase: 3,
  },
  [IntelligenceDomain.MARITIME]: {
    id: IntelligenceDomain.MARITIME,
    label: 'Maritime Intelligence',
    shortLabel: 'Maritime',
    icon: 'ship',
    color: '--domain-maritime',
    description:
      'AIS vessel tracking, port activity, shipping lanes, piracy alerts, and maritime domain awareness.',
    enabled: true,
    phase: 2,
  },
}
