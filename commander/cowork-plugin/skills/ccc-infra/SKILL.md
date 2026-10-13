---
name: ccc-infra
description: "Dev services status — probe local dev servers + connected MCPs from an optional services.json config. Use when the user says 'infrastructure', 'service status', 'is my dev server up',…"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
argument-hint: "[probe | full]"
---

# /ccc-infra — Dev services status

> **Scope:** this plugin is Claude Code + Codex CLI only. This skill never probes Kevin's (or anyone's) private infrastructure — it reads an OPTIONAL `~/.claude/commander/services.json` the user maintains for their own project, plus a small set of Claude/Codex-relevant local checks. If a user wants their own private stack probed, they add it to `services.json` themselves; this skill ships with zero hardcoded ports or process names for any specific person's setup.

Probe the services this project actually declares, plus Claude/Codex tooling health, and recommend next actions. Menu sourced from `references/infrastructure.json`.

## Config format (optional)

`~/.claude/commander/services.json` — created by the user, never assumed:

```json
{
  "services": [
    { "name": "API", "url": "http://localhost:3000/health" },
    { "name": "Worker", "port": 8080 }
  ]
}
```

If the file doesn't exist, skip straight to the Claude/Codex checks below — do not invent service names or ports.

## Quick Mode (default)

```bash
test -f ~/.claude/commander/services.json && cat ~/.claude/commander/services.json || echo "no services.json — using Claude/Codex defaults"
claude mcp list 2>/dev/null || echo "claude mcp: not available"
command -v codex >/dev/null 2>&1 && codex --version 2>/dev/null || echo "codex: not installed"
```

For each entry in `services.json` (if present), probe its `url` (2-second timeout `curl`) or check its `port` is listening (`lsof -iTCP:<port> -sTCP:LISTEN` or equivalent). Never probe a port or process not listed in the user's own config.

Show a compact status table, then offer 3 actions via AskUserQuestion:
- "View full status (Power Mode)"
- "Help me set up services.json"
- "Back to main menu"

## Power Mode

Full status pass. Activate by passing `--power` or `full` as argument.

### Step 1 — Probe declared + Claude/Codex services

```bash
# User-declared project services (from services.json), each with a short timeout
# curl -s --max-time 2 "$URL" && echo "$NAME:ok" || echo "$NAME:down"

# Claude/Codex tooling (always safe to check — no private infra assumed)
claude mcp list 2>/dev/null
command -v codex >/dev/null 2>&1 && codex --version 2>/dev/null || echo "codex: not installed"
```

### Step 2 — Status Table

```
Service          Source              Status     Notes
──────────────────────────────────────────────────────────
API              services.json       UP         200 OK
Worker           services.json       DOWN       Connection refused
Claude MCPs      claude mcp list     3 connected
Codex CLI        command -v codex    INSTALLED  v1.2.3
```

Classify: HTTP 200 (or listening port) → UP. HTTP non-200 → DEGRADED. Connection refused/timeout/missing binary → DOWN or NOT INSTALLED.

### Step 3 — Down Service Recovery

For any `services.json` entry that's DOWN, there is no generic start command — this skill doesn't know how the user runs their own services. Ask them, or suggest checking their project's own README/package.json scripts.

If Codex CLI is missing: `npm install -g @openai/codex` (OAuth login required separately — never route API keys through this skill).

### Step 4 — Recommend Next Action

Via AskUserQuestion (contextual — only show options that apply):
- If any `services.json` entry is DOWN: "Help me figure out how to restart it"
- If no `services.json` exists: "Help me set one up"
- If Codex CLI is missing and the user mentioned Codex: "Show me how to install Codex CLI"
- "Back to main menu"

## If Connectors Available

If **~~monitoring** is connected:
- Pull live metrics (CPU, memory, error rates) from the monitoring provider for services the user has declared
- Link directly to dashboards for degraded services

If **~~CI/CD** is connected:
- Show recent pipeline runs alongside service health
- Offer to trigger a deployment if services are healthy

## Tips

1. This skill never assumes a specific stack — everything beyond Claude/Codex tooling comes from the user's own `services.json`.
2. Pass a service name as argument (e.g., `probe API`) to jump directly to that entry's status.
3. Do not resurrect probes for Fleet Commander, Synapse, AO Dashboard, CloudCLI, Paperclip, OpenClaw, pm2, or TaskMaster here — those are private/personal infra out of the public plugin's Claude+Codex scope (see `feedback_commander_scope_claude_codex` memory note). If a user's own `services.json` happens to list something with those names, that's fine — it's their config, not this skill's assumption.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
