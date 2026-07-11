---
name: caveman-mode
description: "Ultra-compressed communication — ~75% fewer output tokens while keeping full technical accuracy. Three levels: lite, full, ultra."
tags: [mode, tokens, efficiency, cost-saving]
disable-model-invocation: true
---

# Caveman Mode

## Overview

Caveman mode reduces output token usage by ~65-75% by stripping all non-essential language from responses. Technical content is preserved exactly — code blocks, error messages, and technical terms remain unchanged. Only prose is compressed.

Default intensity: **full**. Switch with `/caveman lite`, `/caveman full`, or `/caveman ultra`.

Caveman mode stacks with other modes. Entering caveman mode while design mode is active means: caveman-speak about design work. The domain mode governs what is discussed; caveman mode governs how it is expressed.

To deactivate: `/caveman off`, "stop caveman", or "normal mode".

## Skills Loaded

None. Caveman is a behavioral configuration only. Domain skills load independently.

## Behavioral Instructions

- **Confirmation flow:** acceptEdits — confirm all file changes before applying
- **Communication style:** See `skills/caveman/SKILL.md` for full grammar rules and intensity level definitions. Apply whichever level was activated.
- **Default intensity:** full — drop articles, filler, hedging. Sentence fragments OK.
- **Code blocks:** Write completely normal. Caveman applies to prose only.
- **Git commits:** Normal conventional commit format. Never caveman-speak commits.
- **PR descriptions:** Normal prose. Caveman is for conversational responses only.
- **CCC menus and AskUserQuestion:** Normal. User needs clear, legible options.
- **Error messages:** Quote exact. Caveman only for surrounding explanation.
- **Technical terms:** Never abbreviate or substitute. "polymorphism" stays "polymorphism".
- **Stacking behavior:** When another mode is active, caveman modifies communication style only — the other mode's domain skills and behavioral rules remain active.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| context-guard | Elevated | Compactness is the goal — compact aggressively |
| cost-alert | Elevated | Token savings are the point — track them |
| auto-checkpoint | Standard | |
| confidence-gate | Standard | |
| session-coach | Suppressed | No coaching nudges — they waste tokens |

## Context Strategy

- **Pre-flight check:** No special context requirements
- **Compact threshold:** Aggressive — compact at 70% instead of standard 80%
- **Priority in context:** Current task, code files. Cut explanatory reference docs.
- **Deprioritize:** Long narrative documentation, comments, verbose context files
- **Goal:** Maximize useful context headroom by keeping Claude's output lean

## Pre-flight Checklist

- [ ] Confirm intensity level (lite / full / ultra) — default is full
- [ ] Note any active domain mode that caveman will stack with
- [ ] Confirm code/commit/PR output will remain normal-format
