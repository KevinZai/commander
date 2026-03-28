---
name: infra-runbook
description: |
  Infrastructure runbooks for Kevin's self-hosted stack. Covers common failure
  modes, diagnosis steps, and recovery procedures for: OpenClaw Gateway, Paperclip,
  BlueBubbles, n8n, Langfuse, Caddy, Ollama, PM2, Docker, and Tailscale.
  Use when something is down, slow, or behaving unexpectedly.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Infrastructure Runbook

## Quick Diagnosis
```bash
# What's running?
pm2 jlist | jq -r '.[] | "\(.name)\t\(.pm2_env.status)\t\(.pm2_env.restart_time)"'

# What's listening?
lsof -iTCP -sTCP:LISTEN -nP | grep -E ":(18789|3110|5678|3100|11434|1234)" | awk '{print $1, $9}'

# Disk pressure?
df -h /System/Volumes/Data | tail -1
```

## Service-Specific Runbooks

### OpenClaw Gateway (:18789)
**Symptom:** Agents not responding, messages not flowing
```bash
# Check status
curl -s http://localhost:18789/health  # NOTE: /health not /api/health
# Check logs
openclaw gateway status
# Restart (REQUIRES KEVIN'S APPROVAL)
openclaw gateway restart
```
**Common causes:** Config error after patch, OOM, node crash

### Paperclip (:3110)
**Symptom:** Tickets not creating, API 500s
```bash
pm2 show paperclip
pm2 logs paperclip --lines 30 --nostream
# Restart
pm2 restart paperclip
```
**Common causes:** SQLite lock, port conflict (OrbStack), migration needed

### BlueBubbles (:1234)
**Symptom:** iMessage not working, 401 errors (normal — needs auth), no response at all (bad)
```bash
# Check if alive
curl -s http://localhost:1234/api/v1/server/info -H "Authorization: Bearer $BB_PASSWORD"
# Force restart
killall -9 BlueBubbles; sleep 2; open -a BlueBubbles
```
**Common causes:** macOS killed it, port stuck after crash

### n8n (:5678)
**Symptom:** Workflows not triggering
```bash
pm2 show n8n 2>/dev/null || docker ps | grep n8n
pm2 logs n8n --lines 20 --nostream
```

### Langfuse (:3100)
**Symptom:** Observability blind
```bash
curl -s http://localhost:3100/api/health
docker ps | grep langfuse
docker logs langfuse-web --tail 20
```

### Caddy (Reverse Proxy)
**Symptom:** HTTPS not working, domains not resolving
```bash
# Check config
cat ~/clawd/tools/caddy/Caddyfile | grep -E "^[a-z].*\{" | head -20
# Reload
caddy reload --config ~/clawd/tools/caddy/Caddyfile
# Check TLS certs
caddy validate --config ~/clawd/tools/caddy/Caddyfile
```
**Common causes:** Cloudflare DNS token expired, config syntax error

### Ollama (:11434)
**Symptom:** Local models not responding
```bash
curl -s http://localhost:11434/api/tags | jq '.models[].name'
ollama list
# Restart
killall ollama; sleep 1; ollama serve &
```

## Escalation
If you can't fix it:
1. Write diagnostic output to `~/clawd/workspaces/architecture/reports/incident-YYYYMMDD.md`
2. Post to #morpheus with findings
3. Tag Kevin if it's blocking work
