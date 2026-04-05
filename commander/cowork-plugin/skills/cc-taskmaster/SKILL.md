---
name: cc-taskmaster
description: "TaskMaster — PRD→task decomposition, complexity analysis, implementation pipeline. Use when the user says 'parse prd', 'break down tasks', 'project planning', 'complexity analysis', 'taskmaster'."
---

# CC TaskMaster

Structured project planning via task-master CLI (v0.43.1).

## Key Commands

| Action | What it does |
|--------|-------------|
| Parse PRD | Feed requirements → structured task list with dependencies |
| Analyze complexity | Score tasks by complexity, identify high-risk |
| Expand tasks | Break large tasks into implementable subtasks |
| Next task | Find highest-priority unblocked task → build it |
| Auto-implement | Let TaskMaster drive implementation |

## Usage

Check if installed: `which task-master`
Present options via AskUserQuestion. After each action, suggest next steps.
