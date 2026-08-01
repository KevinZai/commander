# CLAUDE.md — CC Commander

## What This Is

CC Commander — by Kevin Zicherman. Guided AI PM to Master Claude Code Instantly. **Core free forever** — affiliate links + consulting + optional Pro community + GitHub Sponsors. Built on Anthropic's Claude Agent SDK sub-agent architecture — CCC is a PM/orchestration UX layer over that primitive. The Desktop plugin is the primary product — **primary surface: Claude Code Desktop (aka Cowork Desktop)**. **82 plugin skills** (click-first /ccc-* workflows, 11 domain routers, channel/CI/setup, diagnostics, lifecycle & session skills — full live list via /ccc-browse; the Cockpit's Browse tab separately displays a 14-domain taxonomy for filtering — a display concept, not a routers count), **22 specialist sub-agent personas** (architect · reviewer · builder · security-auditor · debugger · designer · qa-engineer · devops-engineer · data-analyst · content-strategist · product-manager · performance-engineer · researcher · technical-writer · fleet-worker · typescript-reviewer · python-reviewer · go-reviewer · rust-reviewer · java-reviewer · kotlin-reviewer · csharp-reviewer), **23 lifecycle hooks × 44 handlers** (SessionStart [orchestrator], UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification, PreCompact, PostCompact, SubagentStop, SubagentStart, PermissionRequest, SessionEnd, Elicitation, ElicitationResult, StopFailure, PostToolUseFailure, PostToolBatch, TaskCreated, TaskCompleted, ConfigChange, UserPromptExpansion, InstructionsLoaded, Setup), **2 credential-free bundled MCP servers** (context7 + sequential-thinking) + 16 opt-in via /ccc-connect. Also a comprehensive Claude Code configuration toolkit + interactive CLI project manager: 467 skills, 11 CCC domains, 74 commands (+32 namespaced), 24 hooks, 37 prompt templates, 10 themes, 19 vendor packages, 3 starter templates, real-time agent dashboard, OpenClaw native integration, agent-friendly CLI API, tabbed tmux split mode, status updates, continuous improvement pipeline, modular installer. Built by scanning 200+ articles from the Claude Code community and distilling into one install.

**Current Release:** v7.4.1 — `/ccc-update` and `/ccc-doctor` no longer dead-end on **Desktop-managed (account-synced) installs** — the mode with no marketplace clone and no `installed_plugins.json` entry *by design*. Both now detect three install modes (CLI marketplace / Desktop-managed / dev checkout), read the Desktop copy's real version, fetch latest from GitHub directly, and give mode-correct guidance. Full release history — every version's features, fixes, and details: [CHANGELOG.md](CHANGELOG.md). · npm package `cc-commander@7.4.1` (version tracked in `package.json`)

## Session Defaults

- **Model:** Opus 5 (1M context is default and max, no `[1m]` suffix needed) — enforced via `.claude/settings.json`
- **Mode:** Plan mode by default — SessionStart hook reminds to enter plan mode
- **Effort:** Anthropic's Opus 5 guidance: start at `high` (the default), drop to `low`/`medium` liberally wherever evals hold quality, step up to `xhigh` only for demanding coding/agentic work, `max` only when justified. Set `effortLevel` in `~/.claude/settings.json`. No project-level pin, so global governs — re-sweep any effort setting carried over from Opus 4.8, don't reuse blindly.
- **Thinking:** Summaries visible (`showThinkingSummaries: true`). Note: `thinking:{"type":"disabled"}` errors on Opus 5 at `xhigh`/`max` — only valid at `high` or below.
- **Footer:** Run `node commander/status-line.js` for live session status bar
- **Version:** Single source of truth is `package.json` — `branding.js` reads it at runtime
- **Fable 5 = deep mode:** For architecture, planning, migration, or threat-model work, escalate with `/model claude-fable-5[1m]`. Pay for Fable on the thinking, not the typing.
- **Subagent routing:** Auto-routed by complexity — Haiku → Sonnet → Opus → Fable. Main thread stays Opus until you escalate. Opus 5 delegates more eagerly than 4.8 and over-spawns without explicit caps — delegate to a subagent only for large, genuinely independent, parallelizable work (not things finishable in a handful of tool calls), and keep spawn counts low.
- **Claude Teams (HARD RULE):** Agent Teams is always on — `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` in `.claude/settings.json` env (and in the global `~/.claude/settings.json`). Multi-agent fan-out (`/ccc-fleet`, dynamic workflows) depends on it. Do not disable.
- **Motto:** "Pay for Fable on the thinking, not the typing."
- **Orchestrator/Executor doctrine:** `/ccc-orchestrate` (Fable/Opus plans → GPT-5.6 Sol via `codex` or a Sonnet subagent executes → Fable/Opus verifies), `/ccc-plan-exec` (same idea, Claude-only), `/ccc-handoff` (Matt Pocock-style context-reset — hand off to a fresh chat before quality degrades). Full doctrine: `CLAUDE.md.template` § "Orchestrator / Executor Model". Existing (non-CCC) projects adopt these rules via `/ccc-adopt`.

