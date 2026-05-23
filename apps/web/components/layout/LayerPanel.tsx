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
  AlertTriangle,
  Plane,
  Wind,
  ShieldAlert,
  Satellite,
  ChevronDown,
  ChevronRight,
  Sun,
  Rss,
  Shield,
  Lock,
  MapPin,
  Network,
  Cpu,
  Database,
  LockKeyhole
} from 'lucide-react'
import { useMapStore } from '@panopticon/core/stores'

interface LayerRowProps {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  locked?: boolean
}

function LayerRow({ id, label, icon, description, locked }: LayerRowProps) {
  const { layerStates, toggleLayer } = useMapStore()
  
  // Layer is active by default if not explicitly turned off (except for custom add-ons)
  const isCustom = id.includes('-add-')
  const isVisible = isCustom
    ? layerStates[id]?.visible === true
    : layerStates[id]?.visible !== false
  const entityCount = layerStates[id]?.entityCount ?? 0
  const error = layerStates[id]?.error

  const handleClick = () => {
    if (locked) return
    toggleLayer(id)
  }

  return (
    <div
      onClick={handleClick}
      title={description}
      className={`group p-3 border-b border-[var(--pan-border-default)] hover:bg-[var(--pan-bg-interactive)] transition-all select-none border-l-2 ${
        locked
          ? 'opacity-40 cursor-not-allowed border-l-transparent bg-transparent'
          : isVisible
            ? 'bg-[var(--pan-btn-active-bg)] border-l-[var(--pan-btn-active-border)] cursor-pointer'
            : 'border-l-transparent bg-transparent opacity-70 hover:opacity-100 cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded transition-all ${
              locked
                ? 'bg-[var(--pan-bg-raised)] text-[var(--pan-text-secondary)] border border-[var(--pan-border-default)]'
                : isVisible
                  ? 'bg-[var(--pan-btn-active-bg)] text-[var(--pan-btn-active-text)] border border-[var(--pan-btn-active-border)]'
                  : 'bg-[var(--pan-bg-raised)] text-[var(--pan-text-secondary)] border border-[var(--pan-border-default)]'
            }`}
          >
            {icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wide text-[var(--pan-text-primary)] uppercase flex items-center gap-1.5">
              {label}
              {locked && <span className="text-[7px] px-1 rounded bg-[var(--pan-sev-critical-bg)] text-[var(--pan-sev-critical-text)] border border-[var(--pan-sev-critical-border)] scale-90">LOCKED</span>}
            </span>
            <span 
              title={description}
              className="text-[10px] text-[var(--pan-text-secondary)] leading-tight mt-0.5 max-w-[140px] truncate block"
            >
              {description}
            </span>
          </div>
        </div>

        {/* Right switch and count */}
        <div className="flex items-center gap-2">
          {error ? (
            <span title={error}>
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--pan-text-danger)]" />
            </span>
          ) : isVisible && entityCount > 0 && !locked ? (
            <span className="text-[9px] font-mono font-semibold px-1 rounded bg-[var(--pan-bg-base)] border border-[var(--pan-border-default)] text-[var(--pan-text-accent)] tabular-nums">
              {entityCount}
            </span>
          ) : null}
          
          {locked ? (
            <Lock className="w-3 h-3 text-[var(--pan-text-secondary)]" />
          ) : (
            <div
              className={`w-6 h-3.5 rounded-full p-0.5 transition-colors relative ${
                isVisible ? 'bg-[var(--pan-text-accent)]' : 'bg-[var(--pan-bg-base)] border border-[var(--pan-border-default)]'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                  isVisible ? 'translate-x-2.5' : 'translate-x-0'
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LayerPanel() {
  const { setLayerVisible } = useMapStore()
  
  const [conflictOpen, setConflictOpen] = React.useState(true)
  const [humanOpen, setHumanOpen] = React.useState(true)
  const [hazardOpen, setHazardOpen] = React.useState(true)
  const [maritimeOpen, setMaritimeOpen] = React.useState(true)
  const [aviationOpen, setAviationOpen] = React.useState(true)
  const [osintOpen, setOsintOpen] = React.useState(true)
  const [spaceOpen, setSpaceOpen] = React.useState(true)
  const [infraOpen, setInfraOpen] = React.useState(false)

  const activeLayerIds = [
    'earthquakes',
    'weather',
    'wildfires',
    'airquality',
    'terminator',
    'gdelt',
    'acled',
    'news-events',
    'aircraft',
    'webcams',
    'recon',
    'space',
    'iss-position',
    'space-weather',
    'active-conflicts',
    'protest-unrest',
    'organized-crime',
    'drug-corridors',
    'terrorism',
    'humanitarian-crises',
    'refugee-movements',
    'ais-vessels',
    'maritime-incidents',
    'undersea-cables',
    'aviation-incidents',
    'no-fly-zones'
  ]

  const handleActivateAll = () => {
    activeLayerIds.forEach(id => {
      setLayerVisible(id, true)
    })
  }

  const handleDeactivateAll = () => {
    activeLayerIds.forEach(id => {
      setLayerVisible(id, false)
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      
      {/* Drawer Title Header */}
      <div className="p-4 border-b border-[var(--pan-border-default)] flex items-center justify-between bg-[var(--pan-bg-surface)]">
        <div className="flex items-center gap-2 text-[var(--pan-text-primary)] font-display text-xs font-bold uppercase tracking-wider">
          <Layers className="w-4 h-4 text-[var(--pan-text-accent)]" />
          <span>Operational Domains</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--pan-text-accent)] animate-ping" />
          <span className="text-[8px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border border-[var(--pan-text-accent)] border-opacity-35 text-[var(--pan-text-accent)] bg-[var(--pan-text-accent)] bg-opacity-[0.03] shadow-[0_0_8px_rgba(0,200,140,0.3)]">
            STATUS: NOMINAL
          </span>
        </div>
      </div>

      {/* Batch Control Action Buttons */}
      <div className="p-2 border-b border-[var(--pan-border-default)] bg-[var(--pan-bg-surface)] flex gap-2 shrink-0">
        <button
          onClick={handleActivateAll}
          className="flex-1 py-1 rounded bg-[var(--pan-btn-secondary-bg)] border border-[var(--pan-border-default)] hover:border-[var(--pan-border-strong)] text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] hover:bg-[var(--pan-btn-secondary-hover)] font-mono text-[8px] font-bold uppercase tracking-widest transition-all"
        >
          ▶ ALL LAYERS
        </button>
        <button
          onClick={handleDeactivateAll}
          className="flex-1 py-1 rounded bg-[var(--pan-btn-secondary-bg)] border border-[var(--pan-border-default)] hover:border-[var(--pan-border-strong)] text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] hover:bg-[var(--pan-btn-secondary-hover)] font-mono text-[8px] font-bold uppercase tracking-widest transition-all"
        >
          ■ CLEAR ALL
        </button>
      </div>

      {/* Layer Groups Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--pan-bg-base)]">
        
        {/* GROUP 1: CONFLICT & SECURITY */}
        <div className="flex flex-col">
          <div
            onClick={() => setConflictOpen(!conflictOpen)}
            className="px-4 py-2 bg-[var(--pan-bg-surface)] border-b border-[var(--pan-border-default)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
          >
            <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-muted)] block uppercase font-mono">
              Conflict & Security
            </span>
            {conflictOpen ? <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />}
          </div>

          {conflictOpen && (
            <div className="flex flex-col">
              <LayerRow
                id="active-conflicts"
                label="Active Conflicts"
                icon={<Shield className="w-3.5 h-3.5" />}
                description="Semi-permanent active wars and strategic occupation maps"
              />
              <LayerRow
                id="gdelt"
                label="GDELT Geopol Events"
                icon={<Globe className="w-3.5 h-3.5" />}
                description="Real-time geo-located conflict and cooperative dispatches"
              />
              <LayerRow
                id="acled"
                label="ACLED Conflict Reports"
                icon={<ShieldAlert className="w-3.5 h-3.5" />}
                description="Tactical armed engagement and violent confrontation telemetry"
              />
              <LayerRow
                id="protest-unrest"
                label="Protest & Civil Unrest"
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                description="Geocoded rallies, strikes, and regional riots"
              />
              <LayerRow
                id="organized-crime"
                label="Organized Crime Zones"
                icon={<ShieldAlert className="w-3.5 h-3.5" />}
                description="Major transnational organized crime syndicates"
              />
              <LayerRow
                id="drug-corridors"
                label="Drug Corridors"
                icon={<Network className="w-3.5 h-3.5" />}
                description="Documented drug trafficking channels and territories"
              />
              <LayerRow
                id="terrorism"
                label="Terrorism Incidents"
                icon={<Shield className="w-3.5 h-3.5" />}
                description="Active attacks and designated extremist cell dispatches"
              />
            </div>
          )}
        </div>

        {/* GROUP 2: HUMANITARIAN & CRISIS */}
        <div className="flex flex-col border-t border-[var(--pan-border-default)]">
          <div
            onClick={() => setHumanOpen(!humanOpen)}
            className="px-4 py-2 bg-[var(--pan-bg-surface)] border-b border-[var(--pan-border-default)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
          >
            <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-muted)] block uppercase font-mono">
              Humanitarian & Crisis
            </span>
            {humanOpen ? <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />}
          </div>

          {humanOpen && (
            <div className="flex flex-col">
              <LayerRow
                id="humanitarian-crises"
                label="Humanitarian Crises"
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                description="UN OCHA verified relief dispatches and persistent emergency alerts"
              />
              <LayerRow
                id="refugee-movements"
                label="Refugee Movements"
                icon={<MapPin className="w-3.5 h-3.5" />}
                description="Authoritative UNHCR geolocated displacement points"
              />
              <LayerRow
                id="news-events"
                label="Geocoded News Wire"
                icon={<Rss className="w-3.5 h-3.5" />}
                description="Geolocated real-time media and threat wire events"
              />
            </div>
          )}
        </div>

        {/* GROUP 3: NATURAL HAZARDS */}
        <div className="flex flex-col border-t border-[var(--pan-border-default)]">
          <div
            onClick={() => setHazardOpen(!hazardOpen)}
            className="px-4 py-2 bg-[var(--pan-bg-surface)] border-b border-[var(--pan-border-default)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
          >
            <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-muted)] block uppercase font-mono">
              Natural Hazards
            </span>
            {hazardOpen ? <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />}
          </div>

          {hazardOpen && (
            <div className="flex flex-col">
              <LayerRow
                id="earthquakes"
                label="USGS Earthquakes"
                icon={<Activity className="w-3.5 h-3.5" />}
                description="Real-time global seismic epicenters"
              />
              <LayerRow
                id="wildfires"
                label="NASA FIRMS Wildfires"
                icon={<Flame className="w-3.5 h-3.5" />}
                description="Active thermal hotspot anomaly vectors"
              />
              <LayerRow
                id="weather"
                label="Extreme Weather"
                icon={<Thermometer className="w-3.5 h-3.5" />}
                description="NOAA and global storm tracking alerts"
              />
              <LayerRow
                id="airquality"
                label="OpenAQ Air Quality"
                icon={<Wind className="w-3.5 h-3.5" />}
                description="Real-time global particulate matter readings"
              />
              <LayerRow
                id="terminator"
                label="Solar Terminator"
                icon={<Sun className="w-3.5 h-3.5" />}
                description="Visual daylight boundary shadows"
              />
            </div>
          )}
        </div>

        {/* GROUP 4: MARITIME & LOGISTICS */}
        <div className="flex flex-col border-t border-[var(--pan-border-default)]">
          <div
            onClick={() => setMaritimeOpen(!maritimeOpen)}
            className="px-4 py-2 bg-[var(--pan-bg-surface)] border-b border-[var(--pan-border-default)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
          >
            <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-muted)] block uppercase font-mono">
              Maritime & Logistics
            </span>
            {maritimeOpen ? <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />}
          </div>

          {maritimeOpen && (
            <div className="flex flex-col">
              <LayerRow
                id="ais-vessels"
                label="AIS Vessel Tracking"
                icon={<Shield className="w-3.5 h-3.5" />}
                description="Real-time commercial and military vessel positions via AISHub"
              />
              <LayerRow
                id="maritime-incidents"
                label="Maritime Incidents"
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                description="Hostile vessels, piracy, and sea lane blockages"
              />
              <LayerRow
                id="undersea-cables"
                label="Undersea Fiber Cables"
                icon={<Network className="w-3.5 h-3.5" />}
                description="Global subsea communication fiber networks"
              />
            </div>
          )}
        </div>

        {/* GROUP 5: AIRSPACE & AVIATION */}
        <div className="flex flex-col border-t border-[var(--pan-border-default)]">
          <div
            onClick={() => setAviationOpen(!aviationOpen)}
            className="px-4 py-2 bg-[var(--pan-bg-surface)] border-b border-[var(--pan-border-default)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
          >
            <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-muted)] block uppercase font-mono">
              Airspace & Aviation
            </span>
            {aviationOpen ? <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />}
          </div>

          {aviationOpen && (
            <div className="flex flex-col">
              <LayerRow
                id="aircraft"
                label="OpenSky ADS-B Feeds"
                icon={<Plane className="w-3.5 h-3.5" />}
                description="Real-time aircraft tracking transponder beacons"
              />
              <LayerRow
                id="aviation-incidents"
                label="Aviation Incidents"
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                description="Grounding orders, flight anomalies, and military intercepts"
              />
              <LayerRow
                id="no-fly-zones"
                label="No-Fly Zones"
                icon={<Lock className="w-3.5 h-3.5" />}
                description="Tactical military and civil airspace restrictions"
              />
            </div>
          )}
        </div>

        {/* GROUP 6: SURVEILLANCE & OSINT */}
        <div className="flex flex-col border-t border-[var(--pan-border-default)]">
          <div
            onClick={() => setOsintOpen(!osintOpen)}
            className="px-4 py-2 bg-[var(--pan-bg-surface)] border-b border-[var(--pan-border-default)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
          >
            <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-muted)] block uppercase font-mono">
              Surveillance & OSINT
            </span>
            {osintOpen ? <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />}
          </div>

          {osintOpen && (
            <div className="flex flex-col">
              <LayerRow
                id="webcams"
                label="Global CCTV Network"
                icon={<Eye className="w-3.5 h-3.5" />}
                description="AMOS webcams and verified public EarthCam live feeds"
              />
              <LayerRow
                id="recon"
                label="OSINT Cyber Recon"
                icon={<Radio className="w-3.5 h-3.5" />}
                description="Tactical network hops and port traceback scanners"
              />
            </div>
          )}
        </div>

        {/* GROUP 7: SPACE & ORBITAL */}
        <div className="flex flex-col border-t border-[var(--pan-border-default)]">
          <div
            onClick={() => setSpaceOpen(!spaceOpen)}
            className="px-4 py-2 bg-[var(--pan-bg-surface)] border-b border-[var(--pan-border-default)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
          >
            <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-muted)] block uppercase font-mono">
              Space & Orbital
            </span>
            {spaceOpen ? <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />}
          </div>

          {spaceOpen && (
            <div className="flex flex-col">
              <LayerRow
                id="space"
                label="Satellite Tracking"
                icon={<Satellite className="w-3.5 h-3.5" />}
                description="Active NORAD satellite sweeps and ground propagations"
              />
              <LayerRow
                id="iss-position"
                label="ISS Real-time Position"
                icon={<Cpu className="w-3.5 h-3.5" />}
                description="Precise geocoded flight path coordinates of the Space Station"
              />
              <LayerRow
                id="space-weather"
                label="Space Weather"
                icon={<Sun className="w-3.5 h-3.5" />}
                description="Planetary K-index, Bz IMF, and solar wind velocities"
              />
            </div>
          )}
        </div>

        {/* GROUP 8: INFRASTRUCTURE (COMING SOON / LOCKED) */}
        <div className="flex flex-col border-t border-[var(--pan-border-default)] border-b border-[var(--pan-border-default)]">
          <div
            onClick={() => setInfraOpen(!infraOpen)}
            className="px-4 py-2 bg-[var(--pan-bg-surface)] border-b border-[var(--pan-border-default)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
          >
            <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-secondary)] block uppercase font-mono">
              Infrastructure [LOCKED]
            </span>
            {infraOpen ? <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />}
          </div>

          {infraOpen && (
            <div className="flex flex-col">
              <LayerRow
                id="power-grid"
                label="Power Grid Status"
                icon={<Database className="w-3.5 h-3.5" />}
                description="National electrical infrastructure maps [Free Real-Time Feeds Pending]"
                locked={true}
              />
              <LayerRow
                id="nuclear-facilities"
                label="Nuclear Facilities"
                icon={<LockKeyhole className="w-3.5 h-3.5" />}
                description="IAEA geocoded nuclear power reactor maps [Undergoing Review]"
                locked={true}
              />
              <LayerRow
                id="pipeline-networks"
                label="Pipeline Networks"
                icon={<Network className="w-3.5 h-3.5" />}
                description="Transnational oil and gas pipeline routes [Cites Required]"
                locked={true}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
