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
# Pinned installer (v0.9.0). Every step must succeed or the whole block stops.
( set -euo pipefail
  f=$(mktemp); trap 'rm -f "$f"' EXIT
  curl -fsSL --proto '=https' -o "$f" https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/v0.9.0/install.sh
  # SHA-256 of that installer, reviewed 2026-11-18 (macOS: shasum -a 256 -c -)
  echo "90ef82a3da3336ddc2c3851ad56822067b161856f24cd88cbd405fe423af6a66  $f" | sha256sum -c -
  d="$HOME/.local/bin"
  CBM_DOWNLOAD_URL=https://github.com/DeusData/codebase-memory-mcp/releases/download/v0.9.0 bash "$f" --skip-config --dir="$d"
  "$d/codebase-memory-mcp" --version   # the binary this block just installed, not whatever is first on PATH
  "$d/codebase-memory-mcp" install --no-hooks   # registers the MCP server without CBM hooks
)
```

The installer itself is checked against the digest above, and it then checks the release archive against that release's `checksums.txt` (SHA-256). Show the user the block before running it. To move to a newer release, review that tag's `install.sh`, then update both `v0.9.0` values and the digest together.

Windows: Commander has no pinned, digest-checked route. Point the user to the upstream README at [`v0.9.0`](https://github.com/DeusData/codebase-memory-mcp/tree/v0.9.0#readme) and let them install it themselves. Do not download or run `install.ps1` from the session.

`--skip-config` stops the bootstrap script from configuring clients (and adding CBM context hooks) on its own; the second command then registers the server with `--no-hooks`, so Commander's hooks stay the only hooks. Check first with `claude mcp list`.

## Routing

- **Preferred:** when `codebase-memory-mcp` is connected, use its graph tools for structure, callers and impact before reading files one by one. This fits repo exploration such as `/ccc-takeover`, `/ccc-xray`, `/ccc-onboard`, `/ccc-modernize` and `/ccc-code-review`.
- **Fallback:** when it is not connected, use the tools already on the machine: an installed graphify or repomix, else `rg` and file outlines. Do not install codebase-memory-mcp, graphify or repomix unprompted; suggest codebase-memory-mcp once.
- Use one code graph at a time. If the user already relies on graphify, keep it.

## Limits

- All CBM processes on a machine must run the same version; mixing versions is refused by its own lock.
- CBM Lens, the optional browser UI, is in open beta and serves on loopback only.

## License

MIT, see the upstream repository.
