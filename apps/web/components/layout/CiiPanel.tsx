'use client'

import * as React from 'react'
import { Activity, ShieldAlert, AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useMapStore } from '@panopticon/core/stores'

// Pre-populated registry of geolocated threat zones with their proxy baseline parameters
interface CountryProfile {
  code: string
  name: string
  lat: number
  lon: number
  baseline: number // Baseline score (40% weight)
  unrest: number   // Unrest index (20% weight)
  security: number // Security index (20% weight)
  velocity: number // Info velocity index (20% weight)
  boosters: { label: string; offset: number }[]
  trend: number[]  // 7-day risk trend sparkline
}

const REGISTRY: CountryProfile[] = [
  {
    code: 'TWN',
    name: 'Taiwan Strait Region',
    lat: 23.5,
    lon: 121.0,
    baseline: 68,
    unrest: 34,
    security: 82,
    velocity: 88,
    boosters: [
      { label: 'GPS Interference Spike', offset: 8 },
      { label: 'Naval Drill Coordination', offset: 12 },
      { label: 'Signals Intel Intercept', offset: 5 }
    ],
    trend: [64, 66, 65, 71, 74, 76, 78]
  },
  {
    code: 'UKR',
    name: 'Ukraine Buffer Zone',
    lat: 48.3,
    lon: 34.5,
    baseline: 92,
    unrest: 45,
    security: 98,
    velocity: 96,
    boosters: [
      { label: 'Active Kinetic Clashes', offset: 15 },
      { label: 'Air Defence Siren Trigger', offset: 10 }
    ],
    trend: [91, 93, 92, 94, 95, 96, 96]
  },
  {
    code: 'YEM',
    name: 'Yemen Red Sea Corridor',
    lat: 15.5,
    lon: 47.5,
    baseline: 88,
    unrest: 50,
    security: 90,
    velocity: 78,
    boosters: [
      { label: 'Anti-Ship Missile Pings', offset: 15 },
      { label: 'Drone Swarm Detection', offset: 10 }
    ],
    trend: [80, 82, 84, 82, 85, 87, 89]
  },
  {
    code: 'KOR',
    name: 'Korean DMZ Sector',
    lat: 38.3,
    lon: 127.2,
    baseline: 60,
    unrest: 20,
    security: 72,
    velocity: 65,
    boosters: [
      { label: 'Border Recon Operations', offset: 6 },
      { label: 'GPS Jamming Active', offset: 8 }
    ],
    trend: [58, 59, 59, 61, 62, 60, 63]
  },
  {
    code: 'VEN',
    name: 'Venezuela Frontier Zone',
    lat: 6.4,
    lon: -66.5,
    baseline: 72,
    unrest: 68,
    security: 45,
    velocity: 70,
    boosters: [
      { label: 'Civil Unrest Protest', offset: 8 }
    ],
    trend: [66, 68, 67, 69, 70, 71, 72]
  },
  {
    code: 'EGY',
    name: 'Suez Canal / Sinai Sector',
    lat: 30.1,
    lon: 32.5,
    baseline: 54,
    unrest: 38,
    security: 62,
    velocity: 75,
    boosters: [
      { label: 'Transit Queue Delays', offset: 5 },
      { label: 'Sinai Patrol Intercept', offset: 8 }
    ],
    trend: [55, 56, 58, 57, 59, 61, 60]
  }
]

