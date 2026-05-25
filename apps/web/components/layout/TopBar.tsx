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
      'space-satellites-core',
      'rss-news-wire-core'
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
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Update theme data-attribute on document element
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  return (
    <header className="h-12 w-full flex items-center justify-between px-4 bg-surface border-b border-weak z-50 select-none shadow-md">
      {/* LEFT: Branding */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-6 h-6 rounded bg-[var(--pan-btn-active-bg)] border border-[var(--pan-border-accent)] shadow-sm">
          <Globe className="w-3.5 h-3.5 text-[var(--pan-text-accent)] animate-pulse" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-display text-sm font-bold tracking-widest text-[var(--pan-text-primary)] uppercase leading-none drop-shadow-sm">
            PANOPTICON
          </h1>
          <span className="text-[9px] font-mono font-semibold tracking-wider text-[var(--pan-text-secondary)] leading-none mt-1">
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
        {/* Theme Cycler */}
        <Tooltip content={`Cycle interface theme (Current: ${theme})`}>
          <button
            onClick={cycleTheme}
            aria-label={`Cycle interface theme (Current: ${theme})`}
            className="p-1.5 rounded border border-[var(--pan-border-default)] hover:border-[var(--pan-border-strong)] text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] bg-[var(--pan-btn-secondary-bg)] hover:bg-[var(--pan-btn-secondary-hover)] transition-all"
          >
            <SunMoon className="w-3.5 h-3.5" />
          </button>
        </Tooltip>



        {/* AI Brief Drawer */}
        <Tooltip content="Toggle daily AI strategic brief overlay [A]">
          <button
            onClick={toggleAiBrief}
            aria-label="Toggle daily AI strategic brief overlay"
            className={`p-1.5 rounded border transition-all ${
              aiBriefOpen 
                ? 'bg-[var(--pan-btn-active-bg)] border-[var(--pan-btn-active-border)] text-[var(--pan-btn-active-text)]' 
                : 'border-[var(--pan-border-default)] hover:border-[var(--pan-border-strong)] text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] bg-[var(--pan-btn-secondary-bg)] hover:bg-[var(--pan-btn-secondary-hover)]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <div className="w-px h-5 bg-border-weak" />

        {/* Layout Control Switches */}
        <div className="flex items-center gap-0.5 bg-[var(--pan-bg-raised)] p-0.5 rounded border border-[var(--pan-border-default)]">
          <Tooltip content="Toggle left map layer toggles panel">
            <button
              onClick={toggleLayerPanel}
              aria-label="Toggle left map layer panel"
              className={`p-1.5 rounded transition-all ${
                layerPanelOpen 
                  ? 'bg-[var(--pan-btn-active-bg)] border border-[var(--pan-btn-active-border)] text-[var(--pan-btn-active-text)]' 
                  : 'text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] hover:bg-[var(--pan-btn-secondary-hover)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Toggle bottom tabular list telemetry inspector">
            <button
              onClick={toggleBottomPanel}
              aria-label="Toggle bottom tabular telemetry panel"
              className={`p-1.5 rounded transition-all ${
                bottomPanelOpen 
                  ? 'bg-[var(--pan-btn-active-bg)] border border-[var(--pan-btn-active-border)] text-[var(--pan-btn-active-text)]' 
                  : 'text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] hover:bg-[var(--pan-btn-secondary-hover)]'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Toggle right real-time geopolitical & cyber tickers">
            <button
              onClick={toggleIntelPanel}
              aria-label="Toggle right tickers panel"
              className={`p-1.5 rounded transition-all ${
                intelPanelOpen 
                  ? 'bg-[var(--pan-btn-active-bg)] border border-[var(--pan-btn-active-border)] text-[var(--pan-btn-active-text)]' 
                  : 'text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] hover:bg-[var(--pan-btn-secondary-hover)]'
              }`}
            >
              <Rss className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Toggle OSINT cyber toolkit overlay scanner [S]">
            <button
              onClick={toggleReconToolkit}
              aria-label="Toggle OSINT cyber toolkit"
              className={`p-1.5 rounded transition-all ${
                reconToolkitOpen 
                  ? 'bg-[var(--pan-btn-active-bg)] border border-[var(--pan-btn-active-border)] text-[var(--pan-btn-active-text)]' 
                  : 'text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] hover:bg-[var(--pan-btn-secondary-hover)]'
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
            aria-label="Toggle browser fullscreen mode"
            className="p-1.5 rounded border border-[var(--pan-border-default)] hover:border-[var(--pan-border-strong)] text-[var(--pan-text-secondary)] hover:text-[var(--pan-text-primary)] bg-[var(--pan-btn-secondary-bg)] hover:bg-[var(--pan-btn-secondary-hover)] transition-all"
          >
            {mapFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
