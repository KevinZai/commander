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
- `GET /api/mission` — unified mission model: `{ agents, tasks, edges, events, suggestions, summary, generatedAt }`
- `GET /api/mission/events?after=<iso>` — mission events newer than the `after` timestamp
- `GET /api/mission/filter-options` — `{ agents, types, sessions, sourceApps }` for the Live Feed filter bar
- `GET /api/suggestions` — `{ suggestions }`, the proactive ideas queue (see below)
- `GET /api/metrics` — `{ metrics, generatedAt }`, the daily `(date, source_app)` rollup (see below)
- `GET /api/top-skills` — `{ topSkills, generatedAt }`, `{skill, runs7d, runs30d, bySource}` rows from `~/.claude/commander/skill-runs.jsonl`
- `GET /api/history?after=<epochMs>` — `{ history, generatedAt }`, the claude-mem History panel feed (see below); `[]` when claude-mem isn't installed
- `GET /charts.js` — serves `commander/cowork-plugin/lib/charts.js` verbatim (the zero-dep `sparkline`/`barStrip` builders) so the browser can `import` the exact same module the snapshot artifact renders server-side
- `GET /api/health` — returns `{ "status": "ok", "uptime", "version" }`
- `GET /health` — monitoring alias for the same health payload

All non-GET methods return `405`. Missing `~/.claude/sessions/` returns an empty array.

## Mission Control

`http://127.0.0.1:4690/mission-control` — a plain-English view of your agent fleet,
built for non-coders. It answers "who's working on what right now?" without any
terminal knowledge.

A Charts strip (cost/day, agents dispatched/day, tasks completed/week, tool
failures/day) sits above the grid, always visible — a machine with no signal
yet still renders 4 clean zero-state charts, never a broken axis. Below it,
six live panels, refreshed every 2 seconds:

- 🤖 **Agent Roster** — one card per agent run: pulsing green = working,
  gray = finished, red = hit a problem, plus model, duration, token counts, a
  small source pill (which app produced the run — `claude-code` by default),
  and — for roster rows synthesized from a delegation event rather than a
  real start record (Codex work, see below) — a dimmed "inferred" badge with
  a tooltip, since those rows carry no real token/cost data
- 🔀 **Delegation Flow** — an inline SVG map of session → agent → task hand-offs
- 📋 **Task Board** — waiting / in progress / completed columns
- 📡 **Live Feed** — newest-first event stream ("reviewer finished after 3m"),
  filterable by agent, activity type, and source app
- 💡 **Suggestions** — proactive ideas any agent has surfaced, filterable by
  status (new / promoted / dismissed)
- 🧠 **History** — a read-only claude-mem timeline (discoveries, fixes,
  decisions...). Opt-in: hidden entirely on a machine without claude-mem
  installed

The big summary bar at the top reads like a sentence:
`2 agents working — reviewer (3m), builder (1m). 4 tasks: 1 in progress, 2 done, 1 waiting.`

Data comes from the Commander plugin hook logs under `~/.claude/commander/`
(`subagent-runs.jsonl`, `agent-runs.jsonl`, `tasks.jsonl`,
`mission-control/events.jsonl`, `mission-control/suggestions.jsonl`,
`mission-control/metrics.jsonl`, `skill-runs.jsonl`) plus, for History,
`~/.claude-mem/claude-mem.db`. The read model lives in `lib/mission-model.js`
— zero dependencies, read-only, fail-open (missing files → empty panels, bad
lines skipped). No build step, no external assets: everything works offline
and never leaves 127.0.0.1. Dark theme by default, light theme via
`prefers-color-scheme`.

### Complete Claude + Codex roster (derived rows)

Codex Desktop's hook surface drops `SubagentStart`/`SubagentStop` (and
`TaskCreated`/`TaskCompleted`), so `subagent-runs.jsonl`/`agent-runs.jsonl`
are always `claude-code` — Codex work would otherwise show up in the Live
Feed but never the Agent Roster. `deriveRosterFromDelegations()` (in
`lib/mission-model.js`, mirrored in the plugin's snapshot renderer)
synthesizes a roster row from `mission-control/events.jsonl`'s delegation
entries for any `(sourceApp, name, sessionId)` combo that has no real start
record. A real start record for the same combo always wins — never a
duplicate. Derived rows have zero token/cost data and render with dimmed
gauges + an "inferred" tooltip rather than pretending to be a verified run.

### Charts strip

`commander/cowork-plugin/lib/charts.js` — zero-dependency inline-SVG
`sparkline`/`barStrip` builders, no DOM, no deps. One canonical file renders
BOTH this live dashboard (served to the browser at `GET /charts.js`, imported
as a native ES module by `public/mission-control.js`) and the CSP-safe
snapshot artifact (server-rendered, no `<script>`) — see that file's own doc
comment for why it lives in the plugin's `lib/` tree rather than
`dashboard/lib/`. Backed by `mission-control/metrics.jsonl`
(`lib/metrics.js`): a daily `(date, source_app)` rollup of cost (from
`ccusage claude daily --json` / `ccusage codex daily --json` — Claude +
Codex only), agents dispatched, tasks completed, and tool failures,
gap-filled across the window so a chart never draws a misleading flat line
across a day with no data.

### Suggestions feed

`mission-control/suggestions.jsonl` is an append-only log any agent can write
to via the plugin's `lib/suggestions.js` helpers — a proactive "you might want
to do X" idea for the user to promote (into a tracked ticket) or dismiss.
Two line shapes, merged latest-status-wins by `id`:

- creation: `{ id, ts, from, source_app, idea, evidence, proposed_ticket, status: "new" }`
- status change: `{ id, ts, status: "promoted" | "dismissed", promoted_ticket?, by }`

Ideas and evidence are redacted and length-capped on write; the log rotates at
10MB. See `/ccc-mission-control` → "Review & promote suggestions" for the
conversational triage flow.

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
