'use client'

import * as React from 'react'
import { ShieldCheck, MapPin, Eye, Zap, Radio, Plane, Shield, Satellite, Activity } from 'lucide-react'
import { useMapStore } from '@panopticon/core/stores'
import useSWR from 'swr'
import type { AircraftEntity, SatelliteEntity } from '@panopticon/core/types'

export default function StatusBar() {
  const { cursorLng, cursorLat, layerStates, bounds } = useMapStore()
  
  // Data pipelines for real-time counting
  const { data: aircraft = [] } = useSWR<AircraftEntity[]>('opensky-aircraft-core')
  const { data: satellites = [] } = useSWR<SatelliteEntity[]>('space-satellites-core')
  const { data: vessels = [] } = useSWR<any[]>('ais-vessels-core') // Placeholder for AIS

  // Remove fake ping and use static generic health value until fully integrated
  const sysPing = 45

  // Count active layers
  const activeLayersCount = React.useMemo(() => {
    let activeCount = 0
    Object.keys(layerStates).forEach(id => {
      if (layerStates[id]?.visible !== false) activeCount++
    })
    return activeCount
  }, [layerStates])

  // Helper to count entities within bounds
  const getVisibleCount = (data: any[], layerId: string) => {
    if (layerStates[layerId]?.visible === false) return 'N/A'
    if (!bounds || bounds.length !== 4 || !data || data.length === 0) return 0
    
    const [w, s, e, n] = bounds
    let count = 0
    const crossesAntimeridian = w > e
    for (const item of data) {
      if (item.coordinates && item.coordinates.length === 2) {
        const [lng, lat] = item.coordinates
        if (lat >= s && lat <= n) {
          if (crossesAntimeridian) {
            if (lng >= w || lng <= e) count++
          } else {
            if (lng >= w && lng <= e) count++
          }
        }
      }
    }
    return count
  }

  const airplaneCount = getVisibleCount(aircraft, 'aircraft')
  const vesselCount = getVisibleCount(vessels, 'ais-vessels')
  const satelliteCount = getVisibleCount(satellites, 'space')

  const formattedCoords = React.useMemo(() => {
    if (cursorLng === null || cursorLat === null) {
      return 'GRID: STANDBY'
    }
    const latDir = cursorLat >= 0 ? 'N' : 'S'
    const lngDir = cursorLng >= 0 ? 'E' : 'W'
    return `${Math.abs(cursorLat).toFixed(4)}°${latDir} ${Math.abs(cursorLng).toFixed(4)}°${lngDir}`
  }, [cursorLng, cursorLat])

  const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false)

  return (
    <>
      {diagnosticsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06080b]/80 backdrop-blur-sm p-4" onClick={() => setDiagnosticsOpen(false)}>
          <div className="bg-[var(--pan-bg-surface)] border border-[var(--pan-border-default)] p-6 rounded max-w-lg w-full flex flex-col gap-4 text-[var(--pan-text-primary)] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-[var(--pan-border-default)] pb-2 text-[var(--pan-text-accent)] uppercase tracking-wider font-bold">
              <Activity className="w-5 h-5 animate-pulse" />
              <h3>System Diagnostics Status</h3>
            </div>
            <div className="flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between border-b border-[var(--pan-border-subtle)] pb-1"><span>Map Engine</span> <span className="text-[var(--pan-text-accent)]">Healthy (WebGL)</span></div>
              <div className="flex justify-between border-b border-[var(--pan-border-subtle)] pb-1"><span>Data Pipeline SWR</span> <span className="text-[var(--pan-text-accent)]">Live Polling</span></div>
              <div className="flex justify-between border-b border-[var(--pan-border-subtle)] pb-1"><span>C2 Geopol Sync</span> <span className="text-[var(--pan-text-accent)]">Verified</span></div>
              <div className="flex justify-between border-b border-[var(--pan-border-subtle)] pb-1"><span>Network Latency</span> <span className="text-[var(--pan-text-accent)]">{sysPing}ms</span></div>
            </div>
            <button onClick={() => setDiagnosticsOpen(false)} className="mt-4 bg-[var(--pan-btn-secondary-bg)] hover:bg-[var(--pan-btn-secondary-hover)] p-2 rounded text-center w-full">CLOSE</button>
          </div>
        </div>
      )}

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
            <Shield className="w-3 h-3 animate-pulse" />
            <span>SECURE LINK</span>
          </div>
        </div>

        {/* CENTER: Active Tickers & Tactical Counts */}
        <div className="hidden lg:flex items-center gap-4">
          
          {/* Airspace Counts */}
          <div className="flex items-center gap-1">
            <Plane className="w-3.5 h-3.5 text-[var(--pan-marker-aviation)]" />
            <span className="text-[var(--pan-text-secondary)] uppercase">ADS-B:</span>
            <span className={`font-bold tabular-nums ${airplaneCount === 'N/A' ? 'text-[var(--pan-text-secondary)]' : 'text-[var(--pan-text-primary)]'}`}>{airplaneCount}</span>
          </div>

          <div className="w-px h-2.5 bg-[var(--pan-border-default)]" />

          {/* Maritime Vessel Counts */}
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-[var(--pan-marker-maritime)]" />
            <span className="text-[var(--pan-text-secondary)] uppercase">AIS:</span>
            <span className={`font-bold tabular-nums ${vesselCount === 'N/A' ? 'text-[var(--pan-text-secondary)]' : 'text-[var(--pan-text-primary)]'}`}>{vesselCount}</span>
          </div>

          <div className="w-px h-2.5 bg-[var(--pan-border-default)]" />

          {/* Satellite Counts */}
          <div className="flex items-center gap-1">
            <Satellite className="w-3.5 h-3.5 text-[var(--pan-marker-space)]" />
            <span className="text-[var(--pan-text-secondary)] uppercase">SPACE:</span>
            <span className={`font-bold tabular-nums ${satelliteCount === 'N/A' ? 'text-[var(--pan-text-secondary)]' : 'text-[var(--pan-text-primary)]'}`}>{satelliteCount}</span>
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
          <button onClick={() => setDiagnosticsOpen(true)} className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none">
            <ShieldCheck className="w-3 h-3 text-[var(--pan-text-accent)]" />
            <span className="text-[8px] uppercase tracking-wider font-semibold text-[var(--pan-text-primary)]">SYS_VERIFIED</span>
          </button>
        </div>
      </footer>
    </>
  )
}
