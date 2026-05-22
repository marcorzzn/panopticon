import type { IntelligenceDomain } from './domain'

// ---------------------------------------------------------------------------
// Render modes
// ---------------------------------------------------------------------------

/** Supported rendering modes for map layers */
export type LayerRenderMode =
  | 'point'
  | 'circle'
  | 'line'
  | 'fill'
  | 'heatmap'
  | 'arc'
  | 'hexbin'
  | 'icon'
  | '3d-column'
  | 'cluster'

// ---------------------------------------------------------------------------
// Layer configuration (static / compile-time)
// ---------------------------------------------------------------------------

export interface LayerConfig {
  /** Unique layer identifier */
  id: string
  /** Intelligence domain this layer belongs to */
  domain: IntelligenceDomain
  /** Human-readable layer name */
  name: string
  /** Brief description of what this layer shows */
  description: string
  /** ID of the DataSourceConfig that feeds this layer */
  sourceId: string
  /** How to render this layer on the map */
  renderMode: LayerRenderMode
  /** Minimum map zoom level for visibility */
  minZoom: number
  /** Maximum map zoom level for visibility */
  maxZoom: number
  /** Whether to restrict data fetching to the current viewport */
  viewportAware: boolean
  /** Whether point clustering is enabled */
  clusteringEnabled: boolean
  /** Cluster radius in screen pixels */
  clusterRadius: number
  /** Whether this layer is visible by default on load */
  defaultVisible: boolean
  /** Implementation phase */
  phase: number
  /** Optional keyboard shortcut to toggle this layer */
  shortcutKey?: string
}

// ---------------------------------------------------------------------------
// Layer runtime state — FLAT primitives only (no DOM/GL objects)
// ---------------------------------------------------------------------------

/** Mutable runtime state for a single layer */
export interface LayerState {
  /** ID of the LayerConfig this state corresponds to */
  layerId: string
  /** Current visibility */
  visible: boolean
  /** Opacity from 0 (transparent) to 1 (opaque) */
  opacity: number
  /** Whether data is currently being fetched */
  loading: boolean
  /** Timestamp of last successful data refresh (epoch ms), null if never */
  lastRefreshAt: number | null
  /** Number of entities currently loaded for this layer */
  entityCount: number
  /** Current error message, null if healthy */
  error: string | null
}
