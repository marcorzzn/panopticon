'use client'

import * as React from 'react'
import {
  Layers,
  Thermometer,
  Activity,
  Flame,
  Globe,
  Radio,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertTriangle,
  Plane,
  Wind,
  ShieldAlert,
  Satellite,
} from 'lucide-react'
import { useMapStore } from '@panopticon/core/stores'

interface LayerRowProps {
  id: string
  label: string
  icon: React.ReactNode
  description: string
}

function LayerRow({ id, label, icon, description }: LayerRowProps) {
  const { layerStates, toggleLayer } = useMapStore()
  
  // Layer is active by default if not explicitly turned off
  const isVisible = layerStates[id]?.visible !== false
  const entityCount = layerStates[id]?.entityCount ?? 0
  const error = layerStates[id]?.error

  return (
    <div
      onClick={() => toggleLayer(id)}
      className={`group p-3 border-b border-weak hover:bg-hover hover:bg-opacity-30 transition-all cursor-pointer select-none ${
        isVisible ? 'bg-accent bg-opacity-[0.02]' : 'opacity-65'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded transition-all ${
              isVisible ? 'bg-accent bg-opacity-15 text-accent border border-accent border-opacity-20' : 'bg-deepest text-secondary border border-weak'
            }`}
          >
            {icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wide text-primary uppercase">
              {label}
            </span>
            <span className="text-[10px] text-secondary leading-tight mt-0.5 max-w-[150px] truncate">
              {description}
            </span>
          </div>
        </div>

        {/* Right switch and count */}
        <div className="flex items-center gap-2">
          {error ? (
            <span title={error}>
              <AlertTriangle className="w-3.5 h-3.5 text-status-critical-text" />
            </span>
          ) : isVisible && entityCount > 0 ? (
            <span className="text-[9px] font-mono font-semibold px-1 rounded bg-deepest border border-weak text-accent tabular-nums">
              {entityCount}
            </span>
          ) : null}
          
          <div
            className={`w-6 h-3.5 rounded-full p-0.5 transition-colors relative ${
              isVisible ? 'bg-accent' : 'bg-deepest border border-weak'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                isVisible ? 'translate-x-2.5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LayerPanel() {
  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Drawer Title Header */}
      <div className="p-4 border-b border-weak flex items-center justify-between bg-deepest bg-opacity-30">
        <div className="flex items-center gap-2 text-primary font-display text-xs font-bold uppercase tracking-wider">
          <Layers className="w-4 h-4 text-accent" />
          <span>Operational Domains</span>
        </div>
        <span className="text-[8px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border border-accent border-opacity-35 text-accent bg-accent bg-opacity-[0.03] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.3)]">
          PHASE 5 ACTIVE
        </span>
      </div>

      {/* Layer Groups Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* DOMAIN 1: CLIMATE & ENVIRONMENTAL RECON */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-deepest bg-opacity-50 border-b border-weak">
            <span className="label-caps font-semibold text-[9px] tracking-widest text-secondary block">
              CLIMATE & ENVIRONMENTAL RECON
            </span>
          </div>

          <LayerRow
            id="earthquakes"
            label="USGS Earthquakes"
            icon={<Activity className="w-3.5 h-3.5" />}
            description="Real-time seismic activity monitor"
          />

          <LayerRow
            id="weather"
            label="Open-Meteo Climate"
            icon={<Thermometer className="w-3.5 h-3.5" />}
            description="Global atmospheric temperature cells"
          />

          <LayerRow
            id="wildfires"
            label="NASA FIRMS Wildfires"
            icon={<Flame className="w-3.5 h-3.5" />}
            description="Thermal hotspot anomalies detector"
          />

          <LayerRow
            id="airquality"
            label="OpenAQ Air Quality"
            icon={<Wind className="w-3.5 h-3.5" />}
            description="Real-time particulate matter index"
          />

          <LayerRow
            id="terminator"
            label="Solar Terminator"
            icon={<Sun className="w-3.5 h-3.5" />}
            description="Dynamic day/night shadows overlay"
          />
        </div>

        {/* DOMAIN 2: GEOPOLITICAL & MEDIA RECON */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-deepest bg-opacity-50 border-b border-weak">
            <span className="label-caps font-semibold text-[9px] tracking-widest text-secondary block">
              GEOPOLITICAL & MEDIA RECON
            </span>
          </div>

          <LayerRow
            id="gdelt"
            label="GDELT Events Monitor"
            icon={<Globe className="w-3.5 h-3.5" />}
            description="Geocoded real-time conflict/cooperation feeds"
          />

          <LayerRow
            id="acled"
            label="ACLED Conflicts"
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            description="Geopolitical armed conflict and protest dispatches"
          />
        </div>

        {/* DOMAIN 3: AIRSPACE & AVIATION INTELLIGENCE */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-deepest bg-opacity-50 border-b border-weak">
            <span className="label-caps font-semibold text-[9px] tracking-widest text-secondary block">
              AIRSPACE & AVIATION INTELLIGENCE
            </span>
          </div>

          <LayerRow
            id="aircraft"
            label="OpenSky ADS-B Feeds"
            icon={<Plane className="w-3.5 h-3.5" />}
            description="Real-time active flight tracking radar"
          />
        </div>

        {/* DOMAIN 4: OSINT & CYBER INTELLIGENCE */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-deepest bg-opacity-50 border-b border-weak">
            <span className="label-caps font-semibold text-[9px] tracking-widest text-secondary block">
              OSINT & CYBER INTELLIGENCE
            </span>
          </div>

          <LayerRow
            id="webcams"
            label="Global CCTV Network"
            icon={<Eye className="w-3.5 h-3.5" />}
            description="Live tactical camera feeds and surveillance endpoints"
          />

          <LayerRow
            id="recon"
            label="OSINT Cyber Recon"
            icon={<Radio className="w-3.5 h-3.5" />}
            description="Simulated geolocated port traceroute scans"
          />
        </div>

        {/* DOMAIN 5: SPACE & ORBITAL INTELLIGENCE */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-deepest bg-opacity-50 border-b border-weak">
            <span className="label-caps font-semibold text-[9px] tracking-widest text-secondary block">
              SPACE & ORBITAL INTELLIGENCE
            </span>
          </div>

          <LayerRow
            id="space"
            label="Satellite Tracking Network"
            icon={<Satellite className="w-3.5 h-3.5" />}
            description="Real-time orbital propagation and sweep sensor swathes"
          />
        </div>
      </div>
    </div>
  )
}
