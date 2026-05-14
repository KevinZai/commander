---
name: ccc-recall
description: "Search across all past Claude Code sessions — find when you solved a similar problem, what decision you made last quarter, which file you were editing the day before…"
model: sonnet
effort: medium
---

# /ccc-recall — Cross-Session Memory Search

Your past sessions are a goldmine. This skill indexes it.

> **Optional integration:** If you have `claude-mem` (a separate AGPL-licensed
> tool by @thedotmack) installed via `npm install claude-mem`, `/ccc-recall`
> will use it for vector search across sessions. **CC Commander does NOT
> bundle claude-mem** — install separately or skip; CCC's built-in grep +
> file-based recall works without it.

## When to use

- "Didn't we solve this last month?" — search instead of re-solving
- "What did I decide about {auth provider / db vendor / testing lib}?" — pull the decision
- "When did {bug} first appear?" — find the session it landed in
- "Which file had that specific comment about the edge case?" — grep across sessions

## Not for

- Current session state — that's `/ccc-memory` (curated) or `/ccc-save-session` (snapshot)
- Code search across the repo — use `Grep` tool directly
- Documentation lookup — use `context7` MCP or `/ccc-docs`

## Three-layer lookup

Run them in order of fastest-first:

### Layer 1 — Session transcripts (`~/.claude/sessions/*.tmp`)

File-based. Fast grep:
```bash
grep -l "${keyword}" ~/.claude/sessions/*.tmp | head -5
```
Returns session files whose summary mentions the keyword. Each is a structured save from `/ccc-save-session` with sections for What Worked / Didn't Work / Decisions.

### Layer 2 — `memory/` curated notes

If project has a `memory/` dir (from `/ccc-memory`):
```bash
grep -rn "${keyword}" memory/
```
Higher signal than transcripts — you curated these specifically because they mattered.

### Layer 3 — Full-text search across all sessions

If you need deeper semantic matches beyond Layer 1-2, search the full session corpus with glob:
```bash
grep -rn "${keyword}" ~/.claude/sessions/ --include="*.tmp" --include="*.md"
```
This indexes all session transcripts and archived notes. Best for semantic matches ("the time we debated SSE vs WebSocket") vs literal keyword, using native grep with context flags.

## Process

1. **Parse the question** — extract 2-3 keywords + time window ("last month", "Q4", "since shipping v4")
2. **Run Layer 1 grep** — if 1-5 hits, read the most recent, answer
3. **If no hits, Layer 2** — curated notes
4. **If still no hits, Layer 3** — full-text grep across all sessions
5. **Summarize findings** — always cite the source file + date so Kevin can verify
6. **Offer to save the recall** — if this turned out to be a common question, suggest `/ccc-memory` entry for next time

## Example

User: "What did we decide about the MCP bundling split?"

1. Layer 1 grep for "mcp bundling" in `~/.claude/sessions/*.tmp` → finds `2026-04-23-commander-blitz-session.tmp`
2. Read that file's "Decisions" section
3. Answer: "On 2026-04-23 during the post-beta.10 hardening review, R1/R5/R8 flagged 9 auto-bundled MCPs as install-day failure. Decision: trim to 2 credential-free (context7 + sequential-thinking), move rest to opt-in via /ccc-connect. Shipped in commit 3cba64d."
4. Offer: "This would make a good `/ccc-memory` entry as `memory/decisions/mcp-bundling.md` — want me to write it?"

## Depends on

- `~/.claude/sessions/` directory (created by `/ccc-save-session`)
- Optional: `memory/` in project root (created by `/ccc-memory`)
- Native bash grep (no external dependencies)

---

*Adapted from [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) (MIT license). Attribution required per MIT terms.*
