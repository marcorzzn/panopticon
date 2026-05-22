'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
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

export default function Home() {
  const {
    viewState,
    setViewState,
    toggleLayer,
    setSelectedEntityId,
    setLayerEntityCount,
  } = useMapStore()

  const {
    toggleLayerPanel,
    toggleIntelPanel,
    toggleMapFullscreen,
    collapseAll,
  } = usePanelStore()

  const { globalRefreshPaused } = useAppStore()

  // ── 1. BACKGROUND SWR POLLING PIPELINE ────────────────────────────────────

  // USGS Earthquakes
  const { data: earthquakes = [] } = useSWR(
    'usgs-earthquakes-core',
    fetchEarthquakes,
    {
      refreshInterval: globalRefreshPaused ? 0 : 60000,
      revalidateOnFocus: false,
    }
  )

  // Global Weather Stations
  const { data: weatherPoints = [] } = useSWR(
    'global-weather-core',
    fetchGlobalWeatherGrid,
    {
      refreshInterval: globalRefreshPaused ? 0 : 300000,
      revalidateOnFocus: false,
    }
  )

  // GDELT Geopolitical Feed (Default 'protest' query for map sync)
  const { data: gdeltEvents = [] } = useSWR(
    ['gdelt-events-core', 'protest'],
    () => fetchGdeltEvents('protest'),
    {
      refreshInterval: globalRefreshPaused ? 0 : 900000,
      revalidateOnFocus: false,
    }
  )

  // OpenSky Aviation (Phase 2 Additions)
  const { data: aircraft = [] } = useSWR(
    'opensky-aircraft-core',
    fetchAircraft,
    {
      refreshInterval: globalRefreshPaused ? 0 : 20000,
      revalidateOnFocus: false,
    }
  )

  // NASA FIRMS Wildfires (Phase 2 Additions)
  const { data: wildfires = [] } = useSWR(
    'nasa-wildfires-core',
    fetchWildfires,
    {
      refreshInterval: globalRefreshPaused ? 0 : 300000,
      revalidateOnFocus: false,
    }
  )

  // OpenAQ Air Quality (Phase 3 Additions)
  const { data: airquality = [] } = useSWR(
    'openaq-airquality-core',
    fetchAirQuality,
    {
      refreshInterval: globalRefreshPaused ? 0 : 60000,
      revalidateOnFocus: false,
    }
  )

  // ACLED Conflicts (Phase 3 Additions)
  const { data: acledEvents = [] } = useSWR(
    'acled-conflicts-core',
    fetchAcledEvents,
    {
      refreshInterval: globalRefreshPaused ? 0 : 60000,
      revalidateOnFocus: false,
    }
  )

  // CCTV Webcams (Phase 4 Additions)
  const { data: webcams = [] } = useSWR(
    'webcams-core',
    fetchWebcams,
    {
      refreshInterval: globalRefreshPaused ? 0 : 3000,
      revalidateOnFocus: false,
    }
  )

  // Space & Orbital Satellites (Phase 5 Additions)
  const { data: satellites = [] } = useSWR(
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
          toggleLayer('space')
          break
        case 'w':
          e.preventDefault()
          toggleLayer('webcams')
          break
        case 'r':
          e.preventDefault()
          toggleLayer('recon')
          break
        case 'g':
          e.preventDefault()
          toggleLayer('gdelt')
          break
        case 'a':
          e.preventDefault()
          toggleLayer('airquality')
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
    collapseAll,
    setSelectedEntityId,
    setViewState,
    viewState.zoom,
  ])

  return (
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
  )
}
