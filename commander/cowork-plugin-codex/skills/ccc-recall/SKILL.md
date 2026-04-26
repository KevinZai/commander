---
name: ccc-recall
description: "Search across all past Claude Code sessions — find when you solved a similar problem, what decision you made last quarter, which file you were editing the day before a bug shipped. Three-layer lookup: session transcripts, memory/ notes, claude-mem observations. Use when you think 'I feel like we already handled this before' — before re-solving from scratch. Pairs with /resume-session (loads a specific past session) and /ccc-memory (curates recall-worthy content)."
model: sonnet
effort: medium
---

# /ccc-recall — Cross-Session Memory Search

Your past sessions are a goldmine. This skill indexes it.

## When to use

- "Didn't we solve this last month?" — search instead of re-solving
- "What did I decide about {auth provider / db vendor / testing lib}?" — pull the decision
- "When did {bug} first appear?" — find the session it landed in
- "Which file had that specific comment about the edge case?" — grep across sessions

## Not for

- Current session state — that's `/ccc-memory` (curated) or `/save-session` (snapshot)
- Code search across the repo — use `Grep` tool directly
- Documentation lookup — use `context7` MCP or `/ccc-docs`

## Three-layer lookup

Run them in order of fastest-first:

### Layer 1 — Session transcripts (`~/.claude/sessions/*.tmp`)

File-based. Fast grep:
```bash
grep -l "${keyword}" ~/.claude/sessions/*.tmp | head -5
```
Returns session files whose summary mentions the keyword. Each is a structured save from `/save-session` with sections for What Worked / Didn't Work / Decisions.

### Layer 2 — `memory/` curated notes

If project has a `memory/` dir (from `/ccc-memory`):
```bash
grep -rn "${keyword}" memory/
```
Higher signal than transcripts — you curated these specifically because they mattered.

### Layer 3 — claude-mem observations (if installed)

If the claude-mem MCP is available, query it:
```
Use mcp__plugin_claude-mem_mcp-search__smart_search with query="${question}"
```
Vector search across every session claude-mem has indexed. Best for semantic matches ("the time we debated SSE vs WebSocket") vs literal keyword.

## Process

1. **Parse the question** — extract 2-3 keywords + time window ("last month", "Q4", "since shipping v4")
2. **Run Layer 1 grep** — if 1-5 hits, read the most recent, answer
3. **If no hits, Layer 2** — curated notes
4. **If still no hits, Layer 3** — claude-mem semantic search
5. **Summarize findings** — always cite the source file + date so Kevin can verify
6. **Offer to save the recall** — if this turned out to be a common question, suggest `/ccc-memory` entry for next time

## Example

User: "What did we decide about the MCP bundling split?"

1. Layer 1 grep for "mcp bundling" in `~/.claude/sessions/*.tmp` → finds `2026-04-23-commander-blitz-session.tmp`
2. Read that file's "Decisions" section
3. Answer: "On 2026-04-23 during the post-beta.10 hardening review, R1/R5/R8 flagged 9 auto-bundled MCPs as install-day failure. Decision: trim to 2 credential-free (context7 + sequential-thinking), move rest to opt-in via /ccc-connect. Shipped in commit 3cba64d."
4. Offer: "This would make a good `/ccc-memory` entry as `memory/decisions/mcp-bundling.md` — want me to write it?"

## Depends on

- `~/.claude/sessions/` directory (created by `/save-session`)
- Optional: `memory/` in project root (created by `/ccc-memory`)
- Optional: claude-mem MCP if installed

---

Adapted from `thedotmack/claude-mem/mem-search` under MIT license. Fitted to CC Commander's save-session / resume-session / ccc-memory pattern.
