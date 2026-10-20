# CC-324 slice 1: activity-source audit and status-bar rendering contract

Read-only audit. No dispatch, no messages, no code behavior change. Date: 2026-10-20.
Base: origin/main 1394a70.

## 1. What the status bar renders today

| Renderer | Agent-related output |
|---|---|
| `commander/status-line.js` | None. No agent, delegation or message segment. Segments: version, model, auth, ctx%, cost, session time, window remaining, cache, skill count, PERM, AUTO, loop, savings, cwd. |
| `lib/statusline.sh` | One segment: `⚡ <agent.name>` from the host stdin JSON (`.agent.name`, line ~326). This is the host's main-thread agent, not the set of running subagents. |

Not present anywhere in the repo: `ccc activity`, `ccc mode theater`, an "unread messages" source.

## 2. Activity sources (all under `~/.claude/commander/`)

| Source | Writer (hook event) | Row keys | Gives | Gap |
|---|---|---|---|---|
| `subagent-runs.jsonl` | `subagent-start-tracker.js` (SubagentStart) | ts, agent_name, agent_id, prompt (≤500, redacted), model, session_id | Start of each subagent; stable `agent_id` | `agent_name` often null; no end marker; no rotation |
| `agent-runs.jsonl` | `agent-run-logger.js` (SubagentStop) | ts, agent, agentId, sessionId, durationMs, in/out/cacheRead tokens, status, tokensAvailable | Completion, tokens, duration | Tokens may be null (`tokensAvailable:false`); rotates at 10MB |
| `analytics/subagent-costs.jsonl` | `subagent-stop.js` (SubagentStop) | per-session cost aggregation | Cost | Second SubagentStop writer; overlaps agent-runs |
| `mission-control/events.jsonl` | `mission-control-feed.js` (PostToolUse, PermissionRequest) | ts, session_id, source_app, type, tool, actor, subject, detail (≤200), status | `delegation` (Agent), `message` (SendMessage, outbound), `workflow`, `permission` | Delegation rows fire at tool-use time, not completion; messages are outbound only (no recipient inbox, so no "unread" count); rotates at 10MB |
| `tasks.jsonl` | `task-tracker.js` (TaskCreated/Completed) | ts, task_id, status, title, subject?, session_id? | Task lifecycle | Older rows lack session_id/subject |
| `fleet/teammates.jsonl` | `fleet-telemetry.js` (TeammateIdle) | timestamp, sessionId, teammate, agentId, team | Agent-team idle events | Idle only |
| `permission-state.json` | permission-gate hook | awaiting, ts (60s TTL) | PERM segment (already consumed) | n/a |

Existing consumer: `commander/cowork-plugin/lib/mission-control-snapshot.js` `joinAgents(starts, stops, nowMs)` pairs start to stop by `agent_id` (falls back to session + normalized name + time). `dashboard/lib/mission-model.js` has a TTL cache. Codex has mirrored copies under `cowork-plugin-codex/`.

Observed volume (this machine, sizes only): agent-runs 674KB, subagent-runs 551KB, tasks 18KB.

## 3. Findings

1. There is no cheap "active agents now" source. Deriving it means tailing and joining two jsonl files (up to MBs) on every status-line render. The status line runs frequently, so that is too heavy.
2. `agent_id` is the only reliable start/stop key; `agent_name` is frequently null, so the label needs a fallback.
3. "💬N unread" has no data source. Treat as out of scope until the inter-agent comms dependency (named in CC-324) exists.
4. Spawn/complete inline lines (`🤖 Dispatched…`, `✅ … completed`) can be produced from hook stdout, but that is a hook-output change, not part of this slice.
5. Two SubagentStop writers (agent-runs, subagent-costs) duplicate effort; not changed here.

## 4. Rendering contract (proposal)

Single new optional segment, inserted after the model segment, hidden when zero agents:

```
🤖<N> <label>(<phase>)·<label>(<phase>)
```

- N = count of active agents; list at most 3 labels, then `+K`.
- label = `agent_name` → normalized `subagent_type` → `agent` (never empty).
- phase = optional, omitted unless known; never invented.
- Active = a start row with no matching stop (by `agent_id`) and age < 30 min (stale guard, same idea as the 60s PERM TTL).
- Width: whole segment capped at 40 visible chars, truncating with `…`; drops entirely below 80 columns.
- No-color / `--json`: add `activeAgents: [{id,label,startedAt}]` to the existing `--json` object.

### Data path (recommended)

A single small state file `~/.claude/commander/active-agents.json` ({ts, agents:[{id,label,startedAt}]}), written by the SubagentStart/SubagentStop hooks (add on start, remove on stop, prune >30 min). The status line reads only this file (one stat plus one small read, errors swallowed, same pattern as `getPermissionState()`). No jsonl tailing at render time.

### Out of scope / later slices

- Slice 2: write `active-agents.json` from the two hooks plus a test.
- Slice 3: status-line segment plus golden test in `commander/tests/`.
- Later: inline spawn/complete lines, `ccc activity`, theater mode, unread (needs comms).
- Reuse of `joinAgents` for `ccc activity` (7-day feed) is the natural base.

## 5. Safety notes for implementers

Prompts are redacted and capped at the writers; the status line must read labels and ids only, never `prompt`/`detail`.
