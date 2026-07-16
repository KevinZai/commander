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
- `GET /mission-control` — Mission Control UI (see below)
- `GET /api/sessions` — lists `~/.claude/sessions/*.tmp` files sorted by modified time
- `GET /api/sessions/:filename` — returns one `.tmp` session file as text
- `GET /api/mission` — unified mission model: `{ agents, tasks, edges, events, summary, generatedAt }`
- `GET /api/mission/events?after=<iso>` — mission events newer than the `after` timestamp
- `GET /api/health` — returns `{ "status": "ok", "uptime", "version" }`
- `GET /health` — monitoring alias for the same health payload

All non-GET methods return `405`. Missing `~/.claude/sessions/` returns an empty array.

## Mission Control

`http://127.0.0.1:4690/mission-control` — a plain-English view of your agent fleet,
built for non-coders. It answers "who's working on what right now?" without any
terminal knowledge.

Four live panels, refreshed every 2 seconds:

- 🤖 **Agent Roster** — one card per agent run: pulsing green = working,
  gray = finished, red = hit a problem, plus model, duration, and token counts
- 🔀 **Delegation Flow** — an inline SVG map of session → agent → task hand-offs
- 📋 **Task Board** — waiting / in progress / completed columns
- 📡 **Live Feed** — newest-first event stream ("reviewer finished after 3m")

The big summary bar at the top reads like a sentence:
`2 agents working — reviewer (3m), builder (1m). 4 tasks: 1 in progress, 2 done, 1 waiting.`

Data comes from the Commander plugin hook logs under `~/.claude/commander/`
(`subagent-runs.jsonl`, `agent-runs.jsonl`, `tasks.jsonl`,
`mission-control/events.jsonl`). The read model lives in `lib/mission-model.js` —
zero dependencies, read-only, fail-open (missing files → empty panels, bad lines
skipped). No build step, no external assets: everything works offline and never
leaves 127.0.0.1. Dark theme by default, light theme via `prefers-color-scheme`.

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
