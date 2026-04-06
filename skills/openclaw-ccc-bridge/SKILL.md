---
name: openclaw-ccc-bridge
description: "OpenClaw ↔ CCC Bridge — lets OpenClaw agents dispatch CCC tasks, browse skills, and manage sessions via the agent-friendly CLI API. Use when OpenClaw agents need to use CC Commander as a project manager."
category: integrations
triggers:
  - openclaw dispatch
  - openclaw ccc
  - agent dispatch
  - agent project manager
  - ccc bridge
---

# OpenClaw ↔ CCC Bridge

Bridge between OpenClaw agents and CC Commander. Any OpenClaw agent (Alfred, Neo, Codex, etc.) can use CCC as an AI project manager via the CLI API.

## Architecture

```
OpenClaw Agent (Alfred, Neo, etc.)
    │
    ├─ ccc --dispatch "task" --json    → Claude Code builds it
    ├─ ccc --list-skills --json        → Browse 450+ skills
    ├─ ccc --list-sessions --json      → Check session history
    ├─ ccc --status                    → Health check
    │
    └─ CCC dispatches to Claude Code with:
       --dangerously-skip-permissions
       --max-turns (based on user level)
       --model (based on user level)
       CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70
```

## Quick Start for OpenClaw Agents

### 1. Check CCC is Available
```bash
ccc --status
# Returns: {"version":"2.1.0","skills":279,"vendors":16,"health":"ok"}
```

### 2. Browse Available Skills
```bash
# All skills
ccc --list-skills --json

# Search for specific skills
ccc --list-skills --json | jq '.[] | select(.name | contains("auth"))'

# Skills with descriptions
ccc --list-skills
```

### 3. Dispatch a Task
```bash
# Simple dispatch (blocks until done, returns JSON)
ccc --dispatch "Build a REST API with JWT auth" --json

# With overrides
ccc --dispatch "Refactor the database layer" \
  --json \
  --model opusplan \
  --max-turns 50 \
  --budget 5 \
  --cwd /path/to/project

# Response format:
# {"result":"...completed text...","session_id":"abc-123","cost_usd":1.25}
```

### 4. Check Session History
```bash
# Recent sessions
ccc --list-sessions --json

# Response: [{"id":"kc-xxx","task":"...","status":"completed","cost":1.25}, ...]
```

## OpenClaw Agent Patterns

### Pattern 1: Neo as Project Manager
Neo evaluates a task, picks the right CCC skill, and dispatches:

```bash
# 1. Neo checks what skills are available
SKILLS=$(ccc --list-skills --json)

# 2. Neo picks the best skill for the task
# (Neo's LLM reasoning selects from the skill list)

# 3. Neo dispatches with the right model/budget
RESULT=$(ccc --dispatch "Using the tdd-workflow skill, build auth system with tests" \
  --json --model opusplan --budget 5)

# 4. Neo reads the result and reports to Linear
echo "$RESULT" | jq '.result'
```

### Pattern 2: Alfred Triages and Delegates
Alfred receives a user request, decides if CCC should handle it:

```bash
# Check CCC health first
STATUS=$(ccc --status)
HEALTH=$(echo "$STATUS" | jq -r '.health')

if [ "$HEALTH" = "ok" ]; then
  # Dispatch to CCC
  ccc --dispatch "$USER_REQUEST" --json --budget 3
else
  # Handle locally
  echo "CCC unavailable, handling directly"
fi
```

### Pattern 3: Batch Operations
Run multiple CCC tasks in parallel:

```bash
# Dispatch 3 tasks in parallel
ccc --dispatch "Write unit tests for auth module" --json --cwd ./backend &
ccc --dispatch "Create landing page" --json --cwd ./frontend &
ccc --dispatch "Write API documentation" --json --cwd ./docs &
wait
```

### Pattern 4: YOLO Loop via API
```bash
# Night mode: 5 cycles of build-test-improve
ccc --dispatch "YOLO: Build complete SaaS starter with auth, billing, and dashboard. 5 cycles." \
  --json --model opusplan --max-turns 100 --budget 10
```

## Environment Variables

| Var | Default | Purpose |
|-----|---------|---------|
| `CC_OPENCLAW_ENABLED` | `0` | Enable OpenClaw event forwarding |
| `CC_OPENCLAW_URL` | `http://localhost:18789` | OpenClaw gateway URL |
| `CCC_TMUX_SESSION` | unset | Set when running in split mode |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `70` | Auto-compact threshold |

## Response Format

All `--json` responses follow this schema:

```json
{
  "result": "string — Claude's final output text",
  "session_id": "string|null — Claude Code session ID (for --resume)",
  "cost_usd": 0.00
}
```

Error responses:
```json
{
  "error": "string — error message"
}
```

## Integration with OpenClaw Config

Add CCC as a tool in `~/.openclaw/openclaw.json`:

```json
{
  "tools": {
    "ccc": {
      "type": "cli",
      "command": "ccc",
      "capabilities": ["dispatch", "list-skills", "list-sessions", "status"],
      "description": "CC Commander — AI project manager with 450+ skills"
    }
  }
}
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ccc: command not found` | Run `./install.sh` or `ln -sf /path/to/bin/kc.js /usr/local/bin/ccc` |
| `Claude Code CLI not found` | `npm i -g @anthropic-ai/claude-code` |
| `--dispatch` hangs | Check Claude Code auth: `claude --version` |
| JSON parse error | Pipe to file first: `ccc --list-skills --json > skills.json` |
| Split mode tabs not creating | Check `CCC_TMUX_SESSION` env var or tmux session name |
