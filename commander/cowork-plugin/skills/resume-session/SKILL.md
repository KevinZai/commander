---
name: resume-session
description: "Load the last saved session file from ~/.claude/sessions/ and orient fully before doing any work. Reads the complete file, formats a structured briefing (project, current state, what NOT to retry, next step), and waits for your direction. Pairs with /save-session — run this at the start of a fresh context window to pick up where you left off."
model: sonnet
effort: medium
---

# /resume-session — Resume Session State

Load the last saved session state and orient fully before doing any work.
This skill is the counterpart to `/save-session`.

## When to Use

- Starting a new session to continue work from a previous day
- After starting a fresh session due to context limits
- When handing off a session file from another source (provide the file path as argument)
- Any time you have a session file and want Claude to fully absorb it before proceeding

## Usage

```
/resume-session                                                      # loads most recent file in ~/.claude/sessions/
/resume-session 2024-01-15                                           # loads most recent session for that date
/resume-session ~/.claude/sessions/2024-01-15-session.tmp           # loads a specific legacy-format file
/resume-session ~/.claude/sessions/2024-01-15-abc123de-session.tmp  # loads a current short-id session file
```

## Process

### Step 1: Find the session file

If no argument provided:

1. Check `~/.claude/sessions/`
2. Pick the most recently modified `*-session.tmp` file
3. If the folder does not exist or has no matching files, tell the user:
   ```
   No session files found in ~/.claude/sessions/
   Run /save-session at the end of a session to create one.
   ```
   Then stop.

If an argument is provided:

- If it looks like a date (`YYYY-MM-DD`), search `~/.claude/sessions/` for files matching that date and load the most recently modified variant
- If it looks like a file path, read that file directly
- If not found, report clearly and stop

### Step 2: Read the entire session file

Read the complete file. Do not summarize yet.

### Step 3: Confirm understanding

Respond with a structured briefing in this exact format:

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
[list every failed approach with its reason — this is critical]

OPEN QUESTIONS / BLOCKERS:
[list any blockers or unanswered questions]

NEXT STEP:
[exact next step if defined in the file]
[if not defined: "No next step defined — recommend reviewing 'What Has NOT Been Tried Yet' together before starting"]

════════════════════════════════════════════════
Ready to continue. What would you like to do?
```

### Step 4: Wait for the user

Do NOT start working automatically. Do NOT touch any files. Wait for the user to say what to do next.

If the next step is clearly defined in the session file and the user says "continue" or "yes" or similar — proceed with that exact next step.

If no next step is defined — ask the user where to start, and optionally suggest an approach from the "What Has NOT Been Tried Yet" section.

---

## Edge Cases

**Multiple sessions for the same date:**
Load the most recently modified matching file for that date, regardless of filename format (legacy or short-id).

**Session file references files that no longer exist:**
Note this during the briefing — "Path/to/file.ts referenced in session but not found on disk."

**Session file is from more than 7 days ago:**
Note the gap — "This session is from N days ago (threshold: 7 days). Things may have changed." — then proceed normally.

**User provides a file path directly (e.g., forwarded from a teammate):**
Read it and follow the same briefing process — the format is the same regardless of source.

**Session file is empty or malformed:**
Report: "Session file found but appears empty or unreadable. You may need to create a new one with /save-session."

---

## Notes

- Never modify the session file when loading it — it is a read-only historical record
- The briefing format is fixed — do not skip sections even if they are empty
- "What Not To Retry" must always be shown, even if it just says "None" — it is too important to miss
- After resuming, the user may want to run `/save-session` again at the end of the new session to create a new dated file
