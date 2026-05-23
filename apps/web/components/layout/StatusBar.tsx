'use client'

import * as React from 'react'
import { ShieldCheck, MapPin, Eye, Zap, Radio, Plane, Shield, Satellite } from 'lucide-react'
import { useMapStore } from '@panopticon/core/stores'

export default function StatusBar() {
  const { cursorLng, cursorLat, layerStates } = useMapStore()
  const [airplaneCount, setAirplaneCount] = React.useState(8240)
  const [vesselCount, setVesselCount] = React.useState(4310)
  const [satelliteCount, setSatelliteCount] = React.useState(2180)
  const [sysPing, setSysPing] = React.useState(12)

  // Increment simulated counters slightly for operational movement realism
  React.useEffect(() => {
    const timer = setInterval(() => {
      setAirplaneCount((prev) => prev + (Math.random() > 0.5 ? 1 : -1))
      setVesselCount((prev) => prev + (Math.random() > 0.5 ? 1 : -1))
      setSatelliteCount((prev) => prev + (Math.random() > 0.7 ? 1 : -1))
      setSysPing((prev) => Math.max(8, Math.min(24, prev + (Math.random() > 0.5 ? 1 : -1))))
    }, 4000)

    return () => clearInterval(timer)
  }, [])

  // Count active layers
  const activeLayersCount = React.useMemo(() => {
    const defaultLayerIds = ['earthquakes', 'weather', 'wildfires', 'airquality', 'terminator', 'gdelt', 'acled', 'aircraft', 'webcams', 'recon', 'space', 'news-events']
    let activeCount = 0
    
    // Check default layers (active by default unless explicitly disabled)
    defaultLayerIds.forEach(id => {
      if (layerStates[id]?.visible !== false) activeCount++
    })
    
    // Check custom add-on layers (active only if explicitly enabled)
    Object.keys(layerStates).forEach(id => {
      if (id.includes('-add-') && layerStates[id]?.visible === true) {
        activeCount++
      }
    })
    
    return activeCount
  }, [layerStates])

  // Format cursor coordinates
  const formattedCoords = React.useMemo(() => {
    if (cursorLng === null || cursorLat === null) {
      return 'GRID: STANDBY'
    }

    const latDir = cursorLat >= 0 ? 'N' : 'S'
    const lngDir = cursorLng >= 0 ? 'E' : 'W'

    return `${Math.abs(cursorLat).toFixed(4)}°${latDir} ${Math.abs(cursorLng).toFixed(4)}°${lngDir}`
  }, [cursorLng, cursorLat])

  return (
    <footer className="h-6 w-full flex items-center justify-between px-4 bg-[var(--pan-bg-surface)] border-t border-[var(--pan-border-default)] font-mono text-[9px] text-[var(--pan-text-secondary)] select-none z-30 shadow-inner">
      
      {/* LEFT: Coordinates & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[var(--pan-text-accent)]" />
          <span className="tabular-nums font-semibold tracking-wider text-[var(--pan-text-primary)]">
            {formattedCoords}
          </span>
        </div>
        <div className="w-px h-3 bg-[var(--pan-border-default)] hidden md:block" />
        <div className="hidden md:flex items-center gap-1.5 text-[var(--pan-text-accent)] font-bold">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>CYBER JAMMING: 12.4%</span>
        </div>
      </div>

      {/* CENTER: Active Tickers & Tactical Counts */}
      <div className="hidden lg:flex items-center gap-4">
        
        {/* Airspace Counts */}
        <div className="flex items-center gap-1">
          <Plane className="w-3.5 h-3.5 text-[var(--pan-marker-aviation)]" />
          <span className="text-[var(--pan-text-secondary)] uppercase">ADS-B:</span>
          <span className="text-[var(--pan-text-primary)] font-bold tabular-nums">{airplaneCount}</span>
        </div>

        <div className="w-px h-2.5 bg-[var(--pan-border-default)]" />

        {/* Maritime Vessel Counts */}
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-[var(--pan-marker-maritime)]" />
          <span className="text-[var(--pan-text-secondary)] uppercase">AIS:</span>
          <span className="text-[var(--pan-text-primary)] font-bold tabular-nums">{vesselCount}</span>
        </div>

        <div className="w-px h-2.5 bg-[var(--pan-border-default)]" />

        {/* Satellite Counts */}
        <div className="flex items-center gap-1">
          <Satellite className="w-3.5 h-3.5 text-[var(--pan-marker-space)]" />
          <span className="text-[var(--pan-text-secondary)] uppercase">SPACE:</span>
          <span className="text-[var(--pan-text-primary)] font-bold tabular-nums">{satelliteCount}</span>
        </div>

        <div className="w-px h-2.5 bg-[var(--pan-border-default)]" />

        {/* Active Layers */}
        <div className="flex items-center gap-1.5">
          <Eye className={`w-3.5 h-3.5 ${activeLayersCount > 0 ? 'text-[var(--pan-text-accent)]' : 'text-[var(--pan-text-secondary)]'}`} />
          <span className="text-[var(--pan-text-secondary)] uppercase">LAYERS:</span>
          <span className={`px-1.5 py-0.5 rounded font-bold tabular-nums border text-[10px] ${
            activeLayersCount > 0 
              ? 'bg-[var(--pan-btn-active-bg)] border-[var(--pan-btn-active-border)] text-[var(--pan-btn-active-text)]' 
              : 'bg-[var(--pan-btn-secondary-bg)] border-[var(--pan-border-default)] text-[var(--pan-text-secondary)]'
          }`}>
            {activeLayersCount}
          </span>
        </div>
      </div>

      {/* RIGHT: Pipeline Latency & System Health */}
      <div className="flex items-center gap-3">
        <div className={`hidden sm:flex items-center gap-1 font-semibold ${
          sysPing < 50 
            ? 'text-[var(--pan-text-accent)]' 
            : sysPing <= 200 
              ? 'text-[var(--pan-text-warning)]' 
              : 'text-[var(--pan-text-danger)]'
        }`}>
          <Zap className="w-3 h-3 animate-pulse" />
          <span className="text-[8px] uppercase tracking-wider">LATENCY: {sysPing}ms</span>
        </div>
        <div className="w-px h-3 bg-[var(--pan-border-default)] hidden sm:block" />
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-[var(--pan-text-accent)]" />
          <span className="text-[8px] uppercase tracking-wider font-semibold text-[var(--pan-text-primary)]">SYS_VERIFIED</span>
        </div>
      </div>
    </footer>
  )
}
