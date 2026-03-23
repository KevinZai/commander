---
description: Review lessons learned for the current project, or add a new lesson
argument-hint: [review|add "lesson text"]
allowed-tools: Read, Write, Glob
---

Manage the project's lessons learned file.

## If "review" or no argument:
1. Read `tasks/lessons.md`
2. Summarize key patterns to remember for this session
3. If file doesn't exist, create it from template

## If "add":
1. Append the lesson to `tasks/lessons.md` with today's date
2. Format: `- **YYYY-MM-DD**: [What went wrong] → [What to do instead]`
3. Confirm what was added
