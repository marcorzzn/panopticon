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

  const handleCardClick = (event: any) => {
    if (event.coordinates && event.coordinates.length === 2) {
      flyTo(event.coordinates[0], event.coordinates[1], 5) // Zoom in on target
      setSelectedEntityId(event.id)
    }
  }

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

        {!isLoading && events && events.length === 0 && (
          <div className="text-center py-20 text-secondary font-mono text-[10px] uppercase font-semibold">
            NO GEOPOLITICAL ENTITIES MATCHING QUERY
          </div>
        )}

        {!isLoading &&
          events &&
          events.map((event) => (
            <div
              key={event.id}
              onClick={() => handleCardClick(event)}
              className={`glass-panel p-3 flex flex-col gap-2 cursor-pointer hover:bg-hover hover:bg-opacity-20 border border-weak transition-all duration-200 ${getSeverityBorderColor(
                event.severity
              )}`}
            >
              {/* Header: Title and Severity */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wide text-primary uppercase leading-tight line-clamp-2">
                  {event.label}
                </span>
                <span className={getSeverityBadgeClass(event.severity)}>{event.severity}</span>
              </div>

              {/* Actor Relationship Grid */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-deepest bg-opacity-40 rounded border border-weak font-mono text-[9px] text-secondary">
                <div className="truncate">
                  <span className="text-[8px] uppercase tracking-wider block opacity-50">ACTOR:</span>
                  <span className="font-bold text-primary text-[9px]">{event.actor1}</span>
                </div>
                <div className="truncate border-l border-weak pl-1.5">
                  <span className="text-[8px] uppercase tracking-wider block opacity-50">TARGET:</span>
                  <span className="font-bold text-primary text-[9px]">{event.actor2}</span>
                </div>
              </div>

              {/* Stats Indicators: Tone and Goldstein */}
              <div className="flex items-center justify-between font-mono text-[9px] text-secondary">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-1"
                    title="Average Tone (Media Sentiment)"
                  >
                    {event.avgTone >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-status-ok-text" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-status-critical-text" />
                    )}
                    <span className="tabular-nums">TONE: {event.avgTone.toFixed(1)}</span>
                  </div>
                  <div className="w-px h-2.5 bg-border-weak" />
                  <div title="Goldstein Geopolitical Stability Index">
                    <span
                      className={`font-semibold ${
                        event.goldsteinScale <= -4.0
                          ? 'text-status-critical-text'
                          : event.goldsteinScale <= 0
                          ? 'text-status-warning-text'
                          : 'text-status-ok-text'
                      }`}
                    >
                      GOLD: {event.goldsteinScale.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {event.sourceUrl && (
                    <a
                      href={event.sourceUrl}
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
                      handleCardClick(event)
                    }}
                    className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                    title="Fly to Coordinates"
                  >
                    <MapPin className="w-3 h-3 text-secondary group-hover:text-primary" />
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
