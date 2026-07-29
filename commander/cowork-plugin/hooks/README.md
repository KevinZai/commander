# Plugin Hooks — Registry Map

Canonical count: **44 handlers across 23 events** (see `hooks.json` — `commander/contract.json` carries the same numbers).

## ✅ Active handlers (wired in `hooks.json`)

Handler counts per event, rebuilt from `hooks.json`. A handler = one command entry; the same script may serve more than one event (e.g. `knowledge-capture.js`, `mission-control-feed.js`, `license-check.js`, `task-tracker.js`, `config-protection.js`).

| Event | Handler file | Matcher | Purpose |
|------|------|------|------|
| SessionStart | `orchestrator/session-start-orchestrator.js` | — | Single-process orchestrator — runs `_archive/session-start.js` (seed state.json, version-transition nudge, first-run welcome), `stale-claude-md-nudge.js`, `post-compact-recovery.js`, `fable-armed-nudge.js`, and `voice-injector.js` via one Node spawn |
| SessionStart | `license-check.js` | — | Explicit no-op kept as an anti-paywall tripwire — core is free forever |
| SessionStart | `git-truth.js` | — | Pillar 6 (truth over cache): opt-in best-effort `gh auth setup-git` refresh. Silent no-op unless `CCC_GIT_TRUTH=1` — swallows all errors, never blocks a session |
| SessionStart | `update-nudge.js` (async) | — | Compares installed plugin version against GitHub `main` (24h cache, offline-silent) and spells out the marketplace-update fix when newer |
| SessionStart | `console-autopen.js` (async) | — | v7.4.0 — asks the model to render the `/ccc-console` widget once, locally. Silent on CI / resume / already-nudged sessions / no telemetry. Off via `/ccc-console off`, `{"autoOpen": false}` in `~/.claude/commander/console.json`, or `CCC_NO_AUTOCONSOLE=1`. Never publishes |
| SessionEnd | `session-save.js` | — | Persist session state to sessions/active-session.json (moved off `Stop` in v5.1.0) |
| SessionEnd | `session-end.js` | — | Persist session summary to knowledge/ directory |
| UserPromptSubmit | `suggest-ticker.js` | — | Ambient intelligence — computes project-state signals and recommends one starred next step |
| UserPromptSubmit | `intent-classifier.js` | — | Match prompt against skill catalog, route when confident |
| UserPromptSubmit | `context-warning.js` | — | Warn when context window crosses 80% / 95% thresholds |
| UserPromptSubmit | `context-guard.js` | — | Context-budget guard companion to `context-warning.js` |
| UserPromptSubmit | `user-prompt-submit.js` | — | Generic prompt-submit dispatcher (logs promptLength + routing decision only — never raw prompt content) |
| UserPromptSubmit | `skill-runs-logger.js` (async) | — | Logs `/ccc-*` skill invocations so "most-used skill" analytics are real data (42nd handler, v6.8.2) |
| UserPromptExpansion | `prompt-expansion-guard.js` | — | Pass-through guard for prompt-expansion events |
| PreToolUse | `cost-tracker.js` (async) | `*` | Accumulate per-session tool-call cost |
| PreToolUse | `cost-ceiling-enforcer.js` | `*` | Block tool calls when session cost exceeds ceiling |
| PreToolUse | `secret-leak-guard.js` | `*` | Scan tool args for leaked secrets before they go out |
| PreToolUse | `config-protection.js` | `Edit\|Write\|MultiEdit` | Blocks modifications to linter/formatter config files |
| PreToolUse | `doc-file-warning.js` | `Write` | Warns when agents write ad-hoc scratch markdown (NOTES.md etc.) |
| PreToolUse | `git-push-reminder.js` | `Bash` | Passive reminder before `git push` suggesting a final review pass |
| PostToolUse | `knowledge-capture.js` | `*` | Capture tool observations to knowledge/ directory |
| PostToolUse | `mission-control-feed.js` (async) | `*` | Append tool events to the Mission Control event feed (never blocks) |
| PostToolUse | `console-log-warn.js` | `Edit\|Write\|MultiEdit` | Warns about `console.log` statements after JS/TS file edits |
| PostToolUse | `pr-link-notify.js` (async) | `Bash` | After `gh pr create` succeeds, surfaces the PR URL |
| PostToolUseFailure | `post-tool-failure-logger.js` (async) | `*` | Logs failed tool name and error for knowledge capture and debugging |
| PostToolBatch | `knowledge-capture.js` (async) | — | Batch-level knowledge capture after multi-tool sequences |
| Stop | `suggest-lightweight.js` | — | Lightweight end-of-turn suggestion pass |
| Stop | `clickability-watch.js` | — | Observes the last assistant message for AskUserQuestion clickability violations → `clickability-violations.jsonl` (telemetry only, never blocks) |
| StopFailure | `stop-failure-handler.js` | — | Logs API errors (rate_limit, billing, auth) for session diagnostics |
| Notification | `fleet-notify.js` (async) | — | Append fleet agent events to notifications.jsonl |
| PreCompact | `pre-compact.js` | — | Block compaction if session is mid-critical-task |
| PostCompact | `post-compact-recovery.js` | — | Restore session context after a compaction cycle (also runs at SessionStart via the orchestrator) |
| SubagentStart | `subagent-start-tracker.js` (async) | — | Logs sub-agent dispatch info (name, prompt, model, session) for observability |
| SubagentStop | `subagent-stop.js` | — | Track subagent cost aggregation per session |
| SubagentStop | `agent-run-logger.js` (async) | — | Logs completed agent runs for Mission Control roster telemetry |
| PermissionRequest | `permission-gate.js` | — | Permission-prompt relay (Codex Desktop only) |
| PermissionRequest | `mission-control-feed.js` (async) | — | Append permission events to the Mission Control event feed |
| Elicitation | `elicitation-logger.js` (async) | — | Logs elicitation request_id, prompt, and type for session observability |
| ElicitationResult | `elicitation-result-handler.js` (async) | — | Handles matched/cancelled/declined elicitation results |
| TaskCreated | `task-tracker.js` (async) | — | Logs background task start (id, status, subject, session) |
| TaskCompleted | `task-tracker.js` (async) | — | Logs background task completion + duration |
| ConfigChange | `config-protection.js` | — | Warns when protected config changes during an active session |
| InstructionsLoaded | `stale-claude-md-nudge.js` | — | Warn if project CLAUDE.md is >14 days stale (dual-mode: also runs at SessionStart via the orchestrator) |
| Setup | `license-check.js` | — | Same explicit no-op as SessionStart — one-time plugin initialization slot |

