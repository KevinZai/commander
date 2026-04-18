# CLAUDE.md — CC Commander

## What This Is

CC Commander — by Kevin Zicherman. Guided AI PM to Master Claude Code Instantly. 1 MCP server. 456+ skills. Every AI IDE. Free in beta. The Desktop plugin is the primary product: 15 plugin skills, 15 specialist agents (with persona voice system), 9 lifecycle hooks, 5 MCP servers, 10 connector categories, and free/pro tier support. Also a comprehensive Claude Code configuration toolkit + interactive CLI project manager: 456+ total skills (456 skills), 11 CCC domains, 83 commands, 28 hooks, 37 prompt templates, 10 themes, 20 vendor packages, 3 starter templates, real-time agent dashboard, OpenClaw native integration, agent-friendly CLI API, tabbed tmux split mode, status updates, continuous improvement pipeline, modular installer. Built by scanning 200+ articles from the Claude Code community and distilling into one install.

**Current Release:** v4.0.0-beta.2 — MCP server + hosted beta + 15 specialist personas · npm package `cc-commander@4.0.0-beta.2` (version tracked in `package.json`)

## Session Defaults

- **Model:** Opus 4.6 (1M context) — enforced via `.claude/settings.json`
- **Mode:** Plan mode by default — SessionStart hook reminds to enter plan mode
- **Effort:** High (`effortLevel: "high"` in settings.json)
- **Thinking:** Summaries visible (`showThinkingSummaries: true`)
- **Footer:** Run `node commander/status-line.js` for live session status bar
- **Version:** Single source of truth is `package.json` — `branding.js` reads it at runtime

## Critical Rule

**Research the codebase before editing. Never change code you haven't read.** Read files before modifying them. Understand the surrounding context. If you're about to edit a function, read the whole file first.

## Desktop Plugin

CCC's primary product as of v3.0.0. Install via the Claude Code plugin marketplace:

```
/plugin marketplace add KevinZai/commander
/plugin install commander
```

**Plugin name:** `commander` · **Marketplace:** `commander-marketplace` at KevinZai/commander

**Beta (v4.0.0-beta.2):** ALL 26 plugin skills + 15 specialist agents + 9 lifecycle hooks + 5 MCP servers — free, gated only by 1000 calls/mo hosted MCP quota (with mandatory feedback survey).
**Pro (post-beta):** unlimited calls + Commander Hub marketplace (v4.1).

Plugin directory: `commander/cowork-plugin/` — CONNECTORS.md documents all 10 connector categories.

## CCC CLI

Interactive CLI that sits ABOVE Claude Code sessions. Manages, dispatches, and tracks AI work.

```bash
ccc          # Launch interactive mode
ccc --test   # 187 tests across 14 suites
ccc --stats  # Quick stats
```

Key components:
- `commander/engine.js` — Main interactive loop with arrow-key menus
- `commander/tui.js` — TUI engine (figlet, gradients, 10 themes, spinners)
- `commander/dispatcher.js` — 14-flag Claude Code dispatch with plan-mode-first
- `commander/knowledge.js` — Knowledge compounding (learns from every session)
- `commander/plugins.js` — Auto-detects gstack, CE, Superpowers, sequences them
- `commander/adventures/*.json` — 14 JSON decision tree flows
- `commander/cowork-plugin/` — Desktop plugin (15 skills, 5 agents, 6 hooks, 5 MCP servers)
- `commander/update-check.js` — Update checker (4h cache, silent on failure, runs at session start)
- `commander/tests/paths.test.js` — 18 E2E path tests

State: `~/.claude/commander/` (never modifies `.claude/`)
Tests: `node --test commander/tests/paths.test.js`

## Project Structure

