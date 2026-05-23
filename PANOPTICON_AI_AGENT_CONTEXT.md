# PANOPTICON OSINT PLATFORM
## Comprehensive Technical Context & Operational Guidelines for AI Agents

**Document Version:** 2.0.0-M2M (Antigravity Environment Edition)
**Classification:** MACHINE-READABLE EXECUTION DIRECTIVES / INTERNAL USE ONLY
**Last Updated:** 2025-06-18
**Target Audience:** Autonomous AI Agents, Code Generation Models, Automated Refactoring Agents (Antigravity Orchestration)

---

## TABLE OF CONTENTS

0. [Antigravity Multi-Agent Orchestration Protocol](#0-antigravity-multi-agent-orchestration-protocol)
1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack Specification](#3-technology-stack-specification)
4. [Critical Architectural Constraints](#4-critical-architectural-constraints)
5. [Known Technical Debt & Anti-Patterns](#5-known-technical-debt--anti-patterns)
6. [Security Posture & Vulnerabilities](#6-security-posture--vulnerabilities)
7. [Data Flow & Integrity Guarantees](#7-data-flow--integrity-guarantees)
8. [Performance Characteristics & Bottlenecks](#8-performance-characteristics--bottlenecks)
9. [Domain-Specific Implementation Details](#9-domain-specific-implementation-details)
10. [Machine-to-Machine (M2M) & Operational Directives](#10-machine-to-machine-m2m--operational-directives)
11. [Code Generation Standards](#11-code-generation-standards)
12. [Testing & Validation Requirements](#12-testing--validation-requirements)
13. [Deployment & Environment Constraints](#13-deployment--environment-constraints)
14. [Future Roadmap & Architectural Evolution](#14-future-roadmap--architectural-evolution)
15. [Appendix: Key File References](#15-appendix-key-file-references)

---

## 0. ANTIGRAVITY MULTI-AGENT ORCHESTRATION PROTOCOL

**CRITICAL CLASSIFICATION:** MACHINE-READABLE EXECUTION DIRECTIVES

This project utilizes a multi-agent architecture within the Antigravity environment. If you are reading this document, you are an Autonomous Agent allocated in the Antigravity orchestrator. You MUST operate according to deterministic cycles (Read -> Plan -> Execute -> Validate).

### 0.1 Agent Role Topology & Boundaries
Before executing any operation, identify your assigned `AGENT_ROLE` and strictly respect the following domain boundaries:

* **`[ARCHITECT_AGENT]`**: The ONLY role authorized to create files in the infrastructure root, modify `.github/`, `docker-compose.yml`, or change Turborepo/PNPM workspace policies.
* **`[DATA_PIPELINE_AGENT]`**: Confined to `packages/data-pipeline/` and `apps/backend/pkg/ingestion/`. Forbidden from touching the UI layer.
* **`[FRONTEND_HUD_AGENT]`**: Confined to `apps/web/`, `packages/map-engine/`, and `packages/ui/`. Forbidden from implementing spatial calculation logic natively in the frontend; must request it from the backend via API.
* **`[SECOPS_AGENT]`**: Supreme authority. Must block commits from other agents if the introduction of vulnerable dependencies, unvalidated user input, or hardcoded secrets is detected.

### 0.2 The Antigravity Execution Loop (AEL)
Agents MUST NOT apply blind modifications. Every file system mutation MUST follow the M.A.V.R. (Map, Analyze, Validate, Record) loop:

1. **MAP:** Use file search tools (e.g., `grep`, `ast-grep`) to map dependencies BEFORE touching a TypeScript interface or a Go struct.
2. **ANALYZE:** Evaluate the "Blast Radius" of the modification. (e.g., If you touch `packages/core/src/types/domain.ts`, be aware that you will invalidate the build in both the `web` app and the `map-engine` package).
3. **VALIDATE:** After EVERY file system mutation, you **MUST EXECUTE AUTOMATED LINTING AND TYPECHECKING TOOLS**.
    * If modifying TS/TSX: `pnpm typecheck --filter=<workspace>`
    * If modifying Go: `cd apps/backend && go test ./... -short`
    * **Self-Healing Policy:** If a check fails, you have a strict maximum limit of **3 auto-correction iterations**. On the 4th failure, you MUST rollback the files, output to stderr, and terminate the sub-task. DO NOT get stuck in infinite token-draining loops.
4. **RECORD:** Every complex modification requires the generation of a temporary `.agent_memo.md` file in the root to pass the execution context to the subsequent Review agent.

---

## 1. EXECUTIVE SUMMARY

Panopticon is an ambitious Global Situational Awareness OSINT (Open Source Intelligence) platform designed to aggregate, correlate, and visualize real-time intelligence data across 12 distinct domains: Geopolitical, Financial, Climate, Aviation, Space, Cyber, Health, Military, Humanitarian, Energy, Transport, and Maritime.

### 1.1 Project Ambition vs. Current State

**Ambition:** Production-grade, globally distributed intelligence platform capable of processing millions of events per day with sub-second latency for critical alerts.

**Current State:** High-fidelity prototype with demonstration-ready features but significant technical debt preventing production deployment. The codebase exhibits "prototype syndrome" where demo functionality has been prioritized over operational robustness.

### 1.2 Critical Directives for AI Agents

When interacting with this codebase, AI agents MUST:

1. **NEVER** introduce new hardcoded credentials or secrets
2. **ALWAYS** preserve the monorepo structure and Turborepo configuration
3. **AVOID** duplicating logic already present in backend Go services into frontend TypeScript
4. **PRIORITIZE** security fixes over feature additions
5. **DOCUMENT** all architectural decisions with ADRs (Architectural Decision Records)
6. **RESPECT** the domain-driven design with explicit separation between intelligence domains
7. **MAINTAIN** type safety across the entire stack (no `any` types without explicit justification)

---

## 2. SYSTEM ARCHITECTURE OVERVIEW

### 2.1 Monorepo Structure

```text
/workspace
├── apps/
│   ├── web/                    # Next.js 16 + React 19 Frontend Application
│   │   ├── app/                # App Router pages and layouts
│   │   ├── components/         # Domain-specific UI components
│   │   ├── hooks/              # Custom React hooks
│   │   └── lib/                # Client-side utilities
│   │
│   └── backend/                # Go 1.22 REST API Server
│       ├── cmd/                # Application entry points
│       ├── pkg/                # Reusable Go packages
│       │   ├── api/            # HTTP handlers and middleware
│       │   ├── ingestion/      # Data ingestion pipelines
│       │   ├── models/         # Database entities and repositories
│       │   └── processor/      # Event correlation engine
│       └── internal/           # Private implementation details
│
├── packages/
│   ├── core/                   # Shared TypeScript types, stores, utilities
│   │   ├── src/
│   │   │   ├── types/          # Cross-domain type definitions
│   │   │   ├── stores/         # Zustand state management
│   │   │   ├── config/         # Layer configurations and domain settings
│   │   │   └── utils/          # Shared helper functions
│   │   │
│   ├── data-pipeline/          # OSINT data fetchers (TypeScript)
│   │   └── src/
│   │       ├── sources/        # Individual source implementations
│   │       ├── types/          # Source-specific type definitions
│   │       └── utils/          # Data transformation utilities
│   │
│   ├── map-engine/             # MapLibre GL wrapper and spatial utilities
│   └── ui/                     # Shared component library
│
├── docker-compose.yml          # Local development environment
├── turbo.json                  # Turborepo configuration
└── pnpm-workspace.yaml         # PNPM workspace definition
```

### 2.2 Architectural Patterns

#### 2.2.1 Domain-Driven Design (DDD)

The system is organized around 12 bounded contexts corresponding to intelligence domains:

```typescript
enum IntelligenceDomain {
  GEOPOLITICAL = 'geopolitical',
  FINANCIAL = 'financial',
  CLIMATE = 'climate',
  AVIATION = 'aviation',
  SPACE = 'space',
  CYBER = 'cyber',
  HEALTH = 'health',
  MILITARY = 'military',
  HUMANITARIAN = 'humanitarian',
  ENERGY = 'energy',
  TRANSPORT = 'transport',
  MARITIME = 'maritime'
}
```

Each domain has:

* Dedicated data sources
* Specific entity types
* Custom visualization layers
* Independent phase rollout (Phase 1-3)

#### 2.2.2 CQRS-Lite Pattern

The architecture implements a lightweight Command Query Responsibility Segregation:

* **Query Side:** Next.js App Router with SWR for data fetching
* **Command Side:** Go backend handles all write operations
* **Event Sourcing:** PostgreSQL with logical replication for audit trails

**CRITICAL:** AI agents must NOT introduce direct database writes from the frontend. All mutations MUST go through the Go backend API.

#### 2.2.3 Layered Architecture

```plaintext
┌─────────────────────────────────────┐
│          Presentation Layer         │
│    (Next.js Components + HUD)       │
│─────────────────────────────────────│
│          Application Layer          │
│    (SWR Hooks + Zustand Stores)     │
│─────────────────────────────────────│
│          Domain Layer               │
│    (Data Pipeline + Correlation)    │
│─────────────────────────────────────│
│          Infrastructure Layer       │
│    (Go Backend + PostgreSQL+PostGIS)│
└─────────────────────────────────────┘
```

## 3. TECHNOLOGY STACK SPECIFICATION

### 3.1 Frontend Stack

| Technology | Version | Purpose | Critical Notes |
| :--- | :--- | :--- | :--- |
| Next.js | 16.2.6 | App framework | App Router only, no Pages Router |
| React | 19.2.4 | UI library | React 19 features enabled (use() hook, actions) |
| TypeScript | 5.7+ | Type system | Strict mode enabled, no implicit any |
| TailwindCSS | 4.x | Styling | Utility-first, custom config in tailwind.config.ts |
| MapLibre GL | 4.x | Map rendering | WebGL-based, requires careful memory management |
| Zustand | 4.5+ | State management | With subscribeWithSelector middleware |
| SWR | 2.4+ | Data fetching | Configured with aggressive caching |
| Lucide React | Latest | Icons | Consistent iconography |

### 3.2 Backend Stack

| Technology | Version | Purpose | Critical Notes |
| :--- | :--- | :--- | :--- |
| Go | 1.22 | Runtime | Use generics, context propagation mandatory |
| chi/v5 | 5.x | HTTP router | Middleware chain pattern |
| pgx/v5 | 5.x | PostgreSQL driver | Connection pooling required |
| PostGIS | 3.4 | Spatial extensions | All geo queries must use ST_* functions |
| Docker | 24+ | Containerization | Multi-stage builds for optimization |

### 3.3 Database Schema

**PostgreSQL 16 with PostGIS 3.4**  
Key tables (simplified):

```sql
-- Core events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
    location GEOGRAPHY(POINT, 4326),
    properties JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    source_id VARCHAR(100),
    correlation_id UUID
);

-- Spatial index for proximity queries
CREATE INDEX idx_events_location ON events USING GIST (location);

-- Domain-specific indexes
CREATE INDEX idx_events_domain_created ON events (domain, created_at DESC);
CREATE INDEX idx_events_severity ON events (severity) WHERE severity >= 4;
```

**CRITICAL FOR AI AGENTS:**

* All location queries MUST use PostGIS functions (ST_DWithin, ST_Distance, etc.)
* Never perform distance calculations in application code
* Always use geography type (not geometry) for global accuracy

### 3.4 Build & Development Tools

| Tool | Purpose | Configuration File |
| :--- | :--- | :--- |
| Turborepo | Monorepo build orchestration | turbo.json |
| PNPM | Package management | pnpm-workspace.yaml |
| ESLint | Code linting | .eslintrc.json |
| Prettier | Code formatting | .prettierrc |
| Go Modules | Dependency management | go.mod |
| Docker Compose | Local environment | docker-compose.yml |

## 4. CRITICAL ARCHITECTURAL CONSTRAINTS

### 4.1 Single Source of Truth for Algorithms

**CONSTRAINT:** Mathematical and algorithmic logic MUST exist in exactly ONE location.  
**Current Violation:** Satellite orbital propagation is implemented identically in:

* /workspace/apps/backend/pkg/ingestion/space.go (lines 242-313)
* /workspace/packages/data-pipeline/src/sources/space.ts (lines 259-300)

**Algorithm Details (Keplerian Propagation):**

```go
// Go implementation (AUTHORITATIVE)
meanAnomaly := (angularSpeed * nowFloat) + phaseOffset
lat := inclination * math.Sin(meanAnomaly)
lon := (rightAscension - earthRotation*nowFloat) + argumentPerigee
```

```typescript
// TypeScript implementation (DUPLICATE - TO BE REMOVED)
const meanAnomaly = (angularSpeed * nowFloat) + phaseOffset
const lat = inclination * Math.sin(meanAnomaly)
const lon = (rightAscension - earthRotation * nowFloat) + argumentPerigee
```

**Directive for AI Agents:**

* When modifying satellite propagation logic, ONLY edit the Go version
* Generate TypeScript types from Go structs using code generation
* Frontend should receive pre-calculated positions via API, never calculate locally
* If real-time client-side interpolation is needed, implement simplified LERP only, not full Keplerian mechanics

### 4.2 Backend-as-Proxy for CORS-Sensitive Sources

**CONSTRAINT:** All external API calls that may encounter CORS restrictions MUST be proxied through the Go backend.  
**Current Violation:** GDELT feed bypasses to mock data in browser:

```typescript
// packages/data-pipeline/src/sources/gdelt.ts
if (isBrowser) {
  return getMockGdeltEvents() // ← WRONG: Silent fallback to fake data
}
```

**Correct Pattern:**

```typescript
// packages/data-pipeline/src/sources/gdelt.ts
export async function fetchGdeltEvents(filter: string) {
  // ALWAYS call backend proxy
  const response = await fetch('/api/v1/geopolitical/gdelt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filter })
  })

  if (!response.ok) {
    throw new Error(`GDELT fetch failed: ${response.status}`)
  }

  return response.json()
}
```

```go
// apps/backend/pkg/api/handlers/gdelt.go
func (h *Handler) GetGdeltEvents(w http.ResponseWriter, r *http.Request) {
    // Backend makes server-to-server call (no CORS issues)
    events, err := h.gdeltService.FetchEvents(r.Context(), filter)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadGateway)
        return
    }

    encodeJSON(w, events)
}
```

**Directive for AI Agents:**

* NEVER implement browser-side fetches to external APIs without backend proxy
* ALWAYS propagate errors to the UI instead of silent fallbacks
* Add metadata to responses indicating data freshness and source reliability

### 4.3 Polling Frequency Limits

**CONSTRAINT:** Client-side polling intervals MUST respect sustainable limits.  
**Current Violation:** Aggressive polling in /workspace/apps/web/app/page.tsx:

```typescript
// PROBLEMATIC: 15-second interval for multiple data sources
const pollingInterval = setInterval(async () => {
  await Promise.all([
    mutate(['satellites']),
    mutate(['aircraft']),
    mutate(['earthquakes']),
    mutate(['gdelt-events-core']),
    mutate(['cyber-threats']),
    mutate(['financial-indicators']),
    mutate(['gdelt-events-core', 'protest'])
  ])
}, 15000) // 15 seconds = 240 requests/hour per client
```

**Mathematical Impact:**

* 7 data sources × 4 times/minute = 28 requests/minute per client
* 28 × 60 = 1,680 requests/hour per client
* With 100 concurrent users: 168,000 requests/hour
* With 1,000 concurrent users: 1.68M requests/hour (UNSUSTAINABLE)

**Directive for AI Agents:**

* Default polling interval: 60 seconds for non-critical feeds
* Critical feeds (severity ≥ 4): 30 seconds maximum
* Implement exponential backoff on errors
* PRIORITY: Migrate to WebSocket-based push architecture
* When generating new polling code, ALWAYS include configuration for interval adjustment

**Recommended Intervals by Domain:**

| Domain | Standard Interval | Critical Interval | Justification |
| :--- | :--- | :--- | :--- |
| Space (Satellites) | 30s | 10s | High velocity objects |
| Aviation (Aircraft) | 30s | 10s | ADS-B update rates |
| Seismic (Earthquakes) | 120s | 30s | USGS feed latency |
| GDELT Events | 300s | 60s | Batch processing nature |
| Cyber Threats | 60s | 30s | Rapid threat evolution |
| Financial | 300s | 120s | Market data licensing limits |
| Climate | 600s | 300s | Slow-changing phenomena |

### 4.4 Type Safety Enforcement

**CONSTRAINT:** No implicit any types allowed without explicit TypeScript ignore comment and justification.  
**Enforcement Rules:**

1. All function parameters must have explicit types
2. All function return types must be declared
3. All state variables must be typed
4. API responses must use generated types from OpenAPI schema
5. Database query results must use sqlc-generated types (future state)

**Example Compliance:**

```typescript
// ✅ CORRECT: Fully typed
interface SatellitePosition {
  id: string
  name: string
  position: [number, number] // [longitude, latitude]
  altitude: number
  velocity: number
  timestamp: number
}

async function fetchSatellitePositions(): Promise<SatellitePosition[]> {
  const response = await fetch('/api/v1/space/satellites')
  if (!response.ok) {
    throw new Error(`Failed to fetch satellites: ${response.status}`)
  }
  return response.json() as Promise<SatellitePosition[]>
}

// ❌ INCORRECT: Implicit any
async function fetchSatellites() {
  const res = await fetch('/api/v1/space/satellites')
  return res.json() // ERROR: Return type is any[]
}
```

**Directive for AI Agents:**

* When generating TypeScript code, ALWAYS include explicit types
* If a type is genuinely unknown, use unknown (not any) and add type guards
* Generate TypeScript types from Go structs using swag or similar tools
* Never suppress TypeScript errors without documented justification

## 5. KNOWN TECHNICAL DEBT & ANTI-PATTERNS

### 5.1 Catalog of Technical Debt

| ID | Category | Severity | Location | Description | Remediation Effort |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TD-001 | Security | CRITICAL | docker-compose.yml | Hardcoded PostgreSQL password | 1 hour |
| TD-002 | Architecture | HIGH | space.go + space.ts | Duplicate satellite propagation logic | 4 hours |
| TD-003 | Data Integrity | HIGH | gdelt.ts | Silent fallback to mock data | 2 hours |
| TD-004 | Performance | HIGH | page.tsx | Unsustainable polling frequency | 8 hours |
| TD-005 | Security | HIGH | backend/cmd/main.go | No authentication middleware | 16 hours |
| TD-006 | Code Quality | MEDIUM | osint-store.ts | Unused Zustand store | 2 hours |
| TD-007 | Configuration | MEDIUM | layers.json | 20 placeholder climate layers | 1 hour |
| TD-008 | Error Handling | MEDIUM | Multiple files | Inconsistent error propagation | 8 hours |
| TD-009 | Testing | HIGH | Entire codebase | Zero integration tests | 40 hours |
| TD-010 | Documentation | MEDIUM | Root directory | No ADRs or architecture docs | 8 hours |

### 5.2 Anti-Patterns to Avoid

#### 5.2.1 Silent Failure with Mock Data

**Pattern to Avoid:**

```typescript
try {
  return await fetchRealData()
} catch {
  return getMockData() // ← NEVER DO THIS
}
```

**Correct Pattern:**

```typescript
try {
  const data = await fetchRealData()
  return {
    data,
    metadata: { source: 'REAL', timestamp: Date.now(), confidence: 0.95 }
  }
} catch (error) {
  logger.error('Real data fetch failed', error)
  return {
    data: [],
    metadata: { source: 'UNAVAILABLE', error: error.message, confidence: 0.0 }
  }
}
```

#### 5.2.2 God Components

**Directive for AI Agents:**

* When refactoring, break down components > 300 lines
* Each component should have single responsibility
* Extract custom hooks for complex logic
* Use compound component pattern for complex UI structures

## 6. SECURITY POSTURE & VULNERABILITIES

### 6.1 Current Security Assessment

**Overall Rating:** CRITICAL RISK - NOT PRODUCTION READY

### 6.2 Identified Vulnerabilities

#### VULN-001: Hardcoded Database Credentials

**Location:** /workspace/docker-compose.yml  
**Remediation:** Use environment variable substitution (${POSTGRES_PASSWORD:?Error...}).  
**Directive for AI Agents:** NEVER generate code with hardcoded secrets.

#### VULN-002: Missing Authentication & Authorization

**Location:** /workspace/apps/backend/cmd/main.go  
**Remediation:** Implement JWT and RBAC middleware chains.  
**Directive for AI Agents:** When adding new endpoints, ALWAYS include auth middleware.

#### VULN-003: SQL Injection Risk (Potential)

**Remediation:** Use parameterized queries and strict whitelisting for ORDER BY clauses.  
**Directive for AI Agents:** NEVER interpolate user input directly into SQL queries.

### 6.3 Security Checklist for New Features

Before merging any new feature, verify:

* [ ] No hardcoded credentials or secrets
* [ ] Authentication required for all endpoints
* [ ] Authorization checks for sensitive operations
* [ ] Input validation on all user-provided data
* [ ] SQL queries are parameterized

## 7. DATA FLOW & INTEGRITY GUARANTEES

### 7.1 Data Lifecycle

External OSINT Sources ➔ Backend Ingestion Pipeline ➔ PostgreSQL/PostGIS ➔ Correlation Engine ➔ Frontend (Next.js)

### 7.2 Mock Data Transparency

**CRITICAL REQUIREMENT:** Any use of mock/simulated data MUST be explicitly indicated.  
**Directive for AI Agents:**

* NEVER hide the fact that data is simulated.
* ALWAYS provide metadata about data sources and visually indicate it in the UI.

## 8. PERFORMANCE CHARACTERISTICS & BOTTLENECKS

### 8.1 Identified Bottlenecks

#### 8.1.1 Frontend Bottlenecks

**Issue:** Excessive re-renders due to SWR mutation strategy.  
**Solution:** Selective updates with focus tracking. Only poll visible domains based on useFilterStore.getState().activeDomains.

#### 8.1.2 Backend Bottlenecks

**Issue:** N+1 query problem in event correlation.  
**Solution:** Single query with LEFT JOIN on correlations.

### 8.2 Performance Budget

**Directive for AI Agents:**

* Bundle Size (JS) must be < 500KB. Fail builds if exceeded.
* Prefer lazy loading for non-critical components.
* Use React.memo() for expensive map marker rendering.

## 9. DOMAIN-SPECIFIC IMPLEMENTATION DETAILS

### 9.1 Space Domain (Satellite Tracking)

**Data Sources:** Celestrak TLE feeds, Space-Track.org API.  
**Algorithm:** SGP4-lite implementation.  
**Directive for AI Agents:** NEVER modify propagation algorithm without domain expert review. Preserve float64 numerical precision.

### 9.2 Geopolitical Domain (GDELT Integration)

**Data Sources:** GDELT Global Knowledge Graph.  
**Integration Requirements:** Real-time stream parsing, correlation algorithms for mapping causal links (e.g., protest triggers within 500km and 7 days).

## 10. MACHINE-TO-MACHINE (M2M) & OPERATIONAL DIRECTIVES

### 10.1 File Mutation & AST Constraints

The Antigravity environment provides direct access to the file system. To avoid catastrophic regressions:

* **NO FULL REWRITES:** Do NOT replace entire files of >100 lines just to change a single function. Use structured regex or AST manipulation tools to patch specific portions of code.
* **PRESERVE IMPORTS:** When writing new Go or TS files, the import block must ALWAYS be formatted via the LSP, or by invoking goimports and prettier post-modification.

### 10.2 Strict Context Handling (Memory Hygiene)

Given the vastness of the monorepo (12 intelligence domains), agents run the risk of Context Window saturation.

* **Synthesis:** Never read apps/web/app/page.tsx together with apps/backend/pkg/ingestion/space.go unless strictly necessary for an end-to-end trace.
* **Isolation:** When working on a React component, load into context ONLY the Props, the relevant SWR Hook, and necessary CSS tokens. Ignore the DB implementation.

### 10.3 Automated Technical Debt Remediation Protocol

When encountering known technical debts (see Table 5.1), apply the following remediation protocol strictly:

```typescript
// AGENT INSTRUCTION EXAMPLE (Operational Pseudocode)
if (Task.Intent === "Refactor_Polling") {
    1. Locate the setInterval blocks in `apps/web`.
    2. Replace the abstraction with a Server-Sent Events (SSE) or WebSocket approach.
    3. IF WebSocket is not practical, implement Exponential Backoff SWR using this EXACT schema:
       ```typescript
       useSWR(key, fetcher, {
           errorRetryCount: 3,
           errorRetryInterval: 5000,
           refreshInterval: (data) => (data?.severity >= 4 ? 10000 : 60000)
       })
       ```
}
```

### 10.4 The CI/CD Agentic Handshake

When an agent completes a feature, it must prepare the simulated MR (Merge Request) for the Review agent (SECOPS_AGENT).  
The commit message MUST be machine-parsable:

```plaintext
[DOMAIN]: <intelligence_domain>
[TYPE]: feat|fix|refactor|sec
[BLAST_RADIUS]: <list_of_affected_workspaces>
[AI_CONFIDENCE_SCORE]: 0.0-1.0
[SUMMARY]: ...
[SECURITY_CHECK]: PASS/FAIL (details if the agent used overrides)
```

If [AI_CONFIDENCE_SCORE] is < 0.8, the agent MUST insert TODO: HUMAN_REVIEW tags in the code.

### 10.5 Code Generation Principles (The Panopticon Way)

1. **Explicit Over Implicit:** Always declare types explicitly. Never rely on type inference for public APIs.
2. **Fail Fast, Fail Loud:** Throw errors early when invariants are violated. Never silently swallow exceptions.
3. **Defensive Programming:** Validate all inputs at system boundaries. Handle edge cases before happy paths.
4. **Observability First:** Log all significant events with structured logging including trace IDs.
5. **Security by Default:** Authenticate before authorizing.

### 10.6 Refactoring Guidelines

**When to Refactor:** Functions > 50 lines, components with > 3 responsibilities, duplicate code in 3+ locations.  
**Process:** Write characterization tests -> Make small changes -> Run full test suite -> Measure impact.  
**Forbidden:** NEVER change public API signatures without a deprecation period. NEVER optimize prematurely.

### 10.7 Debugging Guidelines

* Map not rendering? Verify MapLibre API keys and container dimensions.
* SWR stale data? Adjust refresh intervals or check focus configuration.
* Go pool exhaustion? Check db.Stats(), fix connection leaks, or increase pool size.

### 10.8 Testing Strategy

Maintain the Test Pyramid (70% Unit, 20% Integration, 10% E2E).  
**TypeScript Unit Tests:** Vitest + React Testing Library.  
**Go Integration Tests:** testcontainers-go + httptest.

## 11. CODE GENERATION STANDARDS

### 11.1 Naming Conventions

**TypeScript:**

* Types/Interfaces: PascalCase (SatellitePosition)
* Variables/Functions: camelCase (processEvent)
* Constants: UPPER_SNAKE_CASE (MAX_POLLING_INTERVAL)
* Files: kebab-case (event-processor.ts)

**Go:**

* Exported: PascalCase (ProcessEvent)
* Unexported: camelCase (calculateOrbit)
* Files: snake_case (satellite_tracker.go)

### 11.2 Comment Standards

**DO comment:** Public API documentation, complex algorithm explanations, security considerations.  
**DON'T comment:** Obvious variable declarations, "what" the code does (let code speak for itself).

### 11.3 Error Handling Patterns

* **TypeScript:** Use Custom Error classes extending Error (e.g., PanopticonError, DataSourceError).
* **Go:** Use struct-based custom errors mapping Code, Message, Cause, and Context. Implement Unwrap().

## 12. TESTING & VALIDATION REQUIREMENTS

### 12.1 Test Coverage Requirements

* Domain Logic: 90%
* API Handlers: 85%
* UI Components: 70%
* Utilities: 95%

### 12.2 Security Testing

**Automated Scanning:**

* Snyk for dependency vulnerabilities
* gitleaks for secret detection
* semgrep for code security patterns
* OWASP ZAP for DAST testing

## 13. DEPLOYMENT & ENVIRONMENT CONSTRAINTS

### 13.1 Infrastructure Requirements

**Production Specifications:**

* Frontend: 4 vCPU, 8GB RAM (auto-scale)
* Backend: 8 vCPU, 16GB RAM
* Database: 16 vCPU, 64GB RAM (primary + 2 read replicas, 500GB SSD)

### 13.2 Configuration Management

Required Environment Variables must be strictly validated at startup (e.g., DATABASE_URL, JWT_SECRET, API keys). If validation fails, the application must fast-fail.

### 13.3 Disaster Recovery

**Database Backups:** Continuous WAL archiving to S3, daily full backups (30 days), hourly incremental (7 days).  
**RTO:** < 4 hours | **RPO:** < 1 hour.

## 14. FUTURE ROADMAP & ARCHITECTURAL EVOLUTION

### 14.1 Short-Term Goals (Q3 2025)

* Implement JWT authentication and RBAC.
* Deploy HashiCorp Vault for secrets management.
* Eliminate all mock data fallbacks and implement data quality scoring.

### 14.2 Medium-Term Goals (Q4 2025 - Q1 2026)

* Migrate to microservices for independent scaling.
* Implement event sourcing with Apache Kafka + Flink.
* Multi-region deployment for redundancy.

### 14.3 Long-Term Vision (2026+)

* Predictive analytics for crisis forecasting.
* AI-assisted analyst workflows.
* Quantum-resistant cryptography.

## 15. APPENDIX: KEY FILE REFERENCES

### 15.1 Critical Files for Understanding

| File Path | Purpose | Priority |
| :--- | :--- | :--- |
| apps/web/app/page.tsx | Main dashboard component | 🔴 Critical |
| apps/backend/cmd/main.go | Backend entry point | 🔴 Critical |
| packages/core/src/types/osint.ts | Core type definitions | 🔴 Critical |
| packages/core/src/config/layers.json | Map layer configuration | 🟡 High |
| docker-compose.yml | Local development setup | 🔴 Critical |

### 15.2 Useful Commands

```bash
pnpm dev                  # Start all apps
pnpm dev --filter=web     # Start only frontend
pnpm test                 # Run all tests
go test ./...             # Run backend tests
docker-compose up -d postgres # Start Database
pnpm security:scan        # Run security audits
```

## DOCUMENT REVISION HISTORY

| Version | Date | Author | Changes |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2025-06-18 | Senior Developer | Initial comprehensive documentation |
| 2.0.0-M2M | 2025-06-25 | SecOps Architect | Antigravity Protocol Integration & M2M execution directives added |

## 16. APPENDIX B: SERVER-SIDE LLM INTEGRATION PROTOCOL

**CRITICAL CLASSIFICATION:** SECURITY DIRECTIVE FOR AI AGENTS

### 16.1 Environment State Notice

**CRITICAL INFORMATION FOR ALL AGENTS:** The Google Gemini API key has **ALREADY BEEN SECURELY PROVISIONED** by the human administrator. It is stored in the GitHub Repository Secrets and the server environment under the exact variable name: `GEMINI_API_KEY`. 

Agents MUST NOT attempt to create UI components to ask the user for this key, nor should they instruct the human to add it. It is already there.

### 16.2 Architectural Mandate: Purge of Client-Side API Keys (BYOK Ban)

The system MUST permanently abandon the Client-Side "Bring Your Own Key" (BYOK) model. Storing API keys in the browser is a critical vulnerability (XSS exposure) and violates Rule 4.2 (Backend-as-Proxy).

**Directives for `[FRONTEND_HUD_AGENT]` & `[SECOPS_AGENT]` (SEEK AND DESTROY):**

1. **ERADICATE** all UI input fields in `apps/web/components/layout/SettingsDrawer.tsx` (or anywhere else) that request the user to input a `geminiKey` or `claudeKey`.

2. **PURGE** all logic that reads, writes, or checks for `geminiKey` in the browser's `localStorage`.

3. **REFACTOR** `AiBriefConsole.tsx` (and any related AI tools) to make a clean, authenticated POST request to the Go backend API (e.g., `/api/v1/ai/generate-brief`). The frontend payload MUST ONLY contain the context data (news events, prompts), **NEVER** the API key.

### 16.3 Go Backend Proxy Implementation

The Go backend is the EXCLUSIVE guardian of the AI API keys. All AI interactions MUST occur server-to-server.

**Directives for `[ARCHITECT_AGENT]` and `[DATA_PIPELINE_AGENT]`:**

1. **Environment Read:** The backend MUST read the API key directly from the environment using `os.Getenv("GEMINI_API_KEY")`.

2. **Proxy Route:** Implement the AI endpoint in `apps/backend/pkg/api/handlers/ai.go`.

3. **Execution Flow:**

   - Verify user authentication via JWT.

   - Construct the final prompt server-side.

   - Inject the `GEMINI_API_KEY` into the Google Generative AI SDK client.

   - Execute the call to Gemini.

   - Return the generated text to the frontend.

### 16.4 Protection of Shared Free-Tier Resources

Because the system relies on a globally shared environment API key, the backend MUST implement strict safeguards to prevent account suspension due to quota limits or abuse.

**Implementation Requirements (Mandatory Code Pattern):**

```go
// AGENT INSTRUCTION (Go Middleware & Execution Logic)
func (h *AIHandler) GenerateBrief(w http.ResponseWriter, r *http.Request) {
    userID := auth.GetUserID(r.Context())
    
    // 1. RATE LIMITING: Prevent single-user/DDoS abuse
    if !h.rateLimiter.CheckAIQuota(userID) {
        http.Error(w, "AI quota exceeded. Please try again later.", http.StatusTooManyRequests)
        return
    }
    // 2. TIMEOUT PROTECTION: Context with strict timeout (e.g., 30s)
    ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
    defer cancel()
    // 3. EXECUTION: Call Gemini using the environment-loaded key
    // apiKey := os.Getenv("GEMINI_API_KEY") // Handled during client init
    response, err := h.geminiClient.GenerateText(ctx, promptData)
    if err != nil {
        log.Error("Gemini API failure", zap.Error(err))
        // SECURITY: NEVER leak raw Google API errors (e.g., "invalid key") to the client.
        http.Error(w, "AI service unavailable", http.StatusServiceUnavailable)
        return
    }
    // 4. AUDIT: Log metric for token usage monitoring
    metrics.RecordAITokenUsage(userID, response.TokensUsed)
    
    encodeJSON(w, response.Text)
}
```
