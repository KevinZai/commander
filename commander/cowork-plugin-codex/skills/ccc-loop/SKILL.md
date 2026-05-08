---
name: ccc-loop
description: "[C:meta] — Run any /ccc-* skill on a recurring interval via Claude Code's native /loop. Returns loop patterns and self-pacing guidance."
---

# /ccc-loop — Loop Integration Guide

**Claude Code 2.1.123+** ships a native `/loop` command that runs any prompt or skill on a recurring interval using `ScheduleWakeup` internally. Claude Code Desktop renders a "loop" tag in the UI automatically — CCC does not need to manage the loop lifecycle.

## Syntax

```
/loop [interval] <prompt-or-skill>
```

- `interval` — optional duration: `5m`, `30m`, `1h`, etc. Omit to let Claude self-pace.
- Interrupt anytime with `Ctrl+C` or the stop button in Cowork Desktop.

## Common /loop + CCC Patterns

| Loop command | What it does | Best for |
|---|---|---|
| `/loop 5m /ccc-doctor` | Plugin health check every 5 min | Monitoring during active dev |
| `/loop /ccc-review` | Self-paced branch audit, iterates until clean | Continuous code quality |
| `/loop 30m /ccc-tasks` | Task list refresh on a half-hour cadence | Long work sessions |
| `/loop /ccc-changelog` | Polls until a new release appears | Watching upstream deps |
| `/loop 1h /ccc-xray` | Periodic project health scorecard | Background quality gate |

## When NOT to use /loop

- One-off tasks (just run the skill directly)
- Destructive operations (`/ccc-deploy`, `/ccc-rollback`) — use `/ccc-ship` gate instead
- Skills that write files without idempotency guards — repeated writes will accumulate

## Stopping a loop

- **Cowork Desktop:** click the stop button in the loop tag at the bottom of the UI
- **Terminal:** `Ctrl+C`

## Status-line indicator

CCC's status-line shows `🔁` when `CLAUDE_LOOP_ACTIVE` is set by the runtime, so you can see at a glance that a loop is running.

## Tip

Pair `/loop` with `/ccc-suggest` off (`CCC_SUGGEST_MODE=off`) during tight monitor loops to suppress between-turn suggestion output.
