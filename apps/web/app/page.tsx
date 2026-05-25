'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import useSWR, { useSWRConfig } from 'swr'
import {
  fetchEarthquakes,
  fetchGlobalWeatherGrid,
  fetchGdeltEvents,
  fetchAircraft,
  fetchWildfires,
  fetchAirQuality,
  fetchAcledEvents,
  fetchWebcams,
  fetchSatellites,
  fetchRssEvents,
  fetchPowerGrid,
  fetchNuclearFacilities,
  fetchPipelineNetworks,
} from '@panopticon/data-pipeline'
import { useMapStore, usePanelStore, useAppStore, useNewsStore } from '@panopticon/core/stores'
import persistentConflicts from '../../../packages/core/src/config/persistent-conflicts.json'
import { X, HelpCircle } from 'lucide-react'

// Layout & Panel Imports
import DashboardLayout from '@/components/layout/DashboardLayout'
import EarthquakePanel from '@/components/panels/EarthquakePanel'
import SpaceWeatherPanel from '@/components/panels/SpaceWeatherPanel'


// Dynamically import MapView to disable SSR (MapLibre Gl relies on browser APIs)
const MapView = dynamic(
  () => import('@panopticon/map-engine').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-deepest flex flex-col items-center justify-center gap-3 font-mono text-[10px] text-secondary">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <span>INITIALIZING MAP ENGINE...</span>
      </div>
    ),
  }
)

const EMPTY_ARRAY: any[] = []
const EMPTY_GEOJSON: any = { type: 'FeatureCollection', features: [] }

