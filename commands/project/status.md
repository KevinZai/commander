---
description: Show project status — tasks, recent git activity, lessons count
allowed-tools: Read, Bash, Glob
---

Quick project status dashboard.

1. **Tasks**: Read `tasks/todo.md` — count in-progress vs done
2. **Recent commits**: `git log --oneline -10`
3. **Uncommitted changes**: `git status --short`
4. **Lessons**: Count entries in `tasks/lessons.md`
5. **Branch**: Current branch and ahead/behind status

Format as a clean summary card.
