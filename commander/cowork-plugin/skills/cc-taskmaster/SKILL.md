---
name: cc-taskmaster
description: "TaskMaster — PRD→task decomposition, complexity analysis, implementation pipeline. Use when the user says 'parse prd', 'break down tasks', 'project planning', 'complexity analysis', 'taskmaster'."
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
---

# CC TaskMaster

Structured project planning via task-master CLI. Turns a PRD into an ordered, dependency-aware task list, then drives implementation task by task.

## Step 0 — Check Installation

```bash
which task-master && task-master --version || echo "NOT_INSTALLED"
```

If not installed, offer to install: `npm install -g task-master-ai`

Also check for MCP integration — the `task-master-ai` MCP server exposes the same operations as tools (`get_tasks`, `next_task`, `get_task`, `set_task_status`, `expand_task`). Use MCP tools when available; fall back to CLI otherwise.

## Full Workflow

### Phase 1 — Initialize

```bash
task-master init
```

Skip if `.taskmaster/` already exists.

### Phase 2 — Parse PRD

```bash
task-master parse-prd .taskmaster/docs/prd.md
# To add to an existing task list without overwriting:
task-master parse-prd .taskmaster/docs/prd.md --append
```

If no PRD exists, use Write to create `.taskmaster/docs/prd.md` with the user's requirements, then parse it.

### Phase 3 — Analyze Complexity

```bash
task-master analyze-complexity --research
```

This is an AI call — may take up to 60 seconds. Identifies which tasks need to be broken down.

### Phase 4 — Expand Tasks

```bash
task-master expand --id=3 --research       # expand one task
task-master expand --all --research        # expand all eligible tasks
```

### Phase 5 — Work Loop

```bash
task-master next                                          # find next unblocked task
task-master show 3.2                                     # view full task details
task-master set-status --id=3.2 --status=in-progress    # start working
task-master update-subtask --id=3.2 --prompt="notes"    # log progress
task-master set-status --id=3.2 --status=done           # mark complete
```

Repeat: `next` → `show` → `in-progress` → work → `update-subtask` → `done`.

### Phase 6 — View Progress

```bash
task-master list                 # all tasks and statuses
task-master list --with-subtasks # expanded view
task-master complexity-report    # complexity analysis results
```

## Task Status Values

`pending` → `in-progress` → `done` | `deferred` | `cancelled` | `blocked`

## TaskMaster vs /plan

| | `/plan` | TaskMaster |
|--|---------|-----------|
| Best for | Quick single-session planning | Multi-session PRD-driven projects |
| Output | Plan in chat context | Persistent `.taskmaster/tasks/` files |
| MCP support | No | Yes (`task-master-ai` MCP) |
| Time | Seconds | Minutes (AI calls) |

Use `/plan` for "build this feature now." Use TaskMaster for "I have a PRD and need a full project pipeline."

## AskUserQuestion Flow

When the user says "taskmaster" or "project planning," ask:

- "I have a PRD to parse" → Phase 2
- "I want to see my tasks" → `task-master list`
- "What should I work on next?" → `task-master next`
- "Analyze my project complexity" → Phase 3
- "Start from scratch" → Phase 1 then Phase 2
- "Back to main menu"
