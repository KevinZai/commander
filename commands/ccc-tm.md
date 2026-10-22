---
description: "Turn a PRD into a dependency-ordered task list with the TaskMaster CLI, score complexity, expand tasks into subtasks, and work through them one at a time. Use when planning a multi-task project from a requirements doc or asking what to work on next."
---

# /ccc-tm — PRD to tracked tasks

**CC Commander** · /ccc-tm · drives the opt-in `task-master` CLI from PRD parsing through implementation tracking.

## When to use / when not to

- `/ccc-plan` is for quick planning of a few steps with immediate action.
- `/ccc-tm` is for a full project: parse a PRD, analyze complexity, expand tasks, track status across sessions in the project's TaskMaster files.

## What happens

1. **Check the CLI.** Run `command -v task-master && task-master --version`. If it is missing, tell the user TaskMaster is an optional third-party tool (`npm i -g task-master-ai`) and stop; do not install it without their choice. If the project has no TaskMaster structure yet, offer `task-master init`.
2. **Confirm subcommand names** with `task-master --help` when a command below errors; the CLI changes between releases.
3. **Pick the action** with AskUserQuestion (plain-text question where it is unavailable). Show four at a time:
   - 🟢 Parse a PRD into tasks: structured task list with dependencies.
   - Get the next task: highest-priority unblocked task.
   - Analyze complexity: scores tasks and flags the ones to break down.
   - Expand a task: subtasks for one large task.

   The second page offers: View all tasks · Work through tasks in order · Project status · Something else.

## Flows

### Parse a PRD

1. Ask for the PRD file path, or for pasted text; save pasted text to a file in the project (for example `.taskmaster/docs/prd.txt`) and confirm the path.
2. Run `task-master parse-prd --input=<file>` (add `--num-tasks=<n>` if the user names a count).
3. Run `task-master list --with-subtasks` and show the tasks with dependencies.
4. Ask: 🟢 Start the first unblocked task · Analyze complexity first · Stop here.

### Next task

1. Run `task-master next`, then `task-master show <id>` for its subtasks and dependencies.
2. Ask: 🟢 Start building this task (delegate to a subagent with the task text as its brief) · Create a tracker issue for it (only when a tracker connector such as Linear is configured; it is absent by default) · Skip to the following task · Something else.

### Analyze complexity

1. Run `task-master analyze-complexity` (add `--research` only if the user asks; it calls a research model).
2. Run `task-master complexity-report` and show the scores.
3. Recommend expanding high-complexity tasks before starting them: `task-master expand --id=<id>`.

### Expand a task

Run `task-master expand --id=<id>` (or `task-master expand --all` for every pending task after the user confirms), then `task-master show <id>`.

### View all tasks and project status

`task-master list` (`all` or `--with-subtasks` for detail, `--ready` for unblocked work). Summarize done / in-progress / pending / blocked counts from that output.

### Work through tasks in order

TaskMaster has no autonomous implementation command; the assistant runs the loop:

1. `task-master next` → `task-master set-status <id> in-progress`.
2. Implement the task, then run the project's test command and report the result.
3. On a green result, `task-master set-status <id> done`; on failure, leave it `in-progress` and report.
4. Ask before each new task: 🟢 Continue with the next task · Stop here.

## Done when

After any status-changing step, run `task-master list` and report the changed task ids and their new status. After implementation, report the actual test command output.

## Guardrails

- Do not install TaskMaster or run `--research` without the user's choice.
- Never `remove-task` or `clear-subtasks` without explicit confirmation of the ids.
- Creating tracker issues or posting anywhere needs authorization in the current conversation and an opt-in connector; ask at that moment.
- `parse-prd` and `analyze-complexity` call the AI model configured in TaskMaster (`task-master models`), which may bill the user's own provider key; say so before the first call.

## See also

`/ccc-plan` · `/ccc-tasks` · `/ccc-linear` · `/ccc-spawn`
