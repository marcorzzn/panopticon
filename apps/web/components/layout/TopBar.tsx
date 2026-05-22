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
} from 'lucide-react'
import { usePanelStore, useAppStore } from '@panopticon/core/stores'
import LiveClock from '../widgets/LiveClock'

export default function TopBar() {
  const {
    layerPanelOpen,
    intelPanelOpen,
    bottomPanelOpen,
    mapFullscreen,
    toggleLayerPanel,
    toggleIntelPanel,
    toggleBottomPanel,
    toggleMapFullscreen,
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
    else if (theme === 'amoled') setTheme('high-contrast')
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

        {/* Global Pause Refresh Switch */}
        <button
          onClick={toggleGlobalRefresh}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono transition-all ${
            globalRefreshPaused
              ? 'bg-status-critical-bg border-status-critical text-status-critical-text'
              : 'bg-status-ok-bg border-status-ok text-status-ok-text'
          }`}
          title={globalRefreshPaused ? 'Resume Global Data Polling' : 'Pause Global Data Polling'}
        >
          <Activity className="w-3 h-3" />
          <span className="uppercase font-semibold">{globalRefreshPaused ? 'PAUSED' : 'LIVE'}</span>
        </button>

        {/* Theme Cycler */}
        <button
          onClick={cycleTheme}
          className="p-1.5 rounded hover:bg-hover border border-transparent hover:border-weak text-secondary hover:text-primary transition-all"
          title={`Cycle UI Theme (Current: ${theme})`}
        >
          <SunMoon className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-border-weak" />

        {/* Layout Control Switches */}
        <div className="flex items-center gap-0.5 bg-deepest bg-opacity-40 p-0.5 rounded border border-weak">
          <button
            onClick={toggleLayerPanel}
            className={`p-1.5 rounded transition-all ${
              layerPanelOpen ? 'bg-accent bg-opacity-20 text-accent' : 'text-secondary hover:text-primary'
            }`}
            title="Toggle Left Layers Drawer"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleBottomPanel}
            className={`p-1.5 rounded transition-all ${
              bottomPanelOpen ? 'bg-accent bg-opacity-20 text-accent' : 'text-secondary hover:text-primary'
            }`}
            title="Toggle Bottom Details Panel"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleIntelPanel}
            className={`p-1.5 rounded transition-all ${
              intelPanelOpen ? 'bg-accent bg-opacity-20 text-accent' : 'text-secondary hover:text-primary'
            }`}
            title="Toggle Right Intelligence Feeds"
          >
            <Rss className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fullscreen Map Toggle */}
        <button
          onClick={handleFullscreenClick}
          className="p-1.5 rounded bg-deepest bg-opacity-40 border border-weak hover:bg-hover text-secondary hover:text-primary transition-all"
          title="Toggle Fullscreen Mode"
        >
          {mapFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  )
}
