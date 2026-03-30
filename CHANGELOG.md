# Changelog

All notable changes to Claude Code Kit will be documented in this file.

## [1.5.0] — 2026-03-29

### Added
- **Kit Commander**: Standalone interactive CLI that runs ABOVE Claude Code sessions — the first menu-driven project manager for AI coding tools
- **Choose Your Own Adventure Engine**: JSON-driven decision trees with multiple-choice menus — users never need to type code or commands
- **Session Orchestration**: Dispatches to Claude Code headlessly via `claude -p`, tracks sessions with full metadata (duration, cost, files, outcome)
- **Session Resume Intelligence**: "Pick up where you left off" or "Start fresh with summary" — wraps Claude Code's `--resume` flag in friendly UX
- **Progressive Disclosure**: 3-tier user levels (Guided → Assisted → Power User) that unlock automatically as experience grows
- **Recommendations Engine**: Context-aware suggestions based on git status, streaks, session history, pending tasks, and cost
- **Sync Interface (stub)**: Architecture-ready for future SaaS dashboard, cross-device sync, team features, and mobile app
- **Branding Registry** (`docs/BRANDING-REGISTRY.md`): Complete catalog of 227 branding touchpoints across 65 files for easy pivoting
- **Third-Party Licenses** (`THIRD-PARTY-LICENSES.md`): Attribution for 7 MIT/Elastic-licensed pattern inspirations + explicit "not used" section for license-incompatible projects
- **4 Commander Achievements**: Commander, Assisted Mode, Power Commander, First Build — added to gamification system (now 16 total)
- **6 Adventure Flows**: main-menu, build-something, continue-work, review-work, learn-skill, check-stats — each with multiple-choice branching
- **`bin/kc.js` entry point**: `npx kit-commander` or `node bin/kc.js` — with `--version` and `--test` flags
- **Open Core Architecture**: Free CLI (complete) + paid tier stubs (SaaS dashboard, cloud sync, team features, mobile app at $19/mo)

### Changed
- **Version bump**: 1.4 → 1.5 across all files (README, BIBLE, install.sh, commands/cc.md, package.json)
- **Package.json**: Added `kit-commander` and `kc` binary entries alongside existing `claude-code-kit`
- **Package description**: Updated to lead with "Kit Commander" product name
- **/cc Command Center**: Expanded to 23 menu items with Kit Commander as [23]
- **Gamification**: 12 → 16 achievement definitions (4 Commander achievements)

## [1.4.0] — 2026-03-29

### Added
- **Interactive /cc Command Center**: Expanded from 15 to 22 menu items across 6 categories (Build, Plan, Configure, Collaborate, Learn, Fun) with new interactive sub-menus
- **Beginner PM Mode** (`/cc beginner`): Plain English project manager — users describe what they want, the PM breaks it into tasks, dispatches to Claude Code, and reports progress. No jargon needed
- **Celebration System**: 4 ASCII celebration styles (confetti, fireworks, victory, rocket) + 13 random quips for personality
- **Context Rot Monitor**: PostToolUse hook that tracks context window fill with 4-tier warnings (60/75/85/90%)
- **Gamification Stats**: Session tracking, daily streaks, 12 achievement badges, leaderboard display
- **Session Compress Skill**: AI-powered session compression to reloadable markdown summaries
- **Compass Bridge Skill**: Cross-surface state sync via `~/.claude/compass/` markdown files
- **Coach** (`/cc coach`): Context-aware suggestion engine — checks git status, todo items, context usage, cost, and time since last verify
- **Health Check** (`/cc health`): 10-point system diagnostic with pass/fail indicators and fix suggestions
- **Install Manager** (`/cc install`): Component-level install status, outdated detection, selective install/update
- **Docs Browser** (`/cc docs`): Interactive documentation browser with section navigation and search
- **Quick Reference** (`/cc cheat`): Compact one-screen reference card with searchable content
- **Leaderboard** (`/cc leaderboard`): Session stats, streak tracking, achievement badges, fun rank titles
- **npm/npx Distribution**: `npx claude-code-kit@latest` one-command install via package.json + bin/cli.js
- **MIT LICENSE**: Formal MIT license file added
- **Terminal Art Celebrations**: 6 new functions (celebrate, checkmark, progress_checklist, streak_display, random_quip, mini_dashboard) in both bash and JS
- **Statusline API Key Display**: 3-tier fallback showing last 5 chars of active API key
- **Windsurf Compatibility Guide**: Rules file for Windsurf IDE users
- **Codex Compatibility Guide**: Configuration for OpenAI Codex users
- **Awesome Submission Draft**: PR template for awesome-claude-code listing

