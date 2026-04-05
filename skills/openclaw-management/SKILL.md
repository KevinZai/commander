---
name: openclaw-management
description: |
  Complete OpenClaw management suite for Claude Code. Combines self-healing,
  doctor dispatch, free fleet routing, and the external neurosurgeon pattern
  into one shareable skill. Works with any OpenClaw installation.
  Includes health monitoring, auto-repair, cost optimization, and
  cron-driven autonomous operation.
triggers:
  - /openclaw-manage
  - /oc-manage
  - openclaw management
  - manage openclaw
  - openclaw maintenance
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# OpenClaw Management Suite

## Overview

Claude Code as an external management layer for OpenClaw. The "external neurosurgeon"
pattern: the platform can't reliably manage itself, so CC operates from outside.

**Skills included:**
1. Health monitoring (pure bash, $0)
2. Auto-repair (safe fixes only)
3. Doctor dispatch (scheduled diagnosis)
4. Free fleet routing ($0 continuous operation)
5. Upgrade management (backup → update → verify → rollback)

## Quick Start

```bash
# Run health check now
/openclaw-manage health

# Start autonomous monitoring
/openclaw-manage auto

# Full diagnosis
/openclaw-manage doctor

# View status
/openclaw-manage status
```

## Commands

### `/openclaw-manage health` — Quick Health Check

Run these checks and report results:

```bash
# Gateway
curl -sf --max-time 3 http://localhost:18789/health 2>/dev/null | grep -q '"ok":true' \
  && echo "Gateway: OK" || echo "Gateway: DOWN"

# PM2 services
pm2 jlist 2>/dev/null | python3 -c "
import json,sys
data=json.load(sys.stdin)
online=sum(1 for d in data if d['pm2_env']['status']=='online')
total=len(data)
print(f'PM2: {online}/{total} online')
for d in data:
  if d['pm2_env']['status'] not in ('online','stopped'):
    print(f'  WARNING: {d[\"name\"]} is {d[\"pm2_env\"][\"status\"]}')
" 2>/dev/null

# Disk
df -h /System/Volumes/Data | tail -1 | awk '{print "Disk: " $3 " used / " $4 " free (" $5 ")"}'

# OpenClaw data size
du -sh ~/.openclaw/ 2>/dev/null | awk '{print "OpenClaw data: " $1}'

# Channel status
openclaw channels status --probe 2>&1 | grep -E "works|DOWN|warning"
```

### `/openclaw-manage doctor` — Full Diagnosis

```bash
# Run openclaw's built-in doctor
openclaw doctor 2>&1

# Check cron jobs for errors
openclaw cron list 2>&1

# Detailed PM2 status
pm2 jlist 2>/dev/null | python3 -c "
import json,sys
data=json.load(sys.stdin)
for d in sorted(data, key=lambda x: x['name']):
  name=d['name']
  status=d['pm2_env']['status']
  restarts=d['pm2_env']['restart_time']
  print(f'{name:30s} {status:10s} restarts:{restarts}')
" 2>/dev/null

# Memory usage
du -sh ~/.openclaw/memory/ ~/.openclaw/agents/*/sessions/ 2>/dev/null | sort -rh | head -10

# Cost check (if script exists)
python3 ~/clawd/scripts/cost-by-agent.py 2>/dev/null || echo "Cost script not found"
```

### `/openclaw-manage auto` — Enable Autonomous Monitoring

Set up cron jobs for continuous health monitoring:

