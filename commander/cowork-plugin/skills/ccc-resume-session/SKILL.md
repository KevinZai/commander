---
name: ccc-resume-session
description: "Load a saved session file from ~/.claude/sessions/ (latest, by date, or by path), read it fully, and brief project, state, what not to retry, blockers and next step before touching anything. Use when resuming work, continuing where you left off, or after a fresh session."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[YYYY-MM-DD | path/to/YYYY-MM-DD-short-id-session.tmp]"
model: sonnet
effort: medium
---

# /ccc-resume-session — Resume session state

**CC Commander** · /ccc-resume-session · a fixed-format briefing from the last saved session, then a picker; no work starts until the user chooses.

Counterpart to `/ccc-save-session` and `/ccc-handoff`, which write the files this skill reads. On Codex, AskUserQuestion becomes a plain-text question.

## When to use / when not to

- Use when starting a session that continues earlier work, after restarting for context limits, or when handed a session file from another source (pass its path).
- Use `/ccc-recall` instead to search across many past sessions for one fact; this skill loads one session in full.

## Usage

```
/ccc-resume-session                                                      # most recent file in ~/.claude/sessions/
/ccc-resume-session 2024-01-15                                           # most recent session for that date
/ccc-resume-session ~/.claude/sessions/2024-01-15-session.tmp           # a legacy-format file
/ccc-resume-session ~/.claude/sessions/2024-01-15-abc123de-session.tmp  # a current short-id file
```

## What happens

1. **Find the session file** from `$ARGUMENTS`:

   - No argument → most recently modified session file:

     ```bash
     ls -t "$HOME"/.claude/sessions/*-session.tmp 2>/dev/null | head -1
     ```

   - A date (`YYYY-MM-DD`) → most recently modified file for that date, legacy or short-id form:

     ```bash
     ls -t "$HOME"/.claude/sessions/"$ARGUMENTS"*-session.tmp 2>/dev/null | head -1
     ```

   - A path → use it directly; check it with `test -f "<path>" && echo found`.

   Empty output or no `found` → print the message below and stop.

   ```
   No session files found in ~/.claude/sessions/
   Run /ccc-save-session at the end of a session to create one.
   ```

   For a date or path that does not match, name what was searched and stop.

2. **Read the entire file** with Read. Do not summarize before the whole file is read. If it is empty or has none of the expected `## ` sections, report "Session file found but appears empty or unreadable. You may need to create a new one with /ccc-save-session." and stop.

3. **Check drift.**

   - Age in days:

     ```bash
     f="<resolved path>"; echo $(( ( $(date +%s) - $(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f") ) / 86400 ))
     ```

     Over 7 → add to the briefing: "This session is from N days ago (threshold: 7 days). Things may have changed."
   - Missing files: for each path in "Current State of Files", run `test -e "<path>" || echo "missing: <path>"` from the project root, and list each miss as "`<path>` referenced in session but not found on disk."

4. **Brief** in exactly this format. Never skip a section; write "None" when empty. "WHAT NOT TO RETRY" is always shown.

   ```
   SESSION LOADED: [actual resolved path to the file]
   ════════════════════════════════════════════════

   PROJECT: [project name / topic from file]

   WHAT WE'RE BUILDING:
   [2-3 sentence summary in your own words]

   CURRENT STATE:
   Working: [count] items confirmed
   In Progress: [list files that are in progress]
   Not Started: [list planned but untouched]

   WHAT NOT TO RETRY:
   [every failed approach with its reason]

   OPEN QUESTIONS / BLOCKERS:
   [any blockers or unanswered questions]

   NEXT STEP:
   [exact next step if defined in the file]
   [if not defined: "No next step defined — recommend reviewing 'What Has NOT Been Tried Yet' together before starting"]

   [age and missing-file notes from step 3, if any]
   ════════════════════════════════════════════════
   ```

5. **Ask, then wait.** Ask the decision below. Do not start work or touch any file before the user answers. On "Continue", carry out the exact next step from the file. On any other answer, follow the user's direction.

## Decision points

When the file defines a next step:

```yaml
question: "Where do you want to start?"
header: "CC Commander — Resume"
multiSelect: false
options:
  - label: "🟢 Continue with the next step"
    description: "Carry out the 'Exact Next Step' from the session file now."
  - label: "Review blockers first"
    description: "Work through open questions before any change."
  - label: "Start somewhere else"
    description: "Tell me the task; the briefing stays as context."
```

When it does not, offer up to three items from "What Has NOT Been Tried Yet" (the most promising first, marked 🟢) plus "Start somewhere else".

## Done when

- The resolved path was printed in the briefing, every briefing section is present, and step 3's age and missing-file checks ran.
- The picker was asked and no file was changed before the user answered.

## Guardrails

- Never modify, rename or delete the session file; it is a read-only record.
- Never start work automatically, even when the next step is obvious.
- Never fill a briefing section from memory; every line comes from the file just read.
- Reads only. It does not commit, push, post, or update trackers.

## See also

- `/ccc-save-session` — write the file this skill loads; run it again at the end of the new session
- `/ccc-handoff` — mid-task handoff in the same format
- `/ccc-session` — picker that routes to save, resume or history
- `/ccc-recall` — search across past sessions

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
