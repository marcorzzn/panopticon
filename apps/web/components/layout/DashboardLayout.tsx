'use client'

import * as React from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { usePanelStore } from '@panopticon/core/stores'
import TopBar from './TopBar'
import StatusBar from './StatusBar'
import LayerPanel from './LayerPanel'
import IntelPanel from './IntelPanel'
import DetailInspector from './DetailInspector'
import SettingsDrawer from './SettingsDrawer'
import ReconToolkit from './ReconToolkit'
import AiBriefConsole from './AiBriefConsole'

interface DashboardLayoutProps {
  children: React.ReactNode // Map view is passed here
  earthquakePanel: React.ReactNode
  spaceWeatherPanel: React.ReactNode
}

export default function DashboardLayout({
  children,
  earthquakePanel,
  spaceWeatherPanel,
}: DashboardLayoutProps) {
  const {
    layerPanelOpen,
    intelPanelOpen,
    bottomPanelOpen,
    layerPanelSize,
    intelPanelSize,
    bottomPanelSize,
    setLayerPanelSize,
    setIntelPanelSize,
    setBottomPanelSize,
    toggleLayerPanel,
    toggleIntelPanel,
    toggleBottomPanel,
    activeBottomTab,
    setActiveBottomTab,
  } = usePanelStore()

  // Refs to panels for imperatively collapsing/expanding them if needed
  const layerPanelRef = React.useRef<any>(null)
  const intelPanelRef = React.useRef<any>(null)
  const bottomPanelRef = React.useRef<any>(null)

  // Sync ref expansion/collapse with store values
  React.useEffect(() => {
    const panel = layerPanelRef.current
    if (panel) {
      if (layerPanelOpen && panel.isCollapsed()) {
        panel.expand()
      } else if (!layerPanelOpen && !panel.isCollapsed()) {
        panel.collapse()
      }
    }
  }, [layerPanelOpen])

  React.useEffect(() => {
    const panel = intelPanelRef.current
    if (panel) {
      if (intelPanelOpen && panel.isCollapsed()) {
        panel.expand()
      } else if (!intelPanelOpen && !panel.isCollapsed()) {
        panel.collapse()
      }
    }
  }, [intelPanelOpen])

  React.useEffect(() => {
    const panel = bottomPanelRef.current
    if (panel) {
      if (bottomPanelOpen && panel.isCollapsed()) {
        panel.expand()
      } else if (!bottomPanelOpen && !panel.isCollapsed()) {
        panel.collapse()
      }
    }
  }, [bottomPanelOpen])

  return (
    <div className="flex flex-col h-screen w-screen bg-deepest text-primary overflow-hidden select-none">
      {/* 1. Top Navigation & Header */}
      <TopBar />

      {/* 2. Operations Panel Center Stage */}
      <div className="flex-1 w-full relative overflow-hidden" style={{ height: 'calc(100vh - 72px)' }}>
        <PanelGroup direction="horizontal">
          {/* LEFT SIDEBAR: Layers Grouped by Domain */}
          <Panel
            ref={layerPanelRef}
            id="layer-panel"
            order={1}
            collapsible
            defaultSize={layerPanelSize}
            minSize={12}
            maxSize={25}
            onResize={setLayerPanelSize}
            onCollapse={() => {
              if (layerPanelOpen) toggleLayerPanel()
            }}
            onExpand={() => {
              if (!layerPanelOpen) toggleLayerPanel()
            }}
            className="flex flex-col h-full bg-surface border-r border-weak overflow-hidden z-10"
          >
            <LayerPanel />
          </Panel>

          {layerPanelOpen && (
            <PanelResizeHandle className="w-1 bg-border-weak hover:bg-accent active:bg-accent transition-colors cursor-col-resize z-20 relative" />
          )}

          {/* CENTRAL STAGE: Map & Optional Bottom Details Table */}
          <Panel order={2} className="flex flex-col h-full overflow-hidden relative">
            <PanelGroup direction="vertical">
              {/* Top half: Map Component */}
              <Panel order={1} className="flex-1 w-full relative overflow-hidden">
                {children}
                <DetailInspector />
              </Panel>

              {bottomPanelOpen && (
                <PanelResizeHandle className="h-1 bg-border-weak hover:bg-accent active:bg-accent transition-colors cursor-row-resize z-20 relative" />
              )}

              {/* Bottom half: Tables/Analytics charts */}
              <Panel
                ref={bottomPanelRef}
                id="bottom-panel"
                order={2}
                collapsible
                defaultSize={bottomPanelSize}
                minSize={15}
                maxSize={50}
                onResize={setBottomPanelSize}
                onCollapse={() => {
                  if (bottomPanelOpen) toggleBottomPanel()
                }}
                onExpand={() => {
                  if (!bottomPanelOpen) toggleBottomPanel()
                }}
                className="flex flex-col bg-surface border-t border-weak overflow-hidden z-10"
              >
                {/* Bottom Panel Tabs */}
                <div className="flex items-center justify-between border-b border-weak px-4 py-2 bg-deepest bg-opacity-40">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveBottomTab('data')}
                      className={`px-3 py-1 font-display text-xs font-semibold uppercase tracking-wider transition-colors ${
                        activeBottomTab === 'data'
                          ? 'text-accent border-b-2 border-accent'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      USGS Earthquakes
                    </button>
                    <button
                      onClick={() => setActiveBottomTab('charts')}
                      className={`px-3 py-1 font-display text-xs font-semibold uppercase tracking-wider transition-colors ${
                        activeBottomTab === 'charts'
                          ? 'text-accent border-b-2 border-accent'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      NOAA Space Weather
                    </button>
                  </div>
                  <button
                    onClick={toggleBottomPanel}
                    className="text-secondary hover:text-primary text-xs font-mono font-medium p-1 rounded hover:bg-hover transition-colors"
                  >
                    [CLOSE]
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {activeBottomTab === 'data' && earthquakePanel}
                  {activeBottomTab === 'charts' && spaceWeatherPanel}
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          {intelPanelOpen && (
            <PanelResizeHandle className="w-1 bg-border-weak hover:bg-accent active:bg-accent transition-colors cursor-col-resize z-20 relative" />
          )}

          {/* RIGHT SIDEBAR: Geopolitical Event Feed */}
          <Panel
            ref={intelPanelRef}
            id="intel-panel"
            order={3}
            collapsible
            defaultSize={intelPanelSize}
            minSize={15}
            maxSize={40}
            onResize={setIntelPanelSize}
            onCollapse={() => {
              if (intelPanelOpen) toggleIntelPanel()
            }}
            onExpand={() => {
              if (!intelPanelOpen) toggleIntelPanel()
            }}
            className="flex flex-col h-full bg-surface border-l border-weak overflow-hidden z-10"
          >
            <IntelPanel />
          </Panel>
        </PanelGroup>
      </div>

      {/* 3. Global Status Bar (Footer) */}
      <StatusBar />

      {/* Settings Drawer */}
      <SettingsDrawer />

      {/* Recon Toolkit Drawer */}
      <ReconToolkit />

      {/* AI Intelligence Brief Console */}
      <AiBriefConsole />
    </div>
  )
}
