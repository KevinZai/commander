---
name: ccc-tasks
description: "Track work in one markdown file, tasks/todo.md, with checkboxes, P0-P3 priorities and status marks; no database, service or sync. Use when the user asks for a todo list, wants to track personal or side-session tasks, or types /ccc-tasks."
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[list | pick | add | done | prune]"
disable-model-invocation: true
---

# /ccc-tasks — Markdown task tracking

**CC Commander** · /ccc-tasks · one file, markdown checkboxes, a git-visible audit trail

## When to use / when not to

- Use for personal projects that do not need a tracker, side-session tracking while a larger ticket is in flight, brainstorm capture before picking one or two to execute, and a reviewable audit trail in git.
- Team coordination with two or more people: use `/ccc-linear`.
- Long-term milestones: use a tracker project.
- Sub-tasks of a complex feature: use the feature's spec doc and the session's task tool.
- In Codex, ask each picker below as a plain-text question with the same options.

## File format

`tasks/todo.md` in the project root:

```markdown
# Todo

## Active

- [~] P0 · Ship the release candidate
  - note: smoke test passes locally, CI pending
- [ ] P1 · Add retry to the webhook handler
- [x] P0 · Fix silent MCP startup failure ✅ 2026-04-23

## Blocked

- [!] P1 · Launch post — waiting on the demo recording

## Someday

- [ ] Editor companion extension
```

Priorities: **P0** this week · **P1** this month · **P2** this quarter · **P3** someday.

Status: `[ ]` todo · `[~]` in progress · `[x]` done (with date) · `[!]` blocked (with a blocker note).

## What happens

### 1. Read the file

```bash
test -f tasks/todo.md && cat tasks/todo.md || echo "no tasks/todo.md"
```

Missing: ask with AskUserQuestion "🟢 Create tasks/todo.md with the empty sections" or "Cancel". Create it with Write only on yes. This is the only time the skill writes the whole file.

### 2. Route by argument

| `$ARGUMENTS` | Step |
|---|---|
| empty, `list` | Show Active and Blocked, then step 3 |
| `pick` | Step 3 |
| `add` | Step 4 |
| `done` | Step 5 |
| `prune` | Step 6 |

### 3. Pick one to work on

Ask with AskUserQuestion: up to 4 open items, P0 first, the recommended one first and marked 🟢, each description naming its priority and section. On pick, move it under Active if it is not there, mark it `[~]`, and state the scope in one sentence.

### 4. Add a task

Ask in plain chat for the task text, then ask the priority with AskUserQuestion: "🟢 P1 · this month", "P0 · this week", "P2 · this quarter", "P3 · someday". Insert the line in the right section with Edit.

### 5. Update during and after work

- Mid-work: add indented notes under the task with Edit.
- Finished: flip to `[x]` and append `✅ YYYY-MM-DD` (today's date from `date +%F`).
- Stuck: flip to `[!]`, move under Blocked, add the blocker as an indented note.

### 6. Prune (weekly)

1. List `[x]` items dated more than 30 days ago.
2. Ask with AskUserQuestion: "🟢 Archive them to tasks/archive/YYYY-MM.md", "Keep them", "Show the list first".
3. On archive: append them to `tasks/archive/YYYY-MM.md` (create the directory with `mkdir -p tasks/archive`), then remove them from `tasks/todo.md` with Edit.

### 7. Integration

- At session start, if `tasks/todo.md` exists, suggest the top one or two P0 items.
- Suggest linking it from the project's CLAUDE.md: `See tasks/todo.md for active work`.
- The git diff is the audit trail. Suggest a commit after meaningful changes; commit only when the user asks.

## Done when

- `git diff --stat -- tasks/` (or a fresh read of `tasks/todo.md` outside git) shows exactly the intended line changes, and the reply quotes the changed lines.

## Guardrails

- Edit lines in place; never overwrite the whole file after it exists, so mid-session state is not lost.
- Never delete tasks; pruning moves them to the archive after confirmation.
- Never commit or push without the user asking.
- Never sync to an external tracker from this skill.

## See also

- `/ccc-linear` — team issues in Linear
- `/ccc-standup` — turn finished tasks into a standup
- `/ccc-save-session` — preserve session state for later

---

Adapted from `knowledge-work-plugins/productivity/task-management` under the Apache-2.0 license. Reframed around CC Commander priority conventions (P0-P3).

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
