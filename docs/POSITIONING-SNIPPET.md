---
description: Desktop-first positioning copy block for CC Commander v4.0. Wave 7 weaves this into README, mintlify/introduction.mdx, and plugin.md.
audience: Wave 7 technical writer, README maintainer
---

# CC Commander — Desktop-First Positioning

> This file is a copy source. Paste relevant blocks into README, mintlify docs, and plugin.md during Wave 7. Do not delete this file after use — it serves as the canonical positioning reference.

---

## Primary surface block

**Primary surface: Claude Code Desktop (aka Cowork Desktop)**

CC Commander ships as a native Claude Code Desktop plugin. Install once — all 33 skills, 17 agents, 8 lifecycle hooks, and 9 bundled MCP servers appear inside every session automatically.

> **Note:** Cowork Desktop and Claude Code Desktop are the same app, two UI modes. The plugin works identically in both. All screenshots in `docs/screenshots/` were taken in Desktop.

---

## Install block (Desktop-first)

### Install via GUI (Claude Code Desktop / Cowork Desktop)

1. Open **Settings → Plugin Marketplace**
2. Click **Add from GitHub**
3. Enter `KevinZai/commander`
4. Find `commander` in the list → click **Install**

That's it. Type `/ccc` to open the hub.

### Install via CLI (terminal only)

```
/plugin marketplace add KevinZai/commander
/plugin install commander
```

> CLI `/plugin` commands are not available inside Desktop's chat interface — use the GUI method above.

---

## What ships in the plugin

| Surface | Count | What it does |
|---------|-------|-------------|
| Skills | 33 | Click-first workflows: Plan, Build, Review, Ship, Learn, Fleet, Design, Connect, E2E, Save/Resume Session + 25 more |
| Sub-agent personas | 17 | Architect, Builder, Reviewer, Security Auditor, Designer, QA Engineer, DevOps Engineer, Data Analyst, Content Strategist, Product Manager, Performance Engineer, Researcher, Technical Writer, Fleet Worker, Debugger, TypeScript Reviewer, Python Reviewer |
| Lifecycle hooks | 8 | SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification, PreCompact, SubagentStop |
| Bundled MCP servers | 9 | Tavily, Context7, Firecrawl, Exa, GitHub, Figma, Playwright, claude-mem, sequential-thinking |

**Free forever.** No feature gating. No paywalls. No license checks.

---

## Hero entry point

```
/ccc
```

Opens the hub — a chip picker with 6 main intents. No typing past `/ccc` required.

A Desktop screenshot of this flow is pending capture at `docs/screenshots/03-ccc-hub-menu.png` (see [STATUS.md](screenshots/STATUS.md) for the capture queue). In the meantime, see `04-ccc-browse-catalog.png` for a similar chip-picker pattern.

---

## One-liner descriptions (A/B variants for README headline)

**[A] Outcome-led:**
> One plugin. 33 skills. Free forever. Your guided AI PM for Claude Code.

**[B] Pain-led:**
> Stop context-switching between docs, tools, and prompts. CC Commander runs everything from `/ccc`.

**[C] Feature-led:**
> 33 skills · 17 sub-agents · 8 hooks · 9 MCP servers — all inside Claude Code Desktop. Free forever.

Recommended: run [A] as the hero H1, [C] as the subtitle/tagline underneath.

---

## Sub-agent architecture note

CC Commander is built on Anthropic's Claude Agent SDK sub-agent primitive. The 17 specialist personas are not prompt personas — they are genuine sub-agents with their own context windows, tools, and scoped file domains. When you invoke `/ccc-fleet`, you are dispatching real parallel agents, not a single model with a persona.

This is the technical differentiator from plain Claude Code + prompts.

---

## Positioning against adjacent tools

| Tool | What it is | How CCC differs |
|------|-----------|----------------|
| aider | Code-only CLI agent | CCC is a PM layer over Claude Code, not a replacement |
| Cursor | IDE with AI | CCC runs inside Claude Code Desktop, not a competing IDE |
| Raw Claude Code | The primitive | CCC is the orchestration UX layer on top — curated workflows, sub-agents, hooks |
| Other skill packs | Static prompts | CCC routes into 502+ skills AND spawns real sub-agents |

---

## SEO title / meta description

**Title:** CC Commander — Free Claude Code Desktop Plugin | 33 Skills + 17 Agents

**Meta description:** Install CC Commander in Claude Code Desktop. 33 click-first skills, 17 specialist sub-agents, 8 lifecycle hooks, and 9 MCP servers — all free forever. Type `/ccc` to start.
