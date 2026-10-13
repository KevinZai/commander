---
description: "Report a delegated task as finished: summary of changes, tests and commits, plus an optional tracker update. Use when a task delegated by an orchestrator or tracker is done."
---

# /ccc-complete — signal delegated task done

**CC Commander** · /ccc-complete · a completion report the delegating orchestrator can read, plus an opt-in tracker update.

## Usage

`/ccc-complete [summary of what was done]`

The summary is `$ARGUMENTS`. If it is empty, draft one from steps 1 and 2.

## What happens

1. Gather evidence of the finished work:

   ```bash
   git status --short
   git log --oneline -10
   ```

   Read the project's `tasks/todo.md` if it exists and note which items this task completed.

2. Run the project's verification command (the test or check script named in `package.json`, `Makefile` or the project `CLAUDE.md`, for example `npm test`). Record pass or fail with the actual output line. Do not report the task as complete when it fails; report it as blocked with the failing line.

3. If the task references a tracker issue id (for example `ABC-123`) and the user has configured a tracker endpoint in `TASK_TRACKER_URL`, ask with AskUserQuestion (Codex: a plain-text question) at this moment:

   - 🟢 Mark the issue done — sends the summary as a comment and sets status `done`
   - Comment only — posts the summary, leaves the status unchanged
   - Skip the tracker — the report stays local

   On a yes, send the update and check the response code:

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' -X PATCH "$TASK_TRACKER_URL/api/issues/$ISSUE_ID" \
     -H "Content-Type: application/json" \
     -d '{"status": "done", "comment": "Completed: <summary>"}'
   ```

   A `2xx` code is success. Any other code: report it and leave the issue unchanged. If `TASK_TRACKER_URL` is unset or the tracker uses a different API, skip this step and say so; use the tracker's own tool (for example `/ccc-linear`) instead.

4. Write the completion report to stdout:

   ```
   TASK COMPLETE
   Summary:  <one line>
   Changed:  <files, or "none">
   Tests:    <command> — <pass/fail>
   Commits:  <short hashes, or "uncommitted">
   Tracker:  <issue id and HTTP code, or "not updated">
   ```

   When this session runs under an ACP host or another orchestrator, that host reads the final output; no extra signal is needed.

## Done when

The report shows the verification command and its real result, and any tracker update shows its HTTP code.

## Guardrails

- Tracker writes need the user's yes in this conversation; ask at step 3, not earlier.
- Never claim tests passed without running them in this session.
- Never print tokens or credentials used by the tracker.

## See also

`/ccc-handoff` · `/ccc-tasks` · `/ccc-linear`
