# Hooks Status

## Active (wired in ~/.claude/settings.json)

| Hook | Event | Matcher |
|------|-------|---------|
| rtk-rewrite.sh | PreToolUse | Bash |
| paperclip-bridge.js | PostToolUse | Bash |
| auto-checkpoint.js | PostToolUse | Edit\|Write |
| cost-alert.js | PostToolUse | * |
| openclaw-adapter.js | PostToolUse | Edit\|Write\|Bash |
| pre-compact.js | PreCompact | * |
| openclaw-notify.js | Stop | * |
| memory-archive.js | Stop | * |

## Available but Not Wired (tested, ready to activate)

These hooks pass all tests (61/61) but are not in any settings.json:

| Hook | Purpose | Lines |
|------|---------|-------|
| auto-lessons.js | Extract lessons from corrections | 94 |
| auto-notify.js | Notification dispatch | 21 |
| careful-guard.js | Block destructive commands | 49 |
| claude-md-staleness.js | Check CLAUDE.md freshness | 90 |
| confidence-gate.js | Multi-file operation warning | 50 |
| context-guard.js | Context window monitoring | 71 |
| context-rot-monitor.js | Detect stale context | 120 |
| daily-improvement-scan.js | Scan for new techniques | 315 |
| linear-auto-track.js | Auto-track Linear issues | 67 |
| linear-phase-gate.js | Phase gate on Linear issues | 52 |
| linear-pr-link.js | Link PRs to Linear issues | 69 |
| openclaw-sync.js | Sync with OpenClaw gateway | 195 |
| pre-commit-verify.js | Verify before commits | 70 |
| preuse-logger.js | Log tool usage | 38 |
| rate-predictor.js | Rate limit prediction | 76 |
| session-coach.js | Periodic coaching nudges | 150 |
| session-end-verify.js | End-of-session checklist | 87 |
| self-verify.js | Incomplete work detection | 114 |
| status-checkin.js | Status check-in dispatch | 139 |
| status-reporter.js | Status report generation | 161 |
| vendor-update-notify.js | Vendor update alerts | 55 |

To activate a hook, add it to `~/.claude/settings.json` in the appropriate event section.
