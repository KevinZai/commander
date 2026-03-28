---
name: yolo-mode
description: Maximum speed — skip confirmations, minimal explanation, hooks as safety net
tags: [mode]
disable-model-invocation: true
---

# YOLO Mode

## Overview

Speed mode. Strip away everything that slows you down: confirmations, lengthy explanations, discussion of alternatives. Claude just builds. Hooks remain active as the automated safety net — they catch what the human isn't reviewing.

YOLO mode is for when you know exactly what you want and every second of discussion is wasted time.

## Skills Loaded

**User's choice.** YOLO mode doesn't prescribe which skills to load — you bring what you need. The mode only changes the execution style, not the domain.

Suggested: load the relevant mega-skill for your domain before entering YOLO mode so Claude has the right specialist knowledge available.

## Behavioral Instructions

- **Permission level:** autoAccept — no confirmation prompts. Changes are applied immediately.
- **Minimal explanation:** Don't explain what you're about to do. Don't discuss alternatives. Don't recap what you did. Just do it.
- **Speed over ceremony:** Skip code review suggestions, skip test-first discussions, skip architecture debates. Build first, refine later.
- **Batch operations:** When multiple files need changes, make them all in rapid succession. Don't pause between files.
- **Terse responses:** Short status updates only. "Done." "Fixed." "Added auth middleware to 4 routes." No paragraphs.
- **Infer intent:** If the request is ambiguous, pick the most likely interpretation and run with it. Don't ask clarifying questions.
- **Hooks are the guardrails:** Trust the automated hooks (auto-checkpoint, cost-alert, context-guard) to catch problems. Focus on output velocity.
- **Recover fast:** If something breaks, fix it immediately. Don't explain what went wrong. Just fix and move on.
- **Checkpoint periodically:** Even in speed mode, git checkpoint every 10 edits. Losing work is the opposite of fast.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| auto-checkpoint | Critical | Speed without save points is reckless |
| cost-alert | Elevated | Fast execution burns tokens faster |
| context-guard | Elevated | Rapid file changes fill context quickly |
| confidence-gate | Suppressed | Speed mode — act, don't assess |
| session-coach | Suppressed | No coaching interruptions in speed mode |

## Context Strategy

- **Pre-flight check:** Verify context is below 50% — YOLO sessions move fast and consume context rapidly
- **Compact threshold:** Compact at 65% — leave room for rapid iteration
- **Priority in context:** Files being actively modified, error output, test results
- **Deprioritize:** Documentation, explanations, historical context

## Pre-flight Checklist

- [ ] Confirm context usage is below 50%
- [ ] Clear intent — you know exactly what you want built or changed
- [ ] Auto-accept permissions are enabled
- [ ] Git working tree is clean (so checkpoints are meaningful)
- [ ] Build is passing (don't enter YOLO on a broken build)
