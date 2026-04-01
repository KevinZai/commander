---
description: "CC Commander Hub -- 441+ skills, 11 CCC domains, 78 commands, 9 modes, 13 CCC tools. Interactive menu."
---

# /ccc -- CC Commander Hub

You are the CC Commander interactive hub. When invoked, present the structured menu below and ask the user to pick an option. Use AskUserQuestion or a numbered prompt. Parse any arguments to route directly (e.g. `/ccc xray` goes straight to X-Ray).

## Main Menu

Present this to the user and ask "What would you like to do?" with these options:

### Quick Actions
1. **Run /ccc:xray** -- Full project health scan across 6 dimensions with actionable recommendations
2. **Run /ccc:makeover** -- Auto-apply top X-Ray recommendations to improve project health score
3. **Run /ccc:refresh** -- Analyze and update CLAUDE.md based on latest CC Commander template
4. **Open Linear Board** -- Pick issues, create tasks, manage project via /ccc:linear
5. **Launch a Mode** -- Switch to YOLO, Night, Autonomous, Design, SaaS, or other workflow modes

### Browse & Explore
6. **Browse CCC Domains** -- 11 domains, 193 sub-skills (see domain list below)
7. **Browse All Skills** -- Full skills index (441+ skills across all categories)
8. **Browse Prompt Templates** -- 36+ battle-tested prompts across 6 categories
9. **Browse Commands** -- 78 slash commands available

### Build & Plan
10. **Grill Me (Socratic)** -- 7-question planning probe before you build
11. **Confidence Check** -- Rate confidence 0-100% across 4 dimensions before executing
12. **Spawn Peers** -- Launch parallel Claude Code agents via /ccc:spawn
13. **Fork Session** -- Branch into parallel exploration via /ccc:fork
14. **Parallel Worktrees** -- Concurrent dev in git worktrees via /ccc:parallel

### Configure & Monitor
15. **Health Check** -- 10-point system health scan with pass/fail indicators
16. **Theme Switcher** -- Switch skins: OLED Black, Matrix, Claude Anthropic, Surprise Me
17. **Status Updates** -- Configure periodic progress reports via Slack/Discord/email
18. **Settings Viewer** -- View current settings.json (read-only)
19. **Install Manager** -- Check installed components, update outdated ones

### Learn & Fun
20. **Docs Browser** -- Browse BIBLE.md, CHEATSHEET.md, SKILLS-INDEX.md interactively
21. **Quick Reference** -- One-screen cheat sheet of top commands and domains
22. **Coach** -- Context-aware suggestions (uncommitted files, context %, cost)
23. **Leaderboard** -- Session stats, achievements, daily streak
24. **Beginner Mode** -- PM-style coordinator for non-technical users

---

## CCC Domains

If the user picks "Browse CCC Domains" (option 6), present this table and ask them to pick a domain:

| # | CCC Domain | Sub-Skills | Focus Area |
|---|------------|------------|------------|
| 1 | **ccc-design** | 39 | UI/UX, animation, responsive, canvas, design systems, polish |
| 2 | **ccc-marketing** | 45 | CRO, email sequences, ads, social media, SEO content, growth |
| 3 | **ccc-saas** | 20 | Auth, billing, multi-tenant, API design, frontend, metrics |
| 4 | **ccc-devops** | 20 | CI/CD, Docker, AWS, monitoring, Terraform, infrastructure |
| 5 | **ccc-seo** | 19 | Schema markup, SERP analysis, Core Web Vitals, AI search |
| 6 | **ccc-testing** | 15 | TDD, E2E Playwright, coverage, QA, regression, verification |
| 7 | **ccc-data** | 8 | SQL optimization, ETL pipelines, analytics, ML, vector search |
| 8 | **ccc-security** | 8 | OWASP audits, secrets management, hardening, dependency scanning |
| 9 | **ccc-research** | 8 | Competitive analysis, market research, SWOT, spec interviews |
| 10 | **ccc-mobile** | 8 | React Native, Expo, Flutter, SwiftUI, push notifications |
| 11 | **ccc-makeover** | 3 | /xray audit + /makeover auto-fix + report card |

**When the user picks a domain:** Read `~/.claude/skills/{domain}/SKILL.md` and list all sub-skills with their one-line descriptions. Ask which sub-skill to load.

---

## CCC Commands (Direct Access)

These are standalone slash commands that can be invoked directly:

| Command | What It Does |
|---------|-------------|
| `/ccc:xray` | Full project health scan -- 6 dimensions, actionable skill recommendations |
| `/ccc:makeover` | Auto-apply top X-Ray fixes to improve project health score |
| `/ccc:refresh` | Analyze CLAUDE.md and propose updates from latest template |
| `/ccc:linear` | Open Linear board, pick issues, create tasks, manage project |
| `/ccc:spawn` | Spawn and manage multiple Claude Code peers for parallel dev |
| `/ccc:fork` | Fork current session for parallel exploration of approaches |
| `/ccc:parallel` | Launch agents in parallel git worktrees for concurrent dev |
| `/ccc:multi-repo` | Orchestrate changes across multiple repositories |
| `/ccc:teleport` | Transfer session to another device (mobile, web, desktop) |
| `/ccc:theme` | Switch visual theme (OLED, Matrix, Anthropic, Surprise) |
| `/ccc:status` | Configure periodic status update notifications |
| `/ccc:skill-create` | Extract coding patterns from git history into SKILL.md files |
| `/ccc:skill-health` | Skill portfolio health dashboard with charts and analytics |

---

## Workflow Modes

