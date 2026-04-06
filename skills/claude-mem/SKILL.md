---
name: claude-mem
description: "Persistent AI memory across Claude Code sessions — semantic search, auto-capture, knowledge compounding. Use when the user says 'remember this', 'search memory', 'what do we know about', 'install memory'."
allowed-tools:
  - Bash
  - Read
  - Write
---

# Claude-Mem — Persistent AI Memory

Cross-session memory powered by SQLite + Chroma vector DB. Automatically captures tool usage, compresses observations into facts, and injects relevant context in future sessions.

## Install

```bash
npx claude-mem install
```

This configures 6 lifecycle hooks (SessionStart, PostToolUse, Stop, etc.) and an MCP server.

## Usage

After install, memory works automatically:
- **Auto-capture:** Every tool use is observed and compressed
- **Auto-inject:** Relevant past context injected at session start
- **Search:** `claude-mem search "auth patterns"` — semantic + keyword hybrid
- **Web UI:** http://localhost:37777 — browse all memories

## Commands

```bash
claude-mem search "topic"     # Search memories
claude-mem stats              # Memory statistics
claude-mem export             # Export as JSON
claude-mem web                # Open web viewer
```

## Integration with CC Commander

claude-mem complements CCC's built-in knowledge compounding:
- **CCC knowledge:** Task-level lessons (what worked, what failed, cost)
- **claude-mem:** Observation-level memory (every tool use, code patterns, architecture decisions)

Together they provide two layers of learning — strategic (CCC) and tactical (claude-mem).

## License

AGPL-3.0. Included as a git submodule — no code derivation. See docs/LICENSES-VENDORS.md.
