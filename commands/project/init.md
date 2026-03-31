---
description: "Interactive project setup — questionnaire, skill selection, CLAUDE.md generation"
argument-hint: "[project-name]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

Load and execute the `init-decision-tree` skill.

This is the KZ Init Decision Tree — an interactive questionnaire that configures your entire project setup based on your answers.

## What It Does

1. **Asks project identity** — name, stack (auto-detects from files), deployment target
2. **Asks build type** — QUICK (<4h), DEEP (1-5 days), SAAS (1-4 weeks), or OVERNIGHT (autonomous)
3. **Drills down by domain** — loads the right KZ CCC Domains based on your answers
4. **Generates project setup:**
   - `CLAUDE.md` — tailored project instructions with recommended skills and build-type workflow
   - `tasks/todo.md` — pre-populated with first steps
   - `tasks/lessons.md` — correction log template
   - `.claude/settings.json` — stack-specific permissions
5. **Reports** what was configured and recommends the first action

If a project name is provided as argument, use it. Otherwise ask.

## Important

- **Always run the questionnaire.** Don't skip questions — the configuration depends on answers.
- **Auto-detect first, then confirm.** Check package.json, README, git remote before asking.
- **Don't overwrite existing CLAUDE.md** without asking.
- **Use AskUserQuestion** for each phase of the questionnaire.