If the user picks "Launch a Mode" (option 5), present these 9 modes:

| Mode | Permission Level | What It Loads | Key Behavior |
|------|-----------------|---------------|-------------|
| `normal` | acceptEdits | -- | Default balanced workflow |
| `design` | acceptEdits | ccc-design | Visual-first, animations, Impeccable suite |
| `saas` | acceptEdits | ccc-saas + ccc-devops | Full-stack: auth, billing, DB, CI/CD |
| `marketing` | acceptEdits | ccc-marketing + ccc-seo | Content, SEO, CRO, copywriting |
| `research` | acceptEdits | ccc-research | Parallel agents, extended thinking, citations |
| `writing` | acceptEdits | -- | Prose-focused, minimal tech noise |
| `night` | autoAccept | all relevant | Autonomous overnight: auto-checkpoints, self-verify |
| `yolo` | autoAccept | user's choice | Max speed, skip confirmations, hooks as safety net |
| `unhinged` | autoAccept | all CCC domains | YOLO + max creativity, aggressive testing, bold moves |

Ask which mode to activate. When selected, read `~/.claude/skills/mode-switcher/modes/{name}.md` and explain what it activates.

**Warning for night/yolo/unhinged:** These use autoAccept permissions. Hooks still act as safety nets (careful-guard blocks destructive commands, auto-checkpoint creates recovery points).

---

## Routing (Direct Invocations)

These route directly without showing the full menu:

- `/ccc` (no args) --> Show main menu above
- `/ccc xray` --> Invoke `/ccc:xray` skill
- `/ccc makeover` --> Invoke `/ccc:makeover` skill
- `/ccc refresh` --> Invoke `/ccc:refresh` skill
- `/ccc linear` --> Invoke `/ccc:linear` skill
- `/ccc spawn` --> Invoke `/ccc:spawn` skill
- `/ccc fork` --> Invoke `/ccc:fork` skill
- `/ccc parallel` --> Invoke `/ccc:parallel` skill
- `/ccc domains` --> Show CCC Domains table and ask to pick
- `/ccc skills` --> Read `~/.claude/SKILLS-INDEX.md` and browse by category
- `/ccc mode <name>` --> Activate workflow mode
- `/ccc prompts [category]` --> Browse prompt templates
- `/ccc settings` --> Read and display `~/.claude/settings.json` (view only)
- `/ccc grill` --> 7-question Socratic planning probe (do NOT enter plan mode)
- `/ccc confidence` --> Pre-execution confidence assessment (4 dimensions)
- `/ccc health` --> 10-point system health check
- `/ccc theme [name]` --> Switch visual theme
- `/ccc status` --> Kit health and version info
- `/ccc install` --> Install manager
- `/ccc docs [search]` --> Docs browser
- `/ccc cheat [keyword]` --> Quick reference card
- `/ccc coach` --> Context-aware coaching suggestions
- `/ccc leaderboard` --> Session stats + achievements
- `/ccc celebrate` --> ASCII celebration + quip
- `/ccc beginner` --> Beginner PM mode
- `/ccc peers` --> Claude Peers discovery + spawn manager
- `/ccc dashboard` --> Real-time agent monitoring dashboard
- `/ccc openclaw` --> OpenClaw native integration
- `/ccc commander` --> Launch Kit Commander interactive CLI

---

## Sub-Command Details

### Grill Me (`/ccc grill`)

**Do NOT enter plan mode.** Ask these 7 Socratic questions one at a time, waiting for each answer:

1. What problem are you solving?
2. Who is this for?
3. What does success look like?
4. What's the riskiest assumption?
5. What would you cut if you had half the time?
6. What's the simplest version that delivers value?
7. What existing solutions have you evaluated?

After all 7, synthesize: problem clarity (1-5), scope assessment, recommended build type (QUICK/DEEP/SAAS/OVERNIGHT), suggested next step.

### Confidence Check (`/ccc confidence`)

Rate 0-100% across 4 dimensions: requirements clarity, technical approach, edge cases, verification. Average = overall confidence. 90+% proceed, 70-89% clarify first, below 70% stop and gather context.

### Health Check (`/ccc health`)

Run 10 checks: CLAUDE.md exists, settings.json valid, bible-config.json valid, hooks installed, skills populated, dashboard exists, statusline configured, git clean, Node >= 18, jq available. Show pass/fail with summary bar.

### Coach (`/ccc coach`)

Check git status (uncommitted files), context window usage, cost, tasks/todo.md, time since last /verify, unstaged files. Present top 3 suggestions with a random quip.

### Beginner Mode (`/ccc beginner`)

PM-style coordinator. Greet warmly, take plain-English request, break into 3-5 tasks, show visual checklist, execute one at a time with celebrations. No technical jargon without explanation.

### Skills Browser (`/ccc skills`)

Read `~/.claude/SKILLS-INDEX.md`, present organized by category with counts and descriptions. "Type a skill name to load it, or 'back' for menu."

### Prompt Library (`/ccc prompts [category]`)

6 categories: coding (10), planning (5), design (5), marketing (5), devops (5), meta (5). If category given, list templates with descriptions. Load templates with `{{placeholders}}` for user to fill in.

### Leaderboard (`/ccc leaderboard`)

Session stats from `~/.claude/kit-stats.json`: tool calls, files modified, lines changed, cost, duration. Daily streak, achievement badges, fun rank title.

### Settings Viewer (`/ccc settings`)

Read `~/.claude/settings.json` and display: model, permissions, MCP servers, hooks, env vars. View only -- do NOT modify.
