# CC Commander Dashboard

Local-only browser dashboard for inspecting live CC Commander session activity.
Vanilla HTML/JS/CSS — no framework, no build step, zero runtime dependencies.

## Quick Start

```sh
node dashboard/server.js
```

Open `http://127.0.0.1:4690/`.

The server binds to `127.0.0.1` only (never exposed to the network).

## Endpoints

- `GET /` — dashboard UI
- `GET /api/sessions` — lists `~/.claude/sessions/*.tmp` files sorted by modified time
- `GET /api/sessions/:filename` — returns one `.tmp` session file as text
- `GET /api/health` — returns `{ "status": "ok", "uptime", "version" }`
- `GET /health` — monitoring alias for the same health payload

All non-GET methods return `405`. Missing `~/.claude/sessions/` returns an empty array.

## Stack

| | |
|---|---|
| Server | `server.js` — Node.js `http` module, stdlib only |
| Frontend | `public/index.html` + `public/style.css` — vanilla JS |
| Port | 4690 (registered in `shared/PORT-REGISTRY.md`) |
| Dependencies | zero |
| Build step | none |

## Extend (v0.2 backlog)

- Parse session `.tmp` content into turns, tools, and cost per session
- Add route views for agents, skills, and cost
- Integrate `ccusage` for cost chart data
- Add `claude-mem` search
- Switch from polling to Server-Sent Events when push updates are needed

---

## Archived React App

The dashboard directory contains `_archive/` — a React 18 / Vite prototype built before
the vanilla server existed. It rendered demo data only and had no real backend.

Decision to retire it: `docs/dashboard-strategy-2026-04-26.md`.

To revive the React app, see `dashboard/_archive/README.md`.
