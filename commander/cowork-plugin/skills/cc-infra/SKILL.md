---
name: cc-infra
description: "CC Commander Infrastructure — manage Fleet Commander, Synapse, Cost tracking, CloudCLI, AO, Paperclip, TaskMaster. Use when the user says 'infrastructure', 'fleet', 'cost', 'synapse', 'agents', 'what services are running'."
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# CC Infrastructure & Fleet

Probe all local services, report their status, and recommend next actions.

## Step 1 — Probe All Services

Run these Bash commands (2-second timeout so dead services don't hang):

```bash
curl -s --max-time 2 http://localhost:4680/api/status && echo "fleet:ok" || echo "fleet:down"
curl -s --max-time 2 http://localhost:4682/api/status && echo "synapse:ok" || echo "synapse:down"
curl -s --max-time 2 http://localhost:3005/api/status && echo "ao:ok" || echo "ao:down"
curl -s --max-time 2 http://localhost:4681/api/status && echo "cloudcli:ok" || echo "cloudcli:down"
curl -s --max-time 2 http://localhost:3110/api/health && echo "paperclip:ok" || echo "paperclip:down"
curl -s --max-time 2 http://localhost:18789/health && echo "openclaw:ok" || echo "openclaw:down"
which task-master && task-master --version 2>/dev/null || echo "task-master: not installed"
```

## Step 2 — Classify Each Response

For each service:
- HTTP 200 with valid JSON → **UP**
- HTTP non-200 → **DEGRADED** (note the status code)
- Connection refused / timeout / no response → **DOWN**

## Step 3 — Present Status Table

Format results as:

```
Service          Port   Status     Notes
─────────────────────────────────────────────
Fleet Commander  4680   UP         v1.2.3
Synapse          4682   DOWN       Connection refused
AO Dashboard     3005   UP         $2.34 today
CloudCLI         4681   DEGRADED   HTTP 503
Paperclip        3110   UP         12 open tasks
OpenClaw         18789  UP         38 agents active
TaskMaster       CLI    INSTALLED  v0.43.1
```

## Step 4 — Error State Handling

**If a service is DOWN**, show the exact error and suggest how to start it:

| Service | Start Command |
|---------|--------------|
| Fleet Commander | `pm2 start fleet-commander` |
| Synapse | `pm2 start synapse` |
| AO Dashboard | `pm2 start ao-dashboard` |
| CloudCLI | `pm2 start cloudcli` |
| Paperclip | `pm2 start paperclip` |
| OpenClaw | `openclaw gateway status` — do NOT restart without explicit user approval |
| TaskMaster | `npm install -g task-master-ai` |

**If ALL services are DOWN:**
Say clearly: "No infrastructure services are currently running."
Suggest: Use Bash to run `pm2 list` to see managed processes, or `pm2 start all` to start them.

## Step 5 — Recommend Next Action

After presenting status, use AskUserQuestion with options based on what's running:

- If Paperclip is UP: "Open Paperclip task board" → `curl -s http://localhost:3110/api/tasks`
- If Fleet Commander is UP: "View agent fleet status" → `curl -s http://localhost:4680/api/agents`
- If any service is DOWN: "Start [service name]" → run the pm2 start command above
- "Check full pm2 process list" → `pm2 list`
- "Something else"
- "Back to main menu"
