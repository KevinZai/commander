---
name: night-mode
description: Fully autonomous overnight operation — auto-checkpoints, self-verification, aggressive error recovery, detailed logs
tags: [mode]
disable-model-invocation: true
---

# Night Mode

## Overview

The autonomous overnight workhorse. Designed for unattended execution of large task lists while you sleep. All relevant CCC domains are loaded, permissions are set to auto-accept, and Claude operates with maximum self-sufficiency: auto-checkpoints, self-verification, aggressive error recovery, and detailed execution logs.

The guiding principle: **do the work, don't lose the work, don't break the work.**

## Skills Loaded

**All relevant CCC domains based on the task:**
- `ccc-saas` — If building/extending SaaS features
- `ccc-design` — If UI/visual work is involved
- `ccc-devops` — If infrastructure/deployment work is involved
- `ccc-marketing` + `ccc-seo` — If content/SEO work is involved
- `ccc-testing` — Always loaded for self-verification

**Critical supporting skills (always active):**
- `overnight-runner` — Overnight execution patterns and error recovery
- `strategic-compact` — Smart context compaction before hitting limits
- `verification-loop` — Self-verification before marking tasks complete
- `checkpoint` — Git checkpoint automation

## Behavioral Instructions

- **Permission level:** autoAccept — no confirmation prompts. Claude operates fully autonomously.
- **Auto-checkpoint:** Create a git checkpoint every 5 file edits. Use conventional commit messages. Never go more than 10 edits without a checkpoint.
- **Self-verification:** Before marking any task done, run the verification loop: tests pass, no TypeScript errors, no console errors, functionality works end-to-end.
- **Session persistence:** Run `/save-session` before every context compaction. Never lose progress to compaction.
- **Aggressive error recovery:** If a build breaks or test fails, spend up to 3 attempts fixing it. If still broken after 3 attempts, checkpoint the current state, log the issue, and move to the next task.
- **Detailed logging:** Write execution logs to `tasks/night-log-{date}.md` with timestamps, task status, errors encountered, and decisions made.
- **Task list discipline:** Work through tasks in order. Don't skip ahead. Mark each task with status: DONE, FAILED (with reason), or SKIPPED (with reason).
- **No questions:** Never stop to ask the user a question. Make the best judgment call and log the decision.
- **Defensive coding:** Extra defensive in night mode — more error handling, more edge case coverage, more null checks. Better safe than broken.
- **Cost awareness:** Monitor token usage. If a single task exceeds $1.50, log a warning and consider whether to continue or skip.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| auto-checkpoint | Critical | Must not lose work during unattended operation |
| cost-alert | Critical | No human to catch runaway spending |
| context-guard | Critical | Must compact before running out of context |
| confidence-gate | Elevated | Self-check before executing uncertain operations |
| session-coach | Suppressed | No human to coach — operate autonomously |

## Context Strategy

- **Pre-flight check:** Verify context is below 40% before entering — night mode sessions run long and need maximum headroom
- **Compact threshold:** Compact at 60% — aggressively early to preserve session longevity
- **Before compacting:** Save session state, checkpoint git, write progress to night log file
- **Priority in context:** Task list, current task files, test files, night log
- **Deprioritize:** Completed task files, reference documentation, design assets

## Pre-flight Checklist

- [ ] Confirm context usage is below 40% (night sessions run long)
- [ ] Task list is written to `tasks/todo.md` or provided clearly
- [ ] All dependencies are installed (`npm install` / `pnpm install` done)
- [ ] Build passes before starting (`npx tsc --noEmit`, `npm run build`)
- [ ] Tests pass before starting (`npm test`)
- [ ] Git working tree is clean (commit or stash pending changes)
- [ ] Environment variables are configured (`.env` files in place)
- [ ] Verify auto-accept permissions are enabled
- [ ] Confirm overnight-runner skill is available
