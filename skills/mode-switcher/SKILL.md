---
name: mode-switcher
description: Switch between optimized workflow modes — design, saas, marketing, research, writing, night, yolo, unhinged, normal
tags: [mode, workflow, configuration]
---

# Mode Switcher

> One command to reconfigure Claude Code for a specific workflow. Loads skills, sets behavioral rules, adjusts permissions.

## What Modes Do

A mode is a **preset configuration** that:
1. **Loads specific skills** — mega-skills and individual skills relevant to the workflow
2. **Sets behavioral instructions** — how Claude should think, respond, and prioritize
3. **Configures permissions** — acceptEdits (confirm changes) vs autoAccept (fully autonomous)
4. **Emphasizes hooks** — which automated checks matter most for this workflow
5. **Sets context strategy** — when to compact, what to prioritize in context window

Modes are not exclusive — you can switch at any time. Switching modes replaces the previous mode's instructions.

## Usage

```
/cc mode <name>        # Switch to a mode
/cc mode               # Show current mode + list all
/cc mode normal        # Reset to default
```

Or reference naturally in conversation: "switch to design mode", "go yolo", "enter night mode".

---

## Available Modes

| # | Mode | Loads | Permission | Key Behavior |
|---|------|-------|------------|--------------|
| 1 | **normal** | — | acceptEdits | Default balanced workflow. Standard coding with full confirmation. |
| 2 | **design** | mega-design | acceptEdits | Visual-first. Impeccable suite. Component-focused. Screenshots/previews encouraged. |
| 3 | **saas** | mega-saas + mega-devops | acceptEdits | Full-stack SaaS. Auth, billing, DB, CI/CD. Production-readiness focused. |
| 4 | **marketing** | mega-marketing + mega-seo | acceptEdits | Content creation, SEO, CRO. Copywriting focused. A/B test suggestions. |
| 5 | **research** | mega-research | acceptEdits | Parallel agent research. Extended thinking. Deep analysis. Source attribution. |
| 6 | **writing** | — | acceptEdits | Minimal tech noise. Prose-focused. Grammar/style. Long-form content. |
| 7 | **night** | all relevant mega-skills | autoAccept | Fully autonomous overnight. Auto-checkpoints. Self-verify. Detailed logs. |
| 8 | **yolo** | user's choice | autoAccept | Max speed. Skip confirmations. Hooks as safety net. Minimal explanation. |
| 9 | **unhinged** | all mega-skills | autoAccept | YOLO + max creativity. Bold architecture. Aggressive refactoring. Comprehensive testing. |

---

## Mode Details

### normal (default)
The baseline. No special skills loaded, standard confirmation flow. Use this when switching away from a specialized mode or when doing general-purpose work that doesn't fit a category.

**When to use:** General coding, maintenance, debugging, mixed tasks.

### design
Activates the full mega-design ecosystem: animations, visual effects, Impeccable polish suite, landing page builder, component design. Claude prioritizes visual output, suggests screenshots/previews, and thinks component-first.

**When to use:** UI work, landing pages, design systems, animations, visual polish.

### saas
Loads mega-saas (auth, billing, DB, API, frontend, growth) plus mega-devops (CI/CD, infrastructure, monitoring). Claude thinks in production terms — error handling, scaling, security, billing edge cases.

**When to use:** Building or extending SaaS products. Full-stack feature work.

### marketing
Combines mega-marketing (content, email, ads, social) with mega-seo (technical SEO, content SEO, analytics). Claude writes like a marketer — compelling copy, conversion-focused, data-driven recommendations.

**When to use:** Content creation, SEO optimization, email campaigns, landing page copy, CRO.

### research
Activates mega-research for deep analysis workflows. Claude uses extended thinking, spawns parallel research agents, cites sources, and produces structured findings.

**When to use:** Technical research, competitive analysis, architecture evaluation, deep dives.

### writing
No special skills — just behavioral tuning. Claude minimizes technical jargon, focuses on prose quality, grammar, flow, and structure. Ideal for long-form content, documentation, blog posts.

**When to use:** Blog posts, documentation, copywriting, any prose-heavy work.

### night (autonomous overnight)
The overnight workhorse. All relevant mega-skills loaded, full auto-accept permissions. Claude auto-checkpoints every 5 edits, self-verifies before marking tasks done, saves session before compacting, and writes detailed execution logs.

**When to use:** Large batch tasks you want done by morning. Set task list, enter night mode, walk away.

### yolo (speed mode)
Full auto-accept with whatever skills you choose. Claude skips explanations, minimizes confirmation overhead, and just builds. Hooks remain active as the safety net.

**When to use:** When you know exactly what you want and speed matters more than discussion.

### unhinged (max creativity + autonomy)
Everything YOLO offers plus maximum creative freedom. All mega-skills loaded. Claude makes bold architectural choices, aggressively refactors, and pushes boundaries — but backs it up with comprehensive testing.

**When to use:** Greenfield projects, major refactors, creative exploration where you trust Claude to make big moves.

---

## Switching Protocol

When a mode is activated:

1. **Acknowledge** — Confirm the mode switch with a brief status line
2. **Load** — Reference the mode file from `modes/{name}.md`
3. **Pre-flight** — Run the mode's pre-flight checklist
4. **Context check** — Verify context window has room for the mode's skills
5. **Activate** — Apply behavioral instructions for the remainder of the session

When switching between modes, the previous mode's instructions are fully replaced (not layered).

---

## Mode Files

Each mode is defined in `modes/{name}.md` with:
- Overview of what the mode optimizes for
- Skills loaded (mega-skills + individual skills to suggest)
- Behavioral instructions (how Claude should operate)
- Hook emphasis (which hooks matter most)
- Context strategy (pre-flight context check, compaction thresholds)
- Pre-flight checklist (what to verify before entering)
