# CLAUDE.md — CC Commander

## What This Is

CC Commander — by Kevin Zicherman. Guided AI PM to Master Claude Code Instantly. **Free forever** — affiliate links + consulting + optional Pro community + GitHub Sponsors. Built on Anthropic's Claude Agent SDK sub-agent architecture — CCC is a PM/orchestration UX layer over that primitive. The Desktop plugin is the primary product — **primary surface: Claude Code Desktop (aka Cowork Desktop)**. **51 plugin skills (13 /ccc-* specialist workflows + 14 ccc-* domain routers + 2 diagnostic + 2 vendor-sourced + /save-session + /resume-session + /ccc-e2e + /ccc-memory + /ccc-tasks + /ccc-recall + /ccc-changelog + /ccc-doctor + /ccc-upgrade)**, **17 specialist sub-agent personas** (architect · reviewer · builder · security-auditor · debugger · designer · qa-engineer · devops-engineer · data-analyst · content-strategist · product-manager · performance-engineer · researcher · technical-writer · fleet-worker · typescript-reviewer · python-reviewer), **8 lifecycle hooks × 16 handlers** (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification, PreCompact, SubagentStop), **2 credential-free bundled MCP servers** (context7 + sequential-thinking) + 16 opt-in via /ccc-connect. Also a comprehensive Claude Code configuration toolkit + interactive CLI project manager: 502+ total skills, 11 CCC domains, 83+ commands, 28 hooks, 37 prompt templates, 10 themes, 20 vendor packages, 3 starter templates, real-time agent dashboard, OpenClaw native integration, agent-friendly CLI API, tabbed tmux split mode, status updates, continuous improvement pipeline, modular installer. Built by scanning 200+ articles from the Claude Code community and distilling into one install.

**Current Release:** v4.0.0-beta.11 — hardening + Desktop-first positioning: 5 security fixes (cwd validation, execFile migration, path-traversal, CLAUDE_DIR guards), XML strip across 17 agents/skills, 5 new skills (/ccc-e2e, /save-session, /resume-session, /ccc-changelog, /ccc-doctor), OG image, screenshot scaffold, comprehensive doc sync. Plugin skills 45→50. /ccc-upgrade adds skill 51. · npm package `cc-commander@4.0.0-beta.11` (version tracked in `package.json`)

## Session Defaults

- **Model:** Opus 4.7 (1M context) — enforced via `.claude/settings.json`
- **Mode:** Plan mode by default — SessionStart hook reminds to enter plan mode
- **Effort:** High (`effortLevel: "high"` in settings.json)
- **Thinking:** Summaries visible (`showThinkingSummaries: true`)
- **Footer:** Run `node commander/status-line.js` for live session status bar
- **Version:** Single source of truth is `package.json` — `branding.js` reads it at runtime

## Critical Rule

**Research the codebase before editing. Never change code you haven't read.** Read files before modifying them. Understand the surrounding context. If you're about to edit a function, read the whole file first.

## Desktop Plugin (PRIMARY PRODUCT)

CC Commander's primary product as of v3.0.0. Claude Cowork Desktop / Claude Code Desktop install:

**Via GUI (Cowork Desktop / Code Desktop):**
1. Settings → Plugin Marketplace → **Add from GitHub**
2. Enter `KevinZai/commander` → Add
3. Find `commander` in the marketplace → click **Install**

