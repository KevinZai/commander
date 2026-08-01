---
name: adhd-mode
description: "Answer-first output — fix, then command, then file:line, context last. Based on ayghri/i-have-adhd (MIT). Stacks with caveman."
tags: [mode, output-shape, accessibility]
disable-model-invocation: true
---

# ADHD Mode (Answer-First Output)

## Overview

Reorders every response so the fix leads and the reasoning follows — the opposite of burying the answer three paragraphs deep. This is a **priority reorder**, not a compression mode: full technical accuracy stays, only the order changes. Based on [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) (MIT) — full contract in `commander/cowork-plugin/skills/ccc-adhd/SKILL.md`.

Default: **off**. Turn on with `/ccc-adhd on`, off with `/ccc-adhd off` or "stop adhd mode".

ADHD mode stacks with other modes and with `caveman`. It governs response *ordering*; `caveman` governs response *length*. Active together: the fix on line one, in the fewest words it takes.

## Skills Loaded

None. ADHD mode is a behavioral configuration only, same as `caveman`. Domain modes (design, saas, marketing, …) load independently and keep their own skills.

## Behavioral Instructions

- **Confirmation flow:** acceptEdits — confirm all file changes before applying
- **Response ordering:** See `commander/cowork-plugin/skills/ccc-adhd/SKILL.md` for the full ten-rule contract. Apply it to every response for the rest of the session, not just the current turn.
- **Lead with the fix:** command, file:line, or one-line answer first. Context and reasoning come after, briefly.
- **Numbered steps:** any multi-step task becomes a numbered list, one bounded action per step.
- **Restate progress every turn:** "step 3 of 5 done" — never assume the reader is holding the plan in their head.
- **Code blocks, commits, PR descriptions:** written completely normal. The contract governs conversational prose only.
- **Stacking behavior:** when another mode is active, ADHD mode changes response *ordering* only — the other mode's domain skills and rules stay active. Stacked with `caveman`, ordering and compression both apply.
- **Exceptions:** explain-mode requests, destructive actions, three-turn debug spirals, and real ambiguity all override the shape — see the full contract for each.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| confidence-gate | Standard | |
| auto-checkpoint | Standard | |
| cost-alert | Standard | |
| session-coach | Suppressed | Coaching nudges are exactly the kind of tangent this mode suppresses |

## Context Strategy

- **Pre-flight check:** No special context requirements
- **Compact threshold:** Standard (compact at 80%)
- **Priority in context:** Current task, the file being fixed. Cut narrative reference docs the same way `caveman` does.
- **Deprioritize:** Long explanatory documentation not directly needed for the fix at hand

## Pre-flight Checklist

- [ ] Confirm the toggle is genuinely on (`~/.claude/commander/output-mode.json` → `{"adhd": true}`) — a missing or malformed file means normal voice, not this mode
- [ ] Note whether stacking with `caveman` was requested
- [ ] Confirm code/commit/PR output stays normal-format regardless
