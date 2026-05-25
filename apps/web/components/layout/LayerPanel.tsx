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
  LockKeyhole,
  Users,
  Trophy,
  Book,
  Megaphone,
  Rocket
} from 'lucide-react'
import { useMapStore } from '@panopticon/core/stores'
import layersConfig from '@panopticon/core/src/config/layers.json'

const iconMap: Record<string, React.FC<any>> = {
  Layers, Thermometer, Activity, Flame, Globe, Radio, Eye, AlertTriangle,
  Plane, Wind, ShieldAlert, Satellite, Sun, Rss, Shield, Lock, MapPin,
  Network, Cpu, Database, LockKeyhole, Users, Trophy, Book, Megaphone, Rocket
}

interface LayerRowProps {
  id: string
  label: string
  iconName: string
  description: string
  locked?: boolean
}

function LayerRow({ id, label, iconName, description, locked }: LayerRowProps) {
  const { layerStates, toggleLayer } = useMapStore()
  
  // Layer is active by default if not explicitly turned off
  const isVisible = layerStates[id]?.visible !== false
  const entityCount = layerStates[id]?.entityCount ?? 0
  const error = layerStates[id]?.error

  const IconComponent = iconMap[iconName] || Layers

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
            <IconComponent className="w-3.5 h-3.5" />
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
              {id === 'webcams' ? `${entityCount} VISIBLE` : entityCount}
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
  
  // Group layers based on the central configuration
  const groupedLayers = React.useMemo(() => {
    const groups: Record<string, any[]> = {}
    layersConfig.forEach((layer: any) => {
      const slug = layer.slug || layer.id
      const displayName = layer.displayName || layer.name
      const group = layer.group

      if (!groups[group]) groups[group] = []
      groups[group].push({
        id: slug,
        name: displayName,
        icon: layer.icon,
        description: layer.description
      })
    })
    return groups
  }, [])

  // Manage open states for each group
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    Object.keys(groupedLayers).forEach(group => {
      initial[group] = true
    })
    return initial
  })

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  const activeLayerIds = layersConfig.map((l: any) => l.slug || l.id)

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
          <span className="text-[8px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border border-[var(--pan-text-accent)] border-opacity-35 text-[var(--pan-text-accent)] bg-[var(--pan-text-accent)] bg-opacity-[0.03] shadow-[0_0_8px_rgba(0,200,140,0.3)]">
            LIVE COUNTS
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
        {Object.entries(groupedLayers).map(([groupName, layers]) => (
          <div key={groupName} className="flex flex-col border-b border-[var(--pan-border-default)]">
            <div
              onClick={() => toggleGroup(groupName)}
              className="px-4 py-2 bg-[var(--pan-bg-surface)] flex items-center justify-between cursor-pointer hover:bg-[var(--pan-bg-interactive)]"
            >
              <span className="font-semibold text-[9px] tracking-widest text-[var(--pan-text-muted)] block uppercase font-mono">
                {groupName}
              </span>
              {openGroups[groupName] ? (
                <ChevronDown className="w-3 h-3 text-[var(--pan-text-secondary)]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[var(--pan-text-secondary)]" />
              )}
            </div>

            {openGroups[groupName] && (
              <div className="flex flex-col border-t border-[var(--pan-border-default)]">
                {layers.map(layer => (
                  <LayerRow
                    key={layer.id}
                    id={layer.id}
                    label={layer.name}
                    iconName={layer.icon}
                    description={layer.description}
                    locked={false}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
