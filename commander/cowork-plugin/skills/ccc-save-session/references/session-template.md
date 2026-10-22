# Session file template

The section set `/ccc-save-session` writes and `/ccc-resume-session` reads (`/ccc-handoff` uses the same set). Fill every section. Write "Nothing yet" or "N/A" when a section has no content; an honest empty section beats a missing one. Only "Environment and Setup Notes" may be omitted.

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

[List only things that are confirmed working. For each item include how you
know it works: test passed, ran in browser, endpoint returned 200, etc.
Without evidence, move it to "What Has NOT Been Tried Yet" instead.]

- **[thing that works]** — confirmed by: [specific evidence]

If nothing is confirmed working yet: "Nothing confirmed working yet — all approaches still in progress or untested."

---

## What Did NOT Work (and why)

[The most important section. List every approach tried that failed.
For each failure write the exact reason so the next session does not retry it.
"threw X error because Y" is useful. "did not work" is not.]

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

[Every file touched this session, with its precise state.]

| File              | Status      | Notes                        |
| ----------------- | ----------- | ---------------------------- |
| `path/to/file.ts` | Done        | [what it does]               |
| `path/to/file.ts` | In Progress | [what is done, what is left] |
| `path/to/file.ts` | Broken      | [what is wrong]              |
| `path/to/file.ts` | Not Started | [planned but not touched]    |

If no files were touched: "No files modified this session."

---

## Decisions Made

[Architecture choices, tradeoffs accepted, approaches chosen and why.
These stop the next session from relitigating settled decisions.]

- **[decision]** — reason: [why this was chosen over alternatives]

If no significant decisions: "No major decisions made this session."

---

## Blockers and Open Questions

[Anything unresolved the next session must address. Questions that came up
but were not answered. External dependencies being waited on.]

- [blocker / open question]

If none: "No active blockers."

---

## Exact Next Step

[If known: the single most important thing to do when resuming, precise
enough that resuming needs zero thinking about where to start. If a Workflow
run, Routine or /loop is in flight, name it and how to inspect it
(`/workflows`, `/schedule`).]

[If not known: "Next step not determined — review 'What Has NOT Been Tried Yet'
and 'Blockers' sections to decide on direction before starting."]

---

## Environment and Setup Notes

[Only when relevant: commands needed to run the project, env var names
(never values), services that must be running. Omit this section entirely
for standard setup.]
```
