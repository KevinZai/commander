# Dashboard React App — Archived 2026-04-26

## Why Archived

The React/Vite app was a UI prototype built before the vanilla server existed. It renders
demo data only — all data comes from `generateDemoData()` with no real HTTP backend.

The vanilla server (`dashboard/server.js` + `dashboard/public/`) reads real
`~/.claude/sessions/` data and is the canonical dashboard implementation.

**Decision doc:** `docs/dashboard-strategy-2026-04-26.md`

## Contents

- `react-src/` — React 18 source (App.jsx + 14 components + hooks + styles)
- `react-index.html` — Vite HTML entry point
- `vite.config.js` — Vite build configuration

## How to Revive

If you ever want to build a React UI layer on top of real data:

1. Restore: `cp -r dashboard/_archive/react-src dashboard/src`
2. Restore: `cp dashboard/_archive/react-index.html dashboard/index.html`
3. Restore: `cp dashboard/_archive/vite.config.js dashboard/vite.config.js`
4. Reinstall deps: add react, react-dom, recharts, date-fns, lucide-react, vite back to
   `dashboard/package.json`
5. Wire real data: replace `generateDemoData()` calls with `fetch('/api/sessions')` etc.

The component designs (AgentCard, CostChart, SkillRadar, SpawnTree, ActivityHeatmap, etc.)
are a useful UI reference for v0.2 vanilla enhancements.
