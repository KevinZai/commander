---
name: openclaw-health-check
description: |
  Full OpenClaw system health audit. Checks all agents, gateway status, costs, memory,
  cron jobs, errors, and service health. Use for daily check-ins, debugging, or when
  something feels off. Produces a structured health report.
allowed-tools:
  - Bash
  - Read
  - Write
---

# OpenClaw Health Check

## When to Use
- Daily check-in (or cron-driven)
- After gateway restarts or config changes
- When an agent seems unresponsive
- When costs seem high
- When Kevin asks "is everything healthy?"

## Checks (run in order)

### 1. Gateway Status
```bash
# Use OpenClaw CLI — HTTP REST endpoints don't exist on the gateway
openclaw gateway status 2>/dev/null | grep -E "Runtime|RPC probe|Listening" || echo "GATEWAY DOWN"
# Alternatively, the only HTTP endpoint that works:
curl -s http://localhost:18789/health 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK' if d.get('ok') else 'UNHEALTHY')" 2>/dev/null || echo "GATEWAY DOWN"
```

### 2. PM2 Services
```bash
pm2 jlist 2>/dev/null | jq -r '.[] | "\(.name)\t\(.pm2_env.status)\t\(.pm2_env.restart_time)"' | column -t
```
Flag: any service with status != "online" or restart_time > 5

### 3. Agent Session Activity
```bash
# Recent sessions (last 24h) per agent
for dir in ~/.openclaw/agents/*/sessions/; do
  agent=$(echo "$dir" | sed 's|.*/agents/\(.*\)/sessions/|\1|')
  recent=$(find "$dir" -name "*.jsonl" -mtime -1 2>/dev/null | wc -l | tr -d ' ')
  echo "$agent: $recent sessions (24h)"
done
```

### 4. Cost Check
```bash
# Today's cost estimate from JSONL
today=$(date +%Y-%m-%d)
total=0
for f in ~/.openclaw/agents/*/sessions/*.jsonl; do
  if [ -f "$f" ] && [ "$(stat -f %Sm -t %Y-%m-%d "$f" 2>/dev/null)" = "$today" ]; then
    cost=$(grep -o '"totalCost":[0-9.]*' "$f" 2>/dev/null | tail -1 | cut -d: -f2)
    if [ -n "$cost" ]; then total=$(echo "$total + $cost" | bc 2>/dev/null || echo "$total"); fi
  fi
done
echo "Estimated today: \$$total"
```
Flag: daily > $8, weekly > $30

### 5. Cron Health
Use the cron tool to list jobs, check for consecutiveErrors > 0.

### 6. Memory/Disk
```bash
df -h /System/Volumes/Data | tail -1 | awk '{print "Disk: " $3 " used / " $4 " free (" $5 " used)"}'
du -sh ~/.openclaw/ 2>/dev/null | awk '{print "OpenClaw data: " $1}'
```
Flag: disk > 90% or OpenClaw data > 5GB

### 7. Key Services
```bash
# Check each critical service
for port_name in "18789:Gateway" "3110:Paperclip" "5678:n8n" "3100:Langfuse" "11434:Ollama"; do
  port=$(echo "$port_name" | cut -d: -f1)
  name=$(echo "$port_name" | cut -d: -f2)
  if curl -s --max-time 2 "http://localhost:$port" >/dev/null 2>&1; then
    echo "✅ $name (:$port)"
  else
    echo "❌ $name (:$port) — DOWN"
  fi
done
```

## Output Format
```markdown
# OpenClaw Health Report — YYYY-MM-DD HH:MM

## Status: 🟢 HEALTHY / 🟡 WARNINGS / 🔴 CRITICAL

### Services
| Service | Port | Status |
|---------|------|--------|
| Gateway | 18789 | ✅ |
| ... | ... | ... |

### Agents (24h activity)
| Agent | Sessions | Last Active | Status |
|-------|----------|-------------|--------|

### Costs
- Today: $X.XX
- This week: $XX.XX
- Budget: $100/month

### Cron Jobs
| Job | Last Run | Errors | Status |
|-----|----------|--------|--------|

### Alerts
- 🔴 Critical issues (if any)
- 🟡 Warnings (if any)

### Disk
- Used / Free (%)
```

Write report to `~/clawd/workspaces/architecture/reports/health-YYYYMMDD.md`

## Gotchas
- Gateway health endpoint may not exist — fall back to port check
- JSONL cost parsing is approximate — use Agent-HQ for precise numbers
- Some agents are intentionally idle (trading bot only runs market hours)
- BlueBubbles (port 1234) may show 401 — that's healthy, just needs auth