## Workflow-First (default)

The lead session is a **control plane** — decisions, delegations, and verified conclusions only.

- **Delegate substantive work:** multi-file, multi-step, research, audit, migration, or repo-wide tasks go through the **Workflow tool** — but only when the work is large, genuinely independent, and parallelizable. Agents read/search/build and return ONLY conclusions or structured results — never raw file dumps into the lead context.
- **Go solo (inline)** for a conversational reply, a single trivial edit, reading the one file you're about to edit, or anything finishable in a handful of tool calls — Opus 5 over-delegates without this cap, so don't spawn a subagent just because a task touches more than one file.
- **Keep context slim:** reference code as `path:line`, don't re-read files you just edited, route big tool output to disk.
- **Proactive compaction:** at ~70% context, write/refresh a session handoff doc; at ~85%, compact or hand off rather than risk truncation mid-task.
- Full doctrine: `commander/cowork-plugin/rules/workflow-first.md`.

## Critical Rule

**Research the codebase before editing. Never change code you haven't read.** Read files before modifying them. Understand the surrounding context. If you're about to edit a function, read the whole file first.

## Desktop Plugin (PRIMARY PRODUCT)

CC Commander's primary product as of v6.8.2. Claude Cowork Desktop / Claude Code Desktop install:

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

**v7.4.1:** 82 plugin skills (click-first workflows, 11 domain routers, channel/CI/setup, diagnostics, lifecycle & session skills — full list via /ccc-browse) + 22 specialist agents + 23 lifecycle hooks × 44 handlers (incl. PermissionRequest + SessionStart orchestrator + 5 ECC hooks ported) + 2 credential-free bundled MCP servers (context7 + sequential-thinking) + 16 opt-in via /ccc-connect — **core free forever**, sustained by transparent affiliate links in /ccc-connect + Kevin's consulting practice. Hosted MCP (v4.1) will be free with a 100-call/mo anti-abuse cap; hosted-infrastructure Pro tier planned later — all content stays free forever.

**The 13 /ccc-* specialist workflows (all click-first via AskUserQuestion native picker):**
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

**v4.1 (next):** hosted MCP (free with 100-call/mo anti-abuse cap; hosted-infrastructure Pro tier planned later — all content stays free forever) + Commander Hub marketplace + Anthropic Connectors directory submission.

Plugin directory: `commander/cowork-plugin/` — CONNECTORS.md documents all 13 connector categories.

### Architecture note (since v7.1.0)

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
- `commander/cowork-plugin/` — Desktop plugin (82 skills, 22 sub-agent personas, 23 hooks × 44 handlers, 2 credential-free bundled MCP servers per `.mcp.json` + 16 opt-in via `/ccc-connect`)
- `commander/update-check.js` — Update checker (4h cache, silent on failure, runs at session start)
- `commander/tests/paths.test.js` — 18 E2E path tests

State: `~/.claude/commander/` (never modifies `.claude/`)
Tests: `node --test commander/tests/paths.test.js`

## Project Structure

