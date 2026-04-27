# CC Commander Local Dashboard Scope

## Summary

CC Commander needs a local browser dashboard that answers one question quickly: what is the system doing right now, and what has it been doing recently? The long-term dashboard should unify sessions, agent activity, skill usage, costs, Linear tickets, git activity, and gateway logs. The v0.1 MVP should stay deliberately small: a localhost-only server that lists Claude session temp files and lets Kevin inspect their contents in the browser.

The recommended v1 direction is vanilla HTML, CSS, and JavaScript served by a tiny Node `http` server. That keeps the first version dependency-free, easy to audit, and cheap to maintain. React or Vite can be reconsidered once the dashboard has enough interactive state, charts, and component reuse to justify a build step.

## Goals

- Provide a single local browser entry point for CC Commander activity.
- Replace ad-hoc shell-grep workflows for session inspection.
- Make the system easier to onboard by showing current and recent activity in one place.
- Keep v0.1 read-only, local-only, and dependency-free.
- Establish a route and data-source contract that can grow into analytics, cost, and fleet views.

## Non-Goals For v0.1

- No remote access or public hosting.
- No auth layer while the server binds only to loopback.
- No write APIs, job controls, process controls, or agent actions.
- No bundled database or ingestion pipeline.
- No React, Vite, Express, charting library, or build step.
- No attempt to normalize every future data source before the sessions proof works.

## Architecture

### Recommended v1 Stack

Use a dependency-free Node server plus static files:

- Backend: Node.js `http`, `fs`, `path`, `url`, and `os` standard libraries.
- Frontend: vanilla HTML, CSS, and JavaScript.
- Runtime: `node dashboard/server.js`.
- Build step: none.
- Package metadata: `dashboard/package.json` with only a Node engine requirement and convenience scripts.

This is the cheapest-to-maintain option for v1 because it avoids dependency drift, install time, bundler configuration, and frontend framework decisions before the product shape is proven. It also matches the security posture: local, read-only, inspectable.

### Alternative Later Stack

Vite and React become reasonable when v0.2+ needs:

- reusable route components,
- client-side routing,
- richer charts,
- shared dashboard state,
- virtualized large lists,
- complex filtering,
- optimistic UI or real-time interactions.

If that happens, the Node server can keep serving JSON APIs while Vite owns the frontend bundle. For v0.1, that would add maintenance cost without proving more of the dashboard concept.

### Backend

Run a Node `http` server on port `4690`, bound to `127.0.0.1` only.

Port registry check: `~/clawd/shared/PORT-REGISTRY.md` exists locally. Port `4690` is not listed as locked or reserved there as of this scope pass, while adjacent CC Commander services use `4680` and `4681`. v0.1 can propose `4690`; if Kevin accepts this as a durable service, the shared registry should be updated in a separate change.

Initial server routes:

- `GET /` serves `dashboard/public/index.html`.
- `GET /style.css` serves `dashboard/public/style.css`.
- `GET /api/sessions` returns session file metadata.
- `GET /api/sessions/:filename` returns one session file's text content.
- `GET /api/health` returns JSON health.
- `GET /health` may alias health for monitoring ergonomics.

The server should reject non-GET methods with `405 Method Not Allowed` and should never expose a write endpoint in v1.

### Data Sources

The full dashboard should eventually read from multiple local sources. Each source should degrade gracefully when missing, locked, or unavailable.

| Source | Purpose | v0.1 Status | Notes |
| --- | --- | --- | --- |
| `~/.claude/sessions/*.tmp` | Session list and raw detail view | Implemented first | Missing directory returns `[]`. File reads are restricted to safe `.tmp` basenames. |
| claude-mem database | Search across historical work and memory | v0.2+ | Prefer existing claude-mem APIs or read-only query path rather than direct DB coupling. |
| `commander-cli ccusage` | Cost and token spend | v0.2+ | Start with command execution and parsed JSON/text output if available. Cache briefly to avoid expensive polling. |
| Linear API | CC tickets, project status, task links | v0.2+ | Requires token handling through existing secret conventions. Do not send local session content to Linear. |
| `git log` | Recent repo activity | v0.2+ | Read-only shell command, scoped to known CC Commander repos. |
| `~/.openclaw/` | Gateway logs and local service activity | v0.2+ | Tail recent logs, parse timestamps, handle rotation and missing files. |

### Refresh Strategy

Use client polling every 5 seconds for v0.1. Polling is enough for session metadata and avoids holding open connections or designing event fanout early.

Future real-time options:

- v0.2 can keep polling but add per-source backoff and stale indicators.
- v2 can add Server-Sent Events for push updates from session watchers, cost refreshes, and agent fleet status.
- WebSockets are not needed until the dashboard supports interactive commands, which is out of scope for read-only v1.