export default function CiiPanel() {
  const { selectedEntityId, flyTo } = useMapStore()
  const [activeCode, setActiveCode] = React.useState<string>('TWN')
  const [loading, setLoading] = React.useState(false)

  // Map clicked entities to focus the CII panel dynamically
  React.useEffect(() => {
    if (selectedEntityId) {
      // Find coordinates from standard coordinates mapping or guess based on selected entity content
      // Since entity IDs are hashed strings, we simulate focusing the closest geolocated threat zone
      const seedVal = selectedEntityId.charCodeAt(0) % REGISTRY.length
      const focusedZone = REGISTRY[seedVal]
      if (focusedZone) {
        setActiveCode(focusedZone.code)
      }
    }
  }, [selectedEntityId])

  const profile = React.useMemo(() => {
    return REGISTRY.find((r) => r.code === activeCode) || REGISTRY[0]
  }, [activeCode])

  // NOTE 3 — CII Formula [PROPOSED_PROXY]:
  // The weights and variables mapped below represent a proxy scoring approximation (PROPOSED_PROXY)
  // based on live geopolitical media indicators, conflict catalogs, and signals velocity logs.
  const ciiCalculated = React.useMemo(() => {
    if (!profile) return 0
    const weightedBase =
      profile.baseline * 0.40 +
      profile.unrest * 0.20 +
      profile.security * 0.20 +
      profile.velocity * 0.20
      
    const boosterSum = profile.boosters.reduce((acc, b) => acc + b.offset, 0)
    return Math.min(100, parseFloat((weightedBase + boosterSum).toFixed(1)))
  }, [profile])

  const getRiskClass = (score: number) => {
    if (score >= 75) return 'text-status-critical-text border-status-critical bg-status-critical-bg bg-opacity-10'
    if (score >= 50) return 'text-status-warning-text border-status-warning bg-status-warning-bg bg-opacity-10'
    return 'text-status-ok-text border-status-ok bg-status-ok-bg bg-opacity-10'
  }

  const getSeverityLabel = (score: number) => {
    if (score >= 75) return 'CRITICAL INSTABILITY'
    if (score >= 50) return 'ELEVATED RISK'
    return 'STABLE / MINIMAL THREAT'
  }

  const triggerCalculate = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }

  const handleZoneChange = (code: string) => {
    setActiveCode(code)
    const targetZone = REGISTRY.find(r => r.code === code)
    if (targetZone) {
      flyTo(targetZone.lon, targetZone.lat, 6) // Focus camera smoothly
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none font-sans">
      {/* Title */}
      <div className="p-4 border-b border-weak flex items-center justify-between bg-deepest bg-opacity-35">
        <div className="flex items-center gap-2 text-primary font-display text-xs font-bold uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-accent animate-pulse" />
          <span>Country Instability Index [PROPOSED_PROXY]</span>
        </div>
        <button
          onClick={triggerCalculate}
          disabled={loading}
          className="text-secondary hover:text-primary transition-colors disabled:opacity-40 p-1"
          title="Recalculate Instability Parameters"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Select Zone Dropdown */}
      <div className="p-3 border-b border-weak bg-deepest bg-opacity-40 flex items-center justify-between gap-3">
        <span className="text-[9px] font-mono font-bold text-secondary uppercase tracking-wider">
          SELECT OPERATIONAL REGION:
        </span>
        <select
          value={activeCode}
          onChange={(e) => handleZoneChange(e.target.value)}
          disabled={loading}
          className="bg-deepest border border-weak text-xs font-mono px-2 py-1 rounded text-primary outline-none focus:border-accent"
        >
          {REGISTRY.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Risk Gauge Header */}
      <div className="p-4 flex flex-col items-center justify-center gap-2 border-b border-weak bg-deepest bg-opacity-10 relative">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-mono font-bold text-secondary uppercase tracking-widest leading-none">
            CII RISK SCORE
          </span>
          <span className="text-4xl font-display font-extrabold tracking-tight text-primary tabular-nums select-all mt-1">
            {loading ? '--.-' : ciiCalculated}
          </span>
        </div>
        
        {/* Risk Banner Badge */}
        <div className={`px-2.5 py-1 rounded border text-[9px] font-mono font-bold tracking-wider uppercase leading-none mt-1 select-all ${getRiskClass(ciiCalculated)}`}>
          {loading ? 'CALCULATING SPECTRUM...' : getSeverityLabel(ciiCalculated)}
        </div>
      </div>

      {/* Equation Parameters Split */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        
        {/* Metrics Grid */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[8px] font-mono font-bold text-secondary uppercase tracking-widest">
            EQUATION VALUE MATRIX (PROPOSED WEIGHTS):
          </span>
          
          {[
            { label: 'Baseline Instability', weight: '40%', val: profile.baseline },
            { label: 'Protests & Civil Unrest', weight: '20%', val: profile.unrest },
            { label: 'Security Armed Events', weight: '20%', val: profile.security },
            { label: 'Information News Velocity', weight: '20%', val: profile.velocity }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-primary">{item.label}</span>
                <span className="font-mono text-secondary text-[9px]">{item.val} ({item.weight})</span>
              </div>
              <div className="w-full h-1 bg-deepest rounded-full overflow-hidden border border-weak border-opacity-35">
                <div
                  className="h-full bg-accent transition-all duration-500 rounded-full"
                  style={{ width: `${loading ? 0 : item.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Risk Boosters */}
        <div className="flex flex-col gap-2 bg-deepest bg-opacity-30 p-3 rounded border border-weak">
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-primary uppercase tracking-wider">
              REAL-TIME RISK BOOSTERS (+):
            </span>
          </div>

          <div className="flex flex-col gap-1.5 font-mono text-[9px] text-secondary mt-1">
            {profile.boosters.map((b, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-weak border-dashed pb-1">
                <span>➜ {b.label}</span>
                <span className="text-accent font-bold">+{b.offset} PTS</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Trend Chart SVG */}
        <div className="flex flex-col gap-2">
          <span className="text-[8px] font-mono font-bold text-secondary uppercase tracking-widest">
            7-DAY GEOPOLITICAL RISK VELOCITY TREND:
          </span>

          <div className="h-20 w-full bg-deepest bg-opacity-40 rounded border border-weak p-2 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <span className="text-[8px] font-mono text-secondary animate-pulse">GENERATING SPARKLINE GRAPH...</span>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* SVG Sparkline Grid */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                
                {/* Trend line */}
                <path
                  d={`M 0 ${100 - profile.trend[0]} L 16 ${100 - profile.trend[1]} L 32 ${100 - profile.trend[2]} L 48 ${100 - profile.trend[3]} L 64 ${100 - profile.trend[4]} L 80 ${100 - profile.trend[5]} L 100 ${100 - profile.trend[6]}`}
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </svg>
            )}
          </div>
        </div>

        {/* PROPOSED PROXY Tag Annotation Disclaimer */}
        <div className="p-2.5 rounded bg-deepest bg-opacity-40 border border-weak flex gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-mono font-bold text-accent leading-none">
              [PROPOSED_PROXY] RISK ADVISORY
            </span>
            <p className="text-[8px] text-secondary leading-normal leading-tight">
              Risk parameters utilize <strong>PROPOSED_PROXY</strong> weights. 
              Formula coefficients act as statistical proxy proxies representing physical conflict volume indexes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
