---
name: qmd
description: "On-device search over markdown notes, docs, meeting transcripts and memory files, with BM25, vector search and local re-ranking, via the MIT qmd CLI and MCP server. Use when the user wants to search their notes or a docs folder, or when /ccc-recall or /ccc-knowledge needs a real search index."
tags: [search, knowledge, memory, mcp, local-first]
---

# qmd search

Opt-in add-on. [tobi/qmd](https://github.com/tobi/qmd) (MIT) indexes markdown collections and searches them with BM25 full-text search, vector search and LLM re-ranking, all running locally through node-llama-cpp with GGUF models. It works from the command line and as an MCP server (`qmd mcp`).

## Install

Claude Code plugin (recommended upstream):

Install from the upstream README, reviewed at [`aa247d0`](https://github.com/tobi/qmd/tree/aa247d0ee2e5dc3b83e1270714c0f06ca94e2514#readme). CCC safety: the plugin marketplace serves the current upstream revision, not the reviewed one. Before installing, confirm the marketplace source is `github.com/tobi/qmd` itself and not a same-named plugin from another publisher, and tell the user if upstream has changed since `aa247d0`.

CLI and MCP only:

```bash
npm install -g @tobilu/qmd@2.9.0   # pinned; fails if that version is unavailable
claude mcp add qmd -- qmd mcp
```

The `qmd` binary must be on `PATH` for `qmd mcp` to start; check with `qmd --version`. Check first with `claude mcp list` and `claude plugin list`.

## When to route here

- `/ccc-recall` or `/ccc-knowledge` is asked to find something across many notes, and grep is not enough.
- The user keeps an Obsidian vault, a `docs/` tree, or the `memory/` directory from `/ccc-memory` and wants natural-language search over it.

## Limits

- The first query downloads GGUF models (hundreds of MB). Say so before the first search, and never start it on a metered or offline machine (`CCC_OFFLINE=1`).
- With the default local models, indexing and search stay on the device. CCC safety: if the qmd config points embeddings or re-ranking at a remote endpoint, document chunks and queries leave the machine; tell the user and ask before indexing.

## License

MIT, see the upstream repository.
