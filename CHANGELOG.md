# Changelog

All notable changes to The Claude Code Bible will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
