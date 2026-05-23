import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BottomTab = 'data' | 'charts' | 'events'

export interface PanelStore {
  // ── Panel visibility — flat booleans ──────────────────────────────────
  layerPanelOpen: boolean
  intelPanelOpen: boolean
  bottomPanelOpen: boolean
  reconToolkitOpen: boolean
  aiBriefOpen: boolean

  // ── Panel sizes — flat numbers (percentages of viewport) ──────────────
  layerPanelSize: number
  intelPanelSize: number
  bottomPanelSize: number

  // ── Active domain tab in intel panel ──────────────────────────────────
  activeDomain: string

  // ── Active bottom panel tab ───────────────────────────────────────────
  activeBottomTab: BottomTab

  // ── Fullscreen map mode ───────────────────────────────────────────────
  mapFullscreen: boolean

  // ── Actions ───────────────────────────────────────────────────────────
  toggleLayerPanel: () => void
  toggleIntelPanel: () => void
  toggleBottomPanel: () => void
  toggleReconToolkit: () => void
  toggleAiBrief: () => void
  toggleMapFullscreen: () => void
  setLayerPanelSize: (size: number) => void
  setIntelPanelSize: (size: number) => void
  setBottomPanelSize: (size: number) => void
  setActiveDomain: (domain: string) => void
  setActiveBottomTab: (tab: BottomTab) => void

  /** Collapse all panels (hides everything except the map) */
  collapseAll: () => void
  /** Restore the default panel layout */
  resetLayout: () => void
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  layerPanelOpen: true,
  intelPanelOpen: false,
  bottomPanelOpen: false,
  reconToolkitOpen: false,
  aiBriefOpen: false,
  layerPanelSize: 18,
  intelPanelSize: 22,
  bottomPanelSize: 30,
  activeDomain: 'all',
  activeBottomTab: 'data' as BottomTab,
  mapFullscreen: false,
} as const

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePanelStore = create<PanelStore>()(
  persist(
    (set) => ({
      // ── State ──────────────────────────────────────────────────────────
      ...DEFAULTS,

      // ── Toggle actions ─────────────────────────────────────────────────
      toggleLayerPanel: () =>
        set((s) => ({ layerPanelOpen: !s.layerPanelOpen })),

      toggleIntelPanel: () =>
        set((s) => ({ intelPanelOpen: !s.intelPanelOpen })),

      toggleBottomPanel: () =>
        set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),

      toggleReconToolkit: () =>
        set((s) => ({ reconToolkitOpen: !s.reconToolkitOpen })),

      toggleAiBrief: () =>
        set((s) => ({ aiBriefOpen: !s.aiBriefOpen })),

      toggleMapFullscreen: () =>
        set((s) => ({
          mapFullscreen: !s.mapFullscreen,
          // When entering fullscreen, collapse all panels
          ...(s.mapFullscreen
            ? {}
            : {
                layerPanelOpen: false,
                intelPanelOpen: false,
                bottomPanelOpen: false,
                reconToolkitOpen: false,
                aiBriefOpen: false,
              }),
        })),

      // ── Size setters ───────────────────────────────────────────────────
      setLayerPanelSize: (size) =>
        set({ layerPanelSize: Math.max(10, Math.min(40, size)) }),

      setIntelPanelSize: (size) =>
        set({ intelPanelSize: Math.max(15, Math.min(50, size)) }),

      setBottomPanelSize: (size) =>
        set({ bottomPanelSize: Math.max(15, Math.min(60, size)) }),

      // ── Tab setters ────────────────────────────────────────────────────
      setActiveDomain: (domain) => set({ activeDomain: domain }),
      setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),

      // ── Layout shortcuts ───────────────────────────────────────────────
      collapseAll: () =>
        set({
          layerPanelOpen: false,
          intelPanelOpen: false,
          bottomPanelOpen: false,
          reconToolkitOpen: false,
          aiBriefOpen: false,
        }),

      resetLayout: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'panopticon-panel-layout',
      // Only persist visual state, not action functions
      partialize: (state) => ({
        layerPanelOpen: state.layerPanelOpen,
        intelPanelOpen: state.intelPanelOpen,
        bottomPanelOpen: state.bottomPanelOpen,
        reconToolkitOpen: state.reconToolkitOpen,
        aiBriefOpen: state.aiBriefOpen,
        layerPanelSize: state.layerPanelSize,
        intelPanelSize: state.intelPanelSize,
        bottomPanelSize: state.bottomPanelSize,
        activeDomain: state.activeDomain,
        activeBottomTab: state.activeBottomTab,
        mapFullscreen: state.mapFullscreen,
      }),
    },
  ),
)
