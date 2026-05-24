import type { Coordinate, BoundingBox } from '../types/geo'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mean Earth radius in kilometres (WGS-84 volumetric mean) */
const EARTH_RADIUS_KM = 6371.0088

/** Degrees → radians */
const DEG_TO_RAD = Math.PI / 180

/**
 * Approximate metres-per-pixel at the equator for Web Mercator zoom level 0.
 * Derived from Earth circumference ÷ 256 px tile size.
 */
const METERS_PER_PIXEL_Z0 = 156543.03392

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

/**
 * Calculate the great-circle distance between two WGS-84 coordinates
 * using the Haversine formula.
 *
 * @param a First coordinate [longitude, latitude]
 * @param b Second coordinate [longitude, latitude]
 * @returns Distance in **kilometres**
 */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b

  const dLat = (lat2 - lat1) * DEG_TO_RAD
  const dLng = (lng2 - lng1) * DEG_TO_RAD

  const sinHalfDLat = Math.sin(dLat / 2)
  const sinHalfDLng = Math.sin(dLng / 2)

  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      sinHalfDLng *
      sinHalfDLng

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

// ---------------------------------------------------------------------------
// Bounding box helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a coordinate falls within a bounding box.
 *
 * @param coord Coordinate to test [longitude, latitude]
 * @param bounds Bounding box [west, south, east, north]
 */
export function isInBounds(coord: Coordinate, bounds: BoundingBox): boolean {
  const [lng, lat] = coord
  const [west, south, east, north] = bounds
  return lng >= west && lng <= east && lat >= south && lat <= north
}

/**
 * Expand (or contract) a bounding box by a given factor around its centre.
 * A factor of 1.0 returns the original box; 1.2 expands by 20 %.
 *
 * @param bounds Original bounding box
 * @param factor Expansion factor (> 1 to grow, < 1 to shrink)
 */
export function expandBounds(
  bounds: BoundingBox,
  factor: number,
): BoundingBox {
  const [west, south, east, north] = bounds
  const cLng = (west + east) / 2
  const cLat = (south + north) / 2
  const halfW = ((east - west) / 2) * factor
  const halfH = ((north - south) / 2) * factor

  return [
    Math.max(-180, cLng - halfW),
    Math.max(-90, cLat - halfH),
    Math.min(180, cLng + halfW),
    Math.min(90, cLat + halfH),
  ]
}

/**
 * Return the centre point of a bounding box.
 */
export function boundsCenter(bounds: BoundingBox): Coordinate {
  const [west, south, east, north] = bounds
  return [(west + east) / 2, (south + north) / 2]
}

// ---------------------------------------------------------------------------
// Zoom ↔ altitude conversion (for 2D ↔ 3D camera sync)
// ---------------------------------------------------------------------------

/**
 * Approximate the camera altitude in metres for a given Web Mercator zoom
 * level. Uses the relationship: altitude ≈ earthCircumference / (2^zoom × tileSize × 2).
 *
 * @param zoom Web Mercator zoom level
 * @returns Approximate altitude in metres above ground
 */
export function zoomToAltitude(zoom: number): number {
  return (METERS_PER_PIXEL_Z0 * 256) / Math.pow(2, zoom)
}

/**
 * Convert a camera altitude (metres) back to an approximate Web Mercator
 * zoom level.
 *
 * @param altitude Camera altitude in metres
 * @returns Approximate zoom level
 */
export function altitudeToZoom(altitude: number): number {
  if (altitude <= 0) return 22 // max practical zoom
  return Math.log2((METERS_PER_PIXEL_Z0 * 256) / altitude)
}

// ---------------------------------------------------------------------------
// Coordinate formatting
// ---------------------------------------------------------------------------

/**
 * Format a WGS-84 coordinate into a human-readable string.
 *
 * @example
 * formatCoordinate([12.4922, 41.8902])
 * // → "41.8902° N, 12.4922° E"
 *
 * @param coord Coordinate [longitude, latitude]
 * @param precision Number of decimal places (default 4)
 */
export function formatCoordinate(
  coord: Coordinate,
  precision: number = 4,
): string {
  const [lng, lat] = coord
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'

  return `${Math.abs(lat).toFixed(precision)}° ${latDir}, ${Math.abs(lng).toFixed(precision)}° ${lngDir}`
}
