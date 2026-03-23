---
description: Initialize a new project with standard CLAUDE.md, tasks/, and lessons tracking
argument-hint: [project-name] [description]
allowed-tools: Read, Write, Bash, Glob, LS
---

Initialize this project with the standard development setup.

## Steps:

1. **Create `CLAUDE.md`** in the project root with:
   - Project name and description (from argument or ask)
   - Tech stack (auto-detect from package.json, go.mod, etc.)
   - Directory structure overview
   - Key commands (dev, build, test, lint)
   - Database/ORM info if applicable
   - API patterns used
   - Environment variables needed
   - Deployment info
   - Reference: `~/clawd/shared/refs/shadcn-ecosystem.md` for UI projects

2. **Create `tasks/` directory** with:
   - `tasks/todo.md` — current task tracking (empty template)
   - `tasks/lessons.md` — correction log (empty template with format)
   - `tasks/backlog.md` — future work items

3. **Create `.claude/` directory** if not exists with:
   - `.claude/settings.json` — project-specific settings (inherits global)

4. **Scan the codebase** and populate CLAUDE.md with:
   - Actual file structure (key directories only)
   - Package dependencies summary
   - Available scripts from package.json
   - Any existing README content to absorb

5. **Report** what was created and any recommendations.

## Templates:

### tasks/todo.md
```markdown
# Current Tasks

## In Progress
- [ ] 

## Done
- [x] 
```

### tasks/lessons.md
```markdown
# Lessons Learned

> Updated after every correction. Review at session start.

## Format
- **Date**: What went wrong → What to do instead
```

### tasks/backlog.md
```markdown
# Backlog

## Priority
- 

## Ideas
- 
```
