// @panopticon/map-engine
// Unified 2D/3D map abstraction layer
// Phase 1: MapLibre GL 2D
// Phase 3: CesiumJS 3D + deck.gl GPU layers

export { default as MapView } from './2d/MapView'
export { getTerminatorPolygon } from './layers/terminator-layer'
export { LayerFactory, LayerManager } from './layers/LayerFactory'
export type { LayerConfig } from './layers/LayerFactory'