```
├── commander/cowork-plugin/     # Desktop plugin (primary product)
│   ├── SKILL.md                 # Plugin entry point (name: commander)
│   ├── skills/                  # 15 plugin skills
│   ├── agents/                  # 5 agents (reviewer, builder, researcher, debugger, fleet-worker)
│   ├── hooks/                   # 6 lifecycle hooks
│   ├── mcp/                     # 5 MCP server configs
│   └── CONNECTORS.md            # 10 connector categories
├── skills/              # 456+ skills organized by category
│   ├── ccc-*/           # 11 CCC domains (router + sub-skills)
│   ├── mode-switcher/   # 10 workflow modes
��   ├── init-decision-tree/  # /init project wizard
│   ├── confidence-check/    # Pre-execution confidence assessment
│   ├── four-question-validation/  # Post-implementation verification
���   └── */               # Individual skills (SKILL.md each)
├── commands/            # 83 slash commands (.md files)
│   └── cc.md            # /cc command center (interactive menu)
├── prompts/             # 36+ prompt templates across 6 categories
├── hooks/               # 25 kit-native hooks (JS) + hooks.json + hooks-standalone.json
├── templates/           # 3 starter templates (nextjs, api, cli)
├── lib/                 # Terminal art (bash + JS) + statusline.sh
├── docs/                # GitHub Pages landing site
│   ├── index.html       # Single-page marketing site
│   └── assets/          # CSS, JS, images
├── kevin/               # Kevin's personal overlay (not installed by default)
│   ├── install-kevin.sh # Layer Kevin-specific config after public install
│   ├── CLAUDE.md.kevin  # Kevin's CLAUDE.md (full MCP, OpenClaw)
│   ├── settings.json.kevin  # Kevin's settings (all MCP servers)
│   └── hooks/           # Kevin-specific hooks (Paperclip, OpenClaw)
├── compatibility/       # IDE guides + 4 iTerm2 color profiles (Claude Anthropic, OLED, Matrix)
├── tests/               # Hook test harness
├── install.sh           # Interactive installer
├── install-remote.sh    # One-line remote installer (curl | bash)
├── uninstall.sh         # Clean removal with backup restore
├── BIBLE.md             # The Kevin Z Method — 7 chapters + appendices
├── CHEATSHEET.md        # Daily reference
├── SKILLS-INDEX.md      # Searchable skill directory
├── CHANGELOG.md         # Version history
└── CLAUDE.md.template  # Staff CLAUDE.md template
```

## Aggregator Ecosystem
19 vendor submodules in `vendor/`. Smart orchestrator scores tools: capability 50% + stars 15% + recency 15% + user pref 20%.
Vendor scanner builds capability index across 8-phase pipeline.
Auto-updates weekly via GitHub Actions.

Key vendors: ECC (120K stars), gstack (58K), Superpowers (29K), oh-my-claudecode (17K),
claude-code-best-practice (26K), repomix (22.8K), Claude HUD (15K), RTK (14.6K),
Compound Engineering (11.5K), claude-skills (8.6K), notebooklm-py (8.6K), claude-mem,
claude-code-ultimate-guide (2.7K), acpx (1.8K), caliber (300), claude-reflect (860),
claude-code-prompts (142).

## Footer Bar
CCC renders a rich status footer on every menu screen and recommends it for `/ccc` mid-session:

```
━━ CCC3.0.0│🔥Opus1M│🔑gAA│🧠▐██45%░░▌│⏱️▐██░░▌6%│📅▐██░░▌34%│💰$2.34│⬆️640K⬇️694K│⏰8h0m│🎯456│📋CC-150│📂~/project
```

Render this at session start and after major actions. Source: `commander/cockpit.js`.

## Nested Command Menus
All `/ccc` sub-commands open rich menus with recommendations:

| Command | Menu | What it does |
|---------|------|-------------|
| `/ccc` | Main menu | 15 options — build, review, learn, infra, settings |
| `/ccc build` | Build wizard | Website, API, CLI, custom — with spec questions |
| `/ccc infra` | Infrastructure | Fleet, Cost, Synapse, AO, CloudCLI, Paperclip |
| `/ccc linear` | Linear board | View issues, pick to build, create new |
| `/ccc skills` | Skill browser | 456+ skills by category, preview, try |
| `/ccc domains` | CCC domains | 11 ccc-* domains |
| `/ccc night` | Night/YOLO mode | Autonomous overnight builds |
| `/ccc settings` | Settings | Name, level, cost, theme, Linear setup |

