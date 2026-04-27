# Commander Adapters

This directory tracks Commander's cross-platform adapter strategy. The source of truth for Commander workflows remains the Claude-shaped plugin tree; adapters either translate that tree into a native package or expose it through MCP where native packages are not available yet.

## Adapter Index

| Adapter | Path | Status | Install path | Native package |
|---|---|---|---|---|
| Codex | `commander/adapters/codex/` | Complete scaffold, v4.2 ship target | Generated Codex plugin artifact | Pending build pipeline |
| Cursor | `commander/adapters/cursor/` | MCP-immediate, native-pending | Hosted MCP endpoint + rules template | Pending Cursor package story |
| Windsurf | `commander/adapters/windsurf/` | MCP-immediate, native-pending | Hosted MCP endpoint + rules template | Pending Windsurf package story |
| Cline | future | MCP-based candidate | Hosted MCP endpoint | Pending |
| Continue | future | MCP-based candidate | Hosted MCP endpoint | Pending |

## Decision Rule

- Use a native adapter when the platform exposes stable plugin, skill, agent, hook, and marketplace primitives.
- Use the hosted MCP adapter when the platform can call MCP tools but does not yet support a Commander-native plugin package.
- Keep platform claims scoped to the adapter status above until install and smoke tests exist for that platform.
