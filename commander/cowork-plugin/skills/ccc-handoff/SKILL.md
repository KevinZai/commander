---
name: ccc-handoff
description: "Write a dense handoff file and tell the user to resume in a new chat before a long context degrades output quality. Use when a chunk of work is done, the topic is about to switch, the model starts forgetting context, or a long orchestration run is mid-flight."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
argument-hint: "[optional topic or short-id]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# /ccc-handoff — Hand off to a fresh session

**CC Commander** · /ccc-handoff · a resumable handoff file plus an explicit instruction to continue in a new chat.

Output quality drops as a context window fills. This skill preserves the session's state in a file and moves the work to a fresh chat. Run it often, at natural boundaries, not only when a session is failing.

## When to use / when not to

Use it:

- After finishing a coherent chunk of work (a feature, a fix, a review pass), even mid-session.
- Before starting an unrelated task in the same chat. A topic switch is a handoff point.
- As soon as the model slows down, forgets earlier context, or makes mistakes it normally would not.
- Mid-way through a long orchestration run (`/ccc-orchestrate`, `/ccc-plan-exec`, a Workflow run). Long multi-step executor loops degrade context fastest; do not wait for the run to finish.
- At the end of a work session. This overlaps `/ccc-save-session`; session end is one trigger among many here.

If the question is "hand off now or wait", hand off now. Frequent handoffs are cheap; degraded output is not.

Do not use it to summarize for a human reader (use `/ccc-standup`) or to compact in place. This skill ends the current chat's working life.

## Relationship to /ccc-save-session and /ccc-resume-session

The file format and location are identical to `/ccc-save-session`: the `~/.claude/sessions/` directory, `YYYY-MM-DD-<short-id>-session.tmp` naming, and the same section set. There is no second format. `/ccc-resume-session` loads a handoff file unchanged.

The difference is cadence and ending. `/ccc-save-session` usually runs once at the end of a session. `/ccc-handoff` is the same mechanic used repeatedly as a quality habit, and it always ends by telling the user to leave this chat.

## What happens

### 1. Gather context

Collect, before writing anything:

```bash
git status --short
git diff --stat
git log --oneline -10
```

- Read the files modified this session (from the diff above or from the conversation).
- Review what was discussed, attempted and decided.
- Note every error hit and whether it was resolved.
- Record the current test/build result if relevant. Use the result already observed this session; if none was observed, write "not run this session" rather than claiming a status.
- If an orchestration is in flight (`/ccc-orchestrate`, `/ccc-plan-exec`, a Workflow run, a Routine or a `/loop`), capture the exact phase/step the executor is on and how to inspect it (`/workflows`, `/schedule`), not just the overall goal.

If `git` fails because the directory is not a repository, skip the git commands and list touched files from the conversation.

### 2. Resolve the file path

```bash
mkdir -p "$HOME/.claude/sessions" && echo "$HOME/.claude/sessions" && date +%F
```

Build the filename `<date>-<short-id>-session.tmp` from that date and a short-id that:

- uses only lowercase `a-z`, digits `0-9` and hyphens `-`;
- is at least 8 characters;
- has no uppercase letters, underscores or spaces.

Valid: `abc123de`, `handoff-mid-orch1`. Invalid: `ABC123de` (uppercase), `short` (under 8), `test_id1` (underscore). If `$ARGUMENTS` names a topic, derive the short-id from it (for example `auth-refactor`).

Every invocation gets its own file. Never append to an earlier handoff, even one from this same session. Confirm the target does not exist yet:

```bash
test ! -e "$HOME/.claude/sessions/<date>-<short-id>-session.tmp" && echo free
```

If it exists, change the short-id and check again.

### 3. Write the file

Write the file with the Write tool at the absolute path from step 2 (expand `$HOME`; the tool does not expand `~`). Use the section set in [references/handoff-template.md](references/handoff-template.md).

Fill every section at full depth. Frequency comes from fast invocation of the full format, never from a shorter or lossier file. Write "Nothing yet" or "N/A" when a section is genuinely empty; an incomplete file is worse than an honest empty section. Only "Environment and Setup Notes" may be omitted. Record environment variable names only, never their values.

If the user asks to hand off mid-task, save what is known so far and mark in-progress items clearly. An honest partial handoff beats waiting for a clean stopping point that never comes.

### 4. Verify the file

```bash
f="$HOME/.claude/sessions/<date>-<short-id>-session.tmp"
[[ "$(basename "$f")" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]{8,}-session\.tmp$ ]] && test -s "$f" && echo name-ok
grep -cE '^## (What We Are Building|What WORKED|What Did NOT Work|What Has NOT Been Tried Yet|Current State of Files|Decisions Made|Blockers and Open Questions|Exact Next Step)' "$f"
```

Expect `name-ok` and a count of `8`. On a lower count, add the missing sections and rerun. On a name failure, rename the file to a valid short-id and rerun.

### 5. Show the file

Print the full contents, then the resolved path:

```
Handoff saved to <resolved path>
```

### 6. Tell the user to leave

This is the last thing printed. Do not bury it, soften it, or follow it with more discussion. Print exactly this, with the real path filled in:

```
════════════════════════════════════════════════
HANDOFF COMPLETE — START A NEW CHAT NOW

This session's context is long enough that quality will
start degrading if you keep working here. Open a new
chat/session and run:

  /ccc-resume-session <resolved path>

Do not continue this conversation for further work.
════════════════════════════════════════════════
```

If an orchestration is in flight, print one line above the box: "Orchestration paused at <phase/step> — the fresh session will resume the executor loop from there."

## Decision points

None. The skill does not ask before writing: it always creates a new file under `~/.claude/sessions/` and always ends with the instruction to leave. If the user wants to keep working here instead, that is their call after the box is printed; do not offer it as an option.

## Done when

- Step 4 printed `name-ok` and a section count of `8`.
- The file contents and the resolved path were shown.
- The handoff box with the real `/ccc-resume-session <path>` line is the final output.

## Guardrails

- Never run this only when context is nearly full. By then quality has already degraded; run it early and often.
- Never skip or soften the "start a new chat now" instruction. A handoff file nobody acts on accomplishes nothing.
- Never write a shorter or lossier file because handoffs are frequent. Every section is required every time.
- Never continue working in the same chat after writing the file "to finish one more thing".
- Never overwrite or append to an existing session file.
- Never write secrets, tokens or credential values into the file; name the variable or secret reference instead.
- Writes only inside `~/.claude/sessions/`. It does not commit, push, post, or update trackers.

## See also

- `/ccc-save-session` — same format, end-of-session cadence
- `/ccc-resume-session` — loads the handoff in the new chat
- `/ccc-orchestrate`, `/ccc-plan-exec` — long executor loops where mid-run handoffs matter most

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
