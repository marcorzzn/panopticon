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
    <footer className="h-6 w-full flex items-center justify-between px-4 bg-[#03060d] border-t border-weak font-mono text-[9px] text-secondary select-none z-30 shadow-inner">
      
      {/* LEFT: Coordinates & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-accent" />
          <span className="tabular-nums font-semibold tracking-wider text-primary">
            {formattedCoords}
          </span>
        </div>
        <div className="w-px h-3 bg-border-weak hidden md:block" />
        <div className="hidden md:flex items-center gap-1.5 text-accent font-bold">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>CYBER JAMMING: 12.4%</span>
        </div>
      </div>

      {/* CENTER: Active Tickers & Tactical Counts */}
      <div className="hidden lg:flex items-center gap-4">
        
        {/* Airspace Counts */}
        <div className="flex items-center gap-1">
          <Plane className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-secondary uppercase">ADS-B:</span>
          <span className="text-primary font-bold tabular-nums">{airplaneCount}</span>
        </div>

        <div className="w-px h-2.5 bg-border-weak" />

        {/* Maritime Vessel Counts */}
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-blue-400" />
          <span className="text-secondary uppercase">AIS:</span>
          <span className="text-primary font-bold tabular-nums">{vesselCount}</span>
        </div>

        <div className="w-px h-2.5 bg-border-weak" />

        {/* Satellite Counts */}
        <div className="flex items-center gap-1">
          <Satellite className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-secondary uppercase">SPACE:</span>
          <span className="text-primary font-bold tabular-nums">{satelliteCount}</span>
        </div>

        <div className="w-px h-2.5 bg-border-weak" />

        {/* Active Layers */}
        <div className="flex items-center gap-1.5">
          <Eye className={`w-3.5 h-3.5 ${activeLayersCount > 0 ? 'text-[#34c759]' : 'text-accent'}`} />
          <span className="text-secondary uppercase">LAYERS:</span>
          <span className={`px-1 rounded font-bold tabular-nums border ${
            activeLayersCount > 0 
              ? 'bg-[#34c759]/10 border-[#34c759]/30 text-[#34c759]' 
              : 'bg-accent bg-opacity-15 border-accent border-opacity-30 text-accent'
          }`}>
            {activeLayersCount}
          </span>
        </div>
      </div>

      {/* RIGHT: Pipeline Latency & System Health */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1 text-emerald-400 font-semibold">
          <Zap className="w-3 h-3 animate-pulse" />
          <span className="text-[8px] uppercase tracking-wider">LATENCY: {sysPing}ms</span>
        </div>
        <div className="w-px h-3 bg-border-weak hidden sm:block" />
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-status-ok-text" />
          <span className="text-[8px] uppercase tracking-wider font-semibold text-primary">SYS_VERIFIED</span>
        </div>
      </div>
    </footer>
  )
}
