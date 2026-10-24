---
name: ccc-save-session
description: "Compress the current session into a dense reloadable file in ~/.claude/sessions/: decisions, files touched, what worked, what failed and why, open questions, exact next step. Use when ending a session, nearing context limits, or saying save this session."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Skill
  - AskUserQuestion
argument-hint: "[optional topic or short-id]"
model: sonnet
effort: medium
---

# $ccc-save-session — Save session state

**CC Commander** · $ccc-save-session · one dated file the next session loads with `$ccc-resume-session` and continues from without re-deriving anything.

On Codex, AskUserQuestion becomes a plain-text question and skills are invoked as `$ccc-memory`.

## When to use / when not to

- Use at the end of a work session, before context limits (save first, then start a fresh session), after solving a hard problem, or whenever context must pass to a future session.
- Use `$ccc-handoff` instead when the goal is to leave this chat now and continue in a fresh one; it writes the same format and ends with that instruction.
- Use `$ccc-memory` for a durable project fact or decision that should outlive this one session.

## What happens

1. **Gather context.** Run, in the project directory:

   ```bash
   git status --short
   git diff --stat
   git log --oneline -10
   ```

   If `git` fails because the directory is not a repository, skip these and list touched files from the conversation. Then review what was discussed, attempted and decided; note every error hit and whether it was resolved. Record the test/build result already observed this session with the command that produced it; if none was observed, write "not run this session" rather than claiming a status.

2. **Resolve the file path.**

   ```bash
   mkdir -p "$HOME/.claude/sessions" && echo "$HOME/.claude/sessions" && date +%F
   ```

   Build `~/.claude/sessions/YYYY-MM-DD-<short-id>-session.tmp` from today's date and a short-id that:

   - uses only lowercase `a-z`, digits `0-9` and hyphens `-`;
   - is at least 8 characters;
   - has no uppercase letters, underscores or spaces.

   Valid: `abc123de`, `frontend-worktree-1`. Invalid: `ABC123de` (uppercase), `short` (under 8), `test_id1` (underscore). Full example: `2024-01-15-abc123de-session.tmp`. If `$ARGUMENTS` names a topic, derive the short-id from it (for example `auth-refactor`).

   Each session gets its own file. Confirm the target is free:

   ```bash
   test ! -e "$HOME/.claude/sessions/<date>-<short-id>-session.tmp" && echo free
   ```

   No `free` → change the short-id and check again.

3. **Write the file** with the Write tool at the absolute path (expand `$HOME`; the tool does not expand `~`). Use the full template in [references/session-template.md](references/session-template.md). Required sections, in order:

   - `What We Are Building` — enough context for someone with zero memory of the session.
   - `What WORKED (with evidence)` — only confirmed items, each with its evidence; anything unproven goes to "Not Tried Yet".
   - `What Did NOT Work (and why)` — the most important section: every failed approach with the exact reason or error, so the next session does not retry it.
   - `What Has NOT Been Tried Yet`
   - `Current State of Files` — every touched file as Done / In Progress / Broken / Not Started.
   - `Decisions Made` — each with its reason, so settled choices are not relitigated.
   - `Blockers and Open Questions`
   - `Exact Next Step` — precise enough that resuming needs no thought; name any in-flight Workflow run, Routine or `/loop` and how to inspect it (`/workflows`, `/schedule`).
   - `Environment and Setup Notes` — optional; env var names only, never values.

   Write "Nothing yet" or "N/A" for a genuinely empty section; never drop one. On a mid-session save, record what is known so far and mark in-progress items clearly.

4. **Verify the file.**

   ```bash
   f="$HOME/.claude/sessions/<date>-<short-id>-session.tmp"
   [[ "$(basename "$f")" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]{8,}-session\.tmp$ ]] && test -s "$f" && echo name-ok
   grep -cE '^## (What We Are Building|What WORKED|What Did NOT Work|What Has NOT Been Tried Yet|Current State of Files|Decisions Made|Blockers and Open Questions|Exact Next Step)' "$f"
   ```

   Expect `name-ok` and a count of `8`. A lower count → add the missing sections and rerun. A name failure → rename to a valid short-id and rerun.

5. **Show the file.** Print its full contents, then `Session saved to <resolved path>`, then ask the decision below. Apply any corrections with Edit and rerun step 4.

## Decision points

```yaml
question: "Does this session file look accurate?"
header: "Save session"
multiSelect: false
options:
  - label: "🟢 Looks right — done"
    description: "Keep the file as written; load it next time with $ccc-resume-session."
  - label: "Correct or add something"
    description: "Tell me what to change; I edit the file and re-verify it."
  - label: "Also record a durable decision"
    description: "Run $ccc-memory to keep a decision or gotcha beyond this session."
```

## Done when

- Step 4 printed `name-ok` and a section count of `8` after the last edit.
- The full contents and the resolved path were shown, and the user picked an option or asked for no changes.

## Guardrails

- Never append to or overwrite an earlier session file; every save is a new file.
- Never list an item under "What WORKED" without the evidence that proves it.
- Never write secrets, tokens or credential values into the file; name the variable or secret reference instead.
- Writes only inside `~/.claude/sessions/`. It does not commit, push, post, or update trackers.

## See also

- `$ccc-resume-session` — load this file in the next session and brief before working
- `$ccc-handoff` — same format, ends by moving work to a fresh chat
- `$ccc-memory` — durable project memory beyond one session
- `$ccc-recall` — search past session files

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
