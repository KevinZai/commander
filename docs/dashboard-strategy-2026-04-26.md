# Dashboard Strategy Decision — 2026-04-26

Wave 5 IDEA-3 · Resolves React vs vanilla coexistence after W16 merge cascade.

## Decision

**PICK vanilla (W16 server) as the canonical dashboard. Retire the React app.**

The React app is all demo data — nothing wired to real CC Commander state.
The vanilla MVP is the only implementation reading live data from `~/.claude/sessions/`.
There is no coexistence ambiguity to manage: one is real, one is a prototype that predates it.

---

## Side-by-Side Capability Comparison

| Capability | React app (`src/` + Vite) | Vanilla MVP (`server.js` + `public/`) |
|---|---|---|
| **Live session data** | None — all `generateDemoData()` | Yes — polls `~/.claude/sessions/*.tmp` |
| **Real API backend** | None — Vite dev server only | Yes — Node `http` server, 4 routes |
| **Port** | Vite default (5173/4173) | 4690 (W16 spec) |
| **Zero-dependency install** | No — React 18, recharts, date-fns, lucide-react, Vite, 5 deps | Yes — stdlib only |
| **Build step required** | Yes (`npm run build`) | No (`node dashboard/server.js`) |
| **Line count (source)** | ~4,825 lines across 26 files | ~771 lines across 3 files (server.js 256, index.html 181, style.css 334) |
| **Components** | 16 React components (AgentCard, CostChart, SkillRadar, SpawnTree, ActivityHeatmap, AgentTimeline, ContextGauge, CostTracker, HistorySearch, LogStream, MetricsGrid, ProjectList, StatusBar, TaskProgress, TokenGauge, CostTracker) | 0 framework components — inline vanilla JS |
| **Theme support** | Yes — 3 themes (claude, matrix, oled) + random picker | No — single hardcoded dark theme |
| **Tabs / views** | Yes — Live / History / Analytics (all demo) | No — single sessions view |
| **Cost chart** | Yes — recharts, demo data | No |
| **Skill radar** | Yes — recharts, demo data | No |
| **Spawn tree** | Yes — demo data | No |
| **Activity heatmap** | Yes — demo data | No |
| **Session browser** | No — HistorySearch uses demo sessions array | Yes — real `.tmp` files, click to view raw content |
| **Security posture** | N/A — no server, no real data | Validated — path-traversal guard, 127.0.0.1 bind, 405 on non-GET |
| **Health endpoint** | No | Yes — `/api/health` + `/health` alias |
| **Responsive layout** | Yes | Yes — CSS grid with 880px breakpoint |
| **Serves W16 scope (live fleet view, session monitoring, port 4690)** | No | Yes |

---

## Why Vanilla Wins

### 1. It has the only real data pipeline
The React app calls `generateDemoData()` on a 5-second interval — no HTTP fetch, no server, no real sessions. It has never read a `.tmp` file. The vanilla server reads `~/.claude/sessions/` on every request. Real > polished-but-fake.

### 2. Maintenance burden is 6x lower
React app: 4,825 lines across 26 files, 5 npm dependencies (React, recharts, date-fns, lucide-react, plus devDeps Vite + @vitejs/plugin-react). Every `npm audit` flags that surface. Vanilla: 771 lines across 3 files, 0 npm dependencies, no build step. The W16 scope doc (`docs/dashboard-scope.md`) explicitly argued for vanilla until complexity justifies a build step — and that threshold has not been reached.

### 3. The React app's UI richness is not reachable without wiring real data first
Charts, radars, heatmaps, and spawn trees are only valuable when backed by live data. Building those in React before the data contract is proven inverts the correct sequence: prove the data contract with the simplest UI first, then add richness. The vanilla MVP follows that order. Spinning up React now would require designing real API routes AND a React component architecture in parallel — double the risk.

---

## What the Vanilla MVP Is Missing (v0.2 Backlog, Not Blockers)

These are gaps versus the React app's UI. None block the W16 scope.

- No cost chart (needs `ccusage` integration first)
- No agent fleet view (needs agent data source API first)
- No skill radar (needs session parse to extract skill events first)
- No activity heatmap (needs `~/.claude/sessions/` parse first)
- Only one nav item active (Sessions) — 5 planned routes are stubs

The React app has UI shells for all of these — but they render demo data, not real data. Those shells are not reusable without significant rework because they embed `generateDemoData()` calls and have no real fetch layer. Starting from the vanilla server's established route contract (sessions, health) and adding one real data source at a time is the correct build order.

---

## Migration Path (Retiring the React App)

**Estimated effort: 2–4 hours.**

1. Move `dashboard/src/` → `dashboard/_archive/src/` (do not delete — reference for UI patterns)
2. Move `dashboard/index.html` (React entry) and `dashboard/vite.config.js` → `dashboard/_archive/`
3. Remove React, recharts, date-fns, lucide-react from `dashboard/package.json`; keep only `"engines": { "node": ">=20" }` and convenience scripts
4. Update `dashboard/package.json` scripts to `"start": "node server.js"` and `"dev": "node server.js"`, remove `"build"` and `"preview"`
5. Update `dashboard/README.md` to remove Vite references
6. Register port 4690 in `~/clawd/shared/PORT-REGISTRY.md`

Do this in a single commit labeled `chore(dashboard): retire React/Vite app — vanilla MVP is canonical`.

The React component source in `_archive/` remains available as a UI pattern reference when v0.2 builds real chart views on top of live data.

---

## 3-Week Ship Plan (if keeping both — NOT RECOMMENDED)

> Listed for completeness. The recommendation is to drop React now, not maintain two parallel implementations.

| Week | Vanilla server | React app |
|---|---|---|
| 1 | Add session parse (turns, tools, cost per session) → `/api/sessions/:id/parsed` | Wire `HistorySearch` to real `/api/sessions` |
| 2 | Add `/api/cost` via `ccusage` | Wire `CostChart` + `CostTracker` to real `/api/cost` |
| 3 | Add `/api/agents` (parse worktree + git state) | Wire `AgentCard` + `SpawnTree` to real `/api/agents` |

**Risk:** two teams (or sequential sessions) maintain two surface areas, two debug paths, two HTML entry points, two package surfaces. A bug in the API contract shows up twice. Cognitive overhead doubles. Do not do this.

---

## Recommendation Summary

| | |
|---|---|
| **Decision** | PICK vanilla — retire React |
| **React fate** | Archive to `dashboard/_archive/` (not deleted) |
| **Vanilla next step** | Parse session `.tmp` content into turns/tools/cost → first real v0.2 feature |
| **Port** | Register 4690 in shared PORT-REGISTRY.md |
| **Migration effort** | 2–4 hours, 1 commit |
| **Risk** | Low — React app has zero users on real data |

The React app is a good design sketch. The vanilla server is the product. Build the product first.
