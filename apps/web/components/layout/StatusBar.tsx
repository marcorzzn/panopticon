'use client'

import * as React from 'react'
import { ShieldCheck, MapPin, Eye, Zap } from 'lucide-react'
import { useMapStore } from '@panopticon/core/stores'

export default function StatusBar() {
  const { cursorLng, cursorLat, layerStates } = useMapStore()

  // Count active layers (layers with visible !== false)
  const activeLayersCount = React.useMemo(() => {
    return Object.values(layerStates).filter((layer) => layer.visible !== false).length
  }, [layerStates])

  // Format cursor coordinates
  const formattedCoords = React.useMemo(() => {
    if (cursorLng === null || cursorLat === null) {
      return 'STANDBY — CAMERA STATIC'
    }

    const latDir = cursorLat >= 0 ? 'N' : 'S'
    const lngDir = cursorLng >= 0 ? 'E' : 'W'

    return `LAT: ${Math.abs(cursorLat).toFixed(5)}° ${latDir} | LNG: ${Math.abs(cursorLng).toFixed(5)}° ${lngDir}`
  }, [cursorLng, cursorLat])

  return (
    <footer className="h-6 w-full flex items-center justify-between px-4 bg-deepest border-t border-weak font-mono text-[10px] text-secondary select-none z-30 shadow-inner">
      {/* LEFT: Cursor Coordinates */}
      <div className="flex items-center gap-2">
        <MapPin className="w-3 h-3 text-accent" />
        <span className="tabular-nums font-medium tracking-wider text-primary">
          {formattedCoords}
        </span>
      </div>

      {/* CENTER: Active Layers Display */}
      <div className="hidden sm:flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-secondary" />
        <span className="uppercase text-secondary font-medium tracking-wide">
          ACTIVE OPERATIONAL LAYERS:
        </span>
        <span className="px-1.5 py-0.5 rounded bg-accent bg-opacity-15 border border-accent border-opacity-30 text-accent font-semibold tabular-nums">
          {activeLayersCount}
        </span>
      </div>

      {/* RIGHT: Pipeline latency and security indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-status-ok-text bg-status-ok-bg px-2 py-0.5 rounded border border-status-ok border-opacity-30">
          <Zap className="w-3 h-3 animate-pulse" />
          <span className="uppercase font-semibold tracking-wider text-[9px]">SOCKET DUPLEX SECURE</span>
        </div>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-status-ok-text" />
          <span className="text-[9px] uppercase tracking-wider font-semibold text-primary">SYS.OK</span>
        </div>
      </div>
    </footer>
  )
}
