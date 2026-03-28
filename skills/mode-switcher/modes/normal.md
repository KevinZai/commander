---
name: normal-mode
description: Default balanced workflow — standard coding with full confirmation and no special skill loading
tags: [mode]
disable-model-invocation: true
---

# Normal Mode

## Overview

The default operating mode. No specialized skills are pre-loaded, no behavioral overrides are applied. Claude operates with standard coding workflow: confirm edits, explain decisions, follow conventional development practices.

Use this mode when your work doesn't fit a specialized category, or when returning from a specialized mode to general-purpose work.

## Skills Loaded

None. Skills are loaded on-demand as the task requires. This is the "clean slate" mode.

## Behavioral Instructions

- **Confirmation flow:** acceptEdits — confirm all file changes before applying
- **Explanation level:** Standard — explain reasoning for non-trivial decisions
- **Autonomy level:** Normal — ask before making architectural decisions
- **Code style:** Follow project conventions and CLAUDE.md rules
- **Error handling:** Fail fast, report clearly, suggest fixes
- **Testing:** Follow TDD workflow when writing new features

## Hook Emphasis

All hooks run at standard priority. No hooks are elevated or suppressed.

| Hook | Priority |
|------|----------|
| context-guard | Standard |
| auto-checkpoint | Standard |
| cost-alert | Standard |
| confidence-gate | Standard |
| session-coach | Standard |

## Context Strategy

- **Pre-flight check:** No special context requirements
- **Compact threshold:** Standard (compact when approaching 80% context usage)
- **Priority in context:** Current task files, project CLAUDE.md, relevant test files

## Pre-flight Checklist

- [ ] Confirm previous mode (if any) is deactivated
- [ ] Verify project CLAUDE.md is loaded
- [ ] Check for active todo list or task tracker
