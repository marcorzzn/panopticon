'use client'

import * as React from 'react'
import { Rss, Globe, Radio, Shield, HelpCircle, Activity, Play, Search, MapPin, ExternalLink, AlertTriangle } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { useMapStore, useAppStore, useNewsStore } from '@panopticon/core/stores'

// 5 tactical domains for filtering
type Category = 'geopolitical' | 'cyber' | 'maritime' | 'hazard' | 'markets'

interface FeedItem {
  id: string
  category: Category
  source: string
  title: string
  summary: string
  timestamp: string
  coordinates?: [number, number]
  severity: 'low' | 'moderate' | 'high' | 'critical'
  url?: string
  source_bias?: 'neutral' | 'state_media' | 'advocacy' | 'commercial'
  source_reliability?: 'verified_primary' | 'verified_secondary' | 'unverified'
}

export default function NewsWireHub() {
  const { flyTo, setSelectedEntityId } = useMapStore()
  const { newsEvents } = useNewsStore()
  const [activeCategory, setActiveCategory] = React.useState<Category | 'all'>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [clickedCardId, setClickedCardId] = React.useState<string | null>(null)
  const { mutate } = useSWRConfig()
  const [loading, setLoading] = React.useState(false)

  const handleManualRefresh = async () => {
    setLoading(true)
    await mutate(['gdelt-events-core', 'protest'])
    setTimeout(() => setLoading(false), 500)
  }

  // Filter feeds locally
  const filteredFeeds = React.useMemo(() => {
    let list = newsEvents as FeedItem[]
    if (activeCategory !== 'all') {
      list = list.filter(f => f.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(f => 
        f.title.toLowerCase().includes(q) ||
        f.source.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q)
      )
    }
    return list
  }, [newsEvents, activeCategory, searchQuery])

  const handleFeedClick = (feed: FeedItem) => {
    if (feed.coordinates && feed.coordinates.length === 2) {
      flyTo(feed.coordinates[0], feed.coordinates[1], 11) // flyTo map integration
      setSelectedEntityId(feed.id)
      
      // Visual confirm flash animation trigger
      setClickedCardId(feed.id)
      setTimeout(() => setClickedCardId(null), 800)
    }
  }

  const getSeverityBadgeClass = (severity: FeedItem['severity']) => {
    switch (severity) {
      case 'critical': return 'badge badge--critical'
      case 'high': return 'badge badge--critical opacity-85'
      case 'moderate': return 'badge badge--warning'
      case 'low': return 'badge badge--info'
    }
  }

  const getCategoryColor = (cat: Category) => {
    switch (cat) {
      case 'geopolitical': return 'text-accent'
      case 'cyber': return 'text-purple-400'
      case 'maritime': return 'text-blue-400'
      case 'hazard': return 'text-status-warning-text'
      case 'markets': return 'text-emerald-400'
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none font-sans">
      
      {/* Search & Action Bar */}
      <div className="p-3 border-b border-weak bg-deepest bg-opacity-40 flex flex-col gap-2">
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded font-mono font-bold text-[10px] uppercase tracking-widest transition-all ${
            loading
              ? 'bg-hover text-secondary cursor-not-allowed border border-weak'
              : 'bg-accent text-deepest hover:bg-accent-hover border border-accent hover:shadow-[0_0_15px_rgba(0,200,140,0.5)]'
          }`}
          title="Manual Force Refresh Feeds"
        >
          <Rss className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'SYNCING PIPELINE...' : 'REFRESH FEED'}
        </button>

        <div className="flex w-full items-center gap-1.5 px-2.5 py-1.5 rounded bg-deepest border border-weak font-mono text-xs">
          <Search className="w-3.5 h-3.5 text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH INCIDENTS..."
            className="flex-1 bg-transparent border-0 outline-none text-primary text-[10px] uppercase font-bold tracking-wider placeholder-color-text-disabled"
          />
        </div>
      </div>

      {/* Category Tags Selector Bar */}
      <div className="flex items-center gap-1 p-2 bg-deepest bg-opacity-20 border-b border-weak overflow-x-auto custom-scrollbar shrink-0">
        {[
          { id: 'all', label: 'ALL WIRE' },
          { id: 'geopolitical', label: 'GEOPOL' },
          { id: 'cyber', label: 'CYBER' },
          { id: 'maritime', label: 'MARITIME' },
          { id: 'hazard', label: 'HAZARDS' },
          { id: 'markets', label: 'MARKETS' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`px-2.5 py-1 rounded font-mono text-[8px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeCategory === tab.id
                ? 'bg-accent text-deepest font-extrabold'
                : 'bg-surface border border-weak text-secondary hover:text-primary hover:bg-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feeds List Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {filteredFeeds.slice(0, 40).map((feed) => (
          <div
            key={feed.id}
            onClick={() => handleFeedClick(feed)}
            className={`glass-panel p-2.5 flex flex-col gap-1.5 cursor-pointer hover:bg-hover hover:bg-opacity-25 border border-weak transition-all duration-150 border-l-2 ${
              feed.id === clickedCardId
                ? 'bg-accent/25 border-accent shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : ''
            } ${
              feed.severity === 'critical' ? 'border-l-status-critical' : feed.severity === 'high' ? 'border-l-status-critical opacity-90' : feed.severity === 'moderate' ? 'border-l-status-warning' : 'border-l-accent'
            }`}
          >
            {/* Header: Source, Category & Severity */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8px] font-mono font-bold uppercase tracking-wider ${getCategoryColor(feed.category)}`}>
                    {feed.category}
                  </span>
                  <span className="text-secondary text-[8px]">•</span>
                  <span className="text-[9px] font-bold text-secondary font-mono truncate max-w-[120px]" title={feed.source}>
                    {feed.source}
                  </span>
                </div>
                <span className={getSeverityBadgeClass(feed.severity)}>{feed.severity}</span>
              </div>
              
              {feed.source_reliability === 'unverified' && (
                <div className="flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-wider text-status-warning-text bg-status-warning-bg border border-status-warning px-1.5 py-0.5 rounded self-start">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  UNVERIFIED SOURCE
                </div>
              )}
            </div>

            {/* Title */}
            <span className="text-[10px] font-semibold text-primary uppercase leading-tight line-clamp-2">
              {feed.title}
            </span>

            {/* Summary */}
            <p className="text-[9px] text-secondary leading-relaxed font-mono opacity-85">
              {feed.summary}
            </p>

            {/* Footer: Time & Coordinates & Actions */}
            <div className="flex items-center justify-between text-[8px] font-mono mt-1 text-secondary">
              <div className="flex items-center gap-1.5">
                <span>{feed.timestamp}</span>
                {!feed.coordinates && (
                  <>
                    <span className="text-secondary text-[8px]">•</span>
                    <span className="text-status-warning-text bg-status-warning-bg border border-status-warning px-1 py-0.5 rounded flex items-center gap-1 text-[7px] font-bold">
                      NO GEOLOCATION
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {feed.coordinates && (
                  <span className="text-[7.5px] tracking-wide opacity-80">
                    [{feed.coordinates[0].toFixed(2)}, {feed.coordinates[1].toFixed(2)}]
                  </span>
                )}
                {feed.url && (
                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-accent hover:text-accent-hover p-0.5 shrink-0"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {feed.coordinates && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFeedClick(feed)
                    }}
                    className="text-secondary hover:text-primary p-0.5"
                    title="Fly map to event"
                  >
                    <MapPin className="w-2.5 h-2.5 text-accent" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredFeeds.length > 40 && (
          <div className="text-center py-2 text-[8px] font-mono text-secondary uppercase tracking-widest opacity-60">
            ...showing top 40 of {filteredFeeds.length} active threat feeds...
          </div>
        )}
      </div>
    </div>
  )
}