### Error Handling

- Missing `~/.claude/sessions/` returns an empty session array.
- Missing individual session files return `404`.
- Unsafe filenames return `400`.
- Unexpected read errors return `500` with a generic JSON error.
- The UI should show empty, loading, and error states without crashing.

## Pages And Routes

These are the target product routes. v0.1 ships only the sessions-oriented single-page view plus health JSON.

### `/` Overview Dashboard

Purpose: default landing page for "what happened recently?"

Target widgets:

- last 24h activity heatmap,
- current session if any,
- top skills used,
- latest agent events,
- current cost snapshot,
- recent git commits.

v0.1 status: static shell with Sessions as the only wired view.

### `/sessions`

Purpose: list and inspect all CC session artifacts.

Target widgets:

- sortable session table,
- file detail panel,
- search within selected session,
- metadata summary,
- link to related memories or git activity when available.

v0.1 status: implemented in the single-page app by polling `GET /api/sessions` and reading `GET /api/sessions/:filename`.

### `/agents`

Purpose: show current agent fleet status.

Target widgets:

- parent to children tree,
- active, idle, blocked, and failed state,
- elapsed runtime,
- task title and branch,
- handoff/report links.

v0.1 status: planned.

### `/skills`

Purpose: show which skills are firing and where they add value.

Target widgets:

- most-used skills this week,
- skill usage by project,
- failed or missing skill attempts,
- trend over time.

v0.1 status: planned.

### `/cost`

Purpose: explain model spend across providers.

Target widgets:

- per-model spend,
- provider split for Anthropic, OpenAI, and Cerebras,
- cost trend graph,
- cache hit rate,
- per-session cost attribution.

v0.1 status: planned.

### `/health`

Purpose: JSON-only endpoint for local monitoring.

Target response:

```json
{
  "status": "ok",
  "uptime": 12.345,
  "version": "0.1.0"
}
```

v0.1 status: implemented as `GET /api/health`, with `GET /health` available as a monitoring alias.

## Data Privacy Contract

- Local-only by design.
- Bind to `127.0.0.1`, never `0.0.0.0`.
- No auth in v0.1 because the server is loopback-only.
- Read-only in v0.1; no `POST`, `PUT`, `PATCH`, or `DELETE` routes.
- Never send data to external services.
- Never upload session content to Linear, model providers, analytics tools, or hosted dashboards.
- Do not hardcode secrets, tokens, or API keys.
- Future Linear integration must use existing secret handling and should fetch ticket metadata only.
- Future remote access requires a separate threat model and explicit auth design.

## MVP v0.1 Feature List

Ship only the smallest useful proof:

- Sessions page listing files in `~/.claude/sessions/`.
- Sort sessions by modified time, newest first.
- Show each session file's name, modified time, and size.
- Click a session to view raw content.
- Refresh the list every 5 seconds.
- Health endpoint returning `{ "status": "ok", "uptime", "version" }`.
- Missing sessions directory returns `[]`, not an error.
- Server binds only to `127.0.0.1:4690`.
- No runtime dependencies.

Everything else belongs to v0.2+.

## v0.2+ Backlog

- Add route-level navigation for `/sessions`, `/agents`, `/skills`, `/cost`, and `/health`.
- Parse session files into structured turns, tools, skills, and timestamps.
- Add current session detection.
- Add activity heatmap for the last 24 hours.
- Add skill usage aggregation for the last week.
- Add `ccusage` integration and cost trend graph.
- Add git activity panel with branch, author, and commit message.
- Add claude-mem search integration.
- Add Linear ticket correlation for CC work.
- Add OpenClaw gateway log tailing from `~/.openclaw/`.
- Add SSE push updates if polling becomes too coarse.
- Add configurable data-source paths.
- Add a local-only launch helper or PM2 profile if Kevin wants this always available.

## Why This Matters

CC Commander already spans sessions, costs, agent state, memory, Linear, git history, and gateway logs. Today those signals are scattered across shell commands, temp files, logs, and external tools. A local dashboard gives Kevin and new users one place to answer basic operational questions:

- What is CC Commander doing?
- Which sessions are active or recent?
- Which agents are involved?
- Which skills are being used?
- What did this cost?
- Which ticket or repo activity does this relate to?

The MVP proves the browser workflow with the lowest-risk source: local session files. Once that works, the dashboard can grow source by source without committing early to a heavier app architecture.

## Open Questions For Kevin

1. Tech stack preference after v0.1: keep vanilla HTML/JS until complexity demands more, or move to Vite/React early?
2. Port preference: accept `4690`, or choose another port before adding it to the shared registry?
3. Should the dashboard auto-launch after `/ccc-doctor` passes?
4. Should this integrate with Mission Control in `tools/mission-control`, or remain a focused CC Commander local tool?

