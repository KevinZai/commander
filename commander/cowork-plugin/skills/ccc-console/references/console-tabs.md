# Console tabs and their data

Every tab reads local files only. The builder is `scripts/build-console.mjs`; the model is `lib/console-model.js`; the published page renderer is `lib/console-render.js` (`buildDeckHtml`); the inline widget renderer is `lib/console-widget.js`.

| Tab | Shows | Reads | Published form |
|---|---|---|---|
| `overview` | agents working, sessions awaiting approval, task counts, delegation flow, suggestions | `subagent-runs.jsonl`, `agent-runs.jsonl`, `tasks.jsonl`, `mission-control/events.jsonl`, `mission-control/suggestions.jsonl` | yes (same page `/ccc-mission-control` publishes) |
| `usage` | estimated savings, dispatches, cost by app, saved/day and cost/day | `savings.json`, `mission-control/metrics.jsonl` | yes (`/ccc-usage`) |
| `safety` | blocked, auto-fixed and approved actions, tool-failure hotspots | `analytics/permission-gate.jsonl`, `tool-failures.jsonl` | yes (`/ccc-safety`) |
| `memory` | recent claude-mem observation titles and counts | `~/.claude-mem/claude-mem.db`, read-only | yes, with an extra consent line |
| `history` | the last 30 days: cost, dispatches, tasks, failures, top skills | `mission-control/metrics.jsonl` plus the detail logs | yes |
| `launch` | fixed chips for common Commander workflows | none | no (widget only) |

All paths above are under `<config dir>/commander/` (the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`) unless shown otherwise.

## Memory

- Optional. Most machines have no claude-mem store; the tab then shows one quiet "claude-mem not detected" card with install notes and why it is not bundled (AGPL-3.0 versus Commander's MIT).
- Reads only `id`, `project`, `type`, `title`, `created_at_epoch`. Never `text`, `facts` or `narrative`.
- Titles are redacted (secret patterns; home paths become `<home>`) and capped before rendering.

## History

- Backbone: `mission-control/metrics.jsonl`, durable per-day rollups (cost, dispatches, tasks, failures, sessions). It survives detail-log rotation and is the only source of cost.
- Detail for the last 30 days: `skill-runs.jsonl`, `tasks.jsonl`, `agent-runs.jsonl`, `subagent-runs.jsonl`, and `sessions/` stubs counted by filename only (their contents are never opened).
- A day with a rollup but no detail is honest: the detail aged out. An unreadable source is named in a muted footnote.

## Limits

- Only work journaled by Commander's hooks appears. Agents run without the plugin leave no trace.
- `agent-runs.jsonl` rotates at 10 MB, so old detail ages out.
- On Codex some panels are thin: failure hotspots, the agent roster and the savings hero are fed by Claude-side hooks.
- Usage figures are estimates against an all-Opus baseline, not a bill.
