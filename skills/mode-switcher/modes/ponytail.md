---
name: ponytail-mode
description: "Smallest complete change: reuse before writing, no unasked-for abstractions, finish every caller and test, never cut validation, security or accessibility. Three levels: lite, full, ultra."
tags: [mode, simplicity, yagni, code-size]
disable-model-invocation: true
---

# Ponytail Mode

## Overview

Ponytail mode makes Claude write the least new code that fully solves the task. It is based on [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT); the rules are copied in `skills/ponytail/SKILL.md`.

Default level: **full**. Switch with `/ponytail lite`, `/ponytail full` or `/ponytail ultra`. Deactivate with "stop ponytail" or "normal mode".

Ponytail governs how much code is written. It stacks with caveman (how long replies are) and adhd (what order replies take).

## Skills Loaded

`skills/ponytail/SKILL.md`. Domain skills load independently.

## Behavioral Instructions

- **Confirmation flow:** acceptEdits — confirm all file changes before applying
- **Order of preference:** skip it, reuse what the codebase has, standard library or platform, an installed dependency, one readable line, then the minimum code that works.
- **Scope:** finish every caller, test, fixture and config the change touches. Lazy about the solution, never about the change.
- **Never cut:** validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything the user asked for.
- **Shortcuts:** a known limit gets a `shortcut: <the limit>, <when to upgrade>` comment.
- **Reply ending:** one or two lines on what was skipped or not checked, and any risk.
- **Git commits and PRs:** normal format.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| auto-checkpoint | Standard | |
| confidence-gate | Elevated | Smaller diffs still need their tests |
| session-coach | Suppressed | |

## Pre-flight Checklist

- [ ] Confirm level (lite / full / ultra); default is full
- [ ] Note any active domain mode ponytail stacks with
