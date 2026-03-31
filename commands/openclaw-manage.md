---
name: openclaw-manage
description: Manage OpenClaw agents, sessions, and gateway from within Claude Code
---

# /openclaw-manage

Manage the OpenClaw fleet directly from a Claude Code session.

## What It Does

Provides a command interface for common OpenClaw operations without leaving your Claude Code session.

## Sub-Commands

### Status

```
/openclaw-manage status
```

Shows gateway health, active agents, session counts, and resource usage.

### Agents

```
/openclaw-manage agents list          # List all agents
/openclaw-manage agents status <id>   # Agent health check
/openclaw-manage agents restart <id>  # Reset agent session
```

### Sessions

```
/openclaw-manage sessions list        # Active sessions
/openclaw-manage sessions send <agent> <message>  # Send message to agent
/openclaw-manage sessions cleanup     # Prune old sessions
```

### Health

```
/openclaw-manage health               # Full system health check
/openclaw-manage health --fix         # Auto-repair common issues
```

### Logs

```
/openclaw-manage logs                 # Recent gateway logs
/openclaw-manage logs <agent>         # Agent-specific logs
```

## Integration Notes

- Requires OpenClaw gateway running at localhost:18789
- Uses `openclaw` CLI under the hood
- Respects CLAUDE.md rules: never restarts gateway without approval
- Config changes route through Morpheus (architecture workspace)
