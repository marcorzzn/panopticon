import type { SpaceWeatherData } from '@panopticon/core/types'
import { GeomagneticStormLevel } from '@panopticon/core/types'

function getStormLevel(kp: number): GeomagneticStormLevel {
  if (kp >= 9) return GeomagneticStormLevel.STORM_G5
  if (kp >= 8) return GeomagneticStormLevel.STORM_G4
  if (kp >= 7) return GeomagneticStormLevel.STORM_G3
  if (kp >= 6) return GeomagneticStormLevel.STORM_G2
  if (kp >= 5) return GeomagneticStormLevel.STORM_G1
  if (kp >= 4) return GeomagneticStormLevel.UNSETTLED
  return GeomagneticStormLevel.QUIET
}

export async function fetchSpaceWeather(): Promise<SpaceWeatherData> {
  const kpUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
  const plasmaUrl = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json'
  const magUrl = 'https://services.swpc.noaa.gov/products/solar-wind/mag-5-minute.json'

  let kpIndex = 1
  let kpForecast: number[] = [1, 2, 1, 3, 2, 1, 2, 1]
  let solarWindSpeed = 350
  let solarWindDensity = 4.5
  let bz = 0.5
  let lastUpdate = Date.now()

  // 1. Fetch Kp Index
  try {
    const response = await fetch(kpUrl)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 1) {
        // Headers are first, e.g. ["time_tag", "kp", "a_factor", "station_count"]
        const kpIndexCol = data[0].indexOf('kp')
        const timeCol = data[0].indexOf('time_tag')

        if (kpIndexCol !== -1) {
          // Get the latest valid Kp reading
          const latestRow = data[data.length - 1]
          kpIndex = parseFloat(latestRow[kpIndexCol])
          if (isNaN(kpIndex)) kpIndex = 1

          if (timeCol !== -1 && latestRow[timeCol]) {
            lastUpdate = new Date(latestRow[timeCol] + ' UTC').getTime()
          }

          // Generate a forecast based on recent readings
          kpForecast = data
            .slice(-8)
            .map((row: any) => {
              const val = parseFloat(row[kpIndexCol])
              return isNaN(val) ? 1 : val
            })
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch Kp index from NOAA:', e)
  }

  // 2. Fetch Solar Wind Plasma (speed, density)
  try {
    const response = await fetch(plasmaUrl)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 1) {
        // Headers: ["time_tag", "density", "speed", "temperature"]
        const densityCol = data[0].indexOf('density')
        const speedCol = data[0].indexOf('speed')

        if (densityCol !== -1 && speedCol !== -1) {
          // Get the latest row with valid numbers
          for (let i = data.length - 1; i > 0; i--) {
            const row = data[i]
            const d = parseFloat(row[densityCol])
            const s = parseFloat(row[speedCol])
            if (!isNaN(d) && !isNaN(s)) {
              solarWindDensity = d
              solarWindSpeed = s
              break
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch solar wind plasma from NOAA:', e)
  }

  // 3. Fetch IMF Mag (Bz component)
  try {
    const response = await fetch(magUrl)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 1) {
        // Headers: ["time_tag", "bx", "by", "bz", "lat", "lon", "bt"]
        const bzCol = data[0].indexOf('bz')

        if (bzCol !== -1) {
          for (let i = data.length - 1; i > 0; i--) {
            const row = data[i]
            const bzVal = parseFloat(row[bzCol])
            if (!isNaN(bzVal)) {
              bz = bzVal
              break
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch IMF Bz from NOAA:', e)
  }

  return {
    kpIndex,
    kpForecast,
    solarWindSpeed,
    solarWindDensity,
    bz,
    geomagneticStormLevel: getStormLevel(kpIndex),
    lastUpdate,
  }
}
