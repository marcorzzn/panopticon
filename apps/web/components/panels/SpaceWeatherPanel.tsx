'use client'

import * as React from 'react'
import useSWR from 'swr'
import {
  Compass,
  Zap,
  Activity,
  Wind,
  Shield,
  Loader2,
  RefreshCw,
  Sun,
} from 'lucide-react'
import { fetchSpaceWeather } from '@panopticon/data-pipeline'
import { useAppStore } from '@panopticon/core/stores'

export default function SpaceWeatherPanel() {
  const { globalRefreshPaused } = useAppStore()

  // Fetch space weather from NOAA using SWR
  const { data: spaceData, error, isLoading, mutate } = useSWR(
    'noaa-space-weather',
    fetchSpaceWeather,
    {
      refreshInterval: globalRefreshPaused ? 0 : 120000, // Poll every 2 minutes if not paused
      revalidateOnFocus: false,
    }
  )

  const getKpColor = (kp: number) => {
    if (kp >= 5) return 'text-status-critical-text border-status-critical bg-status-critical-bg'
    if (kp >= 4) return 'text-status-warning-text border-status-warning bg-status-warning-bg'
    return 'text-status-ok-text border-status-ok bg-status-ok-bg'
  }

  const getBzColor = (bz: number) => {
    if (bz < -10) return 'text-status-critical-text'
    if (bz < -2) return 'text-status-warning-text'
    return 'text-status-ok-text'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-secondary gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">
            INGESTING DEEP SPACE DATA...
          </span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-10 text-status-critical-text gap-2 text-center">
          <span className="font-mono text-xs font-bold uppercase">SPACE DISPATCH SYNC ERROR</span>
          <span className="text-[10px] text-secondary">
            Unable to connect to NOAA Deep Space Climate Observatory (DSCOVR) sensors.
          </span>
        </div>
      )}

      {!isLoading && spaceData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[10px] text-secondary">
          {/* DIAL 1: Current Kp Index and storm description */}
          <div className="glass-panel p-4 flex flex-col gap-4 border border-weak">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold uppercase text-xs text-primary">
                Geomagnetic Activity
              </span>
              <Activity className="w-4 h-4 text-accent animate-pulse" />
            </div>

            <div className="flex items-center gap-4">
              {/* Circular Badge showing Kp value */}
              <div
                className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center ${getKpColor(
                  spaceData.kpIndex
                )}`}
              >
                <span className="text-[8px] font-semibold text-secondary uppercase">KP</span>
                <span className="text-2xl font-bold tracking-tighter tabular-nums leading-none">
                  {spaceData.kpIndex.toFixed(1)}
                </span>
              </div>

              {/* Storm severity descriptive title */}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-primary uppercase leading-tight">
                  {spaceData.geomagneticStormLevel}
                </span>
                <span className="text-[9px] text-secondary leading-tight mt-1">
                  NOAA Planetary G-Scale metric mapping.
                </span>
              </div>
            </div>
          </div>

          {/* DIAL 2: Solar Wind Speed, Density and IMF Magnetometer (Bz) */}
          <div className="glass-panel p-4 flex flex-col gap-3 border border-weak md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold uppercase text-xs text-primary">
                Solar Wind & IMF Plasma
              </span>
              <Sun className="w-4 h-4 text-accent" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Speed */}
              <div className="flex flex-col bg-deepest bg-opacity-40 p-2.5 rounded border border-weak">
                <div className="flex items-center gap-1.5 opacity-60">
                  <Wind className="w-3 h-3 text-accent" />
                  <span className="uppercase text-[8px] tracking-wider">SPEED</span>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums mt-1.5">
                  {spaceData.solarWindSpeed.toFixed(0)} <span className="text-[8px] font-normal text-secondary">KM/S</span>
                </span>
              </div>

              {/* Density */}
              <div className="flex flex-col bg-deepest bg-opacity-40 p-2.5 rounded border border-weak">
                <div className="flex items-center gap-1.5 opacity-60">
                  <Zap className="w-3 h-3 text-accent" />
                  <span className="uppercase text-[8px] tracking-wider">DENSITY</span>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums mt-1.5">
                  {spaceData.solarWindDensity.toFixed(1)} <span className="text-[8px] font-normal text-secondary">P/CM³</span>
                </span>
              </div>

              {/* IMF Bz Magnetometer */}
              <div className="flex flex-col bg-deepest bg-opacity-40 p-2.5 rounded border border-weak">
                <div className="flex items-center gap-1.5 opacity-60">
                  <Compass className="w-3 h-3 text-accent" />
                  <span className="uppercase text-[8px] tracking-wider">IMF BZ</span>
                </div>
                <span className={`text-sm font-bold tabular-nums mt-1.5 ${getBzColor(spaceData.bz)}`}>
                  {spaceData.bz >= 0 ? '+' : ''}
                  {spaceData.bz.toFixed(1)}{' '}
                  <span className="text-[8px] font-normal text-secondary">NT</span>
                </span>
              </div>
            </div>
          </div>

          {/* ROW 2: Kp index forecast bars */}
          <div className="glass-panel p-4 flex flex-col gap-3 border border-weak md:col-span-3">
            <span className="font-display font-semibold uppercase text-xs text-primary">
              Planetary K-Index Historical Sequence
            </span>

            {/* Historical Bar Chart Grid */}
            <div className="flex items-end justify-between h-20 bg-deepest bg-opacity-40 p-3 rounded border border-weak">
              {spaceData.kpForecast.map((val, idx) => {
                const heightPercentage = Math.max(8, (val / 9) * 100)
                let colorClass = 'bg-status-ok'
                if (val >= 5) colorClass = 'bg-status-critical'
                else if (val >= 4) colorClass = 'bg-status-warning'

                return (
                  <div key={idx} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-[8px] tabular-nums font-bold text-primary">{val.toFixed(0)}</span>
                    <div className="w-5 md:w-8 relative bg-border-weak rounded-t overflow-hidden h-12">
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-t ${colorClass}`}
                        style={{ height: `${heightPercentage}%` }}
                      />
                    </div>
                    <span className="text-[8px] opacity-40">T-{8 - idx}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
