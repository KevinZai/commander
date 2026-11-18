---
name: qmd
description: "On-device search over markdown notes, docs, meeting transcripts and memory files, with BM25, vector search and local re-ranking, via the MIT qmd CLI and MCP server. Use when the user wants to search their notes or a docs folder, or when /ccc-recall or /ccc-knowledge needs a real search index."
tags: [search, knowledge, memory, mcp, local-first]
---

# qmd search

Opt-in add-on. [tobi/qmd](https://github.com/tobi/qmd) (MIT) indexes markdown collections and searches them with BM25 full-text search, vector search and LLM re-ranking, all running locally through node-llama-cpp with GGUF models. It works from the command line and as an MCP server (`qmd mcp`).

## Install

Claude Code plugin (recommended upstream):

```text
/plugin marketplace add tobi/qmd
/plugin install qmd@qmd
```

CLI and MCP only:

```bash
npm install -g @tobilu/qmd     # or: bun install -g @tobilu/qmd
claude mcp add qmd -- qmd mcp
```

Check first with `claude mcp list` and `claude plugin list`.

## When to route here

- `/ccc-recall` or `/ccc-knowledge` is asked to find something across many notes, and grep is not enough.
- The user keeps an Obsidian vault, a `docs/` tree, or the `memory/` directory from `/ccc-memory` and wants natural-language search over it.

## Limits

- The first query downloads GGUF models (hundreds of MB). Say so before the first search, and never start it on a metered or offline machine (`CCC_OFFLINE=1`).
- Search stays on the device; nothing is sent to a hosted service.

## License

MIT, see the upstream repository.