### Changed
- **Version bump**: 1.3 → 1.4 across all files (README, BIBLE, install.sh, index.html, cc.md, terminal-art)
- **Branding**: Added Author section to README and BIBLE.md with kevinz.ai links
- **Landing page**: Footer updated with Kevin Z attribution + @kzic link, hero badge → v1.4
- **hooks.json**: Added context-rot-monitor to PostToolUse lifecycle

## [1.3.0] — 2026-03-28

### Added
- **Theme System**: 4 switchable skins — Claude Anthropic (default), OLED Black, Matrix (enhanced with CRT scanline overlay), Surprise Me (random from 5 curated palettes)
- **Dashboard Overhaul**: GitHub-style activity heatmaps, agent timeline, cost charts, token gauge, skill radar, metrics grid, history search with filters, tab navigation (Live/History/Analytics)
- **OpenClaw Native Integration**: Auto-detection, skill sync, bidirectional event forwarding, agent profile generation, memory sync
- **Status Update Requests**: Send progress reports to Slack/Discord/email at configurable intervals during long sessions
- **Continuous Improvement Pipeline**: Daily cron scan for ecosystem improvements, multi-agent approval workflow, proposal queue management
- **Task Commander**: Multi-agent orchestration with P0-P10 scoping, 6 DAG workflows, circuit breaker, cost ceiling
- **Modular Installer**: Choose installation mode — full, essentials, scripts, dashboard, or config-only
- **Theme Command**: `/theme list|set|preview|random` for switching visual skins
- **3 iTerm2 Color Profiles**: Claude Anthropic, OLED Black, Matrix — matching dashboard themes
- **Marketing Assets**: Infographic, X/Twitter threads, long-form articles, monetization strategy document
- **New Commands**: `/openclaw`, `/status-updates`, `/theme`, `/improve`, `/deploy-check`, `/debug-session`, `/feature-start`, `/office-hours` (inspired by gstack), `/retro` (inspired by gstack), `/qa` (inspired by gstack), `/compound` (inspired by Compound Engineering)
- **New Skills**: status-updates, openclaw-native, task-commander, continuous-improvement
- **New Hooks**: status-reporter (PostToolUse), openclaw-sync (SessionStart), daily-improvement-scan (cron)

### Changed
- **Visual Rebrand**: Professional Anthropic palette (amber/indigo/deep navy) replaces matrix green as default
- **Dashboard**: React + recharts + date-fns + lucide-react for modern charting and icons
- **Brand Architecture**: "Claude Code Command Center" umbrella brand, "Claude Code Kit" product name
- **Env Vars**: CC_ prefix as primary with KZ_ backward compatibility on all env vars
- **Shell Functions**: cc_* as primary with kz_* backward-compat aliases in terminal-art.sh
- **Status Line**: Updated color palette from green to Anthropic amber/indigo
- **Context Gauge**: Semantic zone labels (Good/Caution/Warning/Critical) replace color names

### Fixed
- Improved color contrast across all dashboard components
- Better ANSI fallback when NO_COLOR is set
- Consistent branding across all 280+ skills and 88+ commands


The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-03-28

