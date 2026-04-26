# Windsurf Adapter - CC Commander

**Status:** scaffold (MCP-immediate, native-pending) - 2026-04-26
**Target:** Windsurf Cascade with hosted CC Commander MCP

---

## TL;DR

Windsurf can use Commander today through Cascade's MCP support. The immediate path is to add the hosted Commander MCP endpoint to Windsurf's `mcp_config.json` and seed the project with rules that tell Cascade to use Commander for skill discovery and workflow routing.

The native path is pending. Windsurf has Cascade features, workflows, rules, skills, hooks, and an MCP marketplace, but this scaffold does not project Commander's Claude/Codex plugin tree into a Windsurf-native package. Commander should be described as MCP-immediate for Windsurf until a native package format is defined.

## Strategy

### A) MCP path - works now

Users install Commander as one remote MCP server:

```json
{
  "mcpServers": {
    "cc-commander": {
      "serverUrl": "https://mcp.cc-commander.com/v1/sse",
      "headers": {
        "Authorization": "Bearer ${env:COMMANDER_LICENSE_KEY}"
      }
    }
  }
}
```

This exposes Commander as Cascade tools. The high-value tools for Windsurf are:

| Tool | Cascade use |
|---|---|
| `commander_suggest_for` | Pick the right Commander workflow for the current task. |
| `commander_search` | Search the catalog when task intent is broad. |
| `commander_list_skills` | Browse workflows before loading content. |
| `commander_get_skill` | Lazy-load a specific `SKILL.md`. |
| `commander_invoke_skill` | Ask Commander for execution guidance. |
| `commander_list_agents` | Discover specialist agent personas as routing hints. |
| `commander_get_agent` | Load the full persona guidance for a specialist. |

### B) Rules path - works now

Windsurf supports workspace rules in `.windsurf/rules/*.md`, global rules, and `AGENTS.md` files through the same rules engine. This adapter ships `windsurfrules.template` as copyable rule text. The recommended install path is `.windsurf/rules/commander.md`; teams with a root `.windsurfrules` convention can use the same content there.

### C) Native plugin path - pending

The native adapter needs a stable package story for Commander skills, personas, hooks, and workflows. Until that exists, Windsurf support is intentionally MCP-first.

## Capability Matrix

| Capability | Platform today | Commander MCP path | Native adapter need | Adapter status |
|---|---|---|---|---|
| Hosted MCP tools | Cascade supports MCP over stdio, SSE, and Streamable HTTP. | Add `cc-commander` remote endpoint to `mcp_config.json`. | None for basic tool access. | Ready |
| Tool discovery | Cascade exposes configured MCP tools and lets users toggle tools per server. | Rules tell Cascade to start with `commander_suggest_for` and lazy-load skills. | Better first-run onboarding once publishable. | Ready |
| Rules / instructions | Rules live in `.windsurf/rules/*.md`; global rules and `AGENTS.md` are also supported. | Install `windsurfrules.template` as a workspace rule. | Rule generator for `.windsurf/rules/commander.md`. | Ready |
| Skills package | Windsurf has Cascade Skills, but no Commander package projection is shipped here. | Commander skills are exposed as MCP content, not installed as native files. | Windsurf package/publish workflow for Commander skills. | Native pending |
| Agent personas | No Commander-compatible persona format is exposed. | Use `commander_list_agents` and `commander_get_agent` for routing hints. | Native agent/persona projection if Windsurf exposes one. | Native pending |
| Lifecycle hooks | Cascade hooks exist, but no Commander hook event map is implemented. | Not covered by MCP. | Hook API research and event map. | Native pending |
| Marketplace install | Windsurf has an MCP marketplace and deeplink support. | Manual config or one-line config merge. | Published Commander MCP registry entry or native package. | Native pending |
| Team deployment | Windsurf supports MCP registry controls, whitelists, and env interpolation. | Commit workspace config or merge user config. | Enterprise installer and admin registry metadata. | Scaffolded |

## File Map

| File | Purpose |
|---|---|
| `README.md` | Strategy, current capability matrix, and sources. |
| `install.md` | User-facing Windsurf install steps. |
| `windsurf-mcp-config.template.json` | Drop-in MCP config for Windsurf. |
| `windsurfrules.template` | Workspace rule seed for Commander MCP usage. |

## Sources

- [Windsurf MCP docs](https://docs.windsurf.com/windsurf/cascade/mcp) - Cascade MCP setup, transport support, `~/.codeium/windsurf/mcp_config.json`, remote HTTP config, and env interpolation.
- [Windsurf Memories & Rules](https://docs.windsurf.com/windsurf/cascade/memories) - global/workspace/system rules, `.windsurf/rules/*.md`, and activation modes.
- [Windsurf AGENTS.md](https://docs.windsurf.com/windsurf/cascade/agents-md) - `AGENTS.md` discovery through the same rules engine.
- [Windsurf Cascade overview](https://docs.windsurf.com/windsurf/cascade/cascade) - Cascade modes, tool calling, MCP, and workflows.