```
├── commander/cowork-plugin/     # Desktop plugin (primary product)
│   ├── .claude-plugin/plugin.json   # Plugin manifest (schema-compliant)
│   ├── skills/                  # 82 plugin skills (one directory per skill — see /ccc-browse)
│   ├── agents/                  # 22 specialist agents (architect, reviewer, builder, designer, security-auditor, typescript-reviewer, python-reviewer, etc.)
│   ├── hooks/                   # 23 lifecycle hooks (SessionStart [orchestrator], UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification, PreCompact, PostCompact, SubagentStop, SubagentStart, PermissionRequest, SessionEnd, Elicitation, ElicitationResult, StopFailure, PostToolUseFailure, PostToolBatch, TaskCreated, TaskCompleted, ConfigChange, UserPromptExpansion, InstructionsLoaded, Setup)
│   ├── menus/                   # 7 menu JSON trees (root + 6 sub-menus)
│   ├── lib/                     # Shared artifact scaffold (menu-render.js + template)
│   ├── .mcp.json                # 2 credential-free bundled MCP server configs (context7, sequential-thinking) — 16 more opt-in via /ccc-connect
│   ├── CONNECTORS.md            # 13 connector categories
│   └── rules/                   # 17 persona voice files + common response-style
├── skills/              # 467 skills organized by category
│   ├── ccc-*/           # 11 CCC domains (router + sub-skills)
│   ├── mode-switcher/   # 10 workflow modes
│   ├── init-decision-tree/  # /ccc-init project wizard
│   ├── confidence-check/    # Pre-execution confidence assessment
│   ├── four-question-validation/  # Post-implementation verification
│   └── */               # Individual skills (SKILL.md each)
├── commands/            # 74 slash commands (+32 namespaced in tools/, test/, code/, project/, sdd/)
│   └── ccc.md           # /ccc command center (interactive menu)
├── prompts/             # 36+ prompt templates across 6 categories
├── hooks/               # 24 kit-native hooks (JS) + hooks.json + hooks-standalone.json
├── templates/           # 3 starter templates (nextjs, api, cli)
├── lib/                 # Terminal art (bash + JS) + statusline.sh
├── docs/                # Internal docs — audit reports, assets/, cheatsheets/, compat/ (marketing site lives in a separate private repo)
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
Compound Engineering (11.5K), claude-skills (8.6K),
claude-code-ultimate-guide (2.7K), acpx (1.8K), caliber (300), claude-reflect (860),
claude-code-prompts (142), MengTo/Skills (web design + prompting, 100★).

**Note:** `claude-mem` was previously vendored but was removed — it ships under AGPL-3.0 which is incompatible with CC Commander's MIT license. Users can install `claude-mem` separately via `npm install claude-mem` or `/ccc-connect`; it is treated as an external opt-in MCP, not a bundled vendor.

## Footer Bar
CCC renders a rich status footer on every menu screen and recommends it for `/ccc` mid-session:

```
━━ CCC7.4.1│🔥Opus1M│🔑gAA│🧠▐██45%░░▌│⏱️▐██░░▌6%│📅▐██░░▌34%│💰$2.34│⬆️640K⬇️694K│⏰8h0m│🎯467│📋CC-150│📂~/project
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
| `/ccc skills` | Skill browser | 467 skills by category, preview, try |
| `/ccc domains` | CCC domains | 11 ccc-* domains |
| `/ccc night` | Night/YOLO mode | Autonomous overnight builds |
| `/ccc settings` | Settings | Name, level, cost, theme, Linear setup |

Every menu recommends the best next action based on context.

## CCC Domains

| Domain | Sub-Skills | Focus |
|--------|-----------|-------|
| `ccc-design` | 41 | UI/UX, animation, responsive, accessibility |
| `ccc-marketing` | 45 | CRO, email, ads, social, content |
| `ccc-saas` | 20 | Auth, billing, multi-tenant, schema |
| `ccc-devops` | 20 | CI/CD, Docker, AWS, monitoring |
| `ccc-seo` | 19 | Technical SEO, content, Core Web Vitals |
| `ccc-testing` | 15 | TDD, E2E, coverage, regression |
| `ccc-security` | 8 | OWASP, pen-test, secrets, hardening |
| `ccc-data` | 8 | SQL, ETL, analytics, visualization |
| `ccc-research` | 8 | Competitive, market analysis |
| `ccc-mobile` | 8 | React Native, Expo, mobile patterns |
| `ccc-makeover` | 3 | /xray audit + /makeover swarm |

## Current Status

**Version:** 7.4.1 (Desktop-first plugin, Claude Agent SDK sub-agent architecture — see `package.json`)

**Stats:** 467 skills total, 82 plugin skills, 22 sub-agent personas, 23 lifecycle hooks (44 handlers), 2 bundled MCP servers + 16 opt-in, 74 commands, 24 JS hooks, 19 vendors, 10 themes

