---
name: ccc-debug-session
description: "Run a structured debug session: gather context, rank hypotheses, test them without editing code, then fix with a regression test and record the lesson. Use when a bug's cause is unclear."
usage: /ccc-debug-session [issue description]
version: 1.3.0
---

# /ccc-debug-session — hypothesis-driven bug hunt

**CC Commander** · /ccc-debug-session · root cause first, then a tested fix and a recorded lesson.

Issue: `$ARGUMENTS`. If it is empty, ask the user for the error message or the unexpected behavior before starting.

## Phase 1: Gather context

1. Recent changes:

   ```bash
   git log --oneline -10
   git diff HEAD~3
   ```

   If `HEAD~3` does not exist, use `git diff` against the first commit.
2. Reproduce: capture the exact error message, stack trace or wrong output, and the command that produces it.
3. Find related files with Grep/Glob on the symbols, messages and paths in the error.
4. Read `tasks/lessons.md` (if present) for related past fixes.
5. `git blame -L <start>,<end> <file>` on the suspect lines to see when they last changed.

## Phase 2: Hypotheses

List 3 to 5 candidate root causes, most likely first:

```
HYPOTHESIS 1 (most likely): <description>
  Evidence for:     <what supports it>
  Evidence against: <what contradicts it>
  Test:             <the read, grep or experiment that confirms or eliminates it>
```

## Phase 3: Investigate

For each hypothesis, starting with the most likely:

1. Design the smallest test that confirms or eliminates it.
2. Run it and record the result.
3. Confirmed: go to Phase 4. Eliminated: next hypothesis.

Test hypotheses with reads, greps, logs and targeted experiments. Do not edit code to try things. If every hypothesis is eliminated, gather more evidence and write a new set before touching code.

When the root cause is confirmed, ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Fix it now — write a failing test, then the minimal fix
- Report only — stop with the root cause and the proposed fix
- Investigate further — test the remaining hypotheses first

## Phase 4: Resolve

1. Write a reproduction test first and run it; it must fail for the reason found (red).
2. Implement the minimal fix and rerun the test; it must pass (green).
3. Rerun the original reproduction from Phase 1 and confirm the symptom is gone.
4. Run the project's full test command (from `package.json`, `Makefile`, `pyproject.toml` or the project `CLAUDE.md`, for example `npm test`, `pytest`, `go test ./...`). Report the actual pass/fail line.
5. Append to `tasks/lessons.md`:

   ```markdown
   ## YYYY-MM-DD — <issue>
   **Root cause:** <what actually caused it>
   **Fix:** <what changed>
   **Lesson:** <what to watch for>
   **Prevention:** <rule or test that prevents recurrence>
   ```

6. `git status --short` shows exactly the files the fix and the test touched.

## Output

```
DEBUG SESSION: <issue>
Status:            INVESTIGATING | ROOT CAUSE FOUND | FIXED | UNRESOLVED
Hypotheses tested: <x>/<y>
Root cause:        <description, or "still investigating">
Fix applied:       <yes/no — description>
Tests:             <added count>; suite <command> — <pass/fail>
Lesson captured:   <yes/no>
```

## Guardrails

- No code edits before a hypothesis is confirmed.
- Never report FIXED without the green test, the rerun reproduction and the suite result from this session.
- Never commit or push; leave that to the user or `/ccc-ship`.

## See also

`/ccc-systematic-debugging` · `/ccc-testing` · `/ccc-compound`
