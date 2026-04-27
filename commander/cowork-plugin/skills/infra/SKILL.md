---
name: infra
description: "Infrastructure probe — manage Fleet Commander, Synapse, Cost tracking, CloudCLI, AO, Paperclip, TaskMaster. Use when the user says 'infrastructure', 'fleet', 'cost', 'synapse', 'agents', 'what services are running', 'check ports', or 'service status'. [Commander]"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
argument-hint: "[probe | fleet | paperclip | cost | taskmaster]"
---

# /ccc:infra

> Placeholders like ~~monitoring refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Probe all local CC Commander infrastructure services, report their status, and recommend next actions. Menu sourced from `references/infrastructure.json`.

## Quick Mode (default)

Run a fast port scan and present a status summary with recommended action:

```bash
curl -s --max-time 2 http://localhost:4680/api/status && echo "fleet:ok" || echo "fleet:down"
curl -s --max-time 2 http://localhost:3100/api/health && echo "paperclip:ok" || echo "paperclip:down"
curl -s --max-time 2 http://localhost:18789/health && echo "openclaw:ok" || echo "openclaw:down"
pm2 list --no-color 2>/dev/null | grep -E 'online|stopped|errored' | head -10
```

Show a compact status table, then offer 3 actions via AskUserQuestion:
- "View full infrastructure menu"
- "Start a stopped service"
- "Back to main menu"

## Power Mode

Full infrastructure menu from `references/infrastructure.json`. Activate by passing `--power` or `full` as argument.

### Step 1 — Probe All Services

Run these Bash commands (2-second timeout so dead services don't hang):

```bash
curl -s --max-time 2 http://localhost:4680/api/status && echo "fleet:ok" || echo "fleet:down"
curl -s --max-time 2 http://localhost:4682/api/status && echo "synapse:ok" || echo "synapse:down"
curl -s --max-time 2 http://localhost:3005/api/status && echo "ao:ok" || echo "ao:down"
curl -s --max-time 2 http://localhost:4681/api/status && echo "cloudcli:ok" || echo "cloudcli:down"
curl -s --max-time 2 http://localhost:3100/api/health && echo "paperclip:ok" || echo "paperclip:down"
curl -s --max-time 2 http://localhost:18789/health && echo "openclaw:ok" || echo "openclaw:down"
which task-master && task-master --version 2>/dev/null || echo "task-master: not installed"
```

### Step 2 — Status Table

```
Service          Port   Status     Notes
─────────────────────────────────────────────
Fleet Commander  4680   UP         v1.2.3
Synapse          4682   DOWN       Connection refused
AO Dashboard     3005   UP         $2.34 today
CloudCLI         4681   DEGRADED   HTTP 503
Paperclip        3100   UP         12 open tasks
OpenClaw         18789  UP         38 agents active
TaskMaster       CLI    INSTALLED  v0.43.1
```

Classify: HTTP 200 with valid JSON → UP. HTTP non-200 → DEGRADED. Connection refused/timeout → DOWN.

### Step 3 — Down Service Recovery

| Service | Start Command |
|---------|--------------|
| Fleet Commander | `pm2 start fleet-commander` |
| Synapse | `pm2 start synapse` |
| AO Dashboard | `pm2 start ao-dashboard` |
| CloudCLI | `pm2 start cloudcli` |
| Paperclip | `pm2 start paperclip` |
| OpenClaw | `openclaw gateway status` — do NOT restart without explicit user approval |
| TaskMaster | `npm install -g task-master-ai` |

If ALL services are DOWN: run `pm2 list` to see managed processes, suggest `pm2 start all`.

### Step 4 — Recommend Next Action

Via AskUserQuestion (contextual — only show options for what's running):
- If Paperclip is UP: "Open Paperclip task board"
- If Fleet Commander is UP: "View agent fleet status"
- If any service is DOWN: "Start [service name]"
- "Check full pm2 process list" (`pm2 list`)
- "Back to main menu"

## If Connectors Available

If **~~monitoring** is connected:
- Pull live metrics (CPU, memory, error rates) from the monitoring provider
- Show alert counts alongside service status
- Link directly to dashboards for degraded services

If **~~CI/CD** is connected:
- Show recent pipeline runs alongside service health
- Offer to trigger a deployment if services are healthy

## Tips

1. OpenClaw must never be restarted without explicit user approval — the skill enforces this.
2. Pass a service name as argument (e.g., `paperclip`) to jump directly to that service's status.
3. TaskMaster status is checked via CLI — MCP tools (`get_tasks`, `next_task`) are used when the MCP server is available.
