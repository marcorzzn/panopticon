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
} from '@panopticon/data-pipeline'
import { useMapStore, usePanelStore, useAppStore } from '@panopticon/core/stores'
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
  const toggleAiBrief = usePanelStore((s) => s.toggleAiBrief)

  const [showHelp, setShowHelp] = React.useState(false)
  const presetIndexRef = React.useRef(0)

  const globalRefreshPaused = useAppStore((s) => s.globalRefreshPaused)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = React.useState(0)
  const { mutate } = useSWRConfig()

  // High-frequency client-side polling timer
  React.useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceUpdate((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-mutate all feeds on high-frequency interval if not paused
  React.useEffect(() => {
    if (globalRefreshPaused) return

    const keys = [
      'usgs-earthquakes-core',
      'opensky-aircraft-core',
      'nasa-wildfires-core',
      'openaq-airquality-core',
      'acled-conflicts-core',
      'webcams-core',
      'space-satellites-core'
    ]

    const pollingInterval = setInterval(async () => {
      await Promise.all([
        ...keys.map(k => mutate(k)),
        mutate(['gdelt-events-core', 'protest'])
      ])
      setSecondsSinceUpdate(0)
    }, 15000) // 15s high-frequency polling sweep

    return () => clearInterval(pollingInterval)
  }, [globalRefreshPaused, mutate])

  // ── 1. BACKGROUND SWR POLLING PIPELINE ────────────────────────────────────

  // USGS Earthquakes
  const { data: earthquakes = EMPTY_ARRAY } = useSWR(
    'usgs-earthquakes-core',
    fetchEarthquakes,
    {
      refreshInterval: globalRefreshPaused ? 0 : 60000,
      revalidateOnFocus: false,
    }
  )

  // Global Weather Stations
  const { data: weatherPoints = EMPTY_ARRAY } = useSWR(
    'global-weather-core',
    fetchGlobalWeatherGrid,
    {
      refreshInterval: globalRefreshPaused ? 0 : 300000,
      revalidateOnFocus: false,
    }
  )

  // GDELT Geopolitical Feed (Default 'protest' query for map sync)
  const { data: gdeltEvents = EMPTY_ARRAY } = useSWR(
    ['gdelt-events-core', 'protest'],
    () => fetchGdeltEvents('protest'),
    {
      refreshInterval: globalRefreshPaused ? 0 : 900000,
      revalidateOnFocus: false,
    }
  )

  // OpenSky Aviation (Phase 2 Additions)
  const { data: aircraft = EMPTY_ARRAY } = useSWR(
    'opensky-aircraft-core',
    fetchAircraft,
    {
      refreshInterval: globalRefreshPaused ? 0 : 20000,
      revalidateOnFocus: false,
    }
  )

  // NASA FIRMS Wildfires (Phase 2 Additions)
  const { data: wildfires = EMPTY_ARRAY } = useSWR(
    'nasa-wildfires-core',
    fetchWildfires,
    {
      refreshInterval: globalRefreshPaused ? 0 : 300000,
      revalidateOnFocus: false,
    }
  )

  // OpenAQ Air Quality (Phase 3 Additions)
  const { data: airquality = EMPTY_ARRAY } = useSWR(
    'openaq-airquality-core',
    fetchAirQuality,
    {
      refreshInterval: globalRefreshPaused ? 0 : 60000,
      revalidateOnFocus: false,
    }
  )

  // ACLED Conflicts (Phase 3 Additions)
  const { data: acledEvents = EMPTY_ARRAY } = useSWR(
    'acled-conflicts-core',
    fetchAcledEvents,
    {
      refreshInterval: globalRefreshPaused ? 0 : 60000,
      revalidateOnFocus: false,
    }
  )

  // CCTV Webcams (Phase 4 Additions)
  const { data: webcams = EMPTY_ARRAY } = useSWR(
    'webcams-core',
    fetchWebcams,
    {
      refreshInterval: globalRefreshPaused ? 0 : 3000,
      revalidateOnFocus: false,
    }
  )

  // Space & Orbital Satellites (Phase 5 Additions)
  const { data: satellites = EMPTY_ARRAY } = useSWR(
    'space-satellites-core',
    fetchSatellites,
    {
      refreshInterval: globalRefreshPaused ? 0 : 2000, // Poll every 2 seconds matching the Go propagator
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
    setLayerEntityCount('webcams', webcams.length)
  }, [webcams, setLayerEntityCount])

  React.useEffect(() => {
    setLayerEntityCount('space', satellites.length)
  }, [satellites, setLayerEntityCount])

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
        case 'a':
          e.preventDefault()
          toggleAiBrief() // [A] = AI Brief Drawer Toggle
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
    toggleAiBrief,
    collapseAll,
    setSelectedEntityId,
    setViewState,
    viewState.zoom,
  ])

  return (
    <>
      {/* Global Pipeline Sync HUD Indicator */}
      <div className="absolute left-16 top-16 z-20 flex flex-col font-mono text-[9px] px-2.5 py-1.5 rounded border border-weak bg-[#0b0f1a]/85 backdrop-blur-sm pointer-events-none select-none text-secondary">
        <div className="flex items-center gap-1.5 font-bold">
          <span className={`w-1.5 h-1.5 rounded-full ${globalRefreshPaused ? 'bg-status-critical-text animate-pulse' : 'bg-accent animate-ping'}`} />
          <span className="uppercase text-primary font-semibold">PIPELINE SYNC</span>
          <span className="text-secondary">•</span>
          <span className={`uppercase font-bold ${globalRefreshPaused ? 'text-status-critical-text' : 'text-[#34c759]'}`}>
            {globalRefreshPaused ? 'PAUSED' : 'ACTIVE'}
          </span>
        </div>
        <span className="mt-1 text-[8px] text-secondary">
          LAST SWEEP: {secondsSinceUpdate === 0 ? 'JUST NOW' : `${secondsSinceUpdate}s AGO`}
        </span>
      </div>

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
                { key: 'A', desc: 'Toggle AI Brief Console' },
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
