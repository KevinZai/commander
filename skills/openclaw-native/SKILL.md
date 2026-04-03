---
name: openclaw-native
description: Native integration with OpenClaw platform — auto-detection, skill sync, bidirectional hooks, agent profiles, memory sync
triggers:
  - "openclaw"
  - "sync with openclaw"
  - "openclaw integration"
  - "connect openclaw"
  - "openclaw status"
  - "register with openclaw"
model: sonnet
disable-model-invocation: false
---

# OpenClaw Native Integration

First-class integration between CC Commander and the OpenClaw AI agent platform. Automatically syncs skills, hooks, and agent profiles between both systems.

## Overview

OpenClaw is a personal AI assistant platform that orchestrates multiple agents across channels (Discord, Slack, Telegram, etc.) from a single gateway. This integration makes CC Commander a native extension of OpenClaw — not just a bridge.

## Auto-Detection

The `openclaw-sync.js` SessionStart hook automatically detects OpenClaw:

1. Check `CC_OPENCLAW_ENABLED=1` env var
2. Probe gateway at `http://localhost:18789/health`
3. If healthy: sync skills, register hooks, report session
4. If not found: exit silently (no errors, no delays)

```bash
# Enable OpenClaw integration
export CC_OPENCLAW_ENABLED=1

# Custom gateway URL (if non-default)
export CC_OPENCLAW_URL=http://localhost:18789
```

## Skill Sync

On session start, all Kit skills are registered with OpenClaw's skill registry:

```
Syncing: 280+ skills → OpenClaw registry
  ├── Core workflow skills (confidence-check, four-question-validation, etc.)
  ├── 11 CCC domains (ccc-seo, ccc-design, ccc-testing, etc.)
  ├── Integration skills (openclaw-native, status-updates, etc.)
  └── Mode switcher (9 workflow modes)
```

OpenClaw agents can then invoke Kit skills by name, enabling:
- Alfred using `/code-review` from Discord
- Morpheus running `/plan` for architecture decisions
- Neo orchestrating `/tdd` across worker agents

## Hook Integration

Bidirectional event forwarding between Kit hooks and OpenClaw webhooks:

### Kit → OpenClaw Events
| Kit Hook | OpenClaw Event | Data |
|----------|---------------|------|
| PostToolUse | `cc_kit_tool_use` | tool name, duration, result |
| Stop | `cc_kit_session_end` | session summary, cost, files changed |
| cost-alert | `cc_kit_cost_alert` | current cost, ceiling, % used |
| context-guard | `cc_kit_context_warn` | context %, tokens remaining |

### OpenClaw → Kit Events
| OpenClaw Event | Kit Action | Description |
|---------------|------------|-------------|
| `agent_task_assigned` | Load context | Pre-load relevant files |
| `agent_mode_change` | Switch mode | Apply workflow mode |
| `channel_message` | Status update | Forward to status-updates skill |

## Agent Profiles

Generate OpenClaw agent profiles from Kit workflow modes:

```bash
# From Kit mode → OpenClaw agent profile
/openclaw agents generate

# Creates profiles for:
# - normal_mode_agent (balanced, standard workflow)
# - design_mode_agent (frontend-focused, design system aware)
# - saas_mode_agent (full-stack, billing/auth/deploy)
# - research_mode_agent (deep analysis, multi-source)
# - yolo_mode_agent (fast, minimal verification)
```

## Memory Sync

Bridge Kit session memory with OpenClaw agent memory:

- Kit sessions saved to `~/.claude/sessions/` sync to OpenClaw's `~/.openclaw/memory/`
- OpenClaw agent learnings feed back into Kit's `tasks/lessons.md`
- Shared memory enables cross-agent knowledge transfer

## Health Monitoring

The `/openclaw health` command checks:
- Gateway status (up/down, uptime, version)
- Channel connectivity (Discord, Slack, Telegram, etc.)
- Agent status (active, idle, error)
- Skill registry (synced count, stale entries)
- Memory DB size and health
- Recent error log

## CLI Commands

See `/openclaw` command for:
- `/openclaw status` — Gateway and agent overview
- `/openclaw sync` — Force skill + hook sync
- `/openclaw configure` — Set up integration
- `/openclaw health` — Detailed health check
- `/openclaw agents` — List and manage agents

## Configuration

| Setting | Env Var | Default | Description |
|---------|---------|---------|-------------|
| Enable | `CC_OPENCLAW_ENABLED` | `0` | Set to `1` to enable |
| Gateway URL | `CC_OPENCLAW_URL` | `http://localhost:18789` | Gateway endpoint |
| Timeout | `CC_OPENCLAW_TIMEOUT` | `5000` | Request timeout (ms) |
| Auto-sync | `CC_OPENCLAW_AUTOSYNC` | `1` | Sync on session start |
| Debug | `CC_OPENCLAW_DEBUG` | `0` | Verbose logging |

## Architecture

```
CC Commander                    OpenClaw Gateway
┌──────────────────┐              ┌──────────────────┐
│  Skills (441+)   │──── sync ───→│  Skill Registry  │
│  Hooks (18)      │←── events ──→│  Webhook System  │
│  Modes (9)       │──── sync ───→│  Agent Profiles  │
│  Sessions        │←── sync ───→│  Memory DBs      │
└──────────────────┘              └──────────────────┘
         ↕                                 ↕
    Claude Code CLI              38 AI Agents (12 workspaces)
```