### Added
- **Claude Peers integration** — comprehensive guide for multi-instance collaboration with 5 coordination patterns (coordinator, swarm, expert, review, research)
- **Spawn Manager** — spawn and manage multiple Claude Code peers with Quick/Team/Swarm/Expert patterns, coordinator protocol, cost management, max 8 peer safety limit
- **Task Commander** — multi-agent orchestration brain with P0-P10 scoping, 6 DAG workflow templates, circuit breaker pattern, cost ceiling, COMP PROVE verification
- **Contextual Assist** — proactive suggestion system with 5 configurable levels (off/minimal/standard/guided/mentored) + pattern matching for common dev scenarios
- **Cowork integration** — Claude Desktop Cowork guide with plugin compatibility, scheduled tasks, handoff protocol
- **Cowork Plugin Builder** — build custom Cowork plugins with 5 examples, packaging/testing/publishing guide
- **Dispatch integration** — background task system guide with overnight builds, batch processing, cost tracking
- **Dispatch Templates** — 8 pre-built templates (overnight-build, batch-review, security-scan, perf-benchmark, dependency-update, content-generation, data-migration, monitoring-setup)
- **OpenClaw Bridge** — skill mapping, hook translation, agent profile generation, session handoff between Bible and OpenClaw (38-agent platform)
- **Paperclip Bridge** — task management integration with issue creation, priority mapping, bidirectional sync, REST API reference
- **Bible Guide** — interactive onboarding for beginners with skill discovery wizard and progressive disclosure
- **VS Code Bible** — VS Code integration guide with buttons, 20+ snippets, keyboard shortcuts, walkthrough
- **5 Quick Start Guides** — beginner, frontend, backend, full-stack, mobile developer paths
- **Real-time Dashboard** — React + Vite app with agent monitoring, spawn tree, cost tracker, live log stream, KZ Matrix theme
- **`/spawn` command** — spawn multiple Claude Code peers from the command line
- **`/peers` command** — discover and communicate with other Claude Code instances
- **`openclaw-adapter.js` hook** — translates Bible hook events to OpenClaw webhook format
- **`lib/config-reader.js`** — shared config utility with env var overrides for bible-config.json
- **`prompts/meta/task-commander.md`** — prompt template for Task Commander sessions
- **`compatibility/vscode-snippets.json`** — 20+ VS Code snippets for Bible commands
- **6 Task Commander workflows** — feature-build, bug-investigation, code-review-deep, research-deep, overnight-batch, migration

### Changed
- Skill count: 260+ → 280+
- Kit-native hooks: 15 → 16
- Total hooks (with ECC): 34 → 35
- Commands: 84+ → 86+
- Prompt templates: 35+ → 36+
- `/cc` command center updated to v1.2 with Claude Peers and Spawn sections

---

## [1.1.0] - 2026-03-28

### Added
- **4 new mega-skills** with 32 sub-skills:
  - `mega-research` (8 skills) — deep research, literature review, competitive analysis, citation management, data synthesis, source validation
  - `mega-mobile` (7 skills) — iOS/Swift, Android/Kotlin, React Native, Flutter, cross-platform patterns, app store optimization
  - `mega-security` (9 skills) — OWASP top 10, supply chain security, secrets management, threat modeling, security headers, auth hardening, API security, incident response, compliance frameworks
  - `mega-data` (8 skills) — ETL pipelines, data warehousing, analytics engineering, visualization, ML ops, data quality, streaming, governance
- **9 workflow modes** via `mode-switcher` skill — normal, design, saas, marketing, research, writing, night, yolo, unhinged. Switch entire development persona with `/cc mode <name>`
- **35+ prompt templates** across 6 categories (coding, planning, design, marketing, devops, meta) in `prompts/` directory. Access via `/cc prompts`
- **2 new kit-native hooks** (15 total):
  - `pre-compact.js` — saves session state and critical context before context compaction (PreCompact lifecycle)
  - `self-verify.js` — auto-verifies file changes against stated intent, catches drift (PostToolUse lifecycle)
- **Agency Orchestrator** integration skill — multi-agent orchestration patterns with coordinator/worker topology, progress tracking, error recovery
- **OpenClaw patterns** skill — agent configuration, channel routing, session management, tool binding, inter-agent communication
- Updated `/cc` command center with mode switcher (`/cc mode`) and prompt library (`/cc prompts`)
- Updated staff `CLAUDE.md` template with compaction survival rules

### Changed
- Skill count: 220+ → 260+
- Mega-skills: 6 → 10
- Kit-native hooks: 13 → 15
- Total hooks (with ECC): 32 → 34

