# /ccc-suggest — ambient involvement levels

The `hooks/suggest-ticker.js` UserPromptSubmit hook runs a lightweight pass on every user turn and records a `recommendedLevel` in the per-project state file (see [project-state.md](project-state.md)). The level decides how loudly a suggestion surfaces. Hooks cannot call AskUserQuestion; they inject instructions the model follows.

## Levels

| Level | Name | What surfaces | When the ticker picks it |
|---|---|---|---|
| 0 | Disabled | Nothing; ambient mode off | `CCC_SUGGEST_DISABLE=1` |
| 1 | Passive | Nothing shown; the pass is logged to `~/.claude/commander/suggest-log.jsonl` | No blockers, branch level with main, no open todos |
| 2 | Gentle nudge (default) | One line at the bottom of the response, only at HIGH confidence | Signals present, no blockers |
| 3 | Assertive | A recommendation card at the top: pick, confidence, reason, alternatives | A blocker exists (CI, tests or lint failing, security alerts), or the prompt asks for direction ("what next", "what should I do", "help me decide", "I'm stuck", "where do I start") |
| 4 | Autopilot | The top recommendation runs without a picker | Only when `CCC_SUGGEST_LEVEL=4` is set; never chosen automatically |

### Level 2 format

```
💡 **Suggested next:** /ccc-ship preflight — tests green, branch ahead, CHANGELOG staged. Ready to release?
```

A response that ignores the suggestion is fine; never repeat it as a nag.

### Level 3 format

```
┌─ 🎯 CC Commander suggests ─────────────────────┐
│ /ccc-review diff (HIGH confidence)             │
│ Why: 18 files changed, 0 test files touched,   │
│ and the branch is 3 commits ahead of main.     │
│ Alternatives: /ccc-ship preflight · /ccc-plan  │
└────────────────────────────────────────────────┘
```

The numbers in a real card come from the scan, never from this example.

### Level 4 constraints

All three must hold, or fall back to Level 3:

1. Confidence is HIGH.
2. The recommendation is read-only (analysis, review, preview). Anything that writes to disk, a remote, a tracker or the network always goes through a picker.
3. The user set `CCC_SUGGEST_LEVEL=4` (session-wide) or passed `--level=4 --force` this turn.

State the action in one line before running it, so the user can interrupt.

## Overrides

| Control | Effect |
|---|---|
| `CCC_SUGGEST_LEVEL=1..4` | Hard-locks the level for the session (read by the ticker) |
| `CCC_SUGGEST_DISABLE=1` | Disables ambient mode entirely (Level 0) |
| `/ccc-suggest --level=N --force` | One-turn override for an explicit run |
| `/ccc-suggest --history` | Shows the last 10 entries of `suggest-log.jsonl` and which were picked |
| `/ccc-suggest --tune` | AskUserQuestion flow to choose a preferred level; tells the user the `CCC_SUGGEST_LEVEL` value to set |

## Hook-bridge chips

When the ticker's confidence is high it injects an instruction to offer the top pick as AskUserQuestion chips once the user's request is finished. Render them exactly as the hook names them:

- Top suggestion: `[⭐ Run <skill>, Dismiss, /ccc-browse]`
- Isolation signal (`detectIsolationSignal`): `[⭐ Spawn as separate session, Keep here, Dismiss]` in Cowork via a spawn_task chip; in the CLI, suggest `/spawn quick <task>`. Never spawn without the user's go-ahead.

Never turn these into a typed-letter list. The ticker warns on the next turn if a reply offered choices as plain text.
