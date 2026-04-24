# Plugin Hooks — Registry Map

Canonical count: **16 handlers across 8 events** (see `hooks.json`).

## ✅ Active handlers (wired in `hooks.json`)

| Event | Handler file | Purpose |
|------|------|---------|
| SessionStart | `session-start.js` | Seed state.json, version-transition nudge, first-run welcome |
| SessionStart | `stale-claude-md-nudge.js` | Warn if project CLAUDE.md is >14 days stale |
| SessionStart | `post-compact-recovery.js` | Restore session context after a PreCompact cycle |
| SessionStart | `suggest-ticker.js` | Ambient intelligence — recommend one starred next step |
| UserPromptSubmit | `intent-classifier.js` | Match prompt against skill catalog, route when confident |
| UserPromptSubmit | `context-warning.js` | Warn when context window crosses 80% / 95% thresholds |
| UserPromptSubmit | `user-prompt-submit.js` | Generic prompt-submit dispatcher |
| PreToolUse | `cost-tracker.js` | Accumulate per-session tool-call cost |
| PreToolUse | `cost-ceiling-enforcer.js` | Block tool calls when session cost exceeds ceiling |
| PreToolUse | `secret-leak-guard.js` | Scan tool args for leaked secrets before they go out |
| PostToolUse | `knowledge-capture.js` | Capture tool observations to knowledge/ directory |
| Stop | `session-save.js` | Auto-save session state to sessions/active-session.json |
| Stop | `session-end.js` | Persist session summary to knowledge/ directory |
| Notification | `fleet-notify.js` | Append fleet agent events to notifications.jsonl |
| PreCompact | `pre-compact.js` | Block compaction if session is mid-critical-task |
| SubagentStop | `subagent-stop.js` | Track subagent cost aggregation per session |

## 🟡 Dormant files (not in `hooks.json`)

These `.js` files live in this directory but are **not registered** with any event yet. They exist as forward-looking scaffolding for events that aren't in the Claude Code plugin spec or aren't ready for production. Leaving them in-place (vs. moving to `experimental/`) keeps import paths stable if/when they get wired up.

| File | Intended event | Why dormant |
|------|---------------|-------------|
| `elicitation-logger.js` | `Elicitation` (not yet in spec) | Would log when Claude asks user for structured input via `AskUserQuestion`. Waiting for official event hook. |
| `elicitation-result-handler.js` | `ElicitationResult` (not yet in spec) | Would trigger on user's AskUserQuestion reply to route intent. Pair with above. |
| `permission-denied.js` | `PermissionDenied` (not yet in spec) | Would log denied tool calls for allowlist tuning. Already cleaned of tier-gating; safe to wire when supported. |
| `subagent-start-tracker.js` | `SubagentStart` (not yet in spec) | Would track subagent spawn → complement `subagent-stop.js`. Claude Code currently only fires SubagentStop. |

## 🔁 Adding a dormant file to `hooks.json`

When Claude Code's plugin spec adds one of the missing events (confirm via the official plugin manifest docs):

1. Add a new matcher/hook block in `hooks.json`:
   ```jsonc
   {
     "event": "PermissionDenied",
     "hooks": [
       { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/permission-denied.js" }
     ]
   }
   ```
2. Bump the **hook handlers count** claim in:
   - `README.md` — feature bullet + hero blockquote
   - `commander/cowork-plugin/README.md`
   - `CLAUDE.md` stats block
   - `SKILLS-INDEX.md`
   - `BIBLE.md` feature table
   - `mintlify-docs/introduction.mdx` card group + stats table
   - `mintlify-docs/plugin/hooks.mdx`
3. Verify `npm test` still green (the audit-counts gate may need updating if it reads hooks.json).
4. Update this README's table (move the file from Dormant to Active).

## 🧪 Testing a hook locally

```bash
# Pipe JSON input to the hook binary to simulate an event
echo '{"source":"test","message":"hello"}' | node commander/cowork-plugin/hooks/fleet-notify.js

# Check the side-effect file
tail -1 ~/.claude/commander/fleet/notifications.jsonl
```

Each hook prints a single-line JSON response to stdout. See individual files for response schemas.