---

## [1.0.0] - 2026-03-27

### Added
- 220+ skills organized by category with 6 mega-skills (mega-seo, mega-design, mega-testing, mega-marketing, mega-saas, mega-devops)
- 84+ slash commands for common workflows
- 23 lifecycle hooks (PreToolUse, PostToolUse, Stop)
- 3 starter templates (Next.js + shadcn, Turborepo fullstack, marketing site)
- `/cc` interactive command center with skills browser, settings viewer, confidence check, grill me, mode toggle
- `confidence-check` skill — pre-execution confidence assessment (inspired by SuperClaude)
- `four-question-validation` skill — post-implementation hallucination detection
- BIBLE.md — comprehensive development guide structured as 7 chapters + appendices
- CHEATSHEET.md — daily reference for commands, workflows, and power user tips
- SKILLS-INDEX.md — searchable skill directory with quick-start bundles
- Interactive installer with matrix rain, ASCII art, and progress visualization
- Uninstaller with backup detection and restore support
- Hook test harness (Node.js built-in test runner)
- Standalone hooks.json for users without ECC
- VS Code tasks.json for keyboard shortcut integration
- Plugin manifest for Claude Code marketplace compatibility
- GitHub Actions CI for validation
- Kevin's personal overlay (kevin/ directory) with OpenClaw/Paperclip integration
- IDE compatibility guide for VS Code, Cursor, JetBrains, and terminal

### Security
- Destructive command guard (careful-guard.js) with disclaimer about scope
- Settings template deny list for rm -rf, force push, hard reset
- Input sanitization in installer

### Contributors
Built by Kevin Z. Incorporates patterns and best practices from 200+ community sources including ykdojo, hooeem, aiedge_, dr_cintas, SuperClaude Framework, MichLieben, coreyganim, GriffinHilly, bekacru, and many more. See BIBLE.md Appendix B for full credits.

## [1.5.2] - 2026-03-30

### Added
- **CC Commander rebrand** — Kit Commander → CC Commander (Claude Code Commander)
- **Tagline**: "280+ skills. One command. Your AI work, managed by AI."
- **TUI Engine** (commander/tui.js) — figlet ASCII logos, true-color gradients, arrow-key menus
- **4 themes**: Cyberpunk, Fire, Graffiti, Futuristic (switch anytime via settings or menu)
- **Dispatcher upgrade**: 10 new CLI flags (--bare, --effort, --permission-mode plan, --max-budget-usd, --model, --fallback-model, --worktree, --name, --json-schema, --continue)
- **Auto-compact**: CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70 on all dispatches
- **Plan-mode-first**: every dispatch starts in plan mode
- **Spec-driven build flow**: 3 clarification questions for guided/assisted users
- **Project import**: "Open a project" reads local CLAUDE.md + .claude/ context (backwards compatible — never writes to .claude/)
- **2 new adventure flows**: create-content (blog/social/email/marketing/docs), research (competitive/market/code/SEO)
- **Settings adventure**: change name, level, cost ceiling, theme, animations, reset
- **Welcome mini-dashboard**: live stats, last session, top recommendation on main menu
- **Rich stats dashboard**: sparklines, activity heatmap, streak fire, level progress
- **Skill browser**: browse 280+ skills from within Commander (commander/skill-browser.js)
- **State repair**: `--repair` flag backs up corrupt state and resets
- **Animated transitions**: wipe effects between screens, responsive logo
- **BIBLE.md**: new CC Commander chapter (works without Commander — skills/hooks standalone)
- **Build diary**: docs/build-diary.md for X content

### Changed
- Main menu: 11 choices (build, content, research, learn, stats, settings, theme, open project, quit)
- Self-test: 18 checks (up from 7)
- 9 adventure files (up from 6)

### Technical
- 1 npm dependency added: figlet (287 ASCII fonts)
- Zero-dependency arrow-key navigation via readline keypress
- Session naming: auto-slugified from task description
- Level-based dispatch defaults: guided=$2/sonnet, assisted=$3/opusplan, power=$5/opusplan
