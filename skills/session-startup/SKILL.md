---
name: session-startup
description: |
  Auto-run at the start of every Claude Code session. Loads project context,
  checks for active tasks, connects MCP servers, and suggests the right skill
  for the current workflow phase. This is the "boot sequence" that ensures
  every session starts with maximum context and minimum waste.
  Trigger: Run at session start or when switching projects.
allowed-tools:
  - Bash
  - Read
---

# Session Startup

## Boot Sequence (run in order)

### 1. Load Context
```bash
# Read project CLAUDE.md
[ -f CLAUDE.md ] && echo "📋 Project CLAUDE.md found" || echo "⚠️ No project CLAUDE.md — consider /project init"

# Read active tasks
[ -f tasks/todo.md ] && echo "📝 Active tasks:" && grep -c "^\- \[ \]" tasks/todo.md | xargs -I{} echo "  {} incomplete items" || echo "📝 No tasks/todo.md"

# Read recent lessons
[ -f tasks/lessons.md ] && echo "📖 Lessons file found" || true
```

### 2. Check Git State
```bash
branch=$(git branch --show-current 2>/dev/null || echo "not a git repo")
dirty=$(git status -s 2>/dev/null | wc -l | tr -d ' ')
echo "🌿 Branch: $branch | Uncommitted: $dirty files"
```

### 3. Detect Workflow Phase
Based on current state, suggest the right skill:

| Signal | Phase | Skill |
|--------|-------|-------|
| No CLAUDE.md or tasks/ | **Kickoff** | `/project init` or `project-kickoff` |
| No spec file, new feature | **Spec** | `spec-interviewer` |
| Spec exists, no code | **Plan** | `writing-plans` or `/plan-eng-review` |
| Active todo items | **Build** | Continue working |
| Code written, no tests | **Verify** | `verification-before-completion` |
| Tests pass, ready to ship | **Ship** | `/ship` or `/pr` |
| Just shipped | **Retro** | `/retro` |

### 4. Report
```
🚀 Session Ready
  Project: {name}
  Branch: {branch}
  Phase: {detected phase}
  Suggested: {skill name}
  Tasks: {X incomplete / Y total}
```

## Gotchas
- Don't spend more than 10 seconds on startup — it should be fast
- If no project context, just greet and ask what we're working on
- Never auto-run destructive commands during startup
- MCP servers connect automatically — don't test them unless asked
