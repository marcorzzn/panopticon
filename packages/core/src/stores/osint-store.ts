import { create } from 'zustand'

export interface AssociatedSource {
  source_id: string
  source_url: string
  snippet: string
  credibility_score: number
  timestamp: string
}

export interface OsintEvent {
  id: string
  headline: string
  event_category: string
  severity: 'low' | 'moderate' | 'high' | 'critical'
  coordinates: [number, number] // [lng, lat]
  event_time: string
  associated_sources: AssociatedSource[]
  redundancy_count: number
  integrity_score: number
  source_tier: number
  audit_log?: Record<string, any>
}

export interface TelemetryPoint {
  id: string
  lat: number
  lon: number
  heading: number
  speed: number
  altitude: number
  type: 'air' | 'sea'
}

export interface CorrelationEdge {
  source_id: string
  target_id: string
  category: string
  distance_meters: number
  time_diff_seconds: number
}

export interface OsintStore {
  liveEvents: OsintEvent[]
  newsItems: OsintEvent[]
  telemetry: TelemetryPoint[]
  selectedEvent: OsintEvent | null
  correlationEdges: CorrelationEdge[]
  activeLayerIds: Set<string>

  setLiveEvents: (events: OsintEvent[]) => void
  setNewsItems: (items: OsintEvent[]) => void
  setTelemetry: (telemetry: TelemetryPoint[]) => void
  setSelectedEvent: (event: OsintEvent | null) => void
  setCorrelationEdges: (edges: CorrelationEdge[]) => void
  toggleLayerId: (layerId: string) => void
  setLayerIdActive: (layerId: string, active: boolean) => void

  addLiveEvent: (event: OsintEvent) => void
  updateLiveEvent: (event: OsintEvent) => void
}

export const useOsintStore = create<OsintStore>((set) => ({
  liveEvents: [],
  newsItems: [],
  telemetry: [],
  selectedEvent: null,
  correlationEdges: [],
  activeLayerIds: new Set([
    'aviation-layer',
    'maritime-layer',
    'congestion-heatmap',
    'conflict-zones',
    'disaster-footprints',
    'sensor-networks',
    'news-pins',
  ]),

  setLiveEvents: (events) => set({ liveEvents: events }),
  setNewsItems: (items) => set({ newsItems: items }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setCorrelationEdges: (edges) => set({ correlationEdges: edges }),

  toggleLayerId: (layerId) =>
    set((state) => {
      const next = new Set(state.activeLayerIds)
      if (next.has(layerId)) {
        next.delete(layerId)
      } else {
        next.add(layerId)
      }
      return { activeLayerIds: next }
    }),

  setLayerIdActive: (layerId, active) =>
    set((state) => {
      const next = new Set(state.activeLayerIds)
      if (active) {
        next.add(layerId)
      } else {
        next.delete(layerId)
      }
      return { activeLayerIds: next }
    }),

  addLiveEvent: (event) =>
    set((state) => {
      // Avoid inserting duplicates
      if (state.liveEvents.some((e) => e.id === event.id)) {
        return state
      }
      return { liveEvents: [event, ...state.liveEvents] }
    }),

  updateLiveEvent: (event) =>
    set((state) => ({
      liveEvents: state.liveEvents.map((e) => (e.id === event.id ? event : e)),
    })),
}))
