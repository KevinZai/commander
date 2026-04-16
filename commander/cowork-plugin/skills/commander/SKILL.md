---
name: commander
description: "CC Commander — interactive AI project manager hub. Use when the user says 'start commander', 'manage my project', 'what should I work on', 'open commander', 'help me build', or wants guided project management. Dispatches to other skills for specialized workflows."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[menu | build | research | linear | night | standup]"
---

# /ccc:commander

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

CC Commander — "450+ skills. One command. Your AI work, managed by AI." This is the main hub. It presents a guided menu, detects installed plugins, and dispatches to specialist skills for builds, reviews, sessions, settings, and night-mode runs.

Footer status format (render at session start and after major actions):
```
━━ CCC3.0│🔥Model│🔑Account│🧠Context│💰Cost│📋Task│📂Project
```

## Quick Mode (default)

Present the 5 most common actions via AskUserQuestion:

1. **Continue where I left off** — resume last session (→ use `session` skill)
2. **Build something new** — code, websites, APIs, CLI tools
3. **Night Mode** — autonomous overnight build (→ use `night-mode` skill)
4. **Linear board** — pick a task and build it (requires `~~project tracker`)
5. **More options...** — open the full menu

Read `references/main-menu.json` before presenting the menu to get accurate labels and flow IDs.

ALWAYS use AskUserQuestion for decisions. Every sub-menu must include "Back to main menu" as the last option.

## Power Mode

Full 15-item menu sourced from `references/main-menu.json`. Activate by passing `--power` or `detailed` as argument, or when user selects "More options...".

Menu items (from main-menu.json):
- Continue where I left off (→ `session` skill)
- Open a project (read CLAUDE.md + .claude/ context)
- Build something new (→ build sub-flow, see references/build-something.json)
- Create content (blog, social, email, marketing copy)
- Research & analyze (competitive analysis, code audit, SEO)
- Review what I built (→ `session` skill, review-work flow)
- Learn a new skill (→ `domains` skill or browse ~/.claude/skills/)
- Check my stats (sessions, streaks, cost, achievements)
- Linear board (→ `~~project tracker`)
- Night Mode (→ `night-mode` skill)
- Settings (→ `settings` skill)
- Change theme
- Infrastructure & Fleet (→ `infra` skill)
- Type a command (free-text or /slash)
- Quit (offer to save session)

### Build Sub-Flow (from references/build-something.json)

Ask project type: web app / API / backend / CLI tool / other. Then run the Spec Flow (3 questions):

**Q1 — Goal:** Something working end-to-end / Solid foundation / Quick prototype to test idea

**Q2 — Tech preferences:** Best option for me / Popular/mainstream tools / Keep it simple

**Q3 — Thoroughness:** Basics only / Include tests and error handling / Production-ready with docs

Present plan and confirm before executing.

### Plugin Detection

Scan `~/.claude/skills/` and `~/.claude/commands/` for installed packages. See `references/orchestration.md` for the full 8-phase pipeline. Show which tools are active and which phase each covers.

### Session Tracking

Write session state to `~/.claude/commander/sessions/{timestamp}.json`. CCC writes session and knowledge state to `~/.claude/commander/` (its own namespace). Never modify other parts of `.claude/`. See `references/plugin-import.md` for import rules.

## If Connectors Available

If **~~project tracker** is connected:
- Show Linear board in Quick Mode top 5
- Load open issues assigned to user and present as build options
- Create tracking issues when starting builds

If **~~source control** is connected:
- Show current branch and PR status in footer
- Offer to create a branch when starting a build

## Tips

1. Pass `--power` or `detailed` to skip Quick Mode and open the full 15-item menu immediately.
2. The footer renders live data — use `Bash` to gather cost, context %, and active Linear task from git branch.
3. Plugin detection is non-blocking — if `~/.claude/skills/` is empty, proceed with CC Commander built-ins only.
