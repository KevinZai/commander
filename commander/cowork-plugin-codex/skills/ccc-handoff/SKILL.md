---
name: ccc-handoff
description: "Proactive context reset — write a dense handoff file and tell the user to start a NEW chat now. Context degrades quality as it fills; fix is frequent handoffs, not deeper compaction."
model: sonnet
effort: medium
---

# /ccc-handoff — Hand Off to a Fresh Session

**Core idea:** context windows degrade model quality as they fill up. The fix is not "compact harder" — it's "hand off to a fresh chat frequently." This skill writes a dense, information-preserving handoff file and then tells you, explicitly, to open a new chat and resume there. It is meant to be invoked **often**, not just when a session is dying.

Pattern popularized by Matt Pocock (open a fresh chat frequently instead of letting one session's context degrade).

## When to Use

Use this proactively — the whole point is that you run it BEFORE quality degrades, not after:

- After finishing a coherent chunk of work (a feature, a fix, a review pass) — even mid-session
- Before starting an unrelated task in the same chat (topic switch = handoff point)
- The moment you notice the model getting slower, forgetting earlier context, or making mistakes it wouldn't normally make
- Mid-way through a long orchestration run (`$ccc-orchestrate`, `$ccc-plan-exec`) — long multi-step Executor loops are exactly when context degrades fastest; do not wait for the run to finish
- End of a work session before closing Claude Code (same use case as `$ccc-save-session`, but treat "session end" as just one of many trigger points, not the primary one)

If you are asking "should I hand off now or wait" — the answer is hand off now. Frequency is cheap; degraded output is not.

## Relationship to /ccc-save-session and /ccc-resume-session

This skill reuses the **exact same file format and location** as `$ccc-save-session` — same `~/.claude/sessions/` directory, same `YYYY-MM-DD-<short-id>-session.tmp` naming. It does not invent a second format. `$ccc-resume-session` loads a handoff file with zero changes.

The difference is framing and cadence: `$ccc-save-session` is typically invoked once, at the natural end of a session. `$ccc-handoff` is the same mechanic invoked deliberately and repeatedly, as a quality-preservation habit — and it always ends with an explicit instruction to leave the current chat.

## Process

### Step 1: Gather context

Before writing the file, collect:

- Read all files modified during this session (use git diff or recall from conversation)
- Review what was discussed, attempted, and decided
- Note any errors encountered and how they were resolved (or not)
- Check current test/build status if relevant
- If this handoff is firing mid-orchestration (`$ccc-orchestrate` or `$ccc-plan-exec` in flight), capture the exact step/phase the Executor is on — not just the overall goal

### Step 2: Create the sessions folder if it does not exist

```bash
mkdir -p ~/.claude/sessions
```

### Step 3: Write the session file

Create `~/.claude/sessions/YYYY-MM-DD-<short-id>-session.tmp`, using today's actual date and a short-id that satisfies these rules:

- Allowed characters: lowercase `a-z`, digits `0-9`, hyphens `-`
- Minimum length: 8 characters
- No uppercase letters, no underscores, no spaces

Valid examples: `abc123de`, `handoff-mid-orch1`
Invalid examples: `ABC123de` (uppercase), `short` (under 8 chars), `test_id1` (underscore)

Full valid filename example: `2024-01-15-abc123de-session.tmp`

### Step 4: Populate all sections

Write every section honestly and completely — full depth, not a shorter or lossier version just because handoffs are meant to be frequent. Frequency should come from cheap, fast invocation of the full format, never from cutting corners on what's preserved. Write "Nothing yet" or "N/A" if a section genuinely has no content. An incomplete file is worse than an honest empty section.

Use the identical section set as `$ccc-save-session`:

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
enough that resuming requires zero thinking about where to start. If this
handoff fired mid-orchestration, name the exact phase/step the Executor
should re-enter — e.g. "resume /ccc-plan-exec at Step 4 of the plan file,
Task 4.2 (Task 4.1 is done and verified)."]

[If not known: "Next step not determined — review 'What Has NOT Been Tried Yet'
and 'Blockers' sections to decide on direction before starting."]

---

## Environment and Setup Notes

[Only fill this if relevant — commands needed to run the project, env vars
required, services that need to be running, etc. Skip if standard setup.]

[If none: omit this section entirely.]
```

### Step 5: Show the file to the user

After writing, display the full contents and confirm the path:

```
Handoff saved to [actual resolved path to the session file]
```

### Step 6: Tell the user to leave — this is the whole point

This is the last thing printed. Do not bury it, do not soften it, do not follow it with more discussion. Print exactly this, filled in:

```
════════════════════════════════════════════════
HANDOFF COMPLETE — START A NEW CHAT NOW

This session's context is getting long enough that quality will
start degrading if you keep working here. Open a NEW chat/session
and run:

  /ccc-resume-session [actual resolved path to the session file]

Do not continue this conversation for further work.
════════════════════════════════════════════════
```

If invoked mid-orchestration (`$ccc-orchestrate` / `$ccc-plan-exec` in flight), add one line above the box: "Orchestration paused at [phase/step] — the fresh session will resume the Executor loop from there."

---

## Anti-Patterns

- **Waiting until context is nearly full to run this.** By the time context pressure is obvious, quality has already degraded — that's the failure mode this skill exists to prevent. Run it early and often, not as a last resort.
- **Skipping the "open a new chat now" instruction, or softening it into a suggestion.** The instruction to leave is not optional framing — it is the mechanism. A handoff file nobody acts on accomplishes nothing.
- **Writing a shorter or lossier file "because this is meant to be frequent."** Frequency must come from how cheap and fast invocation is, not from truncating what gets preserved. Every section from `$ccc-save-session`'s format is still required, every time.
- **Continuing to work in the same chat after writing the file** "just to finish one more thing." That one more thing is exactly what degraded context produces worse output for.

---

## Notes

- Reuses `$ccc-save-session`'s exact file format and `~/.claude/sessions/` location — no second format, no compatibility shim needed for `$ccc-resume-session`.
- Each invocation gets its own file — never append to a previous handoff's file, even if invoked twice in one session.
- Ties into the Orchestrator/Executor model (`$ccc-orchestrate`, `$ccc-plan-exec`): long-running multi-step execution is exactly when this should fire mid-task, at natural phase boundaries — not only when the whole run finishes.
- If the user asks to hand off mid-task, save what is known so far and mark in-progress items clearly — an honest partial handoff beats waiting for a "clean" stopping point that never comes.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