Every menu recommends the best next action based on context.

## CCC Domains

| Domain | Sub-Skills | Focus |
|--------|-----------|-------|
| `ccc-design` | 39 | UI/UX, animation, responsive, accessibility |
| `ccc-marketing` | 45 | CRO, email, ads, social, content |
| `ccc-saas` | 21 | Auth, billing, multi-tenant, schema |
| `ccc-devops` | 21 | CI/CD, Docker, AWS, monitoring |
| `ccc-seo` | 20 | Technical SEO, content, Core Web Vitals |
| `ccc-testing` | 15 | TDD, E2E, coverage, regression |
| `ccc-security` | 8 | OWASP, pen-test, secrets, hardening |
| `ccc-data` | 8 | SQL, ETL, analytics, visualization |
| `ccc-research` | 8 | Competitive, market analysis |
| `ccc-mobile` | 8 | React Native, Expo, mobile patterns |
| `ccc-makeover` | 3 | /xray audit + /makeover swarm |

## Current Status

**Version:** 3.0.0 (Desktop-first plugin transformation — see `package.json`)

**Stats:** 456+ total skills (456 skills), 15 plugin skills, 5 agents, 6 hooks, 5 MCP servers, 83 commands, 28 JS hooks, 19 vendors, 10 themes

**Live:**
- GitHub repo: github.com/KevinZai/commander
- Marketplace: `commander-marketplace` — `/plugin marketplace add KevinZai/commander`
- Landing page: KevinZai.github.io/cc-commander
- One-line install: `curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash`
- Free/Pro tiers: core skills free, agents + MCP servers in Pro

## Key Commands

```bash
./install.sh              # Interactive install (matrix rain, ASCII art, progress)
./install.sh --dry-run    # Preview without changes
./install.sh --verify     # Validate existing installation
./install.sh --force      # Skip confirmation prompts
./uninstall.sh            # Remove kit components (preserves CLAUDE.md + settings.json)
ccc --split               # Tabbed tmux mode
ccc --dispatch "task" --json  # Headless agent dispatch
ccc --list-skills --json      # Skill catalog for agents
ccc --status                  # Health check
```

## Development Notes

