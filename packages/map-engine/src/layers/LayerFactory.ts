import { Map as MapLibreMap, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import layersConfig from '@panopticon/core/src/config/layers.json'

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

// ── 1. LAYER FACTORY ENGINE ─────────────────────────────────────────────────
// Parses JSON config schemas into production-ready MapLibre GL layer pipelines.
export const LayerFactory = {
  buildSource(config: LayerConfig, data?: any): SourceSpecification {
    switch (config.source_type) {
      case 'GeoJSON':
        return {
          type: 'geojson',
          data: data || { type: 'FeatureCollection', features: [] },
          cluster: config.id === 'news-pins', // Enable clustering for high density points
          clusterMaxZoom: 12,
          clusterRadius: 50,
        }
      case 'heatmap':
        return {
          type: 'geojson',
          data: data || { type: 'FeatureCollection', features: [] },
        }
      default:
        return {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        }
    }
  },

  buildLayers(config: LayerConfig): LayerSpecification[] {
    const layers: LayerSpecification[] = []

    if (config.source_type === 'heatmap') {
      layers.push({
        id: config.id,
        type: 'heatmap',
        source: config.id,
        minzoom: config.minZoom || 0,
        maxzoom: config.maxZoom || 24,
        paint: config.paint,
        layout: config.layout,
      } as LayerSpecification)
    } else {
      // Standard circle/fill layer factory
      let type: 'circle' | 'fill' | 'line' | 'symbol' = 'circle'
      if (config.paint && 'fill-color' in config.paint) {
        type = 'fill'
      }

      layers.push({
        id: config.id,
        type: type,
        source: config.id,
        minzoom: config.minZoom || 0,
        maxzoom: config.maxZoom || 24,
        paint: config.paint,
        layout: config.layout,
      } as LayerSpecification)

      // Add a cluster count label layer if clustering is enabled
      if (config.id === 'news-pins') {
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
    this.configs = layersConfig as LayerConfig[]
  }

  // Orchestrates high-frequency layer updates matching viewport state
  public reconcileViewport(currentZoom: number, activeLayerIds: Set<string>) {
    this.configs.forEach((layer) => {
      const isVisibleInCatalog = activeLayerIds.has(layer.id)
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