**Live:**
- GitHub repo: github.com/KevinZai/commander
- Marketplace: `commander-hub` — `/plugin marketplace add KevinZai/commander`
- Landing page: commanderplugin.com (separate private repo)
- One-line install: `curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash`
- Core free forever: all skills, all agents, all hooks, all MCP servers — sustained by affiliate links + Kevin's consulting

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
- CCC domains use router pattern: one SKILL.md dispatches to sub-skill directories
- Kevin's personal overlay lives in `kevin/` — not installed by the public installer
- Tests run via `node --test tests/hooks.test.js` (Node.js built-in test runner, 61 tests)
- 24 kit-native hooks form the "Proactive Automation Suite" — context-guard, auto-checkpoint, cost-alert, confidence-gate, pre-compact, self-verify, openclaw-adapter, status-reporter, openclaw-sync, etc. (session-coach retired 2026-07-10 — folded into the plugin suggest engine)
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
- Vanilla dashboard at `dashboard/` — localhost session inspector (port 4690), reads real `~/.claude/sessions/` data, zero deps, no build step. React app archived to `dashboard/_archive/` (was demo-data only).
- `lib/config-reader.js` — shared config utility for bible-config.json with env var overrides
- VS Code snippets at `compatibility/vscode-snippets.json` (20+ snippets)
- Status line (`lib/statusline.sh`) shows live context gauge, model, cost, tokens, account, rate limit countdown
- `/ccc-init` checks `~/.claude/sessions/` and offers to resume prior sessions before the wizard
- 4 iTerm2 color profiles at `compatibility/` (Claude Anthropic, OLED Black, Matrix); legacy `kz-matrix.itermcolors` preserved
- Theme system with 10 switchable themes
- OpenClaw native integration with auto-detection, skill sync, bidirectional event forwarding
- Status update requests for sending progress reports during long sessions
- Continuous improvement pipeline with daily cron scan and proposal queue
- Modular installer with 5 installation modes (full, essentials, scripts, dashboard, config-only)
- Daemon Mode: commander/daemon.js (tick loop), commander/queue.js (task queue), commander/dream.js (knowledge consolidation)
- Intelligence Layer v1: complexity scoring (dispatcher.js), stack detection (project-importer.js), session learning (knowledge.js), skill filtering (skill-browser.js), smart retry (dispatchWithRetry)
- Tiered skill loading via `skills/_tiers.json` — essential (~30), recommended (~100), domain (11 routers), full (all 467)
- Update checker at `commander/update-check.js` — 4h cache, silent on failure, fires on session start
- Caveman mode (`caveman` skill) — strips markdown/emojis/prose for ~75% output token savings during iteration

## Ecosystem Context

CCC ships 82 focused `/ccc-*` plugin skills as the curated front door, then routes into 467 CCC ecosystem skills across 11 domains. It is a meta-layer over the broader Claude skill ecosystem — not a replacement for it.

**External ecosystems CCC plays well with:**
- `anthropics/skills` — official Anthropic skills (Frontend Design, Theme Factory, Spec Writer)
- `mattpocock/skills` — 15K stars, TypeScript-first (Grill Me, Ubiquitous Language)
- `skillsmp.com` — 66K+ community marketplace

**Install format alternatives:**

| Method | Command | When to Use |
|--------|---------|------------|
| Marketplace (recommended) | `/plugin install commander` | Full plugin with all 82 skills + MCPs + hooks |
| Full CLI | `curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh \| bash` | CLI mode, non-plugin installs |
| Cherry-pick | `npx skills@latest add KevinZai/commander/skills/<name>` | Individual skills via the skills CLI |

**When Claude agents load this CLAUDE.md, they should know:**
- CCC is a meta-layer over the Claude skill ecosystem — curation + guidance + memory, not raw skills
- 82 `/ccc-*` plugin skills are the curated front door; they route into 467+ deeper skills
- `CONNECTORS.md` defines 13 tool-agnostic connector categories via `~~category` placeholders — skills are tool-agnostic
- Everything core free forever: 82 plugin skills, 22 agents, 2 credential-free bundled MCP servers (context7 + sequential-thinking) + 16 opt-in via /ccc-connect, 23 lifecycle hooks × 44 handlers. No feature gating, no paywalls, no license checks.
- Revenue model: core free forever — 4 levers: (1) transparent affiliate links in /ccc-connect (Supabase, Vercel, Neon, etc.) + (2) Kevin's consulting pipeline (plugin = trust engine → consulting funnel) + (3) optional Pro community ($49/mo Discord) + (4) GitHub Sponsors

## UI Components
Check `~/clawd/shared/refs/shadcn-ecosystem.md` before building custom. Key: tremor (charts), auto-form (Zod→forms), magicui (animations).
- **Tech icons:** `developer-icons` (npm) — standard for all projects. Never custom SVGs for tech logos.
