'use client'

import * as React from 'react'
import {
  Layers,
  Rss,
  Table,
  Maximize2,
  Minimize2,
  Activity,
  Globe,
  Radio,
  Cpu,
  Tv,
  SunMoon,
  Settings,
  Terminal,
  RefreshCw,
} from 'lucide-react'
import { useSWRConfig } from 'swr'
import { usePanelStore, useAppStore } from '@panopticon/core/stores'
import LiveClock from '../widgets/LiveClock'

function Tooltip({ content, children }: { content: string; children: React.ReactElement }) {
  const [visible, setVisible] = React.useState(false)
  const [coords, setCoords] = React.useState({ x: 0, y: 0 })
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    })
    timeoutRef.current = setTimeout(() => {
      setVisible(true)
    }, 400) // 400ms delay
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      } as any)}
      {visible && (
        <div
          className="fixed z-50 px-2 py-1 text-[9px] font-mono font-semibold tracking-wider text-accent bg-[#0b0f1a] border border-accent/40 rounded shadow-[0_0_10px_rgba(0,240,255,0.25)] -translate-x-1/2 pointer-events-none transition-all duration-150 animate-fade-in"
          style={{ left: coords.x, top: coords.y }}
        >
          {content}
        </div>
      )}
    </>
  )
}

export default function TopBar() {
  const { mutate } = useSWRConfig()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleForceRefresh = async () => {
    setIsRefreshing(true)
    const keys = [
      'usgs-earthquakes-core',
      'opensky-aircraft-core',
      'nasa-wildfires-core',
      'openaq-airquality-core',
      'acled-conflicts-core',
      'webcams-core',
      'space-satellites-core'
    ]
    await Promise.all([
      ...keys.map(k => mutate(k)),
      mutate(['gdelt-events-core', 'protest'])
    ])
    setTimeout(() => {
      setIsRefreshing(false)
    }, 600)
  }

  const {
    layerPanelOpen,
    intelPanelOpen,
    bottomPanelOpen,
    mapFullscreen,
    toggleLayerPanel,
    toggleIntelPanel,
    toggleBottomPanel,
    toggleMapFullscreen,
    toggleSettingsDrawer,
    reconToolkitOpen,
    toggleReconToolkit,
    aiBriefOpen,
    toggleAiBrief,
  } = usePanelStore()

  const {
    theme,
    setTheme,
    globalRefreshPaused,
    toggleGlobalRefresh,
  } = useAppStore()

  const handleFullscreenClick = () => {
    toggleMapFullscreen()
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const cycleTheme = () => {
    if (theme === 'midnight') setTheme('amoled')
    else if (theme === 'amoled') setTheme('light')
    else if (theme === 'light') setTheme('high-contrast')
    else setTheme('midnight')
  }

  // Update theme data-attribute on document element
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  return (
    <header className="h-12 w-full flex items-center justify-between px-4 bg-surface border-b border-weak z-30 select-none shadow-md">
      {/* LEFT: Branding */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-6 h-6 rounded bg-accent bg-opacity-20 border border-accent">
          <Globe className="w-3.5 h-3.5 text-accent animate-pulse" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-display text-sm font-bold tracking-widest text-heading uppercase leading-none">
            PANOPTICON
          </h1>
          <span className="text-[9px] font-mono font-semibold tracking-wider text-secondary leading-none mt-1">
            GLOBAL RECON SYSTEM v1.0
          </span>
        </div>
      </div>

      {/* CENTER: High Aesthetic Live Clock Grid */}
      <div className="hidden md:flex items-center gap-6">
        <LiveClock />
      </div>

      {/* RIGHT: Systems Grid & UI Toggles */}
      <div className="flex items-center gap-4">
        {/* Source Monitors */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-deepest bg-opacity-40 rounded border border-weak font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="status-dot status-dot--ok" />
            <span className="text-secondary uppercase">USGS</span>
          </div>
          <div className="w-px h-3 bg-border-weak" />
          <div className="flex items-center gap-1.5">
            <span className="status-dot status-dot--ok" />
            <span className="text-secondary uppercase">NOAA</span>
          </div>
          <div className="w-px h-3 bg-border-weak" />
          <div className="flex items-center gap-1.5">
            <span className="status-dot status-dot--warning animate-pulse" />
            <span className="text-secondary uppercase">GDELT</span>
          </div>
          <div className="w-px h-3 bg-border-weak" />
          <div className="flex items-center gap-1.5 text-accent">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="uppercase text-accent font-semibold">FEED LIVE</span>
          </div>
        </div>

        {/* Force Refresh Button */}
        <Tooltip content="Force immediate revalidation of all active OSINT caches">
          <button
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            className={`flex items-center justify-center p-1.5 rounded border border-weak hover:border-accent text-secondary hover:text-accent bg-deepest bg-opacity-40 transition-all ${
              isRefreshing ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </Tooltip>

        {/* Global Pause Refresh Switch */}
        <Tooltip content={globalRefreshPaused ? 'Resume live background SWR polling cycles' : 'Pause background data revalidations'}>
          <button
            onClick={toggleGlobalRefresh}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono transition-all ${
              globalRefreshPaused
                ? 'bg-status-critical-bg border-status-critical text-status-critical-text'
                : 'bg-status-ok-bg border-status-ok text-status-ok-text'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span className="uppercase font-semibold">{globalRefreshPaused ? 'PAUSED' : 'LIVE'}</span>
          </button>
        </Tooltip>

        {/* Theme Cycler */}
        <Tooltip content={`Cycle interface theme (Current: ${theme})`}>
          <button
            onClick={cycleTheme}
            className="p-1.5 rounded hover:bg-hover border border-transparent hover:border-weak text-secondary hover:text-primary transition-all"
          >
            <SunMoon className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Operational Settings Drawer */}
        <Tooltip content="Open telemetry credentials & webcam settings panel">
          <button
            onClick={toggleSettingsDrawer}
            className="p-1.5 rounded hover:bg-hover border border-transparent hover:border-weak text-secondary hover:text-primary transition-all animate-none"
          >
            <Settings className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* AI Brief Drawer */}
        <Tooltip content="Toggle daily AI strategic brief overlay [A]">
          <button
            onClick={toggleAiBrief}
            className={`p-1.5 rounded hover:bg-hover border border-transparent hover:border-weak transition-all ${
              aiBriefOpen ? 'bg-accent bg-opacity-20 text-accent' : 'text-secondary hover:text-primary'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </button>
        </Tooltip>

        <div className="w-px h-5 bg-border-weak" />

        {/* Layout Control Switches */}
        <div className="flex items-center gap-0.5 bg-deepest bg-opacity-40 p-0.5 rounded border border-weak">
          <Tooltip content="Toggle left map layer toggles panel">
            <button
              onClick={toggleLayerPanel}
              className={`p-1.5 rounded transition-all ${
                layerPanelOpen ? 'bg-accent bg-opacity-20 text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Toggle bottom tabular list telemetry inspector">
            <button
              onClick={toggleBottomPanel}
              className={`p-1.5 rounded transition-all ${
                bottomPanelOpen ? 'bg-accent bg-opacity-20 text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Toggle right real-time geopolitical & cyber tickers">
            <button
              onClick={toggleIntelPanel}
              className={`p-1.5 rounded transition-all ${
                intelPanelOpen ? 'bg-accent bg-opacity-20 text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              <Rss className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Toggle OSINT cyber toolkit overlay scanner [S]">
            <button
              onClick={toggleReconToolkit}
              className={`p-1.5 rounded transition-all ${
                reconToolkitOpen ? 'bg-accent bg-opacity-20 text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>

        {/* Fullscreen Map Toggle */}
        <Tooltip content="Toggle browser workspace fullscreen mode">
          <button
            onClick={handleFullscreenClick}
            className="p-1.5 rounded bg-deepest bg-opacity-40 border border-weak hover:bg-hover text-secondary hover:text-primary transition-all"
          >
            {mapFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
