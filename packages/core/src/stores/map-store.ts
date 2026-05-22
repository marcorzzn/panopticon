import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ViewState, BoundingBox, ReconScanEntity } from '../types/geo'
import { DEFAULT_VIEW_STATE } from '../types/geo'
import type { LayerState } from '../types/layer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MapMode = '2d' | '3d'

export interface MapStore {
  // ── Camera — flat primitives only ──────────────────────────────────────
  viewState: ViewState
  setViewState: (vs: Partial<ViewState>) => void

  // ── Viewport bounds — flat array ───────────────────────────────────────
  bounds: BoundingBox | null
  setBounds: (bounds: BoundingBox) => void

  // ── Map mode ───────────────────────────────────────────────────────────
  mode: MapMode
  setMode: (mode: MapMode) => void
  toggleMode: () => void

  // ── Layer states ───────────────────────────────────────────────────────
  layerStates: Record<string, LayerState>
  setLayerVisible: (layerId: string, visible: boolean) => void
  toggleLayer: (layerId: string) => void
  setLayerOpacity: (layerId: string, opacity: number) => void
  setLayerLoading: (layerId: string, loading: boolean) => void
  setLayerEntityCount: (layerId: string, count: number) => void
  setLayerError: (layerId: string, error: string | null) => void
  setLayerRefreshed: (layerId: string) => void

  // ── Selection — flat primitive (entity ID string or null) ──────────────
  selectedEntityId: string | null
  setSelectedEntityId: (id: string | null) => void

  // ── Hover — flat primitive ─────────────────────────────────────────────
  hoveredEntityId: string | null
  setHoveredEntityId: (id: string | null) => void

  // ── Cursor position on map — flat primitives ───────────────────────────
  cursorLng: number | null
  cursorLat: number | null
  setCursorPosition: (lng: number | null, lat: number | null) => void

  // ── Fly-to action ──────────────────────────────────────────────────────
  flyToTarget: { lng: number; lat: number; zoom: number } | null
  flyTo: (lng: number, lat: number, zoom?: number) => void
  clearFlyTo: () => void

  // ── Active Recon Scan (Phase 4 Cyber Layer) ───────────────────────────
  activeReconScan: ReconScanEntity | null
  setActiveReconScan: (scan: ReconScanEntity | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_LAYER_STATE: Omit<LayerState, 'layerId'> = {
  visible: false,
  opacity: 1,
  loading: false,
  lastRefreshAt: null,
  entityCount: 0,
  error: null,
}

/**
 * Ensure a LayerState record exists for the given layer ID.
 * Returns the existing or newly-initialised record.
 */
function ensureLayerState(
  states: Record<string, LayerState>,
  layerId: string,
): Record<string, LayerState> {
  if (states[layerId]) return states
  return {
    ...states,
    [layerId]: { ...DEFAULT_LAYER_STATE, layerId },
  }
}

/** Immutably patch a single field in a layer state record. */
function patchLayer<K extends keyof LayerState>(
  states: Record<string, LayerState>,
  layerId: string,
  key: K,
  value: LayerState[K],
): Record<string, LayerState> {
  const base = ensureLayerState(states, layerId)
  return {
    ...base,
    [layerId]: { ...base[layerId]!, [key]: value },
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMapStore = create<MapStore>()(
  subscribeWithSelector((set) => ({
    // ── Camera ─────────────────────────────────────────────────────────────
    viewState: DEFAULT_VIEW_STATE,
    setViewState: (vs) =>
      set((s) => ({ viewState: { ...s.viewState, ...vs } })),

    // ── Bounds ─────────────────────────────────────────────────────────────
    bounds: null,
    setBounds: (bounds) => set({ bounds }),

    // ── Mode ───────────────────────────────────────────────────────────────
    mode: '2d' as MapMode,
    setMode: (mode) => set({ mode }),
    toggleMode: () =>
      set((s) => ({ mode: s.mode === '2d' ? '3d' : '2d' })),

    // ── Layer states ───────────────────────────────────────────────────────
    layerStates: {} as Record<string, LayerState>,

    setLayerVisible: (layerId, visible) =>
      set((s) => ({
        layerStates: patchLayer(s.layerStates, layerId, 'visible', visible),
      })),

    toggleLayer: (layerId) =>
      set((s) => {
        const base = ensureLayerState(s.layerStates, layerId)
        return {
          layerStates: {
            ...base,
            [layerId]: { ...base[layerId]!, visible: !base[layerId]!.visible },
          },
        }
      }),

    setLayerOpacity: (layerId, opacity) =>
      set((s) => ({
        layerStates: patchLayer(
          s.layerStates,
          layerId,
          'opacity',
          Math.max(0, Math.min(1, opacity)),
        ),
      })),

    setLayerLoading: (layerId, loading) =>
      set((s) => ({
        layerStates: patchLayer(s.layerStates, layerId, 'loading', loading),
      })),

    setLayerEntityCount: (layerId, count) =>
      set((s) => {
        const base = ensureLayerState(s.layerStates, layerId)
        if (base[layerId]?.entityCount === count) {
          return {}
        }
        return {
          layerStates: patchLayer(s.layerStates, layerId, 'entityCount', count),
        }
      }),

    setLayerError: (layerId, error) =>
      set((s) => ({
        layerStates: patchLayer(s.layerStates, layerId, 'error', error),
      })),

    setLayerRefreshed: (layerId) =>
      set((s) => ({
        layerStates: patchLayer(
          s.layerStates,
          layerId,
          'lastRefreshAt',
          Date.now(),
        ),
      })),

    // ── Selection ──────────────────────────────────────────────────────────
    selectedEntityId: null,
    setSelectedEntityId: (id) => set({ selectedEntityId: id }),

    // ── Hover ──────────────────────────────────────────────────────────────
    hoveredEntityId: null,
    setHoveredEntityId: (id) => set({ hoveredEntityId: id }),

    // ── Cursor ─────────────────────────────────────────────────────────────
    cursorLng: null,
    cursorLat: null,
    setCursorPosition: (lng, lat) =>
      set({ cursorLng: lng, cursorLat: lat }),

    // ── Fly-to ─────────────────────────────────────────────────────────────
    flyToTarget: null,
    flyTo: (lng, lat, zoom) =>
      set((s) => ({
        flyToTarget: { lng, lat, zoom: zoom ?? s.viewState.zoom },
      })),
    clearFlyTo: () => set({ flyToTarget: null }),

    // ── Active Recon Scan ──────────────────────────────────────────────────
    activeReconScan: null,
    setActiveReconScan: (scan) => set({ activeReconScan: scan }),
  })),
)
