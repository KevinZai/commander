---
description: "TaskMaster — structured PRD→task decomposition, complexity analysis, and implementation pipeline. Paid tier project planning engine."
---

# /tm — TaskMaster Project Planning

TaskMaster CLI (`task-master`, v0.43.1) provides structured project planning that complements `/plan`:
- `/plan` = quick planning, 1-3 steps, immediate action
- `/tm` = full PRD parse → complexity analysis → task expansion → implementation tracking

## When activated:

Check if task-master CLI is available: `which task-master`
If not found: "TaskMaster not installed. Run: npm i -g task-master-ai"

If found, present via AskUserQuestion:

| Option | What it does |
|--------|-------------|
| Parse a PRD into tasks (Recommended) | Feed a requirements doc → get structured task list with dependencies |
| Analyze task complexity | Score tasks by complexity, identify high-risk items |
| Expand a task into subtasks | Break a large task into implementable pieces |
| Get next task to work on | Find the highest-priority unblocked task |
| View all tasks | List tasks with status, priority, dependencies |
| Auto-implement tasks | Let TaskMaster drive implementation autonomously |
| Project status | Overview of progress, blockers, completion % |
| Something else | Free text |

### Parse PRD Flow

1. Ask: "Paste the PRD or describe what you're building"
2. Run: `task-master parse-prd` with the input
3. Show generated tasks with dependencies
4. Ask: "Want to start implementing? I'll pick the first unblocked task."

### Next Task → Paperclip Flow

When user picks "Get next task":
1. Run: `task-master next-task` to find highest-priority unblocked task
2. Display the task with subtasks and dependencies
3. Ask via AskUserQuestion:
   - "Start building this task (Recommended)" — dispatch to subagent
   - "Create Paperclip issue for this" — POST to Paperclip API at localhost:3110
   - "Skip to next task"
   - "Something else"

### Auto-Implement Flow

1. Run: `task-master auto-implement-tasks`
2. Monitor progress, show completion bars
3. After each task: update status, suggest next

### Complexity Analysis

1. Run: `task-master analyze-complexity`
2. Show complexity report with risk scores
3. Recommend: high-complexity tasks should be broken down first

### After every action, suggest next steps via AskUserQuestion with the Proactive Intelligence Protocol.
