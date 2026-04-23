---
name: save-session
description: "Compress the current Claude Code session into a dense reloadable summary — key decisions, files modified, what worked, what did NOT work, open questions, and the exact next step. Saves to ~/.claude/sessions/YYYY-MM-DD-{slug}-session.tmp so future sessions can resume with full context in one read. Use at the end of a working session before closing."
model: sonnet
effort: medium
---

# /save-session — Save Session State

Capture everything that happened in this session — what was built, what worked, what failed, what is left — and write it to a dated file so the next session can pick up exactly where this one left off.

## When to Use

- End of a work session before closing Claude Code
- Before hitting context limits (run this first, then start a fresh session)
- After solving a complex problem you want to remember
- Any time you need to hand off context to a future session

## Process

### Step 1: Gather context

Before writing the file, collect:

- Read all files modified during this session (use git diff or recall from conversation)
- Review what was discussed, attempted, and decided
- Note any errors encountered and how they were resolved (or not)
- Check current test/build status if relevant

### Step 2: Create the sessions folder if it does not exist

```bash
mkdir -p ~/.claude/sessions
```

### Step 3: Write the session file

Create `~/.claude/sessions/YYYY-MM-DD-<short-id>-session.tmp`, using today's actual date and a short-id that satisfies these rules:

- Allowed characters: lowercase `a-z`, digits `0-9`, hyphens `-`
- Minimum length: 8 characters
- No uppercase letters, no underscores, no spaces

Valid examples: `abc123de`, `frontend-worktree-1`
Invalid examples: `ABC123de` (uppercase), `short` (under 8 chars), `test_id1` (underscore)

Full valid filename example: `2024-01-15-abc123de-session.tmp`

### Step 4: Populate all sections

Write every section honestly. Do not omit any section — write "Nothing yet" or "N/A" if a section genuinely has no content. An incomplete file is worse than an honest empty section.

### Step 5: Show the file to the user

After writing, display the full contents and ask:

```
Session saved to [actual resolved path to the session file]

Does this look accurate? Anything to correct or add before we close?
```

Wait for confirmation. Make edits if requested.

---

## Session File Format

```markdown
# Session: YYYY-MM-DD

**Started:** [approximate time if known]
**Last Updated:** [current time]
**Project:** [project name or path]
**Topic:** [one-line summary of what this session was about]

---

## What We Are Building

[1-3 paragraphs describing the feature, bug fix, or task. Include enough
context that someone with zero memory of this session can understand the goal.
Include: what it does, why it is needed, how it fits into the larger system.]

---

## What WORKED (with evidence)

[List only things that are confirmed working. For each item include WHY you
know it works — test passed, ran in browser, Postman returned 200, etc.
Without evidence, move it to "Not Tried Yet" instead.]

- **[thing that works]** — confirmed by: [specific evidence]

If nothing is confirmed working yet: "Nothing confirmed working yet — all approaches still in progress or untested."

---

## What Did NOT Work (and why)

[This is the most important section. List every approach tried that failed.
For each failure write the EXACT reason so the next session does not retry it.
Be specific: "threw X error because Y" is useful. "did not work" is not.]

- **[approach tried]** — failed because: [exact reason / error message]

If nothing failed: "No failed approaches yet."

---

## What Has NOT Been Tried Yet

[Approaches that seem promising but have not been attempted. Ideas from the
conversation. Alternative solutions worth exploring.]

- [approach / idea]

If nothing is queued: "No specific untried approaches identified."

---

## Current State of Files

[Every file touched this session. Be precise about what state each file is in.]

| File              | Status         | Notes                      |
| ----------------- | -------------- | -------------------------- |
| `path/to/file.ts` | Done           | [what it does]             |
| `path/to/file.ts` | In Progress    | [what is done, what is left] |
| `path/to/file.ts` | Broken         | [what is wrong]            |
| `path/to/file.ts` | Not Started    | [planned but not touched]  |

If no files were touched: "No files modified this session."

---

## Decisions Made

[Architecture choices, tradeoffs accepted, approaches chosen and why.
These prevent the next session from relitigating settled decisions.]

- **[decision]** — reason: [why this was chosen over alternatives]

If no significant decisions: "No major decisions made this session."

---

## Blockers and Open Questions

[Anything unresolved that the next session needs to address or investigate.
Questions that came up but were not answered. External dependencies waiting on.]

- [blocker / open question]

If none: "No active blockers."

---

## Exact Next Step

[If known: The single most important thing to do when resuming. Be precise
enough that resuming requires zero thinking about where to start.]

[If not known: "Next step not determined — review 'What Has NOT Been Tried Yet'
and 'Blockers' sections to decide on direction before starting."]

---

## Environment and Setup Notes

[Only fill this if relevant — commands needed to run the project, env vars
required, services that need to be running, etc. Skip if standard setup.]

[If none: omit this section entirely.]
```

---

## Notes

- Each session gets its own file — never append to a previous session's file
- The "What Did NOT Work" section is the most critical — future sessions will blindly retry failed approaches without it
- If the user asks to save mid-session, save what is known so far and mark in-progress items clearly
- The file is meant to be read by Claude at the start of the next session via `/resume-session`
- Use the canonical global session store: `~/.claude/sessions/`
- Prefer the short-id filename form for any new session file to avoid same-day collisions
