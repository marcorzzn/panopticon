// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

/**
 * Convert an epoch-ms timestamp to a concise relative time string.
 *
 * @example
 * relativeTime(Date.now() - 90_000) // → "1 min ago"
 * relativeTime(Date.now() - 7200_000) // → "2h ago"
 *
 * @param timestamp Unix epoch milliseconds
 * @returns Human-readable relative string
 */
export function relativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp

  if (delta < 0) return 'just now'
  if (delta < SECOND) return 'just now'
  if (delta < MINUTE) {
    const s = Math.floor(delta / SECOND)
    return `${s}s ago`
  }
  if (delta < HOUR) {
    const m = Math.floor(delta / MINUTE)
    return `${m} min ago`
  }
  if (delta < DAY) {
    const h = Math.floor(delta / HOUR)
    return `${h}h ago`
  }
  if (delta < WEEK) {
    const d = Math.floor(delta / DAY)
    return `${d}d ago`
  }
  if (delta < MONTH) {
    const w = Math.floor(delta / WEEK)
    return `${w}w ago`
  }
  if (delta < YEAR) {
    const mo = Math.floor(delta / MONTH)
    return `${mo}mo ago`
  }
  const y = Math.floor(delta / YEAR)
  return `${y}y ago`
}

// ---------------------------------------------------------------------------
// UTC formatting
// ---------------------------------------------------------------------------

/**
 * Format a timestamp as a full UTC date-time string.
 *
 * @example
 * formatUtc(1716389516000) // → "2025-05-22 14:31:56 UTC"
 *
 * @param timestamp Unix epoch milliseconds
 */
export function formatUtc(timestamp: number): string {
  const d = new Date(timestamp)

  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
}

// ---------------------------------------------------------------------------
// Locale-aware formatting
// ---------------------------------------------------------------------------

/**
 * Format a timestamp using the user's locale settings.
 *
 * @param timestamp Unix epoch milliseconds
 */
export function formatLocal(timestamp: number): string {
  const d = new Date(timestamp)

  try {
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    // Fallback for environments without Intl support
    return d.toISOString()
  }
}

// ---------------------------------------------------------------------------
// Staleness check
// ---------------------------------------------------------------------------

/**
 * Determine whether a timestamp is older than the specified maximum age.
 *
 * @param timestamp Unix epoch milliseconds to check
 * @param maxAgeMs Maximum acceptable age in milliseconds
 */
export function isStale(timestamp: number, maxAgeMs: number): boolean {
  return Date.now() - timestamp > maxAgeMs
}

// ---------------------------------------------------------------------------
// Human-readable duration
// ---------------------------------------------------------------------------

/**
 * Convert a millisecond duration to a concise human-readable string.
 *
 * @example
 * msToHuman(450)     // → "450ms"
 * msToHuman(1200)    // → "1.2s"
 * msToHuman(210_000) // → "3.5min"
 * msToHuman(7200000) // → "2.0h"
 *
 * @param ms Duration in milliseconds
 */
export function msToHuman(ms: number): string {
  if (ms < 0) return '0ms'

  if (ms < SECOND) {
    return `${Math.round(ms)}ms`
  }
  if (ms < MINUTE) {
    return `${(ms / SECOND).toFixed(1)}s`
  }
  if (ms < HOUR) {
    return `${(ms / MINUTE).toFixed(1)}min`
  }
  if (ms < DAY) {
    return `${(ms / HOUR).toFixed(1)}h`
  }
  return `${(ms / DAY).toFixed(1)}d`
}
