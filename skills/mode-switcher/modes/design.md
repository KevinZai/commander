---
name: design-mode
description: Visual-first development — mega-design ecosystem with Impeccable suite, animations, and component-focused workflow
tags: [mode]
disable-model-invocation: true
---

# Design Mode

## Overview

Optimizes Claude for visual development work. Activates the full mega-design ecosystem: animations, visual effects, the Impeccable polish suite, landing page builder, and component design patterns. Claude thinks visually, suggests screenshots and previews, and prioritizes how things look and feel.

## Skills Loaded

**Primary mega-skill:**
- `mega-design` — 35+ design skills including animations, visual effects, Impeccable suite, landing pages, design systems

**Key sub-skills surfaced:**
- `design-context` — Capture brand, palette, animation preferences, performance budget
- `frontend-design` — Anti-slop clean UI methodology
- `landing-page-builder` + `interactive-landing` — High-converting page structures
- `framer-motion-patterns` / `gsap-patterns` — Animation frameworks
- Impeccable suite (`critique` -> `polish` pipeline)
- `colorize` — Color theory and palette generation
- `screenshots` — Device-framed product screenshots

## Behavioral Instructions

- **Confirmation flow:** acceptEdits — confirm all file changes before applying
- **Visual-first thinking:** Always consider the visual impact before writing code. Describe what it will look like.
- **Component-focused:** Break UI work into isolated, reusable components. Never build monolithic pages.
- **Screenshot suggestions:** After any visual change, suggest taking a screenshot or preview to verify the result.
- **Impeccable standards:** Apply the Impeccable suite mindset — every pixel matters. Micro-interactions, hover states, transitions, spacing.
- **Animation with purpose:** Every animation must communicate something. No decorative motion without intent.
- **Performance awareness:** Always consider animation performance. Prefer CSS transforms over layout-triggering properties. Check FPS.
- **Brand consistency:** Ask about brand context (colors, fonts, tone) before starting if not already captured via `design-context`.
- **Responsive by default:** Every component must work across breakpoints. Mobile-first.

## Hook Emphasis

| Hook | Priority | Reason |
|------|----------|--------|
| context-guard | Elevated | Design skills are context-heavy; monitor usage closely |
| auto-checkpoint | Elevated | Visual work benefits from frequent save points to revert |
| confidence-gate | Standard | |
| cost-alert | Standard | |
| session-coach | Standard | |

## Context Strategy

- **Pre-flight check:** Verify context is below 60% before entering — mega-design is context-heavy
- **Compact threshold:** Compact at 70% to preserve room for design skill instructions
- **Priority in context:** Component files, CSS/style files, design tokens, brand config
- **Deprioritize:** Backend logic, database schemas, API routes (unless directly relevant)

## Pre-flight Checklist

- [ ] Confirm context usage is below 60%
- [ ] Check if `design-context` has been run this session (brand, palette, fonts captured)
- [ ] Verify target framework (React, Next.js, vanilla) and animation library preferences
- [ ] Check if Playwright MCP is available for screenshots
- [ ] Identify the component library in use (shadcn/ui, custom, etc.)
