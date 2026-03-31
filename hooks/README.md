# Hooks — CC Commander

## Overview

Hooks are lifecycle scripts that run automatically during Claude Code sessions. They fire at specific events (PreToolUse, PostToolUse, Stop) and can validate, log, or augment tool calls.

## Two Hook Configurations

| File | For | Hooks |
|------|-----|-------|
| `hooks.json` | Users with ECC installed | 34 hooks (15 kit-native + 19 ECC-inherited via `CLAUDE_PLUGIN_ROOT`) |
| `hooks-standalone.json` | Users WITHOUT ECC | 15 kit-native hooks only |

## Kit-Native Hooks (15)

### PreToolUse (3)

| Hook | File | Purpose |
|------|------|---------|
| Careful Guard | `careful-guard.js` | Block destructive commands (rm -rf, DROP TABLE, force push) |
| Pre-Commit Verify | `pre-commit-verify.js` | TypeScript check before git commit — blocks on tsc errors |
| Confidence Gate | `confidence-gate.js` | Warn on multi-file bash operations (sed -i on globs, find -exec) |

### PostToolUse (7)

| Hook | File | Purpose |
|------|------|---------|
| Auto Notify | `auto-notify.js` | Notifications on significant events |
| PreUse Logger | `preuse-logger.js` | Log tool usage for cost analysis |
| Context Guard | `context-guard.js` | Warn at ~70% context usage, auto-save session |
| Auto Checkpoint | `auto-checkpoint.js` | Git-stash checkpoint every 10 file edits |
| Cost Alert | `cost-alert.js` | Cost proxy alerts at ~$0.50 and ~$2.00 thresholds |
| Auto Lessons | `auto-lessons.js` | Capture errors and corrections to tasks/lessons.md |
| Rate Predictor | `rate-predictor.js` | Predict session duration from tool call rate |
| Self Verify | `self-verify.js` | Auto-verify file changes against stated intent, catch drift |

### PreCompact (1)

| Hook | File | Purpose |
|------|------|---------|
| Pre-Compact | `pre-compact.js` | Save session state and critical context before context compaction |

### Stop (3)

| Hook | File | Purpose |
|------|------|---------|
| Status Check-in | `status-checkin.js` | Session end status summary |
| Session End Verify | `session-end-verify.js` | Verify modified files, check for console.log |
| Session Coach | `session-coach.js` | Periodic coaching nudges (toggleable: `KZ_COACH_DISABLE=1`) |

## Important: careful-guard.js Limitations

The careful-guard hook is a **best-effort safety net**, not a security boundary. It uses regex pattern matching which can be bypassed. Always combine with:

1. `settings.json` deny list (e.g., `"deny": ["Bash(rm -rf:*)"]`)
2. OS-level file permissions
3. Code review processes

## Installation

The installer (`install.sh`) copies all hooks to `~/.claude/hooks/`. If you have ECC, use `hooks.json`. If not, rename `hooks-standalone.json` to the hooks key in your `settings.json`.

## Writing Custom Hooks

Hooks receive JSON on stdin and must output JSON to stdout. Exit code 2 blocks the tool call (PreToolUse only).

```javascript
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  // Your logic here
  console.log(data); // Pass through
});
```
