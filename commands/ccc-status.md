---
name: status-updates
description: "Configure and manage periodic status update notifications via MCP channels"
usage: /status-updates [on|off|configure|now|status]
version: 1.3.0
---

# Status Updates — Progress Notification Manager

Managing status updates: **{{input}}**

## Subcommands

### `/status-updates on`

Enable status updates with current defaults:
1. Set `CC_STATUS_UPDATES=1`
2. Auto-detect available MCP channels (Slack > Discord > Email > Console)
3. Default interval: 30 minutes
4. Default level: brief
5. Confirm: "Status updates enabled — [channel] every [interval]m"

### `/status-updates off`

Disable status updates:
1. Set `CC_STATUS_UPDATES=0`
2. Clean up signal files: `rm -f /tmp/cc-status-*.signal`
3. Confirm: "Status updates disabled"

### `/status-updates configure`

Interactive configuration:
1. **Channel**: Which MCP channel to use?
   - Auto-detect available channels
   - List options: Slack, Discord, Email, Console
   - Let user pick
2. **Interval**: How often? (default: 30 minutes)
   - Options: 5, 10, 15, 30, 60 minutes
3. **Detail level**: Brief or detailed?
   - Brief: one-line summary
   - Detailed: full phase breakdown with stats
4. Apply settings and confirm

### `/status-updates now`

Send an immediate status update:
1. Read current session state from `/tmp/cc-status-{sessionId}.json`
2. Generate update using current detail level
3. Send via configured channel
4. Show what was sent

### `/status-updates status`

Show current configuration:

```
STATUS UPDATES: [ENABLED/DISABLED]
Channel:   [auto/slack/discord/email]
Interval:  [X] minutes
Level:     [brief/detailed]
Last sent: [time ago or "never"]
Next due:  [time from now]
Tool calls since last: [count]
Session duration: [Xm]
```

## Output

```
STATUS UPDATES: {{action}}
Channel:  [detected channel]
Interval: [minutes]
Level:    [brief/detailed]
State:    [ACTIVE/INACTIVE]
```
