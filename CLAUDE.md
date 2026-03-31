# CLAUDE.md — CC Commander

## What This Is

CC Commander — by Kevin Z. 280+ skills. One command. Your AI work, managed by AI. A comprehensive Claude Code configuration toolkit + interactive CLI project manager: 280+ skills, 10 mega-skills, 88+ commands, 37 hooks (18 kit-native + 19 ECC), 36+ prompt templates, 9 workflow modes, 4 themes, 3 starter templates, real-time agent dashboard, OpenClaw native integration, status updates, continuous improvement pipeline, modular installer. Built by scanning 200+ articles from the Claude Code community and distilling into one install.

## CC Commander (v1.6.0)

Interactive CLI that sits ABOVE Claude Code sessions. Manages, dispatches, and tracks AI work.

```bash
ccc          # Launch interactive mode
ccc --test   # 22-point self-test (101 tests total)
ccc --stats  # Quick stats
```

Key components:
- `commander/engine.js` — Main interactive loop with arrow-key menus
- `commander/tui.js` — TUI engine (figlet, gradients, 4 themes, spinners)
- `commander/dispatcher.js` — 14-flag Claude Code dispatch with plan-mode-first
- `commander/knowledge.js` — Knowledge compounding (learns from every session)
- `commander/plugins.js` — Auto-detects gstack, CE, Superpowers, sequences them
- `commander/adventures/*.json` — 11 JSON decision tree flows
- `commander/cowork-plugin/` — Claude Desktop Cowork plugin (4 skills)
- `commander/tests/paths.test.js` — 18 E2E path tests

State: `~/.claude/commander/` (never modifies `.claude/`)
Tests: `node --test commander/tests/paths.test.js`

## Project Structure

```
├── skills/              # 280+ skills organized by category
│   ├── mega-*/          # 10 mega-skills (router + sub-skills)
│   ├── mode-switcher/   # 9 workflow modes
��   ├── init-decision-tree/  # /init project wizard
│   ├── confidence-check/    # Pre-execution confidence assessment
│   ├── four-question-validation/  # Post-implementation verification
���   └── */               # Individual skills (SKILL.md each)
├── commands/            # 88+ slash commands (.md files)
│   └── cc.md            # /cc command center (interactive menu)
├── prompts/             # 36+ prompt templates across 6 categories
├── hooks/               # 18 kit-native hooks (JS) + hooks.json (37 total w/ ECC) + hooks-standalone.json
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
└── CLAUDE.md.staff-template  # Staff CLAUDE.md template
```

## Current Status

**Version:** 1.3

**Live:**
- GitHub repo: github.com/KevinZai/cc-commander
- Landing page: KevinZai.github.io/cc-commander
- One-line install: `curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash`

## Key Commands

```bash
./install.sh              # Interactive install (matrix rain, ASCII art, progress)
./install.sh --dry-run    # Preview without changes
./install.sh --verify     # Validate existing installation
./install.sh --force      # Skip confirmation prompts
./uninstall.sh            # Remove kit components (preserves CLAUDE.md + settings.json)
```

## Development Notes

- Shell scripts source `lib/terminal-art.sh` for all visual output
- Hooks use `lib/terminal-art.js` for consistent branding
- All animations respect `KZ_NO_COLOR=1`, `KZ_NO_ANIMATION=1`, CI detection
- OG image generated via `docs/assets/og-image.svg` → PNG conversion
- Mega-skills use router pattern: one SKILL.md dispatches to sub-skill directories
- Kevin's personal overlay lives in `kevin/` — not installed by the public installer
- Tests run via `node --test tests/hooks.test.js` (Node.js built-in test runner, 61 tests)
- 18 kit-native hooks form the "Proactive Automation Suite" — context-guard, auto-checkpoint, cost-alert, confidence-gate, session-coach, pre-compact, self-verify, openclaw-adapter, status-reporter, openclaw-sync, etc.
- 9 workflow modes via mode-switcher skill — normal, design, saas, marketing, research, writing, night, yolo, unhinged
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
- session-coach.js fires periodic coaching nudges (toggleable via `KZ_COACH_DISABLE=1`, interval via `KZ_COACH_INTERVAL`)
- Status line (`lib/statusline.sh`) shows live context gauge, model, cost, tokens, account, rate limit countdown
- `/init` checks `~/.claude/sessions/` and offers to resume prior sessions before the wizard
- 4 iTerm2 color profiles at `compatibility/` (Claude Anthropic, OLED Black, Matrix); legacy `kz-matrix.itermcolors` preserved
- Theme system with 4 switchable skins (Claude Anthropic, OLED Black, Matrix, Surprise Me)
- OpenClaw native integration with auto-detection, skill sync, bidirectional event forwarding
- Status update requests for sending progress reports during long sessions
- Continuous improvement pipeline with daily cron scan and proposal queue
- Modular installer with 5 installation modes (full, essentials, scripts, dashboard, config-only)