Every `.js` file in this directory is wired — either directly in `hooks.json` or through the SessionStart orchestrator's handler list (`fable-armed-nudge.js`, `voice-injector.js`, plus `_archive/session-start.js`). There are no dormant files.

## 🔁 Adding a new handler to `hooks.json`

1. Add a new matcher/hook block under the right event in `hooks.json`:
   ```jsonc
   {
     "matcher": "Bash",
     "hooks": [
       { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/my-new-hook.js\"" }
     ]
   }
   ```
   Always quote `${CLAUDE_PLUGIN_ROOT}` — Cowork Desktop installs under a path containing spaces, and an unquoted expansion word-splits and kills the hook. Timeouts are in **seconds**, not milliseconds.
2. Bump `hook_handlers` (and `lifecycle_hooks` if you added a new event) in `commander/contract.json` — the contract gate (`node scripts/check-product-contract.js --check`) propagates/validates the counts across README, CLAUDE.md, BIBLE, SKILLS-INDEX, and the Mintlify docs.
3. Update this README's table.
4. Verify: `node scripts/check-product-contract.js --check && node scripts/audit-counts.js --check && npm test`.

## 🚩 Environment flags

| Flag | Default | Effect |
|------|---------|--------|
| `CCC_GIT_TRUTH` | unset (off) | `git-truth.js` is a silent no-op unless set to `1`. When `1`, best-effort runs `gh auth setup-git` on SessionStart to refresh the git credential bridge — all errors swallowed, never blocks the session. |
| `CCC_FABLE_NUDGE_DISABLE` | unset (off) | Set to `1` to suppress the `fable-armed-nudge.js` status line at session start. |
| `CCC_NO_AUTOCONSOLE` | unset (off) | Set to `1` to suppress the `/ccc-console` auto-open nudge from `console-autopen.js`. |

## 🧪 Testing a hook locally

```bash
# Pipe JSON input to the hook binary to simulate an event
echo '{"source":"test","message":"hello"}' | node commander/cowork-plugin/hooks/fleet-notify.js

# Check the side-effect file
tail -1 ~/.claude/commander/fleet/notifications.jsonl
```

Each hook prints a single-line JSON response to stdout. See individual files for response schemas.
