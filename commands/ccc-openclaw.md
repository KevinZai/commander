---
name: ccc-openclaw
description: "OpenClaw platform integration — status, sync, configure, health check, agent management"
usage: /openclaw [status|sync|configure|health|agents]
version: 1.3.0
---

# OpenClaw — Native Platform Integration

Managing OpenClaw integration: **{{input}}**

## Subcommands

### `/openclaw status`

Show OpenClaw gateway status and integration overview:

1. Probe gateway at configured URL (default: `http://localhost:18789/health`)
2. Report gateway status, version, uptime
3. Show connected agents and their status
4. Show synced skill count
5. Show active channels

```
OPENCLAW STATUS:
Gateway:   ● Online (v2026.3.24, uptime 4h 23m)
Agents:    38 registered, 12 active
Skills:    280 synced from Kit
Channels:  Discord ● Slack ● Telegram ● WhatsApp ●
Last sync: 2m ago
```

### `/openclaw sync`

Force synchronization of Kit skills and hooks with OpenClaw:

1. Discover all skills in `~/.claude/skills/`
2. Register each with OpenClaw skill registry
3. Register Kit hooks with OpenClaw webhook system
4. Sync workflow modes as agent profiles
5. Report results

```
OPENCLAW SYNC:
Skills:    280 synced (3 new, 1 updated)
Hooks:     18 registered
Modes:     9 agent profiles generated
Duration:  1.2s
```

### `/openclaw configure`

Interactive setup for OpenClaw integration:

1. **Gateway URL**: Enter URL or accept default (`http://localhost:18789`)
2. **Auto-sync**: Enable/disable automatic sync on session start
3. **Event forwarding**: Choose which Kit events to forward to OpenClaw
4. **Agent binding**: Map Kit modes to specific OpenClaw agents
5. Save to `bible-config.json`

### `/openclaw health`

Comprehensive health check:

1. Gateway connectivity and response time
2. Each channel status (Discord, Slack, Telegram, WhatsApp, BlueBubbles, WebChat)
3. Agent status (active, idle, error, last activity)
4. Memory DB health (size, last write, integrity)
5. Error log (last 5 errors)
6. Cost report (today's spend, budget remaining)

```
OPENCLAW HEALTH CHECK:
Gateway:    ● OK (12ms response)
Discord:    ● Connected (5 channels)
Slack:      ● Connected (3 workspaces)
Telegram:   ● Connected
WhatsApp:   ● Connected
Agents:     38/38 healthy
Memory:     965MB (OK)
Errors:     0 in last hour
Cost today: $2.15 / $10.00 limit
```

### `/openclaw agents`

List and manage OpenClaw agents:

1. Show all registered agents with status
2. Filter by workspace, status, model
3. Show agent details (current task, cost, session duration)

```
OPENCLAW AGENTS:
  Alfred 🎩    Sonnet  ● active   "Processing inbox"         $0.12
  Morpheus 💊  Opus    ○ idle     —                          $0.00
  Neo ⚡       Sonnet  ● active   "Orchestrating batch #42"  $0.34
  Viper 🐍    Sonnet  ○ idle     —                          $0.00
  Jarvis 💼   Sonnet  ● active   "MyWiFi API review"        $0.08
  ...

  38 agents | 12 active | $2.15 total today
```

## Output

```
OPENCLAW: {{action}}
Gateway:  [online/offline]
Synced:   [skill count]
Status:   [OK/ERROR — details]
```
