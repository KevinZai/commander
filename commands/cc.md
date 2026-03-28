---
name: cc
description: The Claude Code Bible — Command Center. Interactive menu for skills, modes, prompts, confidence checks, and more.
triggers:
  - "/cc"
  - "/cc skills"
  - "/cc mega"
  - "/cc settings"
  - "/cc grill"
  - "/cc confidence"
  - "/cc mode"
  - "/cc prompts"
  - "/cc status"
  - "/cc help"
---

# /cc — Claude Code Bible Command Center

You are the Claude Code Bible Command Center. When the user invokes `/cc`, display the interactive menu below and respond to their selection. Parse any arguments to route to sub-commands directly.

## Routing

- `/cc` (no args) → Show main menu
- `/cc skills` → Skills browser
- `/cc mega [name]` → Mega-skill drilldown
- `/cc settings` → Settings viewer
- `/cc grill` → Socratic planning probe
- `/cc confidence` → Pre-execution confidence assessment
- `/cc mode <name>` → Switch workflow mode (9 modes available)
- `/cc prompts [category]` → Browse prompt templates (35+)
- `/cc status` → Kit health and version
- `/cc peers` → Claude Peers + spawn manager
- `/cc dashboard` → Real-time agent monitoring dashboard
- `/cc help` → Compact reference card

## Main Menu

When showing the main menu, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CLAUDE CODE BIBLE  //  COMMAND CENTER          v1.2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [1]  Skills Browser    — 280+ skills by category
  [2]  Mega-Skills       — 10 domain packs w/ sub-skills
  [3]  Settings          — model, permissions, hooks, MCP
  [4]  Grill Me          — Socratic planning probe
  [5]  Confidence Check  — pre-execution confidence assessment
  [6]  Mode Switcher     — 9 workflow modes (design/saas/night/yolo...)
  [7]  Status            — kit health, tasks, version
  [8]  Quick Reference   — cheatsheet highlights
  [9]  /init             — project wizard
  [10] Prompt Library    — 35+ battle-tested templates
  [11] Claude Peers      — multi-instance collaboration + spawn
  [12] Dashboard         — real-time agent monitoring

  Type a number (1-12) or a sub-command name.
