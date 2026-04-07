<img src="docs/assets/ccc-hero.svg" alt="CC Commander" width="100%">

> **Every Claude Code tool. One install. An AI brain that learns.**

**Not a skill pack. An AI project manager that thinks before it acts.** 450+ skills, 98% context savings, 19 vendor packages, and an Intelligence Layer that scores complexity, reads your stack, and gets smarter every session.

<img src="docs/assets/screenshots/hero-dashboard.gif" alt="CC Commander Dashboard" width="100%">

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT) [![Skills](https://img.shields.io/badge/450%2B_Skills-4F46E5?style=for-the-badge)](./SKILLS-INDEX.md) [![Vendors](https://img.shields.io/badge/19_Vendors-D946EF?style=for-the-badge)](./docs/ACKNOWLEDGMENTS.md) [![Tests](https://img.shields.io/badge/168_Tests_Passing-059669?style=for-the-badge)](./commander/tests/) [![v2.2.1](https://img.shields.io/badge/v2.2.1-D97706?style=for-the-badge)](./CHANGELOG.md)

**[Kevin Z](https://kevinz.ai)** · **[@kzic](https://x.com/kzic)** · Built from 200+ community sources · Aggregates 19 vendor packages

**[Install](#quick-start--pick-your-path)** · **[Browse Skills](SKILLS-INDEX.md)** · **[Agent Bible](docs/BIBLE-AGENT.md)** · **[Ecosystem](docs/ECOSYSTEM.md)** · **[BIBLE](BIBLE.md)** · **[Changelog](CHANGELOG.md)** · **[Why CCC?](docs/WHY-CCC.md)** · **[Evaluation](docs/EVALUATION.md)**

---

<img src="docs/assets/section-why.svg" alt="Why" width="100%">

Stock Claude Code is a blank terminal with amnesia. No skills. No guidance. No memory. Every session starts from zero.

And it wastes 98% of your context window on tool output you'll never re-read. CC Commander sandboxes it automatically.

**CC Commander remembers everything, learns from every session, and gets smarter the more you use it.** It wraps every major Claude Code tool into one install — with a smart orchestrator, guided menus, and an Intelligence Layer that auto-adjusts every dispatch based on your project.

```
You type: ccc
You get:  A guided AI project manager with 450+ skills,
          19 vendor packages, real learning, and zero setup.
```

<img src="docs/assets/ccc-flow.svg" alt="How CCC Works" width="100%">

---

<img src="docs/assets/section-install.svg" alt="Install" width="100%">

## Quick Start — Pick Your Path

One question: **How are you using Claude?**

### Path A: Claude Code CLI (Terminal)

> You use `claude` in your terminal. This is the most common way.

```bash
npm install -g cc-commander
```

Then:

```bash
ccc
```

Arrow keys to navigate. Enter to select. That's it.

**What you get:** Full CLI with tmux split mode, daemon, theme switching, and the cockpit dashboard.

---

### Path B: Claude Code (Slash Commands Only)

> You don't want the full CLI. Just want skills + commands inside Claude Code.

```bash
curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash
```

Then in any Claude Code session:

```
/ccc
```

Full interactive menu appears. Same features, no separate CLI needed.

**What you get:** All 450+ skills and commands, no extra CLI binary required.

---

### Path C: Claude Desktop (Cowork Plugin)

> You use Claude Desktop and want CC Commander as a Cowork plugin.

```
/plugin marketplace add KevinZai/cc-commander
```

CC Commander appears as a skill you can invoke. Say "start commander" or "what should I work on" to begin.

**What you get:** 7 Cowork skills — project management, infrastructure, knowledge base, and night mode.

---

<img src="docs/assets/section-how-to-use.svg" alt="How to Use" width="100%">

## Your First 60 Seconds

```
1. ccc → Main menu (14 options)
2. Pick "Build something new" → Choose project type
3. Answer 3 multiple-choice questions → CCC generates a plan
4. CCC dispatches Claude with the right model, budget, and skills
5. Session ends → CCC extracts lessons → gets smarter next time
```

No configuration. No YAML. No API keys. The Intelligence Layer handles everything.

---

## See It In Action

<!-- Real terminal recordings via vhs (Catppuccin Mocha theme) -->
<!-- Re-generate: vhs /tmp/ccc-*.tape from project root -->

### The Main Menu — Arrow Keys, No Commands to Memorize

<img src="docs/assets/screenshots/mainmenu.gif" alt="CC Commander Main Menu" width="100%">

### The Dashboard — Mission Control for Every Session

<img src="docs/assets/screenshots/hero-dashboard.gif" alt="CC Commander Dashboard" width="100%">

### 11 CCC Domains — One Skill Loads an Entire Specialty

<img src="docs/assets/screenshots/domains.gif" alt="CCC Domains" width="100%">

### Intelligence Layer — CCC Thinks Before It Acts

<img src="docs/assets/screenshots/intelligence.gif" alt="Intelligence Layer" width="100%">

### 5-Layer Token Optimization — 98% Context Savings

<img src="docs/assets/screenshots/optimization.gif" alt="Token Optimization Stack" width="100%">

### Live ASCII Meters — Green → Yellow → Red

<img src="docs/assets/screenshots/live-meters.gif" alt="Live ASCII Meters" width="100%">

### 450+ Skills — Install Only What You Need

<img src="docs/assets/screenshots/skills-install.gif" alt="Skill Management" width="100%">

> All recordings are real terminal output captured with [vhs](https://github.com/charmbracelet/vhs). No mockups.

### Main Menu — Multiple Choice Navigation

The first thing you see. Arrow keys only — no commands to memorize.

<!-- Version is tracked in package.json — update all references when bumping -->
```
╔══════════════════════════════════════════╗
║  CC COMMANDER v2.2                       ║
║  Your AI Project Manager                 ║
╚══════════════════════════════════════════╝

  What would you like to do?

  ❯ Build something new          ← code, websites, APIs
    Import a project             ← auto-detect & audit
    Create content               ← blogs, social, email
    Research & analyze           ← competitors, markets
    Linear board                 ← pick issues to build
    Browse 450+ skills           ← search by keyword
    Check my stats               ← sessions, streaks
    Night Mode / YOLO            ← overnight autonomous
    Infrastructure               ← Fleet, Synapse, Cost
    Settings                     ← name, level, theme
    ↓ more...

  ↑↓ Navigate  ⏎ Select  q Quit
```

### Intelligence Analysis — Smart Dispatch

Before dispatching a single token, CCC scores your task, reads your stack, and auto-configures the session.

```
  Task: "Add authentication with JWT and OAuth"

  Intelligence Analysis:
  ├─ Complexity Score: 72/100 (complex)
  ├─ Keyword signals:  +15 (auth) +15 (implement) +20 (production)
  ├─ Word count:       +10 (detailed description)
  ├─ Stack detected:   nextjs, react, tailwind
  └─ Related lessons:  2 found (JWT auth succeeded, OAuth2 pattern)

  Auto-configured dispatch:
     Model: opus  |  Turns: 35  |  Budget: $6
     Skills: nextjs-app-router, ccc-saas, auth-patterns
     Knowledge: 2 past lessons injected

  Dispatching... ████████████████████░░░░ 78%
```

### Skill Recommendations — Ranked by Relevance

CCC ranks skills using your stack + task keywords + past usage. The right tools surface automatically.

```
  Recommended skills for your project:

  SCORE  SKILL                 WHY
  ─────────────────────────────────────────────
   20    nextjs-app-router     Stack match + keyword
   16    frontend-design       Stack match
   16    shadcn-ui             Stack match
   14    saas-scaffolder       Keyword: auth, billing
   12    tailwind-v4           Stack match
    8    ccc-testing           Always recommended

  ❯ Use top recommendation
    Browse all 450+ skills
    Search by keyword
    Back to main menu
```

### Cockpit Dashboard — Live Session Status

Context, rate limits, and budget meters in your terminal. Color-codes green → yellow → red as limits approach.

```
  ══════════════════════════════════════════
  CC COMMANDER  v2.2                    <!-- update version on bump -->
  ─────────────────────────────────────────
  🔥 Opus4.6-1M  |  $2.14  |  ↑42K↓8K  |  3m12s
  CTX  [████████████░░░░░░░░] 62%   ← green
  5h   [████░░░░░░░░░░░░░░░░] 23%   ← green (ClaudeSwap)
  7d   [██████░░░░░░░░░░░░░░] 34%   ← green (ClaudeSwap)
  ─────────────────────────────────────────
  📋 CC-150  |  🎯 450+ skills  |  📦 19 vendors

  Footer: ━━ 🌈CCC2.2│🔥Opus4.6-1M│🔑gAA│🧠▐██45%▌│⏱️▐██6%▌│📅▐██34%▌│💰$2.34│🎯37│📂~/project
```

### Night Mode / YOLO — Autonomous Overnight Build

Configure once, run while you sleep. CCC checkpoints every 10 edits and self-tests after each phase.

```
  YOLO Mode — Autonomous Overnight Build

  What are we building tonight?
  > "Full e-commerce checkout with Stripe integration"

  Configuration:
  ├─ Model:       Opus (max reasoning)
  ├─ Budget:      $10 (hard cap)
  ├─ Max turns:   100
  ├─ Self-test:   Enabled (tests after each phase)
  ├─ Checkpoint:  Every 10 edits
  └─ Stop file:   ~/.claude/commander/yolo-stop

  Ready to run for up to 8 hours unattended.

  ❯ Start YOLO build
    Adjust settings
    Cancel
```

### Knowledge Compounding — Learning After Every Session

Every completed session extracts patterns and errors. The next dispatch is informed by everything that worked before.

```
  Session Complete — Knowledge Extracted

  Task:     "Add JWT authentication"
  Outcome:  Success
  Cost:     $4.12  |  Duration: 12m
  Category: api

  Patterns learned:
  ├─ bcrypt + JWT combo works well with Next.js
  ├─ httpOnly cookies for token storage
  ├─ middleware.ts matcher needs exact paths
  └─ next-auth conflicts with custom Prisma adapter

  Knowledge base: 47 lessons  |  12 categories
  Next dispatch will be 23% more informed.
```

### Project Import — Stack Auto-Detection

CCC reads your project before every dispatch. No setup needed.

```
  Importing: ~/projects/my-saas-app

  Detected:
  ├─ CLAUDE.md           142 lines
  ├─ Tech stack:         nextjs, react, tailwind, prisma, stripe
  ├─ Monorepo:           No
  ├─ Git branch:         feature/checkout
  └─ Recent commits:     "add cart", "fix price calc", "stripe webhook"

  6 skills pre-selected for this stack
  3 relevant lessons from knowledge base

  ❯ Start building in this project
    Run /xray health audit first
    Back to main menu
```

---

## CLI Reference

| Command | What It Does |
|---------|-------------|
| `ccc` | Interactive mode (default — tmux tabbed) |
| `ccc --stats` | Sessions, streaks, level, cost |
| `ccc --test` | 22-point self-test (verify install) |
| `ccc --update` | Pull latest vendor package updates |
| `ccc --repair` | Reset corrupt state |
| `ccc --simple` | Menu-only, no tmux |
| `ccc --dispatch "task"` | Headless dispatch (for AI agents) |
| `ccc --skills` | Manage skill tiers (list, install, remove, tier) |

---

<img src="docs/assets/section-features.svg" alt="Features" width="100%">

<img src="docs/assets/ccc-components.svg" alt="Components" width="100%">

| Component | Count | What It Does |
|-----------|-------|-------------|
| Skills | 450+ | On-demand expertise (deduplicated) |
| CCC Domains | 11 | Domain routers with sub-skills |
| Commands | 80+ | Slash commands (/ccc: prefix) |
| Hooks | 28 | Lifecycle automation |
| Adventures | 13 | Guided interactive flows |
| Vendor Packages | 16 | Best-in-class tools, auto-updated |
| Themes | 10 | Cyberpunk, Fire, Ocean, Aurora, Sunset, Monochrome, Rainbow, Dracula + more |
| Prompts | 36+ | Battle-tested templates |
| Modes | 9 | Workflow presets |
| Split Mode | tmux | Tabbed sessions — each task gets a window |
| Agent API | CLI | Headless dispatch for AI orchestrators |
| Infrastructure | 6 | Fleet, Synapse, Cost, AO, CloudCLI, Paperclip commands |
| Service Detector | auto | Probes 8 services + 4 CLIs on startup |

---

## Split Mode

**The default mode.** Tabbed tmux sessions. Each task gets its own window.

```
ccc
```

CCC menu runs in tab 0. Each dispatched task opens a new tmux window where Claude works with full output visible. Switch tabs with `Ctrl+A` then `n`(next) / `p`(prev) / `0-9`(by number). Mouse click works too.

| Key | Action |
|-----|--------|
| `Ctrl+A n` | Next tab |
| `Ctrl+A p` | Previous tab |
| `Ctrl+A 0` | Back to CCC menu |
| `Ctrl+A q` | Quit session |
| Mouse click | Switch tabs |

---

## Agent-Friendly API

CCC is built to be controlled by AI agents — OpenClaw, Claude Code, or any orchestrator.

| Command | Output | Purpose |
|---------|--------|---------|
| `ccc --dispatch "task" --json` | JSON | Run task headlessly |
| `ccc --list-skills --json` | JSON | All 450+ skills |
| `ccc --list-sessions --json` | JSON | Session history |
| `ccc --status` | JSON | Health check |
| `ccc --template` | text | Latest CLAUDE.md template |

**Override flags:** `--model opus` · `--max-turns 50` · `--budget 5` · `--cwd /path`

```bash
# OpenClaw agent dispatches a build
result=$(ccc --dispatch "Build auth with JWT" --json --model opus --budget 5)

# Claude Code agent checks available skills
ccc --list-skills --json | jq '.[] | select(.name | contains("auth"))'
```

---

## 🧠 Intelligence Layer

> Stock Claude Code is a blank terminal with amnesia. CC Commander remembers everything, learns from every session, and gets smarter the more you use it.

**An AI project manager that thinks before it acts.** Before dispatching a single token, CCC scores your task, reads your stack, pulls relevant lessons from past sessions, and selects the right model and budget automatically. No configuration. No flags. It just works.

### How It Works

**Four modules. Always running.**

#### 1. Weighted Complexity Scoring (`dispatcher.js`)

Every task scored 0–100 using 47 keyword signals, word count, and fuzzy regex matching:

```
"fix typo"             → score  0  → 10 turns, $1 budget, Haiku
"add dark mode"        → score 25  → 20 turns, $3 budget, Sonnet
"refactor auth module" → score 60  → 35 turns, $6 budget, Sonnet
"build SaaS platform"  → score 100 → 50 turns, $10 budget, Opus
```

File scope estimation adds 0–20 bonus points by scanning how many project files the task is likely to touch. Budget and turns auto-adjust — no manual flags needed.

#### 2. Stack Detection (`project-importer.js`)

CCC reads your project before every dispatch: `package.json`, `Dockerfile`, `go.mod`, `requirements.txt`. Detects nextjs, react, vue, docker, python, rust, go, github-actions, orm, billing, testing. Reads current git branch + last 5 commit themes. Adds monorepo detection (workspaces, lerna, turbo, nx).

#### 3. Skill Recommendations (`skill-browser.js`)

`recommendSkills(task, techStack)` combines three signals:

| Signal | Weight | What It Does |
|--------|--------|-------------|
| Stack match | 10 pts | Next.js project → nextjs-app-router ranks first |
| Keyword match | 2 pts/hit | "auth" task → auth, jwt, better-auth bubble up |
| Usage history | boost | Skills that worked for you rank higher over time |

Trending skills (7-day window) surface automatically. Skills that led to successful sessions compound their ranking advantage.

#### 4. Knowledge Compounding (`knowledge.js`)

Every completed session extracts a lesson (keywords, category, stack, error patterns, success patterns) stored in `~/.claude/commander/`. Searched before the next dispatch with time-decay relevance: < 7 days = 2x, < 30 days = 1.5x, older = 1x. Fuzzy keyword matching and cross-domain boosts (web↔react, api↔backend, testing↔bugfix) catch related concepts.

**Smart retry** handles failures automatically: rate limit → wait 60s + retry; context overflow → reduce turns to 60% + retry; budget exceeded → clear error with next steps.

### The Net Effect

| Session | What Changed |
|---------|-------------|
| 1 | Dispatches based on complexity score alone |
| 5 | Knows your stack, recommends proven skills |
| 20 | Has learned your patterns — feels like a PM who knows your codebase |

---

### 🔋 Token Optimization Stack — 5 Layers of Savings

| Layer | Tool | Savings |
|-------|------|---------|
| Tool output sandboxing | context-mode | **98%** — SQLite + FTS5, BM25 snippets only |
| CLI output filtering | RTK | 99.5% — strips verbose shell output |
| Skill tiering | `_tiers.json` | ~10k tokens — 30 essential vs 451 full |
| Rate limit rotation | ClaudeSwap | 2 MAX accounts, drain-first strategy |
| Prompt caching | Extended TTL | 90% discount, 1hr cache window |

---

## Security

- **No command injection** — all shell calls use `execFileSync` with array arguments
- **Auto-mode by default** — dispatches use `--permission-mode auto`, not `--dangerously-skip-permissions`
- **YOLO only skips** — only YOLO/night mode uses skip-permissions (intentional, documented)
- **Zero npm vulnerabilities** — verified on every CI run
- **PII scanning** — CI blocks commits containing personal data patterns
- **Error containment** — every error returns to menu with error ID, never raw stack traces
- **Pre-publish checks** — `npm run prepublishOnly` runs all tests + lint before publish

---

## Use Inside Claude Code

No CLI needed. Type `/ccc` in any Claude Code session for the full interactive menu.

```
/ccc              → Main menu (15 options with sub-menus)
/ccc xray         → Project health scan
/ccc makeover     → Auto-apply top fixes
/ccc refresh      → Update your CLAUDE.md from latest template
/ccc domains      → Browse 11 CCC domains
/ccc skills       → Browse 450+ skills
/ccc grill        → 7-question Socratic planning probe
/ccc infra        → Infrastructure sub-menu (Fleet, Synapse, Cost, AO, CloudCLI, Paperclip)
/ccc detect       → Probe all services and CLIs
```

Same choices, same sub-menus, same actions as the full CLI. Cancel anytime with "back" or `Escape`. Also works in **Claude Desktop Cowork** and **VS Code / Cursor**.

---

## Agent Bible

**[BIBLE-AGENT.md](docs/BIBLE-AGENT.md)** — 268-line machine-readable reference. Any AI agent reads this and can manage CCC immediately.

```bash
# Tell any agent:
"Read docs/BIBLE-AGENT.md from the cc-commander repo, then use the CLI API to manage this project."
```

Covers: CLI API, dispatch patterns, JSON schemas, skill catalog, level/model defaults, integration points.

---

## Cancel Running Tasks

- **During any build:** Press `Escape` or `q` to kill the Claude process and return to menu
- **During YOLO loop:** `touch ~/.claude/commander/yolo-stop` to halt between cycles
- **In split mode:** Switch to the Claude tab and `Ctrl+C`

---

## Daemon Mode

**KAIROS-inspired persistent background agent.** Monitors your project, processes queued tasks, and consolidates knowledge — all hands-free.

```bash
ccc --daemon                    # Start (runs in background)
ccc --queue "fix login bug"     # Add task to queue
ccc --queue-list                # Show pending tasks
ccc --daemon-stop               # Stop daemon
```

| Feature | What It Does |
|---------|-------------|
| Tick loop (5 min) | Checks queue, git status, dispatches work |
| Dream mode (1 hr) | Consolidates knowledge, detects error patterns |
| Task queue | Priority-based, file-backed, auto-dispatch |
| Budget cap | 15-second limit per tick action |

Customize: `--interval 120` (2 min ticks) · `--tick-budget 30` · `--dream 30` (30 min dreams)

---

<img src="docs/assets/section-domains.svg" alt="Domains" width="100%">

Each domain is a router that dispatches to specialized sub-skills on demand.

| Domain | Skills | What's Inside |
|--------|--------|---------------|
| **ccc-design** | 39 | landing pages, UI audit, animation, responsive layout, color systems, typography, canvas design, wireframes, component library, accessibility, dark mode, micro-interactions, illustration, icon sets, design tokens |
| **ccc-marketing** | 45 | CRO, email campaigns, ad copy, social media, SEO content, blog posts, landing page copy, A/B testing, funnel optimization, lead magnets, newsletter, brand voice, press releases, case studies, video scripts |
| **ccc-saas** | 20 | auth systems, billing/Stripe, API design, database schema, multi-tenancy, onboarding flows, admin dashboards, role-based access, webhooks, rate limiting, usage tracking, feature flags |
| **ccc-devops** | 20 | GitHub Actions, Docker, AWS deploy, Terraform, monitoring, logging, CI/CD pipelines, Kubernetes, Nginx, SSL certs, environment management, health checks, rollback strategies |
| **ccc-seo** | 19 | meta tags, JSON-LD schema, sitemap, robots.txt, Core Web Vitals, internal linking, keyword research, content optimization, image SEO, page speed, structured data, canonical URLs |
| **ccc-testing** | 15 | Vitest, Playwright E2E, TDD workflow, snapshot testing, API testing, load testing, coverage reports, test fixtures, mock strategies, visual regression, accessibility testing |
| **ccc-makeover** | 3 | /xray project audit (health score 0-100, maturity 1-5), /makeover agent swarm execution, before/after report card |
| **ccc-data** | 8 | SQL optimization, data pipelines, analytics setup, data visualization, machine learning, reporting, data quality, vector search |
| **ccc-security** | 8 | OWASP top 10, secrets scanning, dependency audit, container security, penetration testing, CSP headers, rate limiting, auth hardening |
| **ccc-research** | 8 | competitive analysis, market research, user research, technology evaluation, trend analysis, SWOT, stakeholder interviews, data synthesis |
| **ccc-mobile** | 8 | React Native, Expo, mobile UI, push notifications, deep linking, app store optimization, offline-first, gesture handling |

---

<img src="docs/assets/section-vendors.svg" alt="Vendors" width="100%">

CC Commander aggregates the best Claude Code tools as git submodules. Auto-updated weekly. 19 packages, 1,500+ vendor skills.

| Package | Stars | What You Get |
|---------|-------|-------------|
| [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) | 120K+ | 161 skills, AgentShield security, 38 agents, lifecycle hooks |
| [gstack](https://github.com/garrytan/gstack) | 58K+ | CEO/eng plan review, office hours, QA — decision layer |
| [Superpowers](https://github.com/obra/superpowers) | 29K+ | Forces structured thinking — /plan, /tdd, /verify |
| [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | 32K+ | Reference architecture, Channels, Auto Mode |
| [repomix](https://github.com/yamadashy/repomix) | 22.8K+ | Pack codebases for AI (tree-sitter compression = 60% smaller) |
| [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | 17K+ | Team orchestration, multi-agent patterns |
| [Claude HUD](https://github.com/jarrodwatts/claude-hud) | 15K+ | Real-time status display |
| [RTK](https://github.com/rtk-ai/rtk) | 14.6K+ | Token optimization (60-90% savings) |
| [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) | 11.5K+ | Knowledge compounding — every session makes the next smarter |
| [claude-skills](https://github.com/alirezarezvani/claude-skills) | 9.6K+ | 248 skills, prompt A/B testing, CI/CD builder |
| [notebooklm-py](https://github.com/teng-lin/notebooklm-py) | 9.2K+ | Podcast generation, PPTX export, quiz/flashcards |
| [claude-code-ultimate-guide](https://github.com/FlorianBruniaux/claude-code-ultimate-guide) | 2.7K+ | 219 templates, 271 quizzes, threat database |
| [acpx](https://github.com/openclaw/acpx) | 1.8K+ | ACP protocol, structured agent communication |
| [claude-reflect](https://github.com/BayramAnnakov/claude-reflect) | 860+ | Self-improving skills with reflection loops |
| [claude-code-prompts](https://github.com/repowise-dev/claude-code-prompts) | 142+ | Defensive prompt patterns, verification specialist |
| [Caliber](https://github.com/caliber-ai-org/ai-setup) | 300+ | Config scoring, drift detection |

The **smart orchestrator** scores each tool: capability match (50%) + popularity (15%) + recency (15%) + your preference (20%) — then picks the best one for each phase.

---

<img src="docs/assets/section-orchestrator.svg" alt="Orchestrator" width="100%">

```
  PHASE          BEST TOOL              FALLBACK
  ──────────────────────────────────────────────
  ▸ Clarify      /office-hours          Spec flow
  ▸ Decide       /plan-ceo-review       Plan mode
  ▸ Plan         /ce:plan               Claude plan
  ▸ Execute      /ce:work               Dispatch
  ▸ Review       /ce:review (6+ agents) /simplify
  ▸ Test         /qa (real browser)     /verify
  ▸ Learn        Knowledge engine       Always on
  ▸ Ship         /ship                  git commit
```

CCC learns from every session. Knowledge compounds over time.

---

<img src="docs/assets/section-xray.svg" alt="XRay" width="100%">

**Audit any project. Fix it automatically.**

```bash
/ccc:xray                    # Scan → health score 0-100
/ccc:makeover                # Agent swarm applies top fixes
```

| Dimension | Weight | What It Checks |
|-----------|--------|---------------|
| Security | 25% | CVEs, secrets, .env tracking |
| Testing | 20% | Config, coverage, frameworks |
| Maintainability | 20% | Complexity, linting, duplication |
| Dependencies | 15% | Outdated, vulnerable |
| DevOps | 10% | CI presence, quality gates |
| Documentation | 10% | README, CLAUDE.md, inline docs |

---

<img src="docs/assets/section-yolo.svg" alt="YOLO" width="100%">

**Start before bed. Wake up to shipped code.**

<img src="docs/assets/ccc-yolo.svg" alt="YOLO Mode" width="100%">

10 questions → Opus with max effort → $10 budget → 100 turns → self-testing loop.

---

<img src="docs/assets/section-cockpit.svg" alt="Cockpit" width="100%">

```
  ══════════════════════════════════════════────────
  🌈 CC COMMANDER  v2.2               <!-- update version on bump -->
  Every Claude Code tool. One install. An AI brain that learns.
  ─────────────────────────────────────────────
  🔥 Opus4.6-1M  │  $2.14  │  ↑42K↓8K  │  3m12s
  CTX [████████████░░░░░░░░] 62%  5h [████░░░░░░░░░░░░] 23%  7d [██████░░░░░░░░] 34%
  📋 CC-150   │  🎯 450+ skills  │  📦 19 vendors  │  🔋 98% ctx savings
  ─────────────────────────────────────────
```

ASCII meters for context usage + rate limits. Emoji status indicators. Active Linear ticket. Skill and vendor counts. All in your terminal.

**Rich footer bar** — rainbow status line with live ClaudeSwap meters:

<img src="docs/assets/screenshots/footer-rainbow.gif" alt="Rainbow Footer with Meters" width="100%">

Context/rate/budget meters color-code green → yellow → red as you approach limits.

---

## Stats Dashboard & Before/After

<img src="docs/assets/ccc-stats.svg" alt="Stats" width="100%">

Sessions, streaks, badges, cost tracking, activity heatmap, level progression.

<img src="docs/assets/ccc-comparison.svg" alt="Comparison" width="100%">

---

## The Kevin Z Method

> 7 rules from 200+ articles. 14 months of production.

1. Plan before coding
2. Context is milk — keep it fresh
3. Verify, don't trust
4. Subagents = fresh context
5. CLAUDE.md is an investment
6. Boring solutions win
7. Operationalize every fix

Full methodology: **[BIBLE.md](BIBLE.md)** — 2000+ lines, 7 chapters, appendices.

For AI agents: **[BIBLE-AGENT.md](docs/BIBLE-AGENT.md)** — 268-line machine-readable version.

---

## 10 Themes

<img src="docs/assets/ccc-themes.svg" alt="10 Themes" width="100%">

**Cyberpunk, Fire, Ocean, Aurora, Sunset, Monochrome, Rainbow, Dracula, Graffiti, Futuristic.** Live preview as you navigate. Switch anytime in Settings or type `/ccc theme`.

---

## Acknowledgments

CC Commander aggregates 17 open-source packages. Full credits: **[ACKNOWLEDGMENTS.md](docs/ACKNOWLEDGMENTS.md)**

45+ ecosystem repos tracked: **[ECOSYSTEM.md](docs/ECOSYSTEM.md)**

---

## License

MIT License for the full project. The Intelligence Layer (4 files) has an additional [Commons Clause](docs/LICENSE-INTELLIGENCE.md) — free to use, not to sell.

All 19 vendor packages are permissive open-source: 14 MIT, 1 Apache-2.0, 1 CC-BY-SA-4.0. Full details: **[LICENSES-VENDORS.md](docs/LICENSES-VENDORS.md)**

> **Note:** GitHub may show "Unknown" in the sidebar because some vendor submodules don't ship a LICENSE file in their repo root. Every vendor's license has been verified — see the table above.

---

## Contributing

```bash
skills/your-skill/SKILL.md        # Add a skill
commands/your-command.md           # Add a command
hooks/your-hook.js                 # Add a hook
commander/adventures/X.json        # Add a flow
```

---

<div align="center">

**CC Commander v2.2.1** · **[Kevin Z](https://kevinz.ai)** · **[@kzic](https://x.com/kzic)**

*Every Claude Code tool. One install. An AI brain that learns.*

**[Install Now](#quick-start--pick-your-path)** · **[Read the BIBLE](BIBLE.md)** · **[Agent Bible](docs/BIBLE-AGENT.md)** · **[Browse Skills](SKILLS-INDEX.md)** · **[Ecosystem](docs/ECOSYSTEM.md)**

</div>
