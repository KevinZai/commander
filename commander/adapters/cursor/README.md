# Cursor Adapter - CC Commander

**Status:** scaffold (MCP-immediate, native-pending) - 2026-04-26
**Target:** Cursor editor + Cursor CLI with hosted CC Commander MCP

---

## TL;DR

Cursor can use Commander today through MCP. The immediate path is to add the hosted Commander MCP endpoint to Cursor's MCP config and seed the project with a `.cursorrules` file that teaches the agent when to call `commander_suggest_for`, `commander_list_skills`, and `commander_get_skill`.

The native path is pending. Cursor now has a marketplace for plugins and automations, and several listings are MCP/skills-backed, but Commander does not yet have a Cursor-native package format or lifecycle hook adapter comparable to the Codex scaffold.

## Strategy

### A) MCP path - works now

Users install Commander as one remote MCP server:

```json
{
  "mcpServers": {
    "cc-commander": {
      "url": "https://mcp.cc-commander.com/v1/sse",
      "headers": {
        "Authorization": "Bearer ${env:COMMANDER_LICENSE_KEY}"
      }
    }
  }
}
```

This exposes Commander as a tool catalog inside Cursor. The high-value tools for Cursor are:

| Tool | Cursor use |
|---|---|
| `commander_suggest_for` | Pick the right Commander workflow for the current task. |
| `commander_search` | Search the skill catalog by keyword when intent is broad. |
| `commander_list_skills` | Browse available workflows before loading details. |
| `commander_get_skill` | Lazy-load a specific `SKILL.md` on demand. |
| `commander_invoke_skill` | Ask Commander for execution guidance for a named skill. |
| `commander_list_agents` | Discover specialist agent personas as routing hints. |
| `commander_get_agent` | Load the full persona guidance for a specialist. |

### B) Rules path - works now

Cursor supports project rules in `.cursor/rules` and still supports root `.cursorrules` files as a legacy path. This adapter ships `cursorrules.template` so users can prime Cursor's agent to discover Commander skills through MCP instead of asking the model to guess workflows from memory.

### C) Native plugin path - pending

The native adapter needs a published Cursor package story, install metadata, and any future lifecycle APIs Cursor exposes for hooks, personas, and project initialization. Until then, Commander should not claim first-class Cursor parity with Claude/Codex plugins.

## Capability Matrix

| Capability | Platform today | Commander MCP path | Native adapter need | Adapter status |
|---|---|---|---|---|
| Hosted MCP tools | Cursor supports MCP servers over stdio, SSE, and Streamable HTTP via project or global `mcp.json`. | Add `cc-commander` remote endpoint. | None for basic tool access. | Ready |
| Tool discovery | Cursor agents can use configured MCP tools when relevant. | Rules tell Cursor to start with `commander_suggest_for` and lazy-load skills. | Better first-run onboarding once publishable. | Ready |
| Rules / instructions | Project Rules live in `.cursor/rules`; `.cursorrules` remains supported but legacy. | Generate `.cursorrules` from this adapter template. | Optional `.cursor/rules/*.mdc` generator. | Ready |
| Skills package | Cursor Marketplace includes plugins with skills and MCP integrations. | Commander skills are exposed as MCP content, not installed as native files. | Cursor package/publish workflow for Commander skills. | Native pending |
| Agent personas | No Commander-compatible persona format is exposed. | Use `commander_list_agents` and `commander_get_agent` for routing hints. | Native agent/persona projection if Cursor exposes one. | Native pending |
| Lifecycle hooks | No Commander-compatible hook event surface is documented. | Not covered by MCP. | Hook API and event map if Cursor ships one. | Native pending |
| Marketplace install | Cursor Marketplace exists for plugins and automations. | Manual config or one-line config merge. | Published Commander listing. | Native pending |
| Team deployment | Cursor supports project/global MCP config and an MCP Extension API. | Commit project config or merge global config. | Enterprise installer using extension API. | Scaffolded |

## File Map

| File | Purpose |
|---|---|
| `README.md` | Strategy, current capability matrix, and sources. |
| `install.md` | User-facing Cursor install steps. |
| `cursor-mcp-config.template.json` | Drop-in MCP config for Cursor. |
| `cursorrules.template` | Root `.cursorrules` seed for Commander MCP usage. |

## Sources

- [Cursor MCP docs](https://docs.cursor.com/context/model-context-protocol) - Cursor MCP transports, project/global `mcp.json`, and remote server configuration.
- [Cursor rules docs](https://docs.cursor.com/context/rules) - `.cursor/rules`, user rules, and legacy `.cursorrules` behavior.
- [Cursor MCP Extension API](https://docs.cursor.com/en/context/mcp-extension-api) - programmatic MCP server registration with `vscode.cursor.mcp.registerServer()`.
- [Cursor Marketplace](https://cursor.com/en-US/marketplace) - current plugin and automation marketplace listings, including MCP/skills-backed plugins.
