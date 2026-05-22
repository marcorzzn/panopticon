import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Theme = 'midnight' | 'amoled' | 'high-contrast'
type ClockFormat = '24h' | '12h'

export interface AppStore {
  // ── Theme ──────────────────────────────────────────────────────────────
  theme: Theme
  setTheme: (theme: Theme) => void

  // ── Clock ──────────────────────────────────────────────────────────────
  clockFormat: ClockFormat
  setClockFormat: (format: ClockFormat) => void
  showUtcClock: boolean
  toggleUtcClock: () => void

  // ── Performance ────────────────────────────────────────────────────────
  reducedMotion: boolean
  setReducedMotion: (reduced: boolean) => void
  lowPowerMode: boolean
  setLowPowerMode: (low: boolean) => void

  // ── Data refresh ───────────────────────────────────────────────────────
  globalRefreshPaused: boolean
  toggleGlobalRefresh: () => void

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  shortcutsEnabled: boolean
  setShortcutsEnabled: (enabled: boolean) => void

  // ── Source health summary — flat primitives ────────────────────────────
  healthySourceCount: number
  degradedSourceCount: number
  downSourceCount: number
  updateSourceHealth: (
    healthy: number,
    degraded: number,
    down: number,
  ) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detect the user's prefers-reduced-motion setting.
 * Safe for SSR — returns false when `window` is unavailable.
 */
function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // ── Theme ────────────────────────────────────────────────────────────
      theme: 'midnight' as Theme,
      setTheme: (theme) => set({ theme }),

      // ── Clock ────────────────────────────────────────────────────────────
      clockFormat: '24h' as ClockFormat,
      setClockFormat: (format) => set({ clockFormat: format }),
      showUtcClock: true,
      toggleUtcClock: () => set((s) => ({ showUtcClock: !s.showUtcClock })),

      // ── Performance ──────────────────────────────────────────────────────
      reducedMotion: detectReducedMotion(),
      setReducedMotion: (reduced) => set({ reducedMotion: reduced }),
      lowPowerMode: false,
      setLowPowerMode: (low) => set({ lowPowerMode: low }),

      // ── Data refresh ─────────────────────────────────────────────────────
      globalRefreshPaused: false,
      toggleGlobalRefresh: () =>
        set((s) => ({ globalRefreshPaused: !s.globalRefreshPaused })),

      // ── Keyboard shortcuts ───────────────────────────────────────────────
      shortcutsEnabled: true,
      setShortcutsEnabled: (enabled) => set({ shortcutsEnabled: enabled }),

      // ── Source health ────────────────────────────────────────────────────
      healthySourceCount: 0,
      degradedSourceCount: 0,
      downSourceCount: 0,
      updateSourceHealth: (healthy, degraded, down) =>
        set({
          healthySourceCount: healthy,
          degradedSourceCount: degraded,
          downSourceCount: down,
        }),
    }),
    {
      name: 'panopticon-app-settings',
      partialize: (state) => ({
        theme: state.theme,
        clockFormat: state.clockFormat,
        showUtcClock: state.showUtcClock,
        reducedMotion: state.reducedMotion,
        lowPowerMode: state.lowPowerMode,
        shortcutsEnabled: state.shortcutsEnabled,
        // Intentionally NOT persisting: globalRefreshPaused, source health
        // These are transient runtime state
      }),
    },
  ),
)
