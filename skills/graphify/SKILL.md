---
name: graphify
description: Build a local knowledge graph of a codebase (Graphify) and query it instead of grepping. Use when the user wants a codebase graph, graphify, or fewer tokens spent searching a large repo.
category: code
triggers:
  - graphify
  - knowledge graph
  - codebase graph
  - token reduction
---

# Graphify — Codebase Knowledge Graph

Build a knowledge graph from code, docs, PDFs, images and media, then query the graph instead of grepping. Code is parsed locally with tree-sitter (about 40 languages); only the semantic pass over docs and media uses a model. From the command line that is the backend you configure; `/graphify .` inside an assistant session uses that session's model, so docs and media in the folder are sent to it.

## Install

```bash
uv tool install graphifyy      # or: pipx install graphifyy
graphify install               # detects your assistant and registers the /graphify skill
```

`graphify install --project` installs into the current repo; `graphify install --platform codex` targets Codex. Optional extras: `uv tool install "graphifyy[pdf]"` (PDF), `[office]` (docx/xlsx), `[video]` (transcription).

## Usage

```bash
/graphify .                          # in Claude Code: build the graph for this repo
graphify query "how does auth work?" # scoped subgraph for a question
graphify path "FastAPI" "ModelField" # how two things connect, with weakest-hop confidence
graphify explain "SessionStore"      # explain one concept
graphify update                      # refresh after changes
```

## What It Does

1. **Parses** code locally with tree-sitter and resolves `calls` / `imports` / `inherits` across files
2. **Extracts** docs, PDFs, images and media into the same graph (model backend only for this pass)
3. **Tags** every edge `EXTRACTED` or `INFERRED`, so read facts are separate from resolved ones
4. **Finds** god nodes and communities, and exports `graph.json` plus a report

## Integration

- Registers a Claude Code skill (`/graphify`) and a PreToolUse hook that nudges Read/Grep through the graph; `--strict` turns the nudge into a once-per-session denial, `GRAPHIFY_HOOK_STRICT=0` turns it off
- These hooks are installed by Graphify into your own settings, not by CC Commander; review them before enabling strict mode

## Links

- **GitHub:** https://github.com/Graphify-Labs/graphify
- **License:** Apache-2.0 (relicensed; earlier MIT contributions keep `LICENSE-MIT`)
- **Vendored at:** `vendor/graphify` (branch `v8`)
