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
import CiiPanel from './CiiPanel'
import NewsWireHub from './NewsWireHub'

export default function IntelPanel() {
  const { flyTo, setSelectedEntityId, layerStates, setLayerEntityCount } = useMapStore()
  const { globalRefreshPaused } = useAppStore()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<'wire' | 'cii'>('wire')

  // Fetch GDELT geopolitical events once using SWR
  const { data: events, error, isLoading, mutate } = useSWR(
    'gdelt-events-panel',
    () => fetchGdeltEvents('protest'),
    {
      refreshInterval: globalRefreshPaused ? 0 : 300000, // Refresh every 5 minutes if not paused
      revalidateOnFocus: false,
    }
  )

  // Local query filtering
  const filteredEvents = React.useMemo(() => {
    if (!events) return []
    const query = searchQuery.toLowerCase().trim()
    if (!query) return events

    return events.filter((ev) => {
      const label = (ev.label || '').toLowerCase()
      const actor1 = (ev.actor1 || '').toLowerCase()
      const actor2 = (ev.actor2 || '').toLowerCase()
      const eventCode = (ev.eventCode || '').toLowerCase()

      return (
        label.includes(query) ||
        actor1.includes(query) ||
        actor2.includes(query) ||
        eventCode.includes(query)
      )
    })
  }, [events, searchQuery])

  // Sync entity count to map store (reflecting the filtered count)
  React.useEffect(() => {
    if (filteredEvents) {
      setLayerEntityCount('gdelt', filteredEvents.length)
    }
  }, [filteredEvents, setLayerEntityCount])

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
    if (!filteredEvents) return []

    const groups: Record<string, typeof filteredEvents> = {}

    filteredEvents.forEach((ev) => {
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
  }, [filteredEvents])

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

  if (activeTab === 'cii') {
    return (
      <div className="flex flex-col h-full overflow-hidden select-none">
        {/* Tab Switcher Header */}
        <div className="flex border-b border-weak bg-deepest bg-opacity-35 font-display text-[9px] font-bold uppercase tracking-widest text-secondary select-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('wire')}
            className="flex-1 py-3 text-center border-r border-weak hover:text-primary hover:bg-hover hover:bg-opacity-25 transition-all uppercase"
          >
            Intel Wire
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cii')}
            className="flex-1 py-3 text-center bg-surface border-b-2 border-accent text-accent font-extrabold uppercase transition-all"
          >
            Risk Index (CII)
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <CiiPanel />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Tab Switcher Header */}
      <div className="flex border-b border-weak bg-deepest bg-opacity-35 font-display text-[9px] font-bold uppercase tracking-widest text-secondary select-none shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('wire')}
          className="flex-1 py-3 text-center bg-surface border-b-2 border-accent text-accent font-extrabold border-r border-weak uppercase transition-all"
        >
          Intel Wire
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cii')}
          className="flex-1 py-3 text-center hover:text-primary hover:bg-hover hover:bg-opacity-25 transition-all uppercase"
        >
          Risk Index (CII)
        </button>
      </div>
      {/* News Wire Hub */}
      <div className="flex-1 overflow-hidden">
        <NewsWireHub />
      </div>
    </div>
  )
}
