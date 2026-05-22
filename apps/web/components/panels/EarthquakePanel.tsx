'use client'

import * as React from 'react'
import useSWR from 'swr'
import {
  Activity,
  MapPin,
  TrendingUp,
  AlertOctagon,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { fetchEarthquakes } from '@panopticon/data-pipeline'
import { useMapStore, useAppStore } from '@panopticon/core/stores'

type SortField = 'magnitude' | 'time' | 'depth'
type SortOrder = 'asc' | 'desc'

export default function EarthquakePanel() {
  const { flyTo, setSelectedEntityId, selectedEntityId, setLayerEntityCount } = useMapStore()
  const { globalRefreshPaused } = useAppStore()

  // State filters
  const [minMag, setMinMag] = React.useState<number>(0.0)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [sortField, setSortField] = React.useState<SortField>('time')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc')

  // Fetch from USGS using SWR
  const { data: earthquakes, error, isLoading } = useSWR(
    'usgs-earthquakes',
    fetchEarthquakes,
    {
      refreshInterval: globalRefreshPaused ? 0 : 60000, // Poll every minute if not paused
      revalidateOnFocus: false,
    }
  )

  // Update active layer entity count in store
  React.useEffect(() => {
    if (earthquakes) {
      setLayerEntityCount('earthquakes', earthquakes.length)
    }
  }, [earthquakes, setLayerEntityCount])

  // Filter and sort events
  const filteredEvents = React.useMemo(() => {
    if (!earthquakes) return []

    return earthquakes
      .filter((eq) => {
        const matchesMag = eq.magnitude >= minMag
        const matchesSearch = eq.place.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesMag && matchesSearch
      })
      .sort((a, b) => {
        let valA: any = a.magnitude
        let valB: any = b.magnitude

        if (sortField === 'time') {
          valA = a.timestamp
          valB = b.timestamp
        } else if (sortField === 'depth') {
          valA = a.depth
          valB = b.depth
        }

        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1
        } else {
          return valA < valB ? 1 : -1
        }
      })
  }, [earthquakes, minMag, searchTerm, sortField, sortOrder])

  const handleRowClick = (eq: any) => {
    if (eq.coordinates && eq.coordinates.length === 2) {
      flyTo(eq.coordinates[0], eq.coordinates[1], 7)
      setSelectedEntityId(eq.id)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getMagColorClass = (mag: number) => {
    if (mag >= 7.0) return 'text-status-critical-text font-extrabold shadow-glow'
    if (mag >= 5.0) return 'text-status-warning-text font-bold'
    if (mag >= 4.0) return 'text-status-info-text font-semibold'
    return 'text-status-ok-text font-medium'
  }

  const formatRelativeTime = (timestamp: number) => {
    const elapsed = Date.now() - timestamp
    const secs = Math.floor(elapsed / 1000)
    const mins = Math.floor(secs / 60)
    const hrs = Math.floor(mins / 60)

    if (mins < 1) return 'JUST NOW'
    if (mins < 60) return `${mins}M AGO`
    return `${hrs}H AGO`
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* 1. Control Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-weak font-mono text-[10px]">
        {/* Search Omnibar */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-deepest border border-weak w-60">
          <Search className="w-3.5 h-3.5 text-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="FILTER BY REGION/PLACE"
            className="flex-1 bg-transparent border-0 outline-none text-primary text-[10px] uppercase font-bold placeholder-color-text-disabled"
          />
        </div>

        {/* Magnitude threshold slider */}
        <div className="flex items-center gap-2 bg-deepest px-3 py-1 rounded border border-weak">
          <span className="text-secondary font-semibold uppercase">MIN MAG:</span>
          <span className="font-bold text-accent tabular-nums">M {minMag.toFixed(1)}</span>
          <input
            type="range"
            min="0.0"
            max="8.0"
            step="0.5"
            value={minMag}
            onChange={(e) => setMinMag(parseFloat(e.target.value))}
            className="w-24 accent-accent cursor-ew-resize h-1 bg-border-weak rounded-lg appearance-none"
          />
        </div>

        <div className="text-secondary">
          SHOWING{' '}
          <span className="text-primary font-bold tabular-nums">{filteredEvents.length}</span> /{' '}
          <span className="tabular-nums">{(earthquakes || []).length}</span> DISPATCHES
        </div>
      </div>

      {/* 2. Full Width High Density Data Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-secondary gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">
              INGESTING SEISMIC TELEMETRY...
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-10 text-status-critical-text gap-2 text-center">
            <span className="font-mono text-xs font-bold uppercase">TELEMETRY SYNC ERROR</span>
            <span className="text-[10px] text-secondary">
              Unable to sync USGS seismographs.
            </span>
          </div>
        )}

        {!isLoading && filteredEvents && (
          <table className="w-full text-left font-mono text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-weak text-secondary uppercase font-semibold select-none bg-deepest bg-opacity-35">
                <th
                  onClick={() => handleSort('magnitude')}
                  className="py-2 px-3 cursor-pointer hover:text-primary transition-colors text-center w-16"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>MAG</span>
                    {sortField === 'magnitude' &&
                      (sortOrder === 'desc' ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="py-2 px-3">PLACE / EPICENTER</th>
                <th
                  onClick={() => handleSort('depth')}
                  className="py-2 px-3 cursor-pointer hover:text-primary transition-colors text-right w-24"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>DEPTH (KM)</span>
                    {sortField === 'depth' &&
                      (sortOrder === 'desc' ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="py-2 px-3 text-center w-16">TSUNAMI</th>
                <th
                  onClick={() => handleSort('time')}
                  className="py-2 px-3 cursor-pointer hover:text-primary transition-colors text-right w-24"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>TIME (REL)</span>
                    {sortField === 'time' &&
                      (sortOrder === 'desc' ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="py-2 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((eq) => {
                const isSelected = selectedEntityId === eq.id
                return (
                  <tr
                    key={eq.id}
                    onClick={() => handleRowClick(eq)}
                    className={`border-b border-weak border-opacity-40 cursor-pointer hover:bg-hover hover:bg-opacity-20 transition-all ${
                      isSelected ? 'bg-accent bg-opacity-10 border-l-2 border-l-accent' : ''
                    }`}
                  >
                    <td className={`py-1.5 px-3 text-center tabular-nums ${getMagColorClass(eq.magnitude)}`}>
                      {eq.magnitude.toFixed(1)}
                    </td>
                    <td className="py-1.5 px-3 font-display font-semibold text-xs text-primary truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                      {eq.place}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums text-secondary">
                      {eq.depth.toFixed(1)}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {eq.tsunamiAlert ? (
                        <span className="inline-block p-0.5 rounded bg-status-critical-bg text-status-critical-text animate-pulse">
                          <AlertOctagon className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-secondary opacity-30">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums text-secondary">
                      {formatRelativeTime(eq.timestamp)}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {eq.url && (
                        <a
                          href={eq.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary hover:text-accent p-0.5 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          title="Open USGS Catalog"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