- Shell scripts source `lib/terminal-art.sh` for all visual output
- Hooks use `lib/terminal-art.js` for consistent branding
- All animations respect `CC_NO_COLOR=1`, `CC_NO_ANIMATION=1`, CI detection
- OG image generated via `docs/assets/og-image.svg` → PNG conversion
- CCC domains use router pattern: one SKILL.md dispatches to sub-skill directories
- Kevin's personal overlay lives in `kevin/` — not installed by the public installer
- Tests run via `node --test tests/hooks.test.js` (Node.js built-in test runner, 61 tests)
- 18 kit-native hooks form the "Proactive Automation Suite" — context-guard, auto-checkpoint, cost-alert, confidence-gate, session-coach, pre-compact, self-verify, openclaw-adapter, status-reporter, openclaw-sync, etc.
- 10 workflow modes via mode-switcher skill — normal, design, saas, marketing, research, writing, night, yolo, unhinged, caveman
- 36+ prompt templates across 6 categories (coding, planning, design, marketing, devops, meta)
- Agency Orchestrator and OpenClaw patterns for multi-agent integration
- Claude Peers integration — multi-instance collaboration with coordinator/swarm/expert/review/research patterns
- Spawn Manager — `/spawn` command for launching and coordinating multiple Claude Code peers
- Task Commander — multi-agent orchestration with P0-P10 scoping, 6 DAG workflows, circuit breaker, cost ceiling
- Contextual Assist — proactive suggestion system with 5 configurable levels
- Cowork + Dispatch integrations for Claude Desktop autonomous mode and background tasks
- OpenClaw Bridge + Paperclip Bridge for platform integrations
- 5 quickstart guides for beginner/frontend/backend/fullstack/mobile developers
- Real-time React dashboard at `dashboard/` — agent monitoring, spawn tree, cost tracker, live logs (no DB)
- `lib/config-reader.js` — shared config utility for bible-config.json with env var overrides
- VS Code snippets at `compatibility/vscode-snippets.json` (20+ snippets)
- session-coach.js fires periodic coaching nudges (toggleable via `CC_COACH_DISABLE=1`, interval via `CC_COACH_INTERVAL`)
- Status line (`lib/statusline.sh`) shows live context gauge, model, cost, tokens, account, rate limit countdown
- `/init` checks `~/.claude/sessions/` and offers to resume prior sessions before the wizard
- 4 iTerm2 color profiles at `compatibility/` (Claude Anthropic, OLED Black, Matrix); legacy `kz-matrix.itermcolors` preserved
- Theme system with 10 switchable themes
- OpenClaw native integration with auto-detection, skill sync, bidirectional event forwarding
- Status update requests for sending progress reports during long sessions
- Continuous improvement pipeline with daily cron scan and proposal queue
- Modular installer with 5 installation modes (full, essentials, scripts, dashboard, config-only)
- Daemon Mode: commander/daemon.js (tick loop), commander/queue.js (task queue), commander/dream.js (knowledge consolidation)
- Intelligence Layer v1: complexity scoring (dispatcher.js), stack detection (project-importer.js), session learning (knowledge.js), skill filtering (skill-browser.js), smart retry (dispatchWithRetry)
- Tiered skill loading via `skills/_tiers.json` — essential (~30), recommended (~100), domain (11 routers), full (all 456+)
- Update checker at `commander/update-check.js` — 4h cache, silent on failure, fires on session start
- Caveman mode (`caveman` skill) — strips markdown/emojis/prose for ~75% output token savings during iteration

## Ecosystem Context

CCC ships 15 focused `/ccc:*` skills as the curated front door, then routes into 450+ CCC ecosystem skills across 11 domains. It is a meta-layer over the broader Claude skill ecosystem — not a replacement for it.

**External ecosystems CCC plays well with:**
- `anthropics/skills` — official Anthropic skills (Frontend Design, Theme Factory, Spec Writer)
- `mattpocock/skills` — 15K stars, TypeScript-first (Grill Me, Ubiquitous Language)
- `skillsmp.com` — 66K+ community marketplace

**Install format alternatives:**

| Method | Command | When to Use |
|--------|---------|------------|
| Marketplace (recommended) | `/plugin install commander` | Full plugin with all 15 skills + MCPs + hooks |
| Full CLI | `curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh \| bash` | CLI mode, non-plugin installs |
| Cherry-pick | `npx skills@latest add KevinZai/commander/skills/<name>` | Individual skills via the skills CLI |

**When Claude agents load this CLAUDE.md, they should know:**
- CCC is a meta-layer over the Claude skill ecosystem — curation + guidance + memory, not raw skills
- 15 `/ccc:*` skills are the curated front door; they route into 450+ deeper skills
- `CONNECTORS.md` defines 13 tool-agnostic connector categories via `~~category` placeholders — skills are tool-agnostic
- Free tier: 15 skills + SessionStart/Stop hooks. Pro tier: 5 agents + 5 MCP servers + 4 additional lifecycle hooks
- Tier gating is enforced via `license.json` — free hooks are no-ops on capability checks, not absent

## UI Components
Check `~/clawd/shared/refs/shadcn-ecosystem.md` before building custom. Key: tremor (charts), auto-form (Zod→forms), magicui (animations).
- **Tech icons:** `developer-icons` (npm) — standard for all projects. Never custom SVGs for tech logos.
