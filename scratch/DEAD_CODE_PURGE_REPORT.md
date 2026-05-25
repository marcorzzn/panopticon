# PANOPTICON v3.3 — DEAD CODE PURGE REPORT (v3.3 pre-flight)

Date: 2026-05-25
Author: Antigravity AI Agent

## 1. Deleted Files (Phases 0.2 - 0.4)

| Filename | Classification | Removal Rationale |
| :--- | :--- | :--- |
| `apps/web/components/feeds/EventTicker.tsx` | `DEAD` | Obsolete component never imported or rendered in any frontend file. |
| `packages/core/src/data/country-centroids.json` | `DEAD` | Unused location index dataset containing redundant centroids. |
| `packages/core/src/stores/osint-store.ts` | `DEAD` | Legacy Zustand store containing duplicate properties, fully unconsumed. |
| `scratch/extract.js` | `DEAD` | Temporary CLI helper script from previous iteration. |
| `scratch/test-rss.js` | `DEAD` | Stale scrapers/helper scripts from development phase. |
| `scratch/test-rss.ts` | `DEAD` | Stale scrapers/helper scripts from development phase. |

## 2. Refactored Active Files (Phases 0.5 - 0.6)

### 2.1 Unused Imports & Exports (0.5.1)
- **`packages/core/src/stores/index.ts`:** Removed stale `useOsintStore` and type exports representing the deleted `osint-store.ts`.

### 2.2 Unused Variables and Constants (0.5.2)
- **`packages/core/src/stores/panel-store.ts`:** Purged the dead layout controls `aiBriefOpen` and `toggleAiBrief` which were leftover from the client settings AI brief drawer.

### 2.3 Uncalled Functions (0.5.3)
- **`packages/data-pipeline/src/sources/gdelt.ts`:** Eliminated redundant mock-fallback generators (`getMockGdeltEvents`) to enforce true backend-as-proxy endpoints.

### 2.4 Stale Comment Blocks & TODOs (0.5.4 - 0.5.5)
- Removed large commented-out lines from dynamic layer selection menus and map markers filters.
