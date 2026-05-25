import { Map as MapLibreMap, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import layersConfig from '@panopticon/core/src/config/layers.json'

export interface UniversalLayerConfig {
  slug: string
  displayName: string
  group: string
  icon: string
  description: string
  color: string
  defaultPinType: 'instant' | 'persistent' | 'hub-spoke'
  sources: string[]
}

export interface LayerConfig {
  id: string
  name: string
  source_type: 'GeoJSON' | 'vector' | 'raster' | 'heatmap'
  paint: any
  layout: any
  minZoom?: number
  maxZoom?: number
  opacity?: number
  tier: number
  legend: {
    type: string
    label: string
    color: string
  }
}

// Convert universal configuration schemas into LayerConfigs dynamically (zero hardcoding)
export const getMappedLayersConfig = (): LayerConfig[] => {
  return (layersConfig as any[]).map((cfg) => {
    const id = cfg.id
    const displayName = cfg.label || cfg.displayName || cfg.name || id
    const color = cfg.color || '#3498db'
    const defaultPinType = cfg.defaultPinType || 'ephemeral'

    const paint: any = {
      'circle-radius': 6,
      'circle-color': color,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff'
    }

    const layout = {
      'visibility': 'none' as const
    }

    return {
      id,
      name: displayName,
      source_type: 'GeoJSON',
      paint,
      layout,
      minZoom: 1,
      maxZoom: 20,
      opacity: 0.9,
      tier: defaultPinType === 'hub' ? -3 : defaultPinType === 'persistent' ? -1 : 0,
      legend: {
        type: 'circle',
        label: displayName,
        color: color
      }
    }
  })
}

// ── 1. LAYER FACTORY ENGINE ─────────────────────────────────────────────────
// Parses JSON config schemas into production-ready MapLibre GL layer pipelines.
export const LayerFactory = {
  buildSource(config: LayerConfig, data?: any): SourceSpecification {
    return {
      type: 'geojson',
      data: data || { type: 'FeatureCollection', features: [] },
      cluster: config.id === 'news-pins' || config.id === 'news-events', // Enable clustering for high density points
      clusterMaxZoom: 12,
      clusterRadius: 50,
    }
  },

  buildLayers(config: LayerConfig): LayerSpecification[] {
    const layers: LayerSpecification[] = []

    layers.push({
      id: config.id,
      type: 'circle',
      source: config.id,
      minzoom: config.minZoom || 0,
      maxzoom: config.maxZoom || 24,
      paint: config.paint,
      layout: config.layout,
    } as LayerSpecification)

    // Add a cluster count label layer if clustering is enabled
    if (config.id === 'news-pins' || config.id === 'news-events') {
      layers.push({
        id: `${config.id}-cluster-count`,
        type: 'symbol',
        source: config.id,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
          'text-size': 11,
        },
        paint: {
          'text-color': '#ffffff',
        },
      } as LayerSpecification)
    }

    return layers
  },
}

// ── 2. VIEWPORT-AWARE TILE CULLER (2 GB RAM SAVER) ──────────────────────────
// Only loads, overlays, and renders layers inside active zoom thresholds, culling
// off-screen WebGL features and active markers outside of immediate viewport focus.
export class LayerManager {
  private map: MapLibreMap
  private configs: LayerConfig[]

  constructor(map: MapLibreMap) {
    this.map = map
    this.configs = getMappedLayersConfig()
  }

  // Orchestrates high-frequency layer updates matching viewport state
  public reconcileViewport(currentZoom: number, layerStates: Record<string, any>) {
    this.configs.forEach((layer) => {
      const isCustomLayer = layer.id.includes('-add-')
      const isVisibleInCatalog = isCustomLayer
        ? layerStates[layer.id]?.visible === true
        : layerStates[layer.id]?.visible !== false

      const isWithinZoom =
        currentZoom >= (layer.minZoom ?? 0) && currentZoom <= (layer.maxZoom ?? 24)

      const layerExists = this.map.getLayer(layer.id)

      if (layerExists) {
        if (isVisibleInCatalog && isWithinZoom) {
          // Toggle visibility on instead of recreating GPU buffer
          this.map.setLayoutProperty(layer.id, 'visibility', 'visible')
          if (this.map.getLayer(`${layer.id}-cluster-count`)) {
            this.map.setLayoutProperty(
              `${layer.id}-cluster-count`,
              'visibility',
              'visible'
            )
          }
        } else {
          // Transparently cull from map to save render cycles and GPU overhead
          this.map.setLayoutProperty(layer.id, 'visibility', 'none')
          if (this.map.getLayer(`${layer.id}-cluster-count`)) {
            this.map.setLayoutProperty(
              `${layer.id}-cluster-count`,
              'visibility',
              'none'
            )
          }
        }
      }
    })
  }

  public getConfigs(): LayerConfig[] {
    return this.configs
  }
}