```bash
# Create the quick-check script
cat > ~/clawd/tools/openclaw-doctor-quick.sh << 'SCRIPT'
#!/bin/bash
set -uo pipefail
STATUS="OK"; ISSUES=""; FIXES=""

# Gateway
curl -sf --max-time 3 http://localhost:18789/health 2>/dev/null | grep -q '"ok":true' \
  || { STATUS="CRITICAL"; ISSUES="$ISSUES gateway-down"; }

# PM2 (auto-restart safe services)
ERRORED=$(pm2 jlist 2>/dev/null | python3 -c "
import json,sys
skip={'freqtrade','port-guard','vault-sync','vault-git-backup','gateway-watchdog'}
for d in json.load(sys.stdin):
  if d['pm2_env']['status']=='errored' and d['name'] not in skip:
    print(d['name'])
" 2>/dev/null)
for svc in $ERRORED; do
  pm2 restart "$svc" 2>/dev/null; sleep 2
  FIXES="$FIXES restarted:$svc"
done

# Disk
DISK=$(df -h /System/Volumes/Data | tail -1 | awk '{print $5}' | tr -d '%')
[ "${DISK:-0}" -gt 90 ] && { STATUS="ALERT"; ISSUES="$ISSUES disk:${DISK}%"; }

# Log
echo "$(date +%Y-%m-%dT%H:%M:%S) $STATUS $ISSUES $FIXES" >> /tmp/openclaw-health.log

# Alert on failure
[ "$STATUS" != "OK" ] && openclaw message send --channel discord \
  --target {COMMS_LOG_CHANNEL_ID} --message "[Doctor] $STATUS: $ISSUES $FIXES" --silent 2>/dev/null
SCRIPT
chmod +x ~/clawd/tools/openclaw-doctor-quick.sh

# Schedule via OpenClaw cron (or system cron)
openclaw cron create --name "doctor-quick" --schedule "*/15 * * * *" \
  --command "bash ~/clawd/tools/openclaw-doctor-quick.sh" 2>/dev/null \
  || echo "Add to crontab manually: */15 * * * * bash ~/clawd/tools/openclaw-doctor-quick.sh"
```

### `/openclaw-manage status` — Current State

```bash
echo "=== OpenClaw Management Status ==="
echo ""

# Gateway
openclaw gateway status 2>/dev/null | grep -E "Runtime|RPC|Listening"
echo ""

# Agent count
AGENTS=$(openclaw agents list 2>/dev/null | grep -c "^-")
echo "Agents: $AGENTS"

# Channel count
CHANNELS=$(openclaw channels status --probe 2>/dev/null | grep -c "works")
echo "Channels: $CHANNELS connected"

# Health log (last 5 entries)
echo ""
echo "Recent health checks:"
tail -5 /tmp/openclaw-health.log 2>/dev/null || echo "No health log yet"
```

## Free LLM Routing

For autonomous tasks, use free models to achieve $0 operation:

| Task Type | Recommended Model | Cost |
|-----------|------------------|------|
| Health monitoring | Bash (no LLM) | $0 |
| Log analysis | Groq llama-4-scout | $0 |
| Status reports | Groq/Ollama | $0 |
| Deep diagnosis | Haiku | $0.001 |
| Complex repairs | Sonnet | $0.01 |

Configure in OpenClaw:
```json
{
  "model": {
    "primary": "groq/meta-llama/llama-4-scout-17b-16e-instruct",
    "fallbacks": ["ollama/llama3.2"]
  }
}
```

## Safe Auto-Fix Rules

**Auto-fix (no human needed):**
- PM2 service restart (critical services only)
- Session cleanup (older than 7 days)
- Log rotation (compress logs older than 3 days)
- Memory DB optimization (SQLite VACUUM)

**Alert only (needs human):**
- Gateway restart
- Config file changes
- Agent creation/removal
- Credential issues
- Data deletion

## Key Insight

The OpenClaw gateway communicates via **WebSocket RPC** at `ws://127.0.0.1:18789`.
HTTP only serves the dashboard. The only HTTP endpoint is `GET /health`.
All programmatic access must use the `openclaw` CLI (which handles WebSocket internally).

Do NOT use `fetch()` or `curl` for API calls to the gateway. Use `openclaw message send`,
`openclaw agents list`, etc.

## Requirements

- OpenClaw installed and running
- `openclaw` CLI in PATH
- PM2 for service management
- Python 3 (for JSON parsing in bash scripts)