export default function Home() {
  const viewState = useMapStore((s) => s.viewState)
  const setViewState = useMapStore((s) => s.setViewState)
  const toggleLayer = useMapStore((s) => s.toggleLayer)
  const setSelectedEntityId = useMapStore((s) => s.setSelectedEntityId)
  const setLayerEntityCount = useMapStore((s) => s.setLayerEntityCount)

  const toggleLayerPanel = usePanelStore((s) => s.toggleLayerPanel)
  const toggleIntelPanel = usePanelStore((s) => s.toggleIntelPanel)
  const toggleMapFullscreen = usePanelStore((s) => s.toggleMapFullscreen)
  const collapseAll = usePanelStore((s) => s.collapseAll)
  const toggleReconToolkit = usePanelStore((s) => s.toggleReconToolkit)

  const [showHelp, setShowHelp] = React.useState(false)
  const presetIndexRef = React.useRef(0)

  const globalRefreshPaused = useAppStore((s) => s.globalRefreshPaused)
  // Auto-polling removed per constraints (Item 10).
  // Live Feed & Refresh Mechanism is now driven strictly by explicit UI actions (Refresh Feed button).

  // ── 1. BACKGROUND SWR POLLING PIPELINE ────────────────────────────────────

  // USGS Earthquakes
  const { data: earthquakes = EMPTY_ARRAY } = useSWR(
    'usgs-earthquakes-core',
    fetchEarthquakes,
    {
      revalidateOnFocus: false,
    }
  )

  // Global Weather Stations
  const { data: weatherPoints = EMPTY_ARRAY } = useSWR(
    'global-weather-core',
    fetchGlobalWeatherGrid,
    {
      revalidateOnFocus: false,
    }
  )

  // GDELT Geopolitical Feed (Default 'protest' query for map sync)
  const { data: gdeltEvents = EMPTY_ARRAY } = useSWR(
    ['gdelt-events-core', 'protest'],
    () => fetchGdeltEvents('protest'),
    {
      revalidateOnFocus: false,
    }
  )

  // OpenSky Aviation (Phase 2 Additions)
  const { data: aircraft = EMPTY_ARRAY } = useSWR(
    'opensky-aircraft-core',
    fetchAircraft,
    {
      revalidateOnFocus: false,
    }
  )

  // NASA FIRMS Wildfires (Phase 2 Additions)
  const { data: wildfires = EMPTY_ARRAY } = useSWR(
    'nasa-wildfires-core',
    fetchWildfires,
    {
      revalidateOnFocus: false,
    }
  )

  // OpenAQ Air Quality (Phase 3 Additions)
  const { data: airquality = EMPTY_ARRAY } = useSWR(
    'openaq-airquality-core',
    fetchAirQuality,
    {
      revalidateOnFocus: false,
    }
  )

  // ACLED Conflicts (Phase 3 Additions)
  const { data: acledEvents = EMPTY_ARRAY } = useSWR(
    'acled-conflicts-core',
    fetchAcledEvents,
    {
      revalidateOnFocus: false,
    }
  )

  // CCTV Webcams (Phase 4 Additions)
  const { data: webcams = EMPTY_ARRAY } = useSWR(
    'webcams-core',
    fetchWebcams,
    {
      revalidateOnFocus: false,
    }
  )

  // Space & Orbital Satellites (Phase 5 Additions)
  const { data: satellites = EMPTY_ARRAY } = useSWR(
    'space-satellites-core',
    fetchSatellites,
    {
      revalidateOnFocus: false,
    }
  )

  // RSS News Wire Feed (Phase 3 Stabilization)
  const { data: rssEvents = EMPTY_ARRAY } = useSWR(
    'rss-news-wire-core',
    fetchRssEvents,
    {
      revalidateOnFocus: false,
    }
  )

  const setNewsEvents = useNewsStore((s) => s.setNewsEvents)
  React.useEffect(() => {
    if (rssEvents && rssEvents.length > 0) {
      // Merge feed items safely by ID to preserve default curated alerts
      const currentEvents = useNewsStore.getState().newsEvents
      const existingMap = new Map(currentEvents.map(e => [e.id, e]))
      rssEvents.forEach(item => {
        existingMap.set(item.id, item)
      })
      const merged = Array.from(existingMap.values())
      setNewsEvents(merged)
      setLayerEntityCount('news-events', merged.length)
    } else {
      // If backend feed is empty, retain all current/curated store items
      const currentEvents = useNewsStore.getState().newsEvents
      setLayerEntityCount('news-events', currentEvents.length)
    }
  }, [rssEvents, setNewsEvents, setLayerEntityCount])

  // Infrastructure & Energy (Phase 8 Additions)
  const { data: powerGrid = EMPTY_GEOJSON } = useSWR(
    'power-grid-core',
    fetchPowerGrid,
    {
      revalidateOnFocus: false,
    }
  )

  const { data: nuclearFacilities = EMPTY_GEOJSON } = useSWR(
    'nuclear-facilities-core',
    fetchNuclearFacilities,
    {
      revalidateOnFocus: false,
    }
  )

  const { data: pipelineNetworks = EMPTY_GEOJSON } = useSWR(
    'pipeline-networks-core',
    fetchPipelineNetworks,
    {
      revalidateOnFocus: false,
    }
  )

  // Sync layer entity counts for map-markers on load
  React.useEffect(() => {
    setLayerEntityCount('earthquakes', earthquakes.length)
  }, [earthquakes, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('weather', weatherPoints.length)
  }, [weatherPoints, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('gdelt', gdeltEvents.length)
  }, [gdeltEvents, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('aircraft', aircraft.length)
  }, [aircraft, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('wildfires', wildfires.length)
  }, [wildfires, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('airquality', airquality.length)
  }, [airquality, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('acled', acledEvents.length)
  }, [acledEvents, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('space', satellites.length)
  }, [satellites, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('active-conflicts', persistentConflicts.length)
  }, [setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('power-grid', powerGrid.features.length)
  }, [powerGrid, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('nuclear-facilities', nuclearFacilities.features.length)
  }, [nuclearFacilities, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('pipeline-networks', pipelineNetworks.features.length)
  }, [pipelineNetworks, setLayerEntityCount])

  // ── 2. GEOPOLITICAL C2 KEYBOARD SHORTCUTS SYSTEM ─────────────────────────

  React.useEffect(() => {
    const REGION_PRESETS = [
      { longitude: 121.0, latitude: 23.5, zoom: 6.5, pitch: 0, bearing: 0 }, // Taiwan Strait
      { longitude: 56.3, latitude: 26.6, zoom: 6.5, pitch: 0, bearing: 0 },  // Strait of Hormuz
      { longitude: 32.5, latitude: 30.1, zoom: 7.0, pitch: 0, bearing: 0 },  // Suez Canal
      { longitude: 127.2, latitude: 38.3, zoom: 7.5, pitch: 0, bearing: 0 }, // Korean DMZ
      { longitude: -66.5, latitude: 6.4, zoom: 5.5, pitch: 0, bearing: 0 },  // Venezuela Frontier
      { longitude: -74.0, latitude: 40.73, zoom: 11.0, pitch: 0, bearing: 0 } // New York Harbor
    ]

    const handleKeyDown = (e: KeyboardEvent) => {
      // Safe guard against typing in Search boxes or input controls
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      const key = e.key.toLowerCase()

      switch (key) {
        case 'f':
          e.preventDefault()
          toggleMapFullscreen()
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {})
          } else {
            document.exitFullscreen().catch(() => {})
          }
          break
        case 'e':
          e.preventDefault()
          toggleLayer('earthquakes')
          break
        case 's':
          e.preventDefault()
          toggleReconToolkit() // [S] = Recon Toolkit Toggle
          break
        case 'w':
          e.preventDefault()
          toggleLayer('webcams')
          break
        case 'r':
          e.preventDefault()
          // [R] = Smoothly cycle through Geographical presets
          const preset = REGION_PRESETS[presetIndexRef.current]
          setViewState(preset)
          presetIndexRef.current = (presetIndexRef.current + 1) % REGION_PRESETS.length
          break
        case 'g':
          e.preventDefault()
          toggleLayer('gdelt')
          break
        case 'c':
          e.preventDefault()
          toggleLayer('acled')
          break
        case 'l':
          e.preventDefault()
          toggleLayerPanel()
          break
        case 'i':
          e.preventDefault()
          toggleIntelPanel()
          break
        case '?':
          e.preventDefault()
          setShowHelp((prev) => !prev) // [?] = Toggle Help Overlay
          break
        case 'escape':
          e.preventDefault()
          collapseAll()
          setSelectedEntityId(null)
          break
        case '1':
          e.preventDefault()
          // Zoom out completely to global perspective
          setViewState({
            longitude: 0,
            latitude: 20,
            zoom: 1.6,
            pitch: 0,
            bearing: 0,
          })
          break
        case '+':
        case '=':
          e.preventDefault()
          setViewState({
            zoom: Math.min(20, viewState.zoom + 1),
          })
          break
        case '-':
        case '_':
          e.preventDefault()
          setViewState({
            zoom: Math.max(1, viewState.zoom - 1),
          })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    toggleMapFullscreen,
    toggleLayer,
    toggleLayerPanel,
    toggleIntelPanel,
    toggleReconToolkit,
    collapseAll,
    setSelectedEntityId,
    setViewState,
    viewState.zoom,
  ])

  return (
    <>


      <DashboardLayout
        earthquakePanel={<EarthquakePanel />}
        spaceWeatherPanel={<SpaceWeatherPanel />}
      >
        <MapView
          earthquakes={earthquakes}
          weatherPoints={weatherPoints}
          gdeltEvents={gdeltEvents}
          aircraft={aircraft}
          wildfires={wildfires}
          airquality={airquality}
          acledEvents={acledEvents}
          webcams={webcams}
          satellites={satellites}
          powerGrid={powerGrid}
          nuclearFacilities={nuclearFacilities}
          pipelineNetworks={pipelineNetworks}
        />
      </DashboardLayout>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deepest bg-opacity-75 backdrop-blur-sm select-none animate-in fade-in duration-200" onClick={() => setShowHelp(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[360px] bg-surface border border-weak rounded p-5 flex flex-col gap-4 shadow-2xl relative font-sans animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-3 right-3 text-secondary hover:text-primary p-1 hover:bg-hover rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-accent border-b border-weak pb-2">
              <HelpCircle className="w-4 h-4" />
              <span>TACTICAL COMMAND HOTKEYS</span>
            </div>

            <div className="flex flex-col gap-2 font-mono text-[9px] text-secondary">
              {[
                { key: 'F', desc: 'Toggle Fullscreen Map' },
                { key: 'S', desc: 'Toggle OSINT Recon Toolkit' },
                { key: 'R', desc: 'Cycle Geographical presets' },
                { key: 'L', desc: 'Toggle Left Layers Drawer' },
                { key: 'I', desc: 'Toggle Right Intel & CII sidebar' },
                { key: '?', desc: 'Toggle this help overlay' },
                { key: 'ESC', desc: 'Collapse all operational panels' },
                { key: '1', desc: 'Fly camera out to global scale' },
                { key: '+ / -', desc: 'Zoom camera in / out' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-weak border-dashed pb-1.5">
                  <span className="font-bold text-accent">[{item.key}]</span>
                  <span className="text-primary">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