**Via CLI (Claude Code terminal only — `/plugin` slash commands don't exist in Desktop):**
```
/plugin marketplace add KevinZai/commander
/plugin install commander
```

**Plugin name:** `commander` · **Marketplace:** `commander-hub` at KevinZai/commander

**Beta (v4.0.0-beta.11):** 51 plugin skills (13 /ccc-* specialist workflows + 14 ccc-* domain routers + 2 diagnostic/meta + 2 vendor-sourced + /save-session + /resume-session + /ccc-e2e + /ccc-memory + /ccc-tasks + /ccc-recall + /ccc-changelog + /ccc-doctor + /ccc-upgrade) + 17 specialist agents + 8 lifecycle hooks × 16 handlers + 2 credential-free bundled MCP servers (context7 + sequential-thinking) + 16 opt-in via /ccc-connect — **free forever**, sustained by transparent affiliate links in /ccc-connect + Kevin's consulting practice. Hosted MCP (v4.1) will be free with a 100-call/mo anti-abuse cap; no paid upgrade path planned.

**The 12 /ccc-* specialist workflows (all click-first via AskUserQuestion native picker):**
- `/ccc` — main hub (6 intents via nested AUQ)
- `/ccc-start` — first-run onboarding + plan file
- `/ccc-browse` — searchable catalog of all skills + agents
- `/ccc-plan` — spec-first feature planning → plan file
- `/ccc-build` — scaffold projects (web / API / CLI / mobile)
- `/ccc-review` — branch audit (diff / security / perf / x-ray)
- `/ccc-ship` — pre-flight checks + release + deploy
- `/ccc-design` — UI/UX workflow (routes to ccc-design domain)
- `/ccc-learn` — skill discovery across 11 CCC domains
- `/ccc-xray` — project health scorecard with fix chips
- `/ccc-linear` — Linear board integration
- `/ccc-fleet` — multi-agent parallel orchestration
- `/ccc-connect` — opt-in MCP connector (Notion/Zapier/Supabase/Slack/GDrive/Figma)

**Pro (post-beta):** unlimited calls + Commander Hub marketplace (v4.1).

Plugin directory: `commander/cowork-plugin/` — CONNECTORS.md documents all 10 connector categories.

### Architecture note (v4.0.0-beta.7+)

Plugin commands are provided as **SKILLS** (not plugin commands) so they appear as plain `/ccc-*` in the autocomplete (no `commander:` namespace prefix). This is the correct primitive for click-first UX in Cowork Desktop. Menus live in `commander/cowork-plugin/menus/*.json` (root + 6 sub-menus); the template at `commander/cowork-plugin/lib/menu-artifact.html.tpl` and renderer at `commander/cowork-plugin/lib/menu-render.js` are kept for future use if/when Claude Desktop adds interactive-artifact support, but the active UX uses AskUserQuestion-native chip pickers (confirmed working in Cowork Desktop).

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
- `commander/cowork-plugin/` — Desktop plugin (51 skills, 17 sub-agent personas, 8 hooks × 16 handlers, 2 credential-free bundled MCP servers per `.mcp.json` + 16 opt-in via `/ccc-connect`)
- `commander/update-check.js` — Update checker (4h cache, silent on failure, runs at session start)
- `commander/tests/paths.test.js` — 18 E2E path tests

State: `~/.claude/commander/` (never modifies `.claude/`)
Tests: `node --test commander/tests/paths.test.js`

## Project Structure

```
├── commander/cowork-plugin/     # Desktop plugin (primary product)
│   ├── .claude-plugin/plugin.json   # Plugin manifest (schema-compliant)
│   ├── skills/                  # 51 plugin skills (23 ccc-* workflows + 5 lifecycle + 2 vendor-sourced + 21 other)
│   ├── agents/                  # 17 specialist agents (architect, reviewer, builder, designer, security-auditor, typescript-reviewer, python-reviewer, etc.)
│   ├── hooks/                   # 8 lifecycle hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification, PreCompact, SubagentStop)
│   ├── menus/                   # 7 menu JSON trees (root + 6 sub-menus)
│   ├── lib/                     # Shared artifact scaffold (menu-render.js + template)
│   ├── .mcp.json                # 2 credential-free bundled MCP server configs (context7, sequential-thinking) — 16 more opt-in via /ccc-connect
│   ├── CONNECTORS.md            # 10 connector categories
│   └── rules/                   # 17 persona voice files + common response-style
├── skills/              # 502+ skills organized by category
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
| `/ccc skills` | Skill browser | 502+ skills by category, preview, try |
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

**Version:** 4.0.0-beta.11 (Desktop-first plugin, Claude Agent SDK sub-agent architecture — see `package.json`)

**Stats:** 502 skills total, 51 plugin skills, 17 sub-agent personas, 8 lifecycle hooks (16 handlers), 2 bundled MCP servers + 16 opt-in, 83 commands, 28 JS hooks, 19 vendors, 10 themes

**Live:**
- GitHub repo: github.com/KevinZai/commander
- Marketplace: `commander-hub` — `/plugin marketplace add KevinZai/commander`
- Landing page: KevinZai.github.io/cc-commander
- One-line install: `curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash`
- Free forever: all skills, all agents, all hooks, all MCP servers — sustained by affiliate links + Kevin's consulting

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
- Tiered skill loading via `skills/_tiers.json` — essential (~30), recommended (~100), domain (11 routers), full (all 500+)
- Update checker at `commander/update-check.js` — 4h cache, silent on failure, fires on session start
- Caveman mode (`caveman` skill) — strips markdown/emojis/prose for ~75% output token savings during iteration

## Ecosystem Context

CCC ships 51 focused `/ccc-*` plugin skills as the curated front door, then routes into 450+ CCC ecosystem skills across 11 domains. It is a meta-layer over the broader Claude skill ecosystem — not a replacement for it.

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
- 50 `/ccc-*` plugin skills are the curated front door; they route into 450+ deeper skills
- `CONNECTORS.md` defines 13 tool-agnostic connector categories via `~~category` placeholders — skills are tool-agnostic
- Everything free forever: 51 plugin skills, 17 agents, 2 credential-free bundled MCP servers (context7 + sequential-thinking) + 16 opt-in via /ccc-connect, 8 lifecycle hooks × 16 handlers. No feature gating, no paywalls, no license checks.
- Revenue model: free forever — 4 levers: (1) transparent affiliate links in /ccc-connect (Supabase, Vercel, Neon, etc.) + (2) Kevin's consulting pipeline (plugin = trust engine → consulting funnel) + (3) optional Pro community ($49/mo Discord) + (4) GitHub Sponsors

## UI Components
Check `~/clawd/shared/refs/shadcn-ecosystem.md` before building custom. Key: tremor (charts), auto-form (Zod→forms), magicui (animations).
- **Tech icons:** `developer-icons` (npm) — standard for all projects. Never custom SVGs for tech logos.
