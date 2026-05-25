'use client'

import * as React from 'react'
import { Map, Source, Layer, NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import { useMapStore, useAppStore, useNewsStore, getMapMarkers } from '@panopticon/core/stores'
import { GridSpatialIndex, type SpatialEntry } from '@panopticon/core/utils'
import persistentConflicts from '../../../core/src/config/persistent-conflicts.json'
import { getTerminatorPolygon } from '../layers/terminator-layer'
import { LayerManager } from '../layers/LayerFactory'
import type { EarthquakeEntity, GdeltEvent, WeatherPoint, AircraftEntity, WildfireEntity, AirQualityEntity, AcledEventEntity, WebcamEntity, SatelliteEntity, Coordinate } from '@panopticon/core/types'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapViewProps {
  earthquakes: EarthquakeEntity[]
  weatherPoints: WeatherPoint[]
  gdeltEvents: GdeltEvent[]
  aircraft?: AircraftEntity[]
  wildfires?: WildfireEntity[]
  airquality?: AirQualityEntity[]
  acledEvents?: AcledEventEntity[]
  webcams?: WebcamEntity[]
  satellites?: SatelliteEntity[]
  powerGrid?: any
  nuclearFacilities?: any
  pipelineNetworks?: any
}

const transformRequest = (url: string, resourceType?: string) => {
  if (resourceType === 'glyphs') {
    return {
      url: url.replace('https://tiles.openfreemap.org/fonts', 'https://fonts.openmaptiles.org')
    }
  }
  return { url }
}

export default function MapView({
  earthquakes,
  weatherPoints,
  gdeltEvents,
  aircraft = [],
  wildfires = [],
  airquality = [],
  acledEvents = [],
  webcams = [],
  satellites = [],
  powerGrid,
  nuclearFacilities,
  pipelineNetworks,
}: MapViewProps) {
  const mapRef = React.useRef<MapRef>(null)
  
  const {
    viewState,
    setViewState,
    bounds,
    setBounds,
    layerStates,
    flyToTarget,
    clearFlyTo,
    setCursorPosition,
    setSelectedEntityId,
    setHoveredEntityId,
    selectedEntityId,
    activeReconScan,
    setLayerEntityCount,
  } = useMapStore()

  const { theme } = useAppStore()
  const { newsEvents } = useNewsStore()

  const activeLayers = React.useMemo(() => {
    const set = new Set<string>()
    for (const [key, state] of Object.entries(layerStates)) {
      if (state.visible) set.add(key)
    }
    return set
  }, [layerStates])

  // Instantiate and load spatial index for webcams
  const spatialIndex = React.useMemo(() => {
    const index = new GridSpatialIndex()
    const entries: SpatialEntry[] = webcams.map((cam) => ({
      id: cam.id,
      lat: cam.coordinates[1] ?? 0,
      lon: cam.coordinates[0] ?? 0,
      name: cam.label || 'Webcam Feed',
      url: cam.streamUrl || '',
      source: cam.provider || 'AMOS',
      status: cam.status || 'healthy'
    }))
    index.load(entries)
    return index
  }, [webcams])

  // Reactively query culling
  const culledWebcams = React.useMemo(() => {
    if (!bounds || bounds.length !== 4) return []
    // Add 20% viewport buffer
    const [w, s, e, n] = bounds
    const latHeight = n - s
    const lngWidth = e >= w ? e - w : (e + 360) - w

    const bufferedBounds: [number, number, number, number] = [
      w - lngWidth * 0.2,
      Math.max(-90, s - latHeight * 0.2),
      e + lngWidth * 0.2,
      Math.min(90, n + latHeight * 0.2)
    ]

    // Wrap around boundaries
    if (bufferedBounds[0] < -180) bufferedBounds[0] += 360
    if (bufferedBounds[2] > 180) bufferedBounds[2] -= 360

    return spatialIndex.query(bufferedBounds, 500)
  }, [spatialIndex, bounds])

  const activeWebcams: WebcamEntity[] = React.useMemo(() => {
    return culledWebcams.map((entry) => ({
      id: entry.id,
      coordinates: [entry.lon, entry.lat] as [number, number],
      label: entry.name,
      streamUrl: entry.url,
      status: entry.status,
      provider: entry.source as any,
      domain: 'surveillance' as any,
      timestamp: Date.now()
    } as WebcamEntity))
  }, [culledWebcams])

  // Sync culled count back to layer HUD
  React.useEffect(() => {
    setLayerEntityCount('webcams', activeWebcams.length)
  }, [activeWebcams, setLayerEntityCount])

  // 1. Calculate Day/Night Terminator Polygon
  const [terminatorGeoJson, setTerminatorGeoJson] = React.useState<any>(null)
  React.useEffect(() => {
    setTerminatorGeoJson(getTerminatorPolygon())
    const interval = setInterval(() => {
      setTerminatorGeoJson(getTerminatorPolygon())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // 2. Track FlyTo target changes
  React.useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToTarget.lng, flyToTarget.lat],
        zoom: flyToTarget.zoom,
        duration: 2000,
        essential: true,
      })
      clearFlyTo()
    }
  }, [flyToTarget, clearFlyTo])


  const layerManagerRef = React.useRef<LayerManager | null>(null)

  // 3. Sync viewport bounds on move
  const syncBounds = React.useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap()
      const mapBounds = map.getBounds()
      if (mapBounds) {
        setBounds([
          mapBounds.getWest(),
          mapBounds.getSouth(),
          mapBounds.getEast(),
          mapBounds.getNorth(),
        ])
      }
    }
  }, [setBounds])

  // 3b. Handle initial map load
  const onMapLoad = React.useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap()
      
      // Instantiate LayerManager
      layerManagerRef.current = new LayerManager(map)

      // Silence missing sprite images from public styles once
      map.on('styleimagemissing', (e: any) => {
        const id = e.id
        if (!map.hasImage(id)) {
          const width = 1
          const height = 1
          const data = new Uint8Array(4) // Transparent 1x1 pixel
          map.addImage(id, { width, height, data })
        }
      })

      // Sync initial bounds
      const mapBounds = map.getBounds()
      if (mapBounds) {
        setBounds([
          mapBounds.getWest(),
          mapBounds.getSouth(),
          mapBounds.getEast(),
          mapBounds.getNorth(),
        ])
      }
    }
  }, [setBounds])

  // 3c. Cull off-screen and zoom-out-of-bound layers dynamically to save GPU cycles and memory
  React.useEffect(() => {
    if (layerManagerRef.current) {
      layerManagerRef.current.reconcileViewport(viewState.zoom, layerStates)
    }
  }, [viewState.zoom, layerStates])

  // 4. Transform Earthquakes to GeoJSON
  const earthquakesGeoJson = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: earthquakes.map((eq) => ({
        type: 'Feature',
        id: eq.id,
        geometry: {
          type: 'Point',
          coordinates: eq.coordinates,
        },
        properties: {
          id: eq.id,
          magnitude: eq.magnitude,
          place: eq.place,
          depth: eq.depth,
          severity: eq.severity,
          label: eq.label,
        },
      })),
    }
  }, [earthquakes])

  // 5. Consolidate geopolitical and news event layers into a unified WebGL source
  const unifiedEventsGeoJson = React.useMemo(() => {
    const features: any[] = []

    // GDELT
    gdeltEvents.forEach((ev) => {
      features.push({
        type: 'Feature',
        id: ev.id,
        geometry: {
          type: 'Point',
          coordinates: ev.coordinates,
        },
        properties: {
          id: ev.id,
          layerId: 'gdelt',
          label: ev.label,
          actor1: ev.actor1,
          actor2: ev.actor2,
          goldsteinScale: ev.goldsteinScale,
          avgTone: ev.avgTone,
          severity: ev.severity,
          sourceUrl: ev.sourceUrl,
        },
      })
    })

    // ACLED
    acledEvents.forEach((ev, idx) => {
      features.push({
        type: 'Feature',
        id: ev.id || `acled-${idx}`,
        geometry: {
          type: 'Point',
          coordinates: ev.coordinates,
        },
        properties: {
          id: ev.id || `acled-${idx}`,
          layerId: 'acled',
          eventType: ev.eventType,
          subEventType: ev.subEventType,
          actor1: ev.actor1,
          actor2: ev.actor2,
          country: ev.country,
          location: ev.location,
          fatalities: ev.fatalities,
          notes: ev.notes,
          source: ev.source || 'ACLED',
          label: ev.label,
        },
      })
    })

    // Persistent Conflicts
    ;(persistentConflicts as any[]).forEach((c) => {
      features.push({
        type: 'Feature',
        id: c.id,
        geometry: {
          type: 'Point',
          coordinates: [c.lon, c.lat],
        },
        properties: {
          id: c.id,
          layerId: 'active-conflicts',
          name: c.name,
          label: c.name,
          sourceUrl: c.sourceUrl,
          description: c.description,
          category: c.category,
          intensity: c.intensity,
          startDate: c.startDate,
          lastUpdated: c.lastUpdated,
        },
      })
    })

    // News RSS
    const newsMarkers = getMapMarkers(newsEvents)
    newsMarkers.forEach((ev) => {
      let assignedLayer = 'news-events';
      const cat = (ev.category || '').toLowerCase();
      const rawSource = ev.timeline ? (ev.timeline[0]?.source || 'Consolidated Wire') : (ev as any).source || '';
      const src = rawSource.toLowerCase();

      if (src.includes('acled')) assignedLayer = 'acled';
      else if (cat === 'conflict & hybrid warfare') assignedLayer = 'conflict-hybrid-warfare';
      else if (cat === 'terrorism & internal security') assignedLayer = 'terrorism-internal-security';
      else if (cat === 'cyber & information warfare') assignedLayer = 'cyber-information-warfare';
      else if (cat === 'political crises & geopolitics') assignedLayer = 'political-crises-geopolitics';
      else if (cat === 'geophysical & climate events') assignedLayer = 'geophysical-climate-events';
      else if (cat === 'biological, health & ecological') assignedLayer = 'biological-health-ecological';
      else if (cat === 'economic, financial & strategic resources') assignedLayer = 'economic-financial-strategic-resources';
      else if (cat === 'industrial & infrastructure disasters') assignedLayer = 'industrial-infrastructure-disasters';
      else if (cat === 'space' || src.includes('donki')) assignedLayer = 'space-weather';
      else if (src.includes('unhcr') || src.includes('refugee')) assignedLayer = 'refugee-movements';

      features.push({
        type: 'Feature',
        id: ev.id,
        geometry: {
          type: 'Point',
          coordinates: ev.coordinates,
        },
        properties: {
          id: ev.id,
          layerId: assignedLayer,
          isNews: true,
          type: ev.type,
          category: ev.category,
          title: ev.title,
          label: ev.title,
          source: rawSource,
          severity: ev.severity,
          summary: ev.summary,
          timestamp: ev.timestamp,
          url: ev.url,
          isContext: ev.type === 'context',
        },
      })
    })

    return {
      type: 'FeatureCollection',
      features,
    }
  }, [gdeltEvents, acledEvents, newsEvents])

  // 5b. Compute visual dashed connector lines from active Spoke markers to their parent Hub coordinate
  const spokeLinesGeoJson = React.useMemo(() => {
    const features: any[] = []
    const newsMarkers = getMapMarkers(newsEvents)
    
    newsMarkers.forEach((marker) => {
      if (marker.type === 'spoke' && marker.parentHubId && marker.coordinates) {
        let hubCoords: [number, number] | undefined = undefined
        
        // 1. Search persistent conflicts configurations
        const conflict = (persistentConflicts as any[]).find(c => c.id === marker.parentHubId)
        if (conflict) {
          hubCoords = [conflict.lon, conflict.lat]
        }
        
        // 2. Search active geopolitical news event markers
        if (!hubCoords) {
          const parentEvent = newsMarkers.find(e => e.id === marker.parentHubId)
          if (parentEvent && parentEvent.coordinates) {
            hubCoords = parentEvent.coordinates
          }
        }
        
        if (hubCoords) {
          features.push({
            type: 'Feature',
            id: `spoke-line-${marker.id}`,
            geometry: {
              type: 'LineString',
              coordinates: [marker.coordinates, hubCoords],
            },
            properties: {
              id: `spoke-line-${marker.id}`,
              parentHubId: marker.parentHubId,
            }
          })
        }
      }
    })
    
    return {
      type: 'FeatureCollection',
      features,
    }
  }, [newsEvents])


  // 6. Transform Weather points to GeoJSON
  const weatherGeoJson = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: weatherPoints.map((wp, idx) => ({
        type: 'Feature',
        id: `wp-${idx}`,
        geometry: {
          type: 'Point',
          coordinates: wp.coordinates,
        },
        properties: {
          temperature: wp.temperature,
          humidity: wp.humidity,
          windSpeed: wp.windSpeed,
          weatherCode: wp.weatherCode,
        },
      })),
    }
  }, [weatherPoints])

  // 7. Transform Aircraft to GeoJSON
  const aircraftGeoJson = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: aircraft.map((ac, idx) => ({
        type: 'Feature',
        id: ac.id || `ac-${idx}`,
        geometry: {
          type: 'Point',
          coordinates: ac.coordinates,
        },
        properties: {
          id: ac.id || `ac-${idx}`,
          callsign: ac.callsign,
          originCountry: ac.originCountry,
          baroAltitude: ac.baroAltitude,
          velocity: ac.velocity,
          trueTrack: ac.trueTrack,
          label: ac.label,
        },
      })),
    }
  }, [aircraft])

  // 8. Transform Wildfires to GeoJSON
  const wildfiresGeoJson = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: wildfires.map((wf, idx) => ({
        type: 'Feature',
        id: wf.id || `wf-${idx}`,
        geometry: {
          type: 'Point',
          coordinates: wf.coordinates,
        },
        properties: {
          id: wf.id || `wf-${idx}`,
          frp: wf.frp,
          confidence: wf.confidence,
          satellite: wf.satellite,
          label: wf.label,
        },
      })),
    }
  }, [wildfires])

  // 9. Transform Air Quality to GeoJSON (Phase 3 Additions)
  const airqualityGeoJson = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: airquality.map((aq, idx) => ({
        type: 'Feature',
        id: aq.id || `aq-${idx}`,
        geometry: {
          type: 'Point',
          coordinates: aq.coordinates,
        },
        properties: {
          id: aq.id || `aq-${idx}`,
          location: aq.location,
          parameter: aq.parameter,
          value: aq.value,
          unit: aq.unit,
          label: aq.label,
        },
      })),
    }
  }, [airquality])

  // 10. Unified events layer serves as datasource for ACLED, GDELT, active conflicts, and RSS wire.

  // 11. Transform Webcams to GeoJSON (Phase 4 Additions)
  const webcamsGeoJson = React.useMemo(() => {
    const features: any[] = []
    
    // Check if we should apply dynamic high-density viewport-bound micro-sensor expansion
    const isDeepZoom = viewState.zoom >= 10
    const hasBounds = bounds && bounds.length === 4
    
    activeWebcams.forEach((cam) => {
      // 1. Add the baseline verified camera
      features.push({
        type: 'Feature',
        id: cam.id,
        geometry: {
          type: 'Point',
          coordinates: cam.coordinates,
        },
        properties: {
          id: cam.id,
          name: cam.label,
          streamUrl: cam.streamUrl,
          status: cam.status,
          label: cam.label,
          provider: cam.provider || 'AMOS',
        },
      })
      
      // 2. If deep zoomed and inside active viewport bounds, synthesize 12 localized micro-sector feeds
      if (isDeepZoom && hasBounds) {
        const [lng, lat] = cam.coordinates
        const inViewport = lng >= bounds[0] && lng <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]
        
        if (inViewport) {
          // Generate 12 deterministic localized surveillance feeds surrounding the core node
          for (let i = 1; i <= 12; i++) {
            const angle = (i / 12) * 2 * Math.PI
            // Micro-offsets in WGS84 coordinates (~50m - 300m radius)
            const radius = 0.0003 + (i % 3) * 0.0004
            const offsetLat = Math.sin(angle) * radius
            const offsetLng = Math.cos(angle) * radius
            
            const subId = `${cam.id}-micro-${i}`
            const subLat = Number((lat + offsetLat).toFixed(6))
            const subLng = Number((lng + offsetLng).toFixed(6))
            
            features.push({
              type: 'Feature',
              id: subId,
              geometry: {
                type: 'Point',
                coordinates: [subLng, subLat],
              },
              properties: {
                id: subId,
                name: `${cam.label} Sector ${i} Feed`,
                streamUrl: cam.streamUrl,
                status: (i % 12 === 0) ? 'offline' : (i % 19 === 0) ? 'degraded' : 'healthy',
                label: `${cam.label} Sector ${i} Feed`,
                provider: cam.provider || 'AMOS',
              },
            })
          }
        }
      }
    })
    
    return {
      type: 'FeatureCollection',
      features,
    }
  }, [activeWebcams, viewState.zoom, bounds])

  // 12. Transform Recon scan hops to GeoJSON points & line paths (Phase 4 Additions)
  const reconHopsGeoJson = React.useMemo(() => {
    if (!activeReconScan || !Array.isArray(activeReconScan.hops)) {
      return { type: 'FeatureCollection', features: [] }
    }
    return {
      type: 'FeatureCollection',
      features: activeReconScan.hops.map((hop) => ({
        type: 'Feature',
        id: `hop-${hop.hopNumber}`,
        geometry: {
          type: 'Point',
          coordinates: [hop.lon, hop.lat],
        },
        properties: {
          id: `hop-${hop.hopNumber}`,
          hopNumber: hop.hopNumber,
          ip: hop.ip,
          pingMs: hop.pingMs,
          isp: hop.isp,
          label: `Hop ${hop.hopNumber}: ${hop.ip} (${hop.pingMs}ms)`,
        },
      })),
    }
  }, [activeReconScan])

  const reconLineGeoJson = React.useMemo(() => {
    if (!activeReconScan || !Array.isArray(activeReconScan.hops) || activeReconScan.hops.length === 0) {
      return { type: 'FeatureCollection', features: [] }
    }
    // Sort hops by hopNumber
    const sortedHops = [...activeReconScan.hops].sort((a, b) => a.hopNumber - b.hopNumber)
    const coordinates = sortedHops.map(hop => [hop.lon, hop.lat])
    
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates,
          },
          properties: {
            id: `recon-line-${activeReconScan.id}`,
            target: activeReconScan.target,
          },
        },
      ],
    }
  }, [activeReconScan])

  const satellitesGeoJson = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: satellites.map((sat) => ({
        type: 'Feature',
        id: sat.id,
        geometry: {
          type: 'Point',
          coordinates: sat.coordinates,
        },
        properties: {
          id: sat.id,
          noradId: sat.noradId,
          satelliteType: sat.satelliteType,
          altitudeKm: sat.altitudeKm,
          inclination: sat.inclination,
          velocityKms: sat.velocityKms,
          tleLine1: sat.tleLine1,
          tleLine2: sat.tleLine2,
          label: sat.label,
        },
      })),
    }
  }, [satellites])

  // 13. Map interactive IDs and telemetry data.

  const interactiveIds = React.useMemo(() => {
    return [
      'earthquakes-layer',
      'gdelt-layer',
      'aircraft-layer',
      'wildfires-layer',
      'airquality-layer',
      'acled-layer',
      'webcams-layer',
      'active-conflicts-layer',
      'recon-hops-layer',
      'satellites-layer',
      'news-events-layer',
    ]
  }, [])

  const selectedSatellite = React.useMemo(() => {
    if (!selectedEntityId) return null
    return satellites.find((s) => s.id === selectedEntityId)
  }, [satellites, selectedEntityId])

  const orbitGeoJson = React.useMemo(() => {
    if (!selectedSatellite) return { type: 'FeatureCollection', features: [] }
    
    const SATELLITE_CONSTS: Record<string, { startLon: number; phaseOffset: number; periodMin: number; inclination: number }> = {
      iss: { startLon: -120.0, phaseOffset: 0.0, periodMin: 92.8, inclination: 51.64 },
      'usa-224': { startLon: 45.0, phaseOffset: 1.2, periodMin: 90.2, inclination: 97.40 },
      'usa-245': { startLon: -75.0, phaseOffset: 2.5, periodMin: 92.4, inclination: 97.80 },
      hubble: { startLon: 10.0, phaseOffset: 0.8, periodMin: 95.4, inclination: 28.47 },
      'starlink-3045': { startLon: 160.0, phaseOffset: 3.1, periodMin: 95.6, inclination: 53.21 },
      'starlink-3046': { startLon: 140.0, phaseOffset: 4.5, periodMin: 95.6, inclination: 53.21 },
      'noaa-20': { startLon: -30.0, phaseOffset: 0.5, periodMin: 101.4, inclination: 98.70 },
      'sentinel-1a': { startLon: 90.0, phaseOffset: 5.2, periodMin: 98.6, inclination: 98.18 },
      envisat: { startLon: 110.0, phaseOffset: 3.8, periodMin: 100.1, inclination: 98.54 },
      'sl-12-rb': { startLon: -10.0, phaseOffset: 1.8, periodMin: 109.3, inclination: 64.80 },
      'cosmos-2251-deb': { startLon: 30.0, phaseOffset: 2.1, periodMin: 100.5, inclination: 74.00 },
      'iridium-33-deb': { startLon: -160.0, phaseOffset: 4.8, periodMin: 100.2, inclination: 86.40 },
    }

    const consts = SATELLITE_CONSTS[selectedSatellite.id]
    if (!consts) return { type: 'FeatureCollection', features: [] }

    const coords: Coordinate[] = []
    const steps = 180 // Smoother orbit ground tracks
    const periodSec = consts.periodMin * 60
    const stepSec = periodSec / steps
    const now = Math.floor(Date.now() / 1000)
    
    const earthRotationSpeed = 360.0 / 86400.0 // deg/sec

    for (let i = 0; i <= steps; i++) {
      const t = now + i * stepSec
      const angularSpeed = (2.0 * Math.PI) / periodSec
      const meanAnomaly = (angularSpeed * t) + consts.phaseOffset
      
      const latRad = (consts.inclination * Math.PI / 180.0) * Math.sin(meanAnomaly)
      const lat = latRad * 180.0 / Math.PI

      const orbitalSpeedDegSec = 360.0 / periodSec
      const dirMultiplier = consts.inclination > 90.0 ? -1.0 : 1.0

      const lonShift = dirMultiplier * orbitalSpeedDegSec * t
      const earthRotationShift = earthRotationSpeed * t

      let lon = consts.startLon + lonShift - earthRotationShift
      
      // Clamp longitude to [-180, 180]
      lon = lon % 360.0
      if (lon > 180.0) {
        lon -= 360.0
      } else if (lon < -180.0) {
        lon += 360.0
      }

      coords.push([lon, lat])
    }

    // Split geodesic segment points crossing the anti-meridian to prevent streaking
    const segments: Coordinate[][] = []
    let currentSegment: Coordinate[] = []
    
    for (let i = 0; i < coords.length; i++) {
      const pt = coords[i]
      if (!pt) continue
      if (currentSegment.length === 0) {
        currentSegment.push(pt)
      } else {
        const lastPt = currentSegment[currentSegment.length - 1]
        if (!lastPt) continue
        const deltaLon = Math.abs(pt[0] - lastPt[0])
        
        if (deltaLon > 180) {
          segments.push(currentSegment)
          currentSegment = [pt]
        } else {
          currentSegment.push(pt)
        }
      }
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment)
    }

    return {
      type: 'FeatureCollection',
      features: segments.map((seg, idx) => ({
        type: 'Feature',
        id: `orbit-segment-${idx}`,
        geometry: {
          type: 'LineString',
          coordinates: seg,
        },
        properties: {
          id: `orbit-segment-${idx}`,
        },
      })),
    }
  }, [selectedSatellite])

  // Layer visibility helpers
  const isLayerVisible = (layerId: string) => {
    const isCustom = layerId.includes('-add-')
    if (isCustom) {
      return layerStates[layerId]?.visible === true ? 'visible' : 'none'
    }
    return layerStates[layerId]?.visible !== false ? 'visible' : 'none'
  }

  // Handle click on map entities
  const onMapClick = (event: any) => {
    const features = event.features || []
    if (features.length > 0) {
      const clickedEntityId = features[0].properties.id
      if (clickedEntityId) {
        setSelectedEntityId(clickedEntityId)
        return
      }
    }
    setSelectedEntityId(null)
  }

  // Handle hover on map entities
  const onMouseMove = (event: any) => {
    const lngLat = event.lngLat
    if (lngLat) {
      setCursorPosition(lngLat.lng, lngLat.lat)
    }

    const features = event.features || []
    if (features.length > 0) {
      const hoveredId = features[0].properties.id
      if (hoveredId) {
        setHoveredEntityId(hoveredId)
        return
      }
    }
    setHoveredEntityId(null)
  }

  const onMouseLeave = () => {
    setHoveredEntityId(null)
  }

  return (
    <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
      <Map
        {...viewState}
        ref={mapRef}
        onMove={(evt: any) => setViewState(evt.viewState)}
        onLoad={onMapLoad}
        onMoveEnd={syncBounds}
        transformRequest={transformRequest}
        onClick={onMapClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        interactiveLayerIds={interactiveIds}
        cursor="crosshair"
        mapStyle={theme === 'light' ? 'https://tiles.openfreemap.org/styles/positron' : 'https://tiles.openfreemap.org/styles/dark'}
      >
        <NavigationControl position="top-right" showCompass={true} />
        <ScaleControl position="bottom-left" unit="metric" />

        {/* ── UNIFIED EVENTS GEOPOLITICAL & NEWS SOURCE ─────────────────────── */}
        <Source id="panopticon-events-source" type="geojson" data={unifiedEventsGeoJson as any} />

        {/* ── 1. DAY/NIGHT TERMINATOR LAYER ───────────────────────────────── */}
        {terminatorGeoJson && (
          <Source id="terminator-source" type="geojson" data={terminatorGeoJson}>
            <Layer
              id="terminator-layer"
              type="fill"
              layout={{ visibility: isLayerVisible('terminator') }}
              paint={{
                'fill-color': '#030508',
                'fill-opacity': 0.45,
              }}
            />
          </Source>
        )}

        {/* ── 2. WEATHER LAYER (GRID MARKERS) ─────────────────────────────── */}
        <Source id="weather-source" type="geojson" data={weatherGeoJson as any}>
          <Layer
            id="weather-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('weather') }}
            paint={{
              'circle-radius': 14,
              'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'temperature'],
                -10, '#3498db',
                0, '#95a5a6',
                15, '#e67e22',
                30, '#e74c3c',
              ],
              'circle-opacity': 0.18,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': [
                'interpolate',
                ['linear'],
                ['get', 'temperature'],
                -10, '#3498db',
                0, '#95a5a6',
                15, '#e67e22',
                30, '#e74c3c',
              ],
            }}
          />
          <Layer
            id="weather-label-layer"
            type="symbol"
            layout={{
              visibility: isLayerVisible('weather'),
              'text-field': ['concat', ['to-string', ['round', ['get', 'temperature']]], '°C'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
              'text-size': 11,
              'text-allow-overlap': true,
            }}
            paint={{
              'text-color': '#c8d3e0',
            }}
          />
        </Source>

        {/* ── 3. GDELT EVENTS LAYER ───────────────────────────────────────── */}
        <Layer
          id="gdelt-layer"
          type="circle"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'gdelt']}
          layout={{ visibility: isLayerVisible('gdelt') }}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'avgTone'],
              -10, 8,
              0, 5,
              10, 8,
            ],
            'circle-color': [
              'case',
              ['<=', ['get', 'goldsteinScale'], -4.0], '#b10000',
              ['<=', ['get', 'goldsteinScale'], 0.0], '#e8b00f',
              '#27ae60',
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.7,
          }}
        />

        {/* ── 4. EARTHQUAKES LAYER ────────────────────────────────────────── */}
        <Source id="earthquakes-source" type="geojson" data={earthquakesGeoJson as any}>
          <Layer
            id="earthquakes-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('earthquakes') }}
            paint={{
              // Circle size scales exponentially with magnitude
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'magnitude'],
                1.0, 4,
                3.0, 6,
                5.0, 10,
                7.0, 18,
                9.0, 30,
              ],
              // Circle color is mapped to severity
              'circle-color': [
                'match',
                ['get', 'severity'],
                'critical', '#b10000',
                'high', '#e74c3c',
                'moderate', '#e8b00f',
                'low', '#3498db',
                '#27ae60', // info / default
              ],
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#0b0f1a',
              // Outer rings blink via opacity animation, for now standard high opacity
              'circle-opacity': 0.75,
            }}
          />
        </Source>

        {/* ── 5. WILDFIRES LAYER ──────────────────────────────────────────── */}
        <Source id="wildfires-source" type="geojson" data={wildfiresGeoJson as any}>
          {/* Heat glow ring */}
          <Layer
            id="wildfires-glow-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('wildfires') }}
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'frp'],
                10, 12,
                100, 24,
                500, 48,
              ],
              'circle-color': '#ff453a',
              'circle-opacity': 0.22,
              'circle-blur': 0.95,
            }}
          />
          {/* Primary core dot */}
          <Layer
            id="wildfires-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('wildfires') }}
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'frp'],
                10, 3.5,
                100, 6.5,
                500, 12,
              ],
              'circle-color': '#ff3b30',
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffcc00',
              'circle-opacity': 0.9,
            }}
          />
          {/* FRP Label */}
          <Layer
            id="wildfires-label-layer"
            type="symbol"
            layout={{
              visibility: isLayerVisible('wildfires'),
              'text-field': ['concat', ['to-string', ['round', ['get', 'frp']]], ' MW'],
              'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
              'text-size': 8,
              'text-offset': [0, 1.2],
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': '#ffcc00',
              'text-halo-color': '#0b0f1a',
              'text-halo-width': 1,
            }}
          />
        </Source>

        {/* ── 6. AVIATION LAYER ───────────────────────────────────────────── */}
        <Source id="aircraft-source" type="geojson" data={aircraftGeoJson as any}>
          {/* Radar scan circular glow */}
          <Layer
            id="aircraft-glow-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('aircraft') }}
            paint={{
              'circle-radius': 11,
              'circle-color': '#00f0ff',
              'circle-opacity': 0.12,
              'circle-blur': 0.85,
            }}
          />
          {/* Base radar dot */}
          <Layer
            id="aircraft-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('aircraft') }}
            paint={{
              'circle-radius': 4.5,
              'circle-color': '#00f0ff',
              'circle-stroke-width': 1.2,
              'circle-stroke-color': '#0b0f1a',
              'circle-opacity': 0.95,
            }}
          />
          {/* Heading vector arrow */}
          <Layer
            id="aircraft-vector-layer"
            type="symbol"
            layout={{
              visibility: isLayerVisible('aircraft'),
              'text-field': '▲',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
              'text-size': 11,
              'text-rotate': ['get', 'trueTrack'],
              'text-rotation-alignment': 'map',
              'text-keep-upright': false,
              'text-allow-overlap': true,
            }}
            paint={{
              'text-color': '#00f0ff',
              'text-halo-color': '#0b0f1a',
              'text-halo-width': 0.5,
            }}
          />
          {/* Callsign and Flight Level text */}
          <Layer
            id="aircraft-label-layer"
            type="symbol"
            layout={{
              visibility: isLayerVisible('aircraft'),
              'text-field': [
                'concat',
                ['get', 'callsign'],
                ' \nFL',
                ['to-string', ['round', ['/', ['get', 'baroAltitude'], 30.48]]],
              ],
              'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
              'text-size': 8.5,
              'text-offset': [0, 1.6],
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': '#00f0ff',
              'text-halo-color': '#0b0f1a',
              'text-halo-width': 1.2,
            }}
          />
        </Source>

        {/* ── 7. AIR QUALITY (OPENAQ) LAYER ───────────────────────────────── */}
        <Source id="airquality-source" type="geojson" data={airqualityGeoJson as any}>
          {/* Neon AQI glow */}
          <Layer
            id="airquality-glow-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('airquality') }}
            paint={{
              'circle-radius': 14,
              'circle-color': [
                'step',
                ['get', 'value'],
                '#34c759', // Good (Green)
                12.0, '#ffcc00', // Moderate (Yellow)
                35.4, '#ff9500', // Unhealthy for Sensitive (Orange)
                55.4, '#ff3b30', // Unhealthy (Red)
                150.4, '#af52de' // Hazardous (Purple)
              ],
              'circle-opacity': 0.15,
              'circle-blur': 0.85,
            }}
          />
          {/* Inner core monitoring dot */}
          <Layer
            id="airquality-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('airquality') }}
            paint={{
              'circle-radius': 5.5,
              'circle-color': [
                'step',
                ['get', 'value'],
                '#34c759', // Good
                12.0, '#ffcc00', // Moderate
                35.4, '#ff9500', // Unhealthy Sensitive
                55.4, '#ff3b30', // Unhealthy
                150.4, '#af52de' // Hazardous
              ],
              'circle-stroke-width': 1.2,
              'circle-stroke-color': '#0b0f1a',
              'circle-opacity': 0.9,
            }}
          />
          {/* AQI Numeric labels */}
          <Layer
            id="airquality-label-layer"
            type="symbol"
            layout={{
              visibility: isLayerVisible('airquality'),
              'text-field': ['to-string', ['round', ['get', 'value']]],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
              'text-size': 8.5,
              'text-offset': [0, 1.4],
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': '#ffffff',
              'text-halo-color': '#0b0f1a',
              'text-halo-width': 1.2,
            }}
          />
        </Source>

        {/* ── 8. ACLED GEOPOLITICAL CONFLICTS LAYER ───────────────────────── */}
        {/* Large wide hazard warning ring */}
        <Layer
          id="acled-glow-layer"
          type="circle"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'acled']}
          layout={{ visibility: isLayerVisible('acled') }}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'fatalities'],
              0, 12,
              5, 24,
              50, 48
            ],
            'circle-color': '#ff9500',
            'circle-opacity': 0.12,
            'circle-blur': 0.8,
          }}
        />
        {/* Pulsing warning perimeter stroke */}
        <Layer
          id="acled-pulse-layer"
          type="circle"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'acled']}
          layout={{ visibility: isLayerVisible('acled') }}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'fatalities'],
              0, 16,
              5, 28,
              50, 56
            ],
            'circle-color': 'transparent',
            'circle-stroke-width': 1.0,
            'circle-stroke-color': '#ff9500',
            'circle-stroke-opacity': 0.6,
          }}
        />
        {/* Solid warning center core dot */}
        <Layer
          id="acled-layer"
          type="circle"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'acled']}
          layout={{ visibility: isLayerVisible('acled') }}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'fatalities'],
              0, 4.5,
              5, 7.5,
              50, 12
            ],
            'circle-color': '#ff9500',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ff3b30',
            'circle-opacity': 0.85,
          }}
        />
        {/* Fatalities badge label */}
        <Layer
          id="acled-label-layer"
          type="symbol"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'acled']}
          layout={{
            visibility: isLayerVisible('acled'),
            'text-field': [
              'case',
              ['>', ['get', 'fatalities'], 0],
              ['concat', '⚠️ ', ['to-string', ['get', 'fatalities']]],
              '⚠️'
            ],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': 8.5,
            'text-offset': [0, 1.4],
            'text-allow-overlap': false,
          }}
          paint={{
            'text-color': '#ff9500',
            'text-halo-color': '#0b0f1a',
            'text-halo-width': 1.2,
          }}
        />

        {/* ── 9. GLOBAL CCTV WEBCAMS LAYER ───────────────────────── */}
        <Source id="webcams-source" type="geojson" data={webcamsGeoJson as any} cluster={true} clusterMaxZoom={14} clusterRadius={50}>
          {/* Cluster circle */}
          <Layer
            id="webcams-cluster-circle"
            type="circle"
            filter={['has', 'point_count']}
            layout={{ visibility: isLayerVisible('webcams') }}
            paint={{
              'circle-color': '#fffb00',
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                14,
                10, 18,
                50, 22
              ],
              'circle-opacity': 0.7,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#0b0f1a'
            }}
          />
          {/* Cluster count */}
          <Layer
            id="webcams-cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              visibility: isLayerVisible('webcams'),
              'text-field': '{point_count}',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
              'text-size': 9,
              'text-allow-overlap': true
            }}
            paint={{
              'text-color': '#0b0f1a'
            }}
          />
          {/* Webcam Neon-yellow glow */}
          <Layer
            id="webcams-glow-layer"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            layout={{ visibility: isLayerVisible('webcams') }}
            paint={{
              'circle-radius': 14,
              'circle-color': '#fffb00',
              'circle-opacity': 0.15,
              'circle-blur': 0.85,
            }}
          />
          {/* Webcam solid yellow dot */}
          <Layer
            id="webcams-layer"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            layout={{ visibility: isLayerVisible('webcams') }}
            paint={{
              'circle-radius': 5,
              'circle-color': '#fffb00',
              'circle-stroke-width': 1.2,
              'circle-stroke-color': '#0b0f1a',
              'circle-opacity': 0.95,
            }}
          />
          {/* Webcam Label */}
          <Layer
            id="webcams-label-layer"
            type="symbol"
            filter={['!', ['has', 'point_count']]}
            layout={{
              visibility: isLayerVisible('webcams'),
              'text-field': '📹',
              'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
              'text-size': 9,
              'text-offset': [0, -1.2],
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': '#fffb00',
              'text-halo-color': '#0b0f1a',
              'text-halo-width': 1.2,
            }}
          />
        </Source>

        {/* ── 9b. ACTIVE CONFLICTS LAYER (PERSISTENT) ────────────────────── */}
        {/* Outer glowing warning backdrop */}
        <Layer
          id="active-conflicts-glow-layer"
          type="circle"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'active-conflicts']}
          layout={{ visibility: isLayerVisible('active-conflicts') }}
          paint={{
            'circle-radius': [
              'match',
              ['get', 'intensity'],
              'HIGH', 18,
              'MEDIUM', 12,
              'LOW', 8,
              12
            ],
            'circle-color': '#ff1a1a',
            'circle-opacity': 0.18,
            'circle-blur': 0.85,
          }}
        />
        {/* Pulsing warning perimeter stroke */}
        <Layer
          id="active-conflicts-pulse-layer"
          type="circle"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'active-conflicts']}
          layout={{ visibility: isLayerVisible('active-conflicts') }}
          paint={{
            'circle-radius': [
              'match',
              ['get', 'intensity'],
              'HIGH', 22,
              'MEDIUM', 16,
              'LOW', 11,
              16
            ],
            'circle-color': 'transparent',
            'circle-stroke-width': 1.2,
            'circle-stroke-color': '#ff1a1a',
            'circle-stroke-opacity': 0.5,
          }}
        />
        {/* Solid warning center core dot */}
        <Layer
          id="active-conflicts-layer"
          type="circle"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'active-conflicts']}
          layout={{ visibility: isLayerVisible('active-conflicts') }}
          paint={{
            'circle-radius': [
              'match',
              ['get', 'intensity'],
              'HIGH', 6.5,
              'MEDIUM', 4.5,
              'LOW', 3.5,
              4.5
            ],
            'circle-color': '#ff1a1a',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#0b0f1a',
            'circle-opacity': 0.9,
          }}
        />
        {/* Label icon */}
        <Layer
          id="active-conflicts-label-layer"
          type="symbol"
          source="panopticon-events-source"
          filter={['==', ['get', 'layerId'], 'active-conflicts']}
          layout={{
            visibility: isLayerVisible('active-conflicts'),
            'text-field': '💥',
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': 9,
            'text-offset': [0, -1.2],
            'text-allow-overlap': false,
          }}
          paint={{
            'text-color': '#ff1a1a',
            'text-halo-color': '#0b0f1a',
            'text-halo-width': 1.2,
          }}
        />

        {/* ── 9b. NEWS SPOKES CONNECTIONS LAYER ───────────────────────── */}
        <Source id="news-spoke-lines-source" type="geojson" data={spokeLinesGeoJson as any}>
          <Layer
            id="news-spoke-lines-layer"
            type="line"
            layout={{
              visibility: 'visible',
              'line-join': 'round',
              'line-cap': 'round',
            }}
            filter={[
              'all',
              ['==', ['get', 'isNews'], true],
              [
                'any',
                ['literal', activeLayers.has('news-events')],
                ['in', ['get', 'layerId'], ['literal', Array.from(activeLayers)]]
              ]
            ]}
            paint={{
              'line-color': '#af52de',
              'line-width': 1.2,
              'line-opacity': 0.65,
              'line-dasharray': [3, 3],
            }}
          />
        </Source>

        {/* ── 9c. NEWS EVENTS GEOLOCATED LAYER ───────────────────────── */}
        {/* Soft neon outer glow based on severity & event type */}
        <Layer
          id="news-events-glow-layer"
          type="circle"
          source="panopticon-events-source"
          filter={[
            'all',
            ['==', ['get', 'isNews'], true],
            [
              'any',
              ['literal', activeLayers.has('news-events')],
              ['in', ['get', 'layerId'], ['literal', Array.from(activeLayers)]]
            ]
          ]}
          layout={{ visibility: 'visible' }}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'severity'], 3],
              1, 12,
              2, 16,
              3, 20,
              4, 24,
              5, 30
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'type'], 'hub'], '#af52de',
              ['==', ['get', 'type'], 'spoke'], '#e0a0ff',
              ['==', ['get', 'type'], 'persistent'], '#ff9500',
              ['==', ['get', 'type'], 'context'], '#af52de',
              [
                'match',
                ['get', 'category'],
                'Conflict & Hybrid Warfare', '#ff3b30',
                'Terrorism & Internal Security', '#ff4500',
                'Cyber & Information Warfare', '#00f0ff',
                'Political Crises & Geopolitics', '#af52de',
                'Geophysical & Climate Events', '#ff9500',
                'Biological, Health & Ecological', '#34c759',
                'Economic, Financial & Strategic Resources', '#007aff',
                'Industrial & Infrastructure Disasters', '#e0a0ff',
                '#ffffff'
              ]
            ],
            'circle-opacity': 0.18,
            'circle-blur': 0.85,
          }}
        />
        {/* Solid color core dot based on category & event type */}
        <Layer
          id="news-events-layer"
          type="circle"
          source="panopticon-events-source"
          filter={[
            'all',
            ['==', ['get', 'isNews'], true],
            [
              'any',
              ['literal', activeLayers.has('news-events')],
              ['in', ['get', 'layerId'], ['literal', Array.from(activeLayers)]]
            ]
          ]}
          layout={{ visibility: 'visible' }}
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'severity'], 3],
              1, 4.5,
              2, 6.0,
              3, 7.5,
              4, 9.0,
              5, 11.5
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'type'], 'hub'], '#af52de',
              ['==', ['get', 'type'], 'spoke'], '#e0a0ff',
              ['==', ['get', 'type'], 'persistent'], '#ff9500',
              ['==', ['get', 'type'], 'context'], '#af52de',
              [
                'match',
                ['get', 'category'],
                'Conflict & Hybrid Warfare', '#ff3b30',
                'Terrorism & Internal Security', '#ff4500',
                'Cyber & Information Warfare', '#00f0ff',
                'Political Crises & Geopolitics', '#af52de',
                'Geophysical & Climate Events', '#ff9500',
                'Biological, Health & Ecological', '#34c759',
                'Economic, Financial & Strategic Resources', '#007aff',
                'Industrial & Infrastructure Disasters', '#e0a0ff',
                '#ffffff'
              ]
            ],
            'circle-stroke-width': [
              'case',
              ['==', ['get', 'type'], 'hub'], 2.0,
              ['==', ['get', 'type'], 'persistent'], 1.5,
              ['==', ['get', 'type'], 'spoke'], 1.2,
              ['==', ['get', 'type'], 'context'], 1.2,
              1.2
            ],
            'circle-stroke-color': [
              'case',
              ['==', ['get', 'type'], 'persistent'], '#ff3b30',
              '#ffffff'
            ],
            'circle-opacity': 0.95,
          }}
        />
        {/* News Ticker Label symbol */}
        <Layer
          id="news-events-label-layer"
          type="symbol"
          source="panopticon-events-source"
          filter={[
            'all',
            ['==', ['get', 'isNews'], true],
            ['!=', ['get', 'type'], 'context'],
            [
              'any',
              ['literal', activeLayers.has('news-events')],
              ['in', ['get', 'layerId'], ['literal', Array.from(activeLayers)]]
            ]
          ]}
          layout={{
            visibility: 'visible',
            'text-field': [
              'case',
              ['==', ['get', 'type'], 'hub'], '📚',
              ['==', ['get', 'type'], 'spoke'], '🎯',
              ['==', ['get', 'type'], 'persistent'], '🔥',
              ['==', ['get', 'type'], 'context'], '📚',
              '📰'
            ],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': 9,
            'text-offset': [0, -1.2],
            'text-allow-overlap': false,
          }}
          paint={{
            'text-color': '#00f0ff',
            'text-halo-color': '#0b0f1a',
            'text-halo-width': 1.2,
          }}
        />

        {/* ── 10. OSINT CYBER RECON SCANS LAYER ───────────────────────── */}
        {activeReconScan && (
          <>
            {/* Traceroute Line Path */}
            <Source id="recon-line-source" type="geojson" data={reconLineGeoJson as any}>
              <Layer
                id="recon-line-layer"
                type="line"
                layout={{ visibility: isLayerVisible('recon') }}
                paint={{
                  'line-color': '#00ff00',
                  'line-width': 2.5,
                  'line-opacity': 0.8,
                }}
              />
            </Source>

            {/* Traceroute Hop Dots */}
            <Source id="recon-hops-source" type="geojson" data={reconHopsGeoJson as any}>
              {/* Hop Glow */}
              <Layer
                id="recon-hops-glow-layer"
                type="circle"
                layout={{ visibility: isLayerVisible('recon') }}
                paint={{
                  'circle-radius': 9,
                  'circle-color': '#00ff00',
                  'circle-opacity': 0.15,
                  'circle-blur': 0.8,
                }}
              />
              {/* Hop Core */}
              <Layer
                id="recon-hops-layer"
                type="circle"
                layout={{ visibility: isLayerVisible('recon') }}
                paint={{
                  'circle-radius': 4.5,
                  'circle-color': '#00ff00',
                  'circle-stroke-width': 1.2,
                  'circle-stroke-color': '#0b0f1a',
                  'circle-opacity': 0.95,
                }}
              />
              {/* Hop Label text */}
              <Layer
                id="recon-hops-label-layer"
                type="symbol"
                layout={{
                  visibility: isLayerVisible('recon'),
                  'text-field': ['concat', 'H', ['to-string', ['get', 'hopNumber']]],
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
                  'text-size': 8,
                  'text-offset': [0, 1.4],
                  'text-allow-overlap': true,
                }}
                paint={{
                  'text-color': '#00ff00',
                  'text-halo-color': '#0b0f1a',
                  'text-halo-width': 1.2,
                }}
              />
            </Source>
          </>
        )}

        {/* ── 11. SPACE & ORBITAL SATELLITES LAYER ───────────────────────── */}
        <Source id="satellites-source" type="geojson" data={satellitesGeoJson as any}>
          {/* Pulsing footprint swath under each satellite */}
          <Layer
            id="satellites-footprint-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('space') }}
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                1, ['*', ['get', 'altitudeKm'], 0.03],
                5, ['*', ['get', 'altitudeKm'], 0.12],
                10, ['*', ['get', 'altitudeKm'], 0.4]
              ],
              'circle-color': '#00f0ff',
              'circle-opacity': 0.05,
              'circle-stroke-width': 1.0,
              'circle-stroke-color': '#00f0ff',
              'circle-stroke-opacity': 0.15,
            }}
          />
          {/* Satellite Neon-cyan glow */}
          <Layer
            id="satellites-glow-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('space') }}
            paint={{
              'circle-radius': 14,
              'circle-color': '#00f0ff',
              'circle-opacity': 0.18,
              'circle-blur': 0.85,
            }}
          />
          {/* Satellite solid cyan dot */}
          <Layer
            id="satellites-layer"
            type="circle"
            layout={{ visibility: isLayerVisible('space') }}
            paint={{
              'circle-radius': 5,
              'circle-color': '#00f0ff',
              'circle-stroke-width': 1.2,
              'circle-stroke-color': '#0b0f1a',
              'circle-opacity': 0.95,
            }}
          />
          {/* Satellite Label */}
          <Layer
            id="satellites-label-layer"
            type="symbol"
            layout={{
              visibility: isLayerVisible('space'),
              'text-field': '🛰️',
              'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
              'text-size': 11,
              'text-offset': [0, -1.2],
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': '#00f0ff',
              'text-halo-color': '#0b0f1a',
              'text-halo-width': 1.2,
            }}
          />
        </Source>

        {/* Selected Satellite Orbital Projection Track */}
        {selectedSatellite && (
          <Source id="orbit-source" type="geojson" data={orbitGeoJson as any}>
            {/* Inner dashed line */}
            <Layer
              id="orbit-line-layer"
              type="line"
              layout={{
                visibility: isLayerVisible('space'),
                'line-join': 'round',
                'line-cap': 'round',
              }}
              paint={{
                'line-color': '#00f0ff',
                'line-width': 1.8,
                'line-opacity': 0.85,
                'line-dasharray': [3, 3],
              }}
            />
            {/* Outer soft glowing backdrop line */}
            <Layer
              id="orbit-glow-line-layer"
              type="line"
              layout={{
                visibility: isLayerVisible('space'),
                'line-join': 'round',
                'line-cap': 'round',
              }}
              paint={{
                'line-color': '#00f0ff',
                'line-width': 4.0,
                'line-opacity': 0.25,
                'line-blur': 1.5,
              }}
            />
          </Source>
        )}

        {/* ── 12. ENERGY & INFRASTRUCTURE LAYERS ───────────────────────── */}
        {powerGrid && (
          <Source id="power-grid-source" type="geojson" data={powerGrid}>
            <Layer
              id="power-grid-layer"
              type="line"
              layout={{ visibility: isLayerVisible('power-grid') }}
              paint={{ 'line-color': '#ffcc00', 'line-width': 1.5, 'line-opacity': 0.7 }}
            />
          </Source>
        )}
        {nuclearFacilities && (
          <Source id="nuclear-facilities-source" type="geojson" data={nuclearFacilities}>
            <Layer
              id="nuclear-facilities-layer"
              type="circle"
              layout={{ visibility: isLayerVisible('nuclear') }}
              paint={{ 'circle-color': '#39ff14', 'circle-radius': 4, 'circle-opacity': 0.8 }}
            />
            <Layer
              id="nuclear-facilities-label-layer"
              type="symbol"
              layout={{
                visibility: isLayerVisible('nuclear'),
                'text-field': '☢️',
                'text-size': 12,
                'text-allow-overlap': false,
              }}
            />
          </Source>
        )}
        {pipelineNetworks && (
          <Source id="pipelines-source" type="geojson" data={pipelineNetworks}>
            <Layer
              id="pipelines-layer"
              type="line"
              layout={{ visibility: isLayerVisible('pipelines') }}
              paint={{ 'line-color': '#00ffff', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.7 }}
            />
          </Source>
        )}
      </Map>
    </div>
  )
}
