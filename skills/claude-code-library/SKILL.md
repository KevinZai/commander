---
name: claude-code-library
description: The Claude Code prompt library (52 copy-paste prompts by SDLC phase) + a 7-module Claude Code Best Practices course. Use when the user asks for a Claude Code prompt to try, wants to learn/teach Claude Code best practices, or asks "how should I prompt Claude Code to do X".
tags: [claude-code, prompts, best-practices, onboarding, reference]
version: "1.0"
---

# Claude Code Library

> A curated reference: **52 copy-paste Claude Code prompts** organized by the software-development lifecycle, plus a **7-module best-practices course**. Ripped from Anthropic's official prompt library + best-practices docs (`code.claude.com/docs`) on 2026-07-14 and cross-referenced with the CC Commander bible.

## What's here

| File | Use it when |
|------|-------------|
| [`PROMPT-LIBRARY.md`](./PROMPT-LIBRARY.md) | You want a ready-to-copy prompt for a specific task (onboard a repo, plan a change, write tests, review a PR, debug an incident, automate a workflow…). 52 prompts across Discover → Design → Build → Ship → Operate, each with an example, *why it works*, and a *make-it-stick* follow-up. |
| [`COURSE.md`](./COURSE.md) | You want to learn or teach Claude Code end-to-end — the agentic loop, verification, explore-plan-code, CLAUDE.md/permissions/hooks/skills, session management, and parallel-agent scaling. 7 modules + capstone, each mapped to CC Commander commands. |

## How to use this skill

- **"Give me a prompt to <task>"** → open `PROMPT-LIBRARY.md`, find the matching SDLC phase/category, return the pre-filled prompt + the *why it works* note.
- **"Teach me / walk me through Claude Code"** → follow `COURSE.md` modules in order; each has objectives, key practices, and a hands-on exercise.
- **"How should I prompt for X?"** → apply the 6 meta-patterns (bottom of `PROMPT-LIBRARY.md`): outcome-not-steps · give-it-a-check · point-at-a-reference · measurable-target · give-it-the-artifact · say-how-you-want-the-answer.

## The one principle behind all of it

Claude's context window is the fundamental constraint, and Claude stops when work *looks* done. Every practice is downstream of: (1) keep context clean (`/clear`, subagents, a lean CLAUDE.md) and (2) give Claude a check it can run so it closes its own loop.

## Provenance & licensing

Content adapted from Anthropic's published, copy-paste-intended Claude Code docs. Fine for internal/personal use as-is. If any of this is productized for resale (e.g. into a commercial template library), reframe the wording first — the source is Anthropic-authored.
