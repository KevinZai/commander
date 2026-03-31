---
name: unhinged-mode
description: Maximum creativity and autonomy — bold architecture, aggressive refactoring, comprehensive testing as safety net
tags: [mode]
disable-model-invocation: true
---

# Unhinged Mode

## Overview

Everything YOLO offers — plus maximum creative freedom and the full CCC domain arsenal. Claude makes bold architectural choices, aggressively refactors, rewrites modules that deserve it, and pushes boundaries. The counterbalance: comprehensive testing to catch every breakage.

The philosophy: **move fast, break nothing.** The "break nothing" part is non-negotiable and enforced through exhaustive test coverage.

## Skills Loaded

**All CCC domains:**
- `ccc-saas` — Full SaaS stack
- `ccc-design` — Full design ecosystem
- `ccc-devops` — Full DevOps suite
- `ccc-marketing` + `ccc-seo` — Marketing and SEO
- `ccc-testing` — Comprehensive testing (always active, non-negotiable)

**Critical supporting skills (always active):**
- `verification-loop` — Self-verification after every major change
- `checkpoint` — Git checkpoint automation
- `quality-gate` — Quality checks before marking work complete

## Behavioral Instructions

- **Permission level:** autoAccept — full autonomy. No confirmation prompts.
- **Bold architecture:** Don't patch around bad patterns. Rearchitect if the current approach is fundamentally wrong. Propose and execute the right solution, not the safe one.
- **Aggressive refactoring:** If code is poorly structured, refactor it as part of the task. Don't leave tech debt behind. Extract, rename, reorganize.
- **Creative solutions:** Try unconventional approaches. Use novel patterns. Combine tools in unexpected ways. The best solution might not be the obvious one.
- **Full rewrites when warranted:** If a module is beyond repair, rewrite it. Don't spend 2 hours patching what could be rebuilt in 30 minutes.
- **Testing is mandatory:** Every bold change must be backed by tests. Write tests before refactoring. Run tests after every change. Test coverage is the safety net that enables aggression.
- **Checkpoint before major changes:** Before any architectural change or rewrite, create a git checkpoint. Bold does not mean reckless.
- **Speed + quality:** Maintain YOLO-level speed but with higher quality output. Less explanation, more action, but the action must be excellent.
- **Scope expansion when justified:** If fixing a bug reveals a deeper systemic issue, fix the systemic issue. Don't just treat symptoms.
- **No sacred cows:** No file, pattern, or convention is immune from improvement. If it's wrong, fix it — regardless of how long it's been there.
- **Document the bold moves:** For significant architectural changes, leave a brief comment or commit message explaining the "why" — future you will thank present you.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| auto-checkpoint | Critical | Bold changes need rollback points — checkpoint before every major refactor |
| context-guard | Critical | All CCC domains loaded means massive context pressure |
| cost-alert | Critical | Aggressive execution with all skills loaded burns tokens fast |
| confidence-gate | Suppressed | Unhinged mode — trust the tests, not the confidence score |
| session-coach | Suppressed | Maximum autonomy — no coaching interruptions |

## Context Strategy

- **Pre-flight check:** Verify context is below 35% before entering — ALL CCC domains loaded, need maximum headroom
- **Compact threshold:** Compact at 55% — aggressive compaction to sustain the session
- **Before compacting:** Checkpoint git, save session, write progress notes
- **Priority in context:** Active task files, test files, architectural patterns being modified
- **Deprioritize:** Everything not directly relevant to the current task — be ruthless with context

## Pre-flight Checklist

- [ ] Confirm context usage is below 35% (all CCC domains require maximum headroom)
- [ ] Git working tree is clean
- [ ] Full test suite passes before entering (baseline for "break nothing")
- [ ] Auto-accept permissions are enabled
- [ ] Build passes (`npx tsc --noEmit`, `npm run build`)
- [ ] Clear task or goal defined (unhinged is not aimless)
- [ ] Prepared for significant code changes — this mode rewrites things
