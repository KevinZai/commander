---
name: mempalace
description: "Local, verbatim cross-session memory with semantic search and Claude Code auto-save hooks, via the MIT MemPalace MCP server. Use when the user wants searchable long-term memory of past sessions and conversations, or an MIT alternative to claude-mem."
tags: [memory, mcp, search, local-first]
---

# MemPalace memory

Opt-in add-on. [MemPalace/mempalace](https://github.com/MemPalace/mempalace) (MIT) stores conversation history verbatim and retrieves it with local semantic search. It does not summarize or paraphrase, needs no API key, and exposes its tools over an MCP server (`mempalace-mcp`).

## Why it is offered

`/ccc-memory` keeps durable facts in files, with no search index. `claude-mem` adds search but stays an external install that Commander does not bundle. MemPalace is the MIT option for users who want search over everything that was said.

Offer one memory backend, not both. If `claude-mem` is already installed, say so and let the user choose.

## Install

Claude Code plugin (MCP server, auto-save hooks and a guided setup skill). CCC safety: the plugin's hooks save every conversation verbatim on the device. Say so before installing it, and offer the CLI-and-MCP path below, which adds no hooks:

```text
/plugin marketplace add MemPalace/mempalace
/plugin install mempalace@mempalace
```

CLI and MCP only:

```bash
uv tool install mempalace          # or: pipx install mempalace
mempalace init ~/projects/myapp
claude mcp add mempalace -- mempalace-mcp
```

Check first with `claude mcp list` and `claude plugin list`.

## Notes

- The upstream README warns that Claude Code transcripts expire after 30 days unless its auto-save hooks are wired. The plugin install wires them.
- Only `github.com/MemPalace/mempalace` and the `mempalace` PyPI package are official; the upstream README warns about impostor sites.
- Commander's `/ccc-memory` files stay the source of truth for decisions and preferences. MemPalace is for recall.

## License

MIT, see the upstream repository.
