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

Install from the upstream README, reviewed at [`fec575b`](https://github.com/MemPalace/mempalace/tree/fec575bb4be04d4db244c2f724fa75ee6b9667ca#readme). CCC safety: the plugin marketplace serves the current upstream revision, not the reviewed one. Before installing, confirm the marketplace source is `github.com/MemPalace/mempalace` itself and not a same-named plugin from another publisher, and tell the user if upstream has changed since `fec575b`.

CLI and MCP only:

```bash
# One errexit subshell, run on its own: a failed install stops before init or registration,
# and both use the binaries this install just placed, never whatever is first on PATH.
( set -euo pipefail
  uv tool install mempalace==3.12.0          # pinned; fails if that version is unavailable
  bin="$(uv tool dir --bin)"
  "$bin/mempalace" init ~/projects/myapp
  claude mcp add mempalace -- "$bin/mempalace-mcp"
)
```

With pipx instead of uv, use `pipx install mempalace==3.12.0` and `$(pipx environment --value PIPX_BIN_DIR)` for `bin`.

Check first with `claude mcp list` and `claude plugin list`.

## Notes

- The upstream README warns that Claude Code transcripts expire after 30 days unless its auto-save hooks are wired. The plugin install wires them.
- Only `github.com/MemPalace/mempalace` and the `mempalace` PyPI package are official; the upstream README warns about impostor sites.
- Commander's `/ccc-memory` files stay the source of truth for decisions and preferences. MemPalace is for recall.

## License

MIT, see the upstream repository.
