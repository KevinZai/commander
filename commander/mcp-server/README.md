# CC Commander MCP Server

Local MCP server for CC Commander v4.0 Beta. Implements MCP stdio transport (JSON-RPC 2.0 over stdin/stdout). No external dependencies — runs with Node.js >= 18.

## Quick Start

Wire into your IDE's MCP config:

**Claude Code** (`.claude/mcp.json`):
```json
{
  "commander": {
    "command": "node",
    "args": ["/path/to/commander/mcp-server/index.js"],
    "env": { "COMMANDER_LICENSE": "free" }
  }
}
```

**Cursor / Windsurf / Zed** — use the same config format, pointing to `commander/mcp-server/index.js`.

## Available Tools (14)

| Tool | Description |
|------|-------------|
| `commander_list_skills` | Paginated skill catalog with metadata |
| `commander_get_skill` | Full SKILL.md content on demand |
| `commander_search` | Semantic search across 456+ skills |
| `commander_suggest_for` | Top skill suggestions for a task |
| `commander_invoke_skill` | Invoke skill with context |
| `commander_list_agents` | Available agents (free vs Pro) |
| `commander_get_agent` | Full agent definition |
| `commander_invoke_agent` | Agent dispatch hints |
| `commander_status` | Health check + license info |
| `commander_update` | Check for updates |
| `commander_init` | Generate project CLAUDE.md |
| `commander_notes_pin` | Pin notes to knowledge store |
| `commander_tasks_push` | Push tasks to Linear |
| `commander_plan_integrate` | Import plan into session context |

## Architecture

```
commander_list_skills   → skills-loader.js → skills/**
commander_get_skill     → skills-loader.js → lazy-loaded SKILL.md
commander_search        → skills-loader.js → keyword scoring
commander_invoke_skill  → skills-loader.js + routing hints
index.js                → translator.js → MCP content blocks
```

**Lazy loading:** `commander_get_skill` fetches SKILL.md on demand. Clients can implement "load on mention" patterns — 85% token savings vs loading all skills at session start.

## Local vs Hosted

This is the **local beta** build. No network required. Skills served from `skills/` directory.

**Hosted GA** (planned): `https://mcp.cc-commander.com/v1` with API key auth, server-side license validation, and PostHog analytics.

## Environment Variables

| Var | Default | Purpose |
|-----|---------|---------|
| `COMMANDER_LICENSE` | `free` | License tier (free / pro) |
| `MCP_CLIENT_AGENT` | — | IDE hint for translation layer |
