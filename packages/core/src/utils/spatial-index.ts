import { isInBounds } from './geo'
import type { BoundingBox } from '../types/geo'

export interface SpatialEntry {
  id: string
  lat: number
  lon: number
  name: string
  url: string
  source: string
  status: 'healthy' | 'degraded' | 'offline'
}

export class GridSpatialIndex {
  // 36 columns (longitude 10° steps from -180 to 180)
  // 18 rows (latitude 10° steps from -90 to 90)
  private grid: SpatialEntry[][][]

  constructor() {
    this.grid = Array.from({ length: 18 }, () =>
      Array.from({ length: 36 }, () => [])
    )
  }

  /**
   * Helper to clamp latitude index to [0, 17]
   */
  private getLatIndex(lat: number): number {
    const idx = Math.floor((lat + 90) / 10)
    return Math.max(0, Math.min(17, idx))
  }

  /**
   * Helper to clamp longitude index to [0, 35]
   */
  private getLngIndex(lon: number): number {
    const idx = Math.floor((lon + 180) / 10)
    return Math.max(0, Math.min(35, idx))
  }

  /**
   * Load bulk spatial entries into the grid
   */
  public load(entries: SpatialEntry[]): void {
    // Clear grid first
    for (let r = 0; r < 18; r++) {
      for (let c = 0; c < 36; c++) {
        this.grid[r]![c] = []
      }
    }

    // Insert entries
    entries.forEach((entry) => {
      const r = this.getLatIndex(entry.lat)
      const c = this.getLngIndex(entry.lon)
      this.grid[r]![c]!.push(entry)
    })
  }

  /**
   * Get quality score of a spatial entry
   * Prefer HTTPS stream URLs and entries with descriptive names
   */
  private getQualityScore(entry: SpatialEntry): number {
    let score = 0
    if (entry.url.startsWith('https://')) {
      score += 10
    }
    if (entry.name && !entry.name.includes('Sector') && !entry.name.includes('Node') && !entry.name.includes('Sensor')) {
      score += 5
    }
    if (entry.status === 'healthy') {
      score += 2
    }
    return score
  }

  /**
   * Query the index for entries within the target WGS84 bounding box.
   * Handles Anti-Meridian wraps.
   *
   * @param bounds Viewport bounding box [west, south, east, north]
   * @param maxResults Maximum results to return (default 500)
   */
  public query(bounds: BoundingBox, maxResults: number = 500): SpatialEntry[] {
    const [west, south, east, north] = bounds

    const southIdx = this.getLatIndex(south)
    const northIdx = this.getLatIndex(north)

    const westIdx = this.getLngIndex(west)
    const eastIdx = this.getLngIndex(east)

    const candidates: SpatialEntry[] = []

    // Determine longitude ranges (handling Anti-Meridian crossing when west > east)
    const lngRanges: [number, number][] = []
    if (west <= east) {
      lngRanges.push([westIdx, eastIdx])
    } else {
      lngRanges.push([westIdx, 35])
      lngRanges.push([0, eastIdx])
    }

    // Accumulate all candidates from intersecting grid cells
    for (let r = southIdx; r <= northIdx; r++) {
      const row = this.grid[r]!
      lngRanges.forEach(([startCol, endCol]) => {
        for (let c = startCol; c <= endCol; c++) {
          const cell = row[c]!
          candidates.push(...cell)
        }
      })
    }

    // Filter candidates strictly inside the target bounds and sort by quality score
    const filtered = candidates.filter((item) =>
      isInBounds([item.lon, item.lat], bounds)
    )

    // Sort descending by quality score
    filtered.sort((a, b) => this.getQualityScore(b) - this.getQualityScore(a))

    // Truncate to maxResults limit
    return filtered.slice(0, maxResults)
  }
}
