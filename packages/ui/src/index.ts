/* ============================================================================
 * @panopticon/ui — TypeScript Exports
 * Type-safe theme names, constants, and CSS class name references.
 * ============================================================================ */

/** Available theme identifiers */
export type Theme = 'dark' | 'light'

/** Ordered list of all available themes */
export const THEMES: Theme[] = ['dark', 'light']

/** Default theme applied when no explicit theme is set */
export const DEFAULT_THEME: Theme = 'dark'

/** Data attribute name used on the root element to set the active theme */
export const THEME_ATTRIBUTE = 'data-theme'

/** Glass panel elevation levels */
export type GlassLevel = 1 | 2 | 3

/** Status variants used throughout the system */
export type StatusVariant = 'ok' | 'warning' | 'critical' | 'info' | 'unknown'

/** All status variants as a constant array */
export const STATUS_VARIANTS: StatusVariant[] = [
  'ok',
  'warning',
  'critical',
  'info',
  'unknown',
]

/** Badge variants */
export type BadgeVariant = 'ok' | 'warning' | 'critical' | 'info'

/** CSS class name constants for programmatic reference */
export const CSS_CLASSES = {
  /* Layout */
  glassPanel: 'glass-panel',
  dataGrid: 'data-grid',

  /* Typography */
  mono: 'mono',
  fontMono: 'font-mono',
  fontDisplay: 'font-display',
  tabularNums: 'tabular-nums',
  labelCaps: 'label-caps',
  truncate: 'truncate',

  /* Status */
  statusDot: 'status-dot',
  statusDotOk: 'status-dot--ok',
  statusDotWarning: 'status-dot--warning',
  statusDotCritical: 'status-dot--critical',
  statusDotUnknown: 'status-dot--unknown',

  /* Badges */
  badge: 'badge',
  badgeOk: 'badge--ok',
  badgeWarning: 'badge--warning',
  badgeCritical: 'badge--critical',
  badgeInfo: 'badge--info',

  /* Effects */
  glow: 'glow',
  fadeIn: 'fade-in',
  slideUp: 'slide-up',

  /* Accessibility */
  srOnly: 'sr-only',

  /* Resize handles */
  resizeHandle: 'resize-handle',
} as const

/**
 * Helper to apply a theme to the document root element.
 * Call from client code: applyTheme('amoled')
 */
export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
  }
}

/**
 * Read the currently active theme from the document root.
 * Returns the default theme if none is explicitly set.
 */
export function getActiveTheme(): Theme {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute(THEME_ATTRIBUTE)
    if (attr && THEMES.includes(attr as Theme)) {
      return attr as Theme
    }
  }
  return DEFAULT_THEME
}