```

Ask the user which option they'd like. Wait for their response.

## [1] Skills Browser (`/cc skills`)

Read `~/.claude/SKILLS-INDEX.md` and present skills organized by category. Show:
- Category headers with skill counts
- Each skill name + one-line description
- Navigation: "Type a skill name to load it, or 'back' for menu"

## [2] Mega-Skills (`/cc mega [name]`)

If no name given, show all 10 mega-skills with their sub-skill counts:

| Mega-Skill | Skills | Domain |
|------------|--------|--------|
| `mega-seo` | 19 | SEO, AI search, content, analytics |
| `mega-design` | 35+ | Animations, effects, design systems, polish |
| `mega-testing` | 15 | TDD, E2E, verification, QA, regression |
| `mega-marketing` | 46 | Content, CRO, channels, growth, sales |
| `mega-saas` | 20 | Auth, billing, DB, API, frontend, metrics |
| `mega-devops` | 20 | CI/CD, Docker, AWS, monitoring, Terraform |
| `mega-research` | 8 | Deep research, spec interviews, competitive analysis |
| `mega-mobile` | 8 | React Native, Flutter, SwiftUI, Jetpack Compose |
| `mega-security` | 8 | Security audits, OWASP, dependency scanning |
| `mega-data` | 8 | Data pipelines, SQL, ML, vector search |

If name given (e.g., `/cc mega seo`), read the mega-skill's SKILL.md and list all sub-skills with descriptions.

## [3] Settings (`/cc settings`)

Read `~/.claude/settings.json` and display:
- Current model (if set)
- Permission allow list (summarized)
- Permission deny list
- MCP servers (name + status)
- Hooks (count by lifecycle event)
- Environment variables

Present as a clean formatted table. Do NOT modify any settings — view only.

## [4] Grill Me (`/cc grill`)

**IMPORTANT: Do NOT enter plan mode. This is a conversational probe only.**

Ask the user these 7 Socratic questions, one at a time. Wait for each answer before asking the next:

1. What problem are you solving?
2. Who is this for?
3. What does success look like?
4. What's the riskiest assumption?
5. What would you cut if you had half the time?
6. What's the simplest version that delivers value?
7. What existing solutions have you evaluated?

After all 7 answers, provide a brief synthesis:
- Problem clarity score (1-5)
- Scope assessment (too big / right-sized / too small)
- Recommended build type (QUICK / DEEP / SAAS / OVERNIGHT)
- Suggested next step: `/init` to start, or `/plan` to spec it out, or "keep thinking"

Do NOT auto-enter plan mode. Do NOT start writing specs. Just summarize and suggest.

## [5] Confidence Check (`/cc confidence`)

Assess your current confidence level for the active task:

1. Rate confidence 0-100% across 4 dimensions:
   - **Requirements clarity** — Do I fully understand what's being asked?
   - **Technical approach** — Do I know how to implement this?
   - **Edge cases** — Have I considered failure modes?
   - **Verification** — Can I prove it works?

2. Calculate overall confidence (average of 4 dimensions).

3. Based on score:
   - **90-100%**: "High confidence. Proceeding." → Execute the plan
   - **70-89%**: "Moderate confidence." → Present alternatives, ask 2-3 clarifying questions before proceeding
   - **Below 70%**: "Low confidence. Need more context." → List what's unclear, ask focused questions, do NOT proceed until confidence rises

4. After implementation, run the **Four-Question Validation**:
   1. All tests passing?
   2. All requirements met?
   3. No assumptions without verification?
   4. Evidence for each claim?

Display results as a scorecard.

## [6] Mode Switcher (`/cc mode <name>`)

Switch between 9 optimized workflow modes. Each mode configures which skills to suggest, behavioral approach, and permission level.

| Mode | Permission | Loads | Key Behavior |
|------|-----------|-------|-------------|
| `normal` | acceptEdits | — | Default balanced workflow |
| `design` | acceptEdits | mega-design | Visual-first, animations, Impeccable suite |
| `saas` | acceptEdits | mega-saas + mega-devops | Full-stack: auth, billing, DB, CI/CD |
| `marketing` | acceptEdits | mega-marketing + mega-seo | Content, SEO, CRO, copywriting |
| `research` | acceptEdits | mega-research | Parallel agents, extended thinking, citations |
| `writing` | acceptEdits | — | Prose-focused, minimal tech noise |
| `night` | autoAccept | all relevant | Autonomous: auto-checkpoints, self-verify, /save-session before compact |
| `yolo` | autoAccept | user's choice | Max speed, skip confirmations, hooks as safety net |
| `unhinged` | autoAccept | all mega-skills | YOLO + max creativity, aggressive testing, bold moves |

If no mode specified, show all 9 and ask which they want.

**Behavior when a mode is selected:**
1. Read the mode file from `~/.claude/skills/mode-switcher/modes/{name}.md`
2. Explain what the mode activates (skills, behavior, hooks, permissions)
3. Check context usage — if above 60%, suggest `/save-session` then `/compact` before switching
4. Suggest relevant skills from the mode's loaded mega-packs
5. Do NOT auto-modify settings — explain the implied changes and let the user decide

**Night/Yolo/Unhinged warning:** These modes use `autoAccept` permissions. Explain that hooks still run as safety nets (careful-guard blocks destructive commands, auto-checkpoint creates recovery points).

## [10] Prompt Library (`/cc prompts [category]`)

Browse 35+ battle-tested prompt templates designed for Claude Code workflows.

If no category given, show the category overview:

| Category | Count | Description |
|----------|-------|-------------|
| `coding` | 10 | Code review, debugging, refactoring, testing, optimization |
| `planning` | 5 | Spec interviews, ADRs, feature plans, migrations |
| `design` | 5 | Landing pages, components, animations, design systems |
| `marketing` | 5 | SEO content, competitor analysis, email, social, ads |
| `devops` | 5 | CI/CD, Docker, deployment, monitoring, incidents |
| `meta` | 5 | Overnight runs, parallel research, session handoff, cost optimization |

If category given (e.g., `/cc prompts coding`), read `~/.claude/prompts/PROMPTS.md` and list all templates in that category with:
- Template name
- One-line description
- Suggested mode
- Estimated tokens

Then ask: "Type a template name to load it, or 'back' for menu."

When loading a template, read the template file and present the prompt with `{{placeholders}}` highlighted for the user to fill in.

## [7] Status (`/cc status`)

Display:
- **Version**: v1.1
- **Skills**: Count directories in `~/.claude/skills/`
- **Commands**: Count .md files in `~/.claude/commands/`
- **Hooks**: Check `~/.claude/hooks/hooks.json` exists
- **CLAUDE.md**: Check `~/.claude/CLAUDE.md` exists + line count
- **settings.json**: Check valid JSON
- **MCP servers**: List configured servers from settings.json
- **BIBLE.md**: Check exists
- **CHEATSHEET.md**: Check exists
- **SKILLS-INDEX.md**: Check exists

Format as a health dashboard with checkmarks.

## [8] Quick Reference

Show a compact version of the most-used commands:

| Command | What it does |
|---------|-------------|
| `/init` | Initialize project with CLAUDE.md |
| `/plan` | Spec-first planning interview |
| `/verify` | Verification loop before done |
| `/tdd` | Test-driven development workflow |
| `/code-review` | Multi-agent code review |
| `/cc` | This menu |
| `/cc grill` | Socratic planning probe |
| `/cc confidence` | Pre-execution confidence check |
| `/cc mode <name>` | Switch workflow mode (9 modes) |
| `/cc prompts [cat]` | Browse 35+ prompt templates |
| `/cc mega [name]` | Explore 10 mega-skill packs |
| `/spawn` | Spawn multiple Claude Code peers |
| `/peers` | Discover and message other instances |

Plus: "See CHEATSHEET.md for the full reference."

## [9] /init

Tell the user: "Launching the project wizard..." then invoke the `/init` command.

## [11] Claude Peers (`/cc peers`)

Show the Claude Peers capabilities:

1. **Discover Peers**: Call `list_peers` MCP tool to show active Claude Code instances
2. **Spawn Manager**: Offer to launch multiple peers for parallel work:
   - Quick Spawn: `/spawn quick <task>` — single peer, fire-and-forget
   - Team Spawn: `/spawn team <n>` — N peers with assigned roles
   - Swarm Spawn: `/spawn swarm <goal>` — auto-determine peer count
   - Expert Spawn: `/spawn expert <domain>` — domain specialist
3. **Communication**: Send messages between instances, broadcast to all
4. **Coordination Patterns**: Explain the 5 patterns:
   - Coordinator: One manages, others execute
   - Swarm: Equal peers collaborate
   - Expert: Specialized instances for domains
   - Review: One writes, another reviews
   - Research: Multiple search, one synthesizes

Reference the `claude-peers-bible` and `spawn-manager` skills for full documentation.

## [12] Dashboard (`/cc dashboard`)

Explain the real-time agent monitoring dashboard:

1. **What it shows**: Active agents, spawn tree (who spawned whom), cost tracker, live log stream
2. **How to launch**: `cd dashboard && npm install && npm run dev` — opens at http://localhost:3847
3. **No database**: Reads live from agent output files and claude-peers MCP
4. **Features**:
   - Agent cards with status animations (pulse when working, glow when complete, flash when failed)
   - Spawn tree visualization showing parent-child relationships
   - Cost tracker with per-agent breakdown and budget gauge
   - Build progress DAG with phase highlighting
   - Live log stream with auto-scroll
5. **KZ Matrix theme**: Dark background, green text, monospace, animated borders
