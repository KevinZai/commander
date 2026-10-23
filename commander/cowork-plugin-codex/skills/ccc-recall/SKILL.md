---
name: ccc-recall
description: "Search past saved sessions and curated memory notes for an earlier fix, decision or file, and answer with the source file and date cited. Use when asking didn't we solve this before, what did we decide about X, or when a bug first appeared."
allowed-tools:
  - Bash
  - Read
  - Skill
  - AskUserQuestion
argument-hint: "[question or keywords] [--since YYYY-MM-DD]"
model: sonnet
effort: medium
---

# $ccc-recall — Cross-session memory search

**CC Commander** · $ccc-recall · an answer from your own past sessions and notes, with the file and date that prove it.

On Codex, AskUserQuestion becomes a plain-text question and skills are invoked as `$ccc-memory`.

> **Optional integration:** claude-mem is a separate AGPL-licensed tool by @thedotmack. CC Commander does not bundle it; it is absent by default. The built-in grep layers below work without it.

## When to use / when not to

- Use for "didn't we solve this last month?", "what did I decide about the auth provider / database / test library?", "when did this bug first appear?", or "which session had that comment about the edge case?".
- Not for the current session's state: use `$ccc-memory` (curated) or `$ccc-save-session` (snapshot).
- Not for code search across the repository: use the Grep tool directly.
- Not for library documentation: use the context7 MCP server or `$ccc-research`.

## What happens

1. **Parse the question.** Extract two or three keywords plus any time window ("last month", "since the release") and turn the window into a `YYYY-MM-DD` start date. Session filenames begin with their date, so a window filters by name.

2. **Layer 1 — saved session files** (`~/.claude/sessions/*.tmp`, written by `$ccc-save-session` and `$ccc-handoff`):

   ```bash
   grep -il -- "<keyword>" "$HOME"/.claude/sessions/*.tmp 2>/dev/null | sort -r | head -5
   ```

   With a window, append `| awk -F/ -v since=<YYYY-MM-DD> '$NF >= since'` before `head`. One to five hits → Read the newest, focusing on "Decisions Made", "What WORKED" and "What Did NOT Work", and answer. No hits → step 3.

3. **Layer 2 — curated memory notes** (from `$ccc-memory`), higher signal than session files:

   ```bash
   grep -rin -- "<keyword>" memory/ tasks/memory/ 2>/dev/null | head -20
   ```

   Hits → Read the matching notes and answer. No hits → step 4.

4. **Layer 3 — broad full-text search.** Grep is literal, so search each keyword and two or three synonyms (for example "SSE", "server-sent", "websocket") with context across every session and archived note:

   ```bash
   grep -rin -C 2 --include='*.tmp' --include='*.md' -- "<keyword-or-synonym>" "$HOME"/.claude/sessions/ 2>/dev/null | head -60
   ```

   If claude-mem's search tool is exposed in this session, query it here as well; it is not pre-approved by this skill and runs under the session's normal permission prompts. Confirm the tool is present before calling it.

5. **Answer with citations.** Every claim names its source file and date so the user can verify it. Nothing found in any layer → say so, list the keywords and layers searched, and suggest other keywords. Never answer from model memory.

6. **Offer to save the recall** when it answers a question likely to recur, using the decision below. On the 🟢 option, invoke the `ccc-memory` skill with `add`, then verify the write and report the actual output:

   ```bash
   ls -l memory/decisions/<slug>.md && head -20 memory/decisions/<slug>.md
   ```

   A missing file or a body without the cited source means the save failed; say so instead of reporting it saved.

## Decision points

```yaml
question: "Save this answer as a memory note so the next lookup is instant?"
header: "Recall"
multiSelect: false
options:
  - label: "🟢 Save as a decision note"
    description: "Run $ccc-memory add and write memory/decisions/<slug>.md with the cited source."
  - label: "No, done"
    description: "Keep the answer in this conversation only."
```

## Example

User: "What did we decide about bundling MCP servers?"

1. Layer 1 grep for `mcp` and `bundl` finds `2026-04-23-commander-blitz-session.tmp`.
2. Read its "Decisions Made" section.
3. Answer: "On 2026-04-23 (source: `~/.claude/sessions/2026-04-23-commander-blitz-session.tmp`) the decision was to bundle only credential-free MCP servers and make the rest opt-in through $ccc-connect, because servers that need credentials failed on install day."
4. Offer to save it as `memory/decisions/mcp-bundling.md`.

## Done when

- The answer cites at least one source file and date, or the report names every keyword and layer searched with no match.
- The save offer was made when the question is likely to recur.
- If the user chose to save, the note exists and its path and the `ls -l` / `head -20` output were shown.

## Guardrails

- Read-only: never edit, move or delete a session file or memory note. Saving happens only through `$ccc-memory` after the user picks it, and is confirmed by the step 6 check before it is reported as saved.
- Never present a guess as a recalled fact; uncited claims are not answers.
- Never quote secrets or credential values found in old files; name the variable instead.

## See also

- `$ccc-memory` — write the curated notes Layer 2 searches
- `$ccc-resume-session` — load one past session in full
- `$ccc-save-session` — create the files Layer 1 searches
- `$ccc-knowledge` — browse past lessons by category

---

*Adapted from [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) (MIT license). Attribution required per MIT terms.*

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
