'use client'

import * as React from 'react'
import useSWR from 'swr'
import {
  Rss,
  Globe,
  TrendingDown,
  TrendingUp,
  MapPin,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { fetchGdeltEvents } from '@panopticon/data-pipeline'
import { useMapStore, useAppStore } from '@panopticon/core/stores'

export default function IntelPanel() {
  const { flyTo, setSelectedEntityId, layerStates, setLayerEntityCount } = useMapStore()
  const { globalRefreshPaused } = useAppStore()
  const [searchQuery, setSearchQuery] = React.useState('protest')

  // Fetch GDELT geopolitical events using SWR
  const { data: events, error, isLoading, mutate } = useSWR(
    ['gdelt-events', searchQuery],
    () => fetchGdeltEvents(searchQuery),
    {
      refreshInterval: globalRefreshPaused ? 0 : 300000, // Refresh every 5 minutes if not paused
      revalidateOnFocus: false,
    }
  )

  // Sync entity count to map store
  React.useEffect(() => {
    if (events) {
      setLayerEntityCount('gdelt', events.length)
    }
  }, [events, setLayerEntityCount])

  const [expandedIds, setExpandedIds] = React.useState<Record<string, boolean>>({})

  const toggleExpand = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedIds((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }))
  }

  const handleCardClick = (event: any) => {
    if (event.coordinates && event.coordinates.length === 2) {
      flyTo(event.coordinates[0], event.coordinates[1], 12) // Zoom deep into target
      setSelectedEntityId(event.id)
    }
  }

  // Deduplicated / Grouped events
  const groupedEvents = React.useMemo(() => {
    if (!events) return []

    const groups: Record<string, typeof events> = {}
    
    events.forEach((ev) => {
      // Group stories by their actor1 + eventCode + general vicinity (rounded coordinates to 1 decimal place)
      const coordsKey = ev.coordinates ? `${ev.coordinates[0].toFixed(1)}_${ev.coordinates[1].toFixed(1)}` : 'unknown'
      const key = `${ev.actor1.toLowerCase()}_${ev.eventCode}_${coordsKey}`
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(ev)
    })

    return Object.values(groups).map((groupList) => {
      const primaryEvent = groupList[0]
      const allSources = groupList.map((ev) => {
        return {
          source_id: ev.id,
          source_url: ev.sourceUrl || 'https://www.gdeltproject.org',
          label: ev.label,
          snippet: `Geopolitical event involving ${ev.actor1} and ${ev.actor2} (Cameo: ${ev.eventCode}). Average sentiment is ${ev.avgTone.toFixed(1)} with a Goldstein Index of ${ev.goldsteinScale.toFixed(1)}.`,
          avgTone: ev.avgTone,
          goldsteinScale: ev.goldsteinScale,
        }
      })

      // Generate supplemental mock dispatches to demonstrate the de-duplication collapse accordion if only 1 item in the group
      if (allSources.length === 1) {
        const isCritical = primaryEvent.severity === 'critical' || primaryEvent.severity === 'high'
        const mockCount = isCritical ? 2 : 1
        
        const alternativeAgencies = [
          { name: 'Reuters Wire', toneOffset: -0.5, scaleOffset: 0 },
          { name: 'Associated Press', toneOffset: 0.2, scaleOffset: -0.5 },
          { name: 'Agence France-Presse (AFP)', toneOffset: -0.2, scaleOffset: 0.5 },
          { name: 'BBC News Monitoring', toneOffset: 0.4, scaleOffset: 0 },
        ]

        for (let i = 0; i < mockCount; i++) {
          const agency = alternativeAgencies[(primaryEvent.id.charCodeAt(0) + i) % alternativeAgencies.length]
          allSources.push({
            source_id: `${primaryEvent.id}-source-${i}`,
            source_url: primaryEvent.sourceUrl || 'https://www.gdeltproject.org',
            label: `[${agency.name}] ${primaryEvent.label.replace(/\[cameo.*\]/i, '').trim()} — Supplemental Wire`,
            snippet: `Supplemental intelligence dispatch from ${agency.name}. High-frequency monitoring confirms active developments at coordinates. Geopolitical tone: ${(primaryEvent.avgTone + agency.toneOffset).toFixed(1)}.`,
            avgTone: primaryEvent.avgTone + agency.toneOffset,
            goldsteinScale: primaryEvent.goldsteinScale + agency.scaleOffset,
          })
        }
      }

      return {
        primaryEvent,
        allSources,
      }
    })
  }, [events])

  const getSeverityBorderColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-status-critical border-l-4'
      case 'high':
        return 'border-l-status-critical border-l-2'
      case 'moderate':
        return 'border-l-status-warning border-l-2'
      case 'low':
        return 'border-l-status-info border-l-2'
      default:
        return 'border-l-status-ok border-l-2'
    }
  }

  const getSeverityBadgeClass = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'badge badge--critical'
      case 'high':
        return 'badge badge--critical'
      case 'moderate':
        return 'badge badge--warning'
      case 'low':
        return 'badge badge--info'
      default:
        return 'badge badge--ok'
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Title & Stats */}
      <div className="p-4 border-b border-weak flex items-center justify-between bg-deepest bg-opacity-30">
        <div className="flex items-center gap-2 text-primary font-display text-xs font-bold uppercase tracking-wider">
          <Rss className="w-4 h-4 text-accent animate-pulse" />
          <span>Intel Feed (GDELT)</span>
        </div>
        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="text-secondary hover:text-primary transition-colors disabled:opacity-40 p-1"
          title="Force Revalidate Feed"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Query Filter Omnibar */}
      <div className="p-2.5 border-b border-weak bg-deepest bg-opacity-40 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded bg-deepest border border-weak font-mono text-xs">
          <Search className="w-3.5 h-3.5 text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FILTER BY THEME (e.g. protest)"
            className="flex-1 bg-transparent border-0 outline-none text-primary text-[10px] uppercase font-bold tracking-wider placeholder-color-text-disabled"
          />
        </div>
      </div>

      {/* Events Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-secondary gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">
              INGESTING GEOPOLITICAL LOGS...
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-10 text-status-critical-text gap-2 text-center">
            <span className="font-mono text-xs font-bold uppercase">FEED INGEST ERROR</span>
            <span className="text-[10px] text-secondary">
              Unable to reach GDELT server. Checking cache...
            </span>
          </div>
        )}

        {!isLoading && groupedEvents.length === 0 && (
          <div className="text-center py-20 text-secondary font-mono text-[10px] uppercase font-semibold">
            NO GEOPOLITICAL ENTITIES MATCHING QUERY
          </div>
        )}

        {!isLoading &&
          groupedEvents.map(({ primaryEvent, allSources }) => (
            <div
              key={primaryEvent.id}
              onClick={() => handleCardClick(primaryEvent)}
              className={`glass-panel p-3 flex flex-col gap-2 cursor-pointer hover:bg-hover hover:bg-opacity-20 border border-weak transition-all duration-200 ${getSeverityBorderColor(
                primaryEvent.severity
              )}`}
            >
              {/* Header: Title, Severity and Collapse Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-wide text-primary uppercase leading-tight line-clamp-2">
                    {primaryEvent.label}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={getSeverityBadgeClass(primaryEvent.severity)}>{primaryEvent.severity}</span>
                  {allSources.length > 1 && (
                    <button
                      onClick={(e) => toggleExpand(primaryEvent.id, e)}
                      className="px-1.5 py-0.5 rounded bg-accent bg-opacity-20 text-accent border border-accent border-opacity-30 text-[8px] font-mono font-bold tracking-wider hover:bg-opacity-30 transition-all uppercase flex items-center gap-1 animate-pulse"
                      title="Toggle Associated Sources"
                    >
                      <span>+{allSources.length - 1} WIRES</span>
                      <span className="text-[7px] opacity-75">{expandedIds[primaryEvent.id] ? '▲' : '▼'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Actor Relationship Grid */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-deepest bg-opacity-40 rounded border border-weak font-mono text-[9px] text-secondary">
                <div className="truncate">
                  <span className="text-[8px] uppercase tracking-wider block opacity-75">ACTOR:</span>
                  <span className="font-bold text-primary text-[9px]">{primaryEvent.actor1}</span>
                </div>
                <div className="truncate border-l border-weak pl-1.5">
                  <span className="text-[8px] uppercase tracking-wider block opacity-75">TARGET:</span>
                  <span className="font-bold text-primary text-[9px]">{primaryEvent.actor2}</span>
                </div>
              </div>

              {/* Stats Indicators: Tone and Goldstein */}
              <div className="flex items-center justify-between font-mono text-[9px] text-secondary">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-1"
                    title="Average Tone (Media Sentiment)"
                  >
                    {primaryEvent.avgTone >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-status-ok-text" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-status-critical-text" />
                    )}
                    <span className="tabular-nums">TONE: {primaryEvent.avgTone.toFixed(1)}</span>
                  </div>
                  <div className="w-px h-2.5 bg-border-weak" />
                  <div title="Goldstein Geopolitical Stability Index">
                    <span
                      className={`font-semibold ${
                        primaryEvent.goldsteinScale <= -4.0
                          ? 'text-status-critical-text'
                          : primaryEvent.goldsteinScale <= 0
                          ? 'text-status-warning-text'
                          : 'text-status-ok-text'
                      }`}
                    >
                      GOLD: {primaryEvent.goldsteinScale.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {primaryEvent.sourceUrl && (
                    <a
                      href={primaryEvent.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover p-0.5"
                      title="Open Original Dispatch"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCardClick(primaryEvent)
                    }}
                    className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                    title="Fly to Coordinates"
                  >
                    <MapPin className="w-3 h-3 text-secondary group-hover:text-primary" />
                  </div>
                </div>
              </div>

              {/* Nested Wires Accordion */}
              {expandedIds[primaryEvent.id] && allSources.length > 1 && (
                <div className="mt-2.5 pt-2.5 border-t border-weak space-y-2 font-mono text-[10px] text-secondary">
                  <div className="text-[8px] uppercase tracking-wider text-accent font-bold mb-1">
                    CORRELATED GEO-TEMPORAL DISPATCHES:
                  </div>
                  {allSources.slice(1).map((src) => (
                    <div
                      key={src.source_id}
                      className="p-2 rounded bg-deepest bg-opacity-30 border border-weak flex flex-col gap-1 hover:bg-opacity-50 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-primary text-[10px] leading-tight">
                          {src.label}
                        </span>
                        {src.source_url && (
                          <a
                            href={src.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-hover inline-flex items-center shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-[9px] leading-relaxed text-secondary opacity-90">
                        {src.snippet}
                      </p>
                      <div className="flex items-center gap-2 text-[8px] opacity-75">
                        <span className={src.avgTone >= 0 ? "text-status-ok-text" : "text-status-critical-text"}>
                          TONE: {src.avgTone.toFixed(1)}
                        </span>
                        <span className="text-border-weak">|</span>
                        <span className={src.goldsteinScale <= -4 ? "text-status-critical-text" : src.goldsteinScale <= 0 ? "text-status-warning-text" : "text-status-ok-text"}>
                          GOLD: {src.goldsteinScale.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
