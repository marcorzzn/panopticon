// ---------------------------------------------------------------------------
// Earthquake magnitude
// ---------------------------------------------------------------------------

/**
 * Format an earthquake magnitude with a descriptive category hint.
 *
 * @example
 * formatMagnitude(2.3)  // → "M2.3 (Minor)"
 * formatMagnitude(7.1)  // → "M7.1 (Major)"
 *
 * @param mag Moment magnitude
 */
export function formatMagnitude(mag: number): string {
  const label =
    mag < 2
      ? 'Micro'
      : mag < 4
        ? 'Minor'
        : mag < 5
          ? 'Light'
          : mag < 6
            ? 'Moderate'
            : mag < 7
              ? 'Strong'
              : mag < 8
                ? 'Major'
                : 'Great'

  return `M${mag.toFixed(1)} (${label})`
}

// ---------------------------------------------------------------------------
// Compact number
// ---------------------------------------------------------------------------

/**
 * Format a number into a compact human-readable string.
 *
 * @example
 * formatCompact(1_234)         // → "1.2K"
 * formatCompact(3_456_789)     // → "3.5M"
 * formatCompact(1_200_000_000) // → "1.2B"
 * formatCompact(42)            // → "42"
 *
 * @param num Number to format
 */
export function formatCompact(num: number): string {
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}K`
  }
  return `${sign}${abs}`
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * Format a number as a currency string.
 *
 * @example
 * formatCurrency(1234.5)        // → "$1,234.50"
 * formatCurrency(1234.5, 'EUR') // → "€1,234.50"
 *
 * @param num Amount
 * @param currency ISO 4217 currency code (default "USD")
 */
export function formatCurrency(
  num: number,
  currency: string = 'USD',
): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    // Fallback for environments without full Intl support
    return `${currency} ${num.toFixed(2)}`
  }
}

// ---------------------------------------------------------------------------
// Percentage
// ---------------------------------------------------------------------------

/**
 * Format a number as a percentage string.
 *
 * @example
 * formatPercent(0.8523)    // → "85.2%"
 * formatPercent(0.8523, 0) // → "85%"
 *
 * @param num Value (0–1 range is typical but not enforced)
 * @param decimals Decimal places (default 1)
 */
export function formatPercent(num: number, decimals: number = 1): string {
  return `${(num * 100).toFixed(decimals)}%`
}

// ---------------------------------------------------------------------------
// Temperature
// ---------------------------------------------------------------------------

/**
 * Format a temperature value.
 *
 * @example
 * formatTemperature(22.5)       // → "22.5 °C"
 * formatTemperature(22.5, 'F')  // → "72.5 °F"
 *
 * @param celsius Temperature in degrees Celsius
 * @param unit Display unit (default 'C')
 */
export function formatTemperature(
  celsius: number,
  unit: 'C' | 'F' = 'C',
): string {
  if (unit === 'F') {
    const fahrenheit = celsius * 1.8 + 32
    return `${fahrenheit.toFixed(1)} °F`
  }
  return `${celsius.toFixed(1)} °C`
}

// ---------------------------------------------------------------------------
// Wind speed
// ---------------------------------------------------------------------------

/**
 * Format a wind speed value with unit conversion.
 *
 * @example
 * formatWindSpeed(100)            // → "100.0 km/h"
 * formatWindSpeed(100, 'kts')     // → "54.0 kts"
 * formatWindSpeed(100, 'mph')     // → "62.1 mph"
 * formatWindSpeed(100, 'ms')      // → "27.8 m/s"
 *
 * @param kmh Wind speed in km/h
 * @param unit Desired display unit (default 'kmh')
 */
export function formatWindSpeed(
  kmh: number,
  unit: 'kmh' | 'mph' | 'kts' | 'ms' = 'kmh',
): string {
  switch (unit) {
    case 'mph':
      return `${(kmh * 0.621371).toFixed(1)} mph`
    case 'kts':
      return `${(kmh * 0.539957).toFixed(1)} kts`
    case 'ms':
      return `${(kmh / 3.6).toFixed(1)} m/s`
    case 'kmh':
    default:
      return `${kmh.toFixed(1)} km/h`
  }
}

// ---------------------------------------------------------------------------
// Depth
// ---------------------------------------------------------------------------

/**
 * Format a depth value for seismic events.
 *
 * @example
 * formatDepth(12.3) // → "12.3 km depth"
 *
 * @param km Depth in kilometres
 */
export function formatDepth(km: number): string {
  return `${km.toFixed(1)} km depth`
}

// ---------------------------------------------------------------------------
// String truncation
// ---------------------------------------------------------------------------

/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 *
 * @example
 * truncate("Hello, World!", 8) // → "Hello, …"
 *
 * @param str Input string
 * @param maxLen Maximum character length (including ellipsis)
 */
export function truncate(str: string, maxLen: number): string {
  if (maxLen < 1) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}
