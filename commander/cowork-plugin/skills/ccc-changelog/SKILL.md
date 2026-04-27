---
name: ccc-changelog
description: "Show what changed in the latest CC Commander update. Reads CHANGELOG.md and renders the most-recent version section in a digestible summary. Use when the user types /ccc-changelog, asks 'what changed', 'what is new', 'what was updated', or sees the version-transition nudge. [Commander]"
model: sonnet
effort: medium
allowed-tools:
  - Read
  - Bash
argument-hint: "[version]"
---

# /ccc-changelog — What's New

Reads `CHANGELOG.md` at the repo root and surfaces the most-recent version section in a scan-friendly summary. Works whether invoked directly or triggered by the SessionStart version-transition nudge.

## Steps (always in this order)

### 1. Locate CHANGELOG.md

Read `${CLAUDE_PLUGIN_ROOT}/../../CHANGELOG.md` via the Read tool.

If that fails, try `Bash`: `find ~ -name CHANGELOG.md -path "*/cc-commander/*" 2>/dev/null | head -1` and read the result.

If no CHANGELOG.md is found: output a friendly message — "CHANGELOG.md not found. Visit https://cc-commander.com for release notes." and exit.

### 2. Extract the most-recent version section

Parse the file to find the first `## [` header (e.g. `## [4.0.0-beta.11] — 2026-04-23 — ...`). Extract everything from that line up to (but not including) the next `## [` header. That is the "current release block".

If an argument (version string) was passed, instead find the section whose header contains that version string.

### 3. Render a digestible summary

Output in this exact structure:

```
## CC Commander [VERSION] — [DATE]

**[HEADLINE from changelog section if present, else first sentence of first paragraph]**

[CHANGES — grouped by emoji category, max 5 bullets per category, ≤15 words each]

---
Full notes: CHANGELOG.md
```

**Grouping rules:**
- Scan the block for sub-headers (e.g. `### Security`, `### Tests`, `### UX`, `### New skills`) — preserve those as bold labels.
- Under each label, output at most 5 bullet points, each compressed to the single most important fact.
- If a section has more than 5 items, append: `…and N more — see CHANGELOG.md`.
- Skip sections with zero bullets after filtering.
- Maximum total output: 30 lines (not counting the header).

### 4. Footer

Always end with:

```
Run `/ccc` to get started or `/ccc-browse` to explore all 48 skills.
```

## Anti-patterns

- Never dump the raw CHANGELOG.md — always summarize.
- Never truncate mid-sentence — compress, don't cut.
- No numbered lists — bullets only.
- No "Let me know if..." sign-offs.
