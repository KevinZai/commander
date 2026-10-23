---
name: status-updates
description: Send progress updates to Discord, Slack, or email at configurable intervals during long-running sessions
triggers:
  - "send me updates"
  - "notify me"
  - "ping me when done"
  - "status updates"
  - "send updates every"
  - "keep me posted"
  - "update me on progress"
model: sonnet
disable-model-invocation: false
---

# Status Updates — Progress Reporting via MCP Channels

Send periodic progress reports to Discord, Slack, email, or any MCP-connected channel during long-running Claude Code sessions.

## Overview

When working on extended tasks (overnight builds, large refactors, batch operations), you can ask Claude to send progress updates at regular intervals. Updates are delivered via whatever MCP channels are available in your environment.

## How It Works

```
You:    "Send me a Slack update every 30 minutes"
Claude: Sets CC_STATUS_UPDATES=1, CC_STATUS_INTERVAL=30, CC_STATUS_CHANNEL=slack

→ Every 30 minutes, the status-reporter hook fires
→ Claude detects the signal file and sends an update via Slack MCP
→ Update includes: current task, progress, cost, tools used
```

## Channel Detection

The skill auto-detects available MCP channels in this priority:

1. **Slack** — via `mcp__slack__slack_send_message` tool
2. **Discord** — via Discord MCP or webhook
3. **Email** — via `mcp__gmail__gmail_create_draft` tool
4. **Telegram** — via Telegram MCP
5. **Console** — fallback: prints to stderr

To specify a channel explicitly:
```
"Send updates to Discord every 15 minutes"
"Ping me on Slack when this finishes"
"Email me a summary when done"
```

## Configuration

| Setting | Env Var | Default | Description |
|---------|---------|---------|-------------|
| Enable | `CC_STATUS_UPDATES` | `0` | Set to `1` to enable |
| Interval | `CC_STATUS_INTERVAL` | `30` | Minutes between reports |
| Channel | `CC_STATUS_CHANNEL` | `auto` | Target: slack, discord, email, auto |
| Level | `CC_STATUS_LEVEL` | `brief` | Detail: brief, detailed |

## Update Templates

### Brief Update
```
CC Kit Status Update — 2:30 PM
━━━━━━━━━━━━━━━━━━━━
Task: Refactoring auth module
Progress: 65% (Phase 4/6)
Duration: 45m | Cost: \$0.82
Tools: 127 calls (Edit: 45, Read: 38, Bash: 24)
Next: Integration tests
```

### Detailed Update
```
CC Kit Status Update — 2:30 PM
━━━━━━━━━━━━━━━━━━━━
Task: Refactoring auth module
Progress: 65% (Phase 4 of 6: Implementing token refresh)

Completed:
  ✓ Phase 1: Audit existing auth (12m)
  ✓ Phase 2: Write failing tests (8m)
  ✓ Phase 3: Implement JWT validation (15m)
  → Phase 4: Token refresh logic (in progress, 10m)
  ○ Phase 5: Integration tests
  ○ Phase 6: Documentation

Session Stats:
  Duration: 45m | Cost: \$0.82 | Context: 62%
  Tools: 127 calls | Files modified: 8 | Tests: 12 passing

Recent Activity:
  - Modified src/auth/token-refresh.ts
  - Added test for expired token handling
  - Fixed race condition in session cleanup
```

### Completion Notification
```
CC Kit — Task Complete ✓
━━━━━━━━━━━━━━━━━━━━
Task: Refactoring auth module
Result: SUCCESS
Duration: 1h 12m | Cost: \$1.45
Files: 12 modified, 3 created
Tests: 24 passing, 0 failing
Commit: feat: implement JWT token refresh with auto-renewal
```

### Error Alert
```
CC Kit — Error Alert ⚠
━━━━━━━━━━━━━━━━━━━━
Task: Refactoring auth module
Status: BLOCKED
Error: Build failed — TypeScript error in src/auth/types.ts:42
Details: Type 'string' is not assignable to type 'TokenPayload'
Action: Needs manual review
Duration: 52m | Cost: \$1.12
```

## Integration

### With Hooks
The `status-reporter.js` PostToolUse hook runs after every tool call:
1. Tracks tool call count, types, and timing
2. Checks if the reporting interval has elapsed
3. If due: writes a signal file that the skill picks up
4. The skill generates and sends the appropriate update

### With Other Skills
- **confidence-check**: Include confidence level in updates
- **cost-alert**: Escalate if cost ceiling is approaching
- **context-guard**: Include context usage in updates

## Examples

```
"Keep me posted every 15 minutes on Slack"
"Send detailed Discord updates every hour"
"Ping me when you're done with this task"
"Send a brief email update every 30 minutes"
"Notify me if you hit any errors"
```

## Command

Use `/status-updates` for quick control:
- `/status-updates on` — Enable with defaults
- `/status-updates off` — Disable
- `/status-updates configure` — Interactive setup
- `/status-updates now` — Send immediate update
- `/status-updates status` — Show current config
