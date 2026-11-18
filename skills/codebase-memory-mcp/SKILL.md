---
name: codebase-memory-mcp
description: "Commander's preferred code map: a local knowledge graph of code, docs, config and infrastructure with callers, impact and change-aware test selection, via the MIT codebase-memory-mcp server. Use when exploring an unfamiliar repo, tracing a call across services, or asking what a change could break."
tags: [code-intelligence, knowledge-graph, mcp, onboarding, local-first]
---

# codebase-memory-mcp

Opt-in add-on, and Commander's preferred code mapper. [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) (MIT) is a native MCP server that builds a persistent local graph of a repository. It exposes 17 MCP tools: symbol, text and semantic search, callers and dependencies, file outlines, change impact, and test selection for a diff. Indexing and queries need no hosted service or API key.

## Install

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
codebase-memory-mcp install            # registers the MCP server for the clients you pick
```

Windows: use `install.ps1` from the upstream README. Show the user the script URL before running it; do not pipe it to a shell without their go-ahead.

`install` also adds CBM context hooks by default. To keep Commander's hooks as the only hooks, run `codebase-memory-mcp install --no-hooks`. Check first with `claude mcp list`.

## Routing

- **Preferred:** when `codebase-memory-mcp` is connected, use its graph tools for structure, callers and impact before reading files one by one. This fits repo exploration such as `/ccc-takeover`, `/ccc-xray`, `/ccc-onboard`, `/ccc-modernize` and `/ccc-code-review`.
- **Fallback:** when it is not connected, use `skills/graphify` (vendored, Python, no MCP) or `repomix` for a one-shot pack. Do not install codebase-memory-mcp unprompted; suggest it once.
- Use one code graph at a time. If the user already relies on graphify, keep it.

## Limits

- All CBM processes on a machine must run the same version; mixing versions is refused by its own lock.
- CBM Lens, the optional browser UI, is in open beta and serves on loopback only.

## License

MIT, see the upstream repository.
