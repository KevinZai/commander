# CLAUDE.md — The Claude Code Bible

## What This Is

The Claude Code Bible — by Kevin Z. A comprehensive Claude Code configuration toolkit: 280+ skills, 10 mega-skills, 86+ commands, 35 hooks (16 kit-native + 19 ECC), 36+ prompt templates, 9 workflow modes, 3 starter templates, real-time agent dashboard. Built by scanning 200+ articles from the Claude Code community and distilling into one install.

## Project Structure

```
├── skills/              # 260+ skills organized by category
│   ├── mega-*/          # 10 mega-skills (router + sub-skills)
│   ├── mode-switcher/   # 9 workflow modes
��   ├── init-decision-tree/  # /init project wizard
│   ├── confidence-check/    # Pre-execution confidence assessment
│   ├── four-question-validation/  # Post-implementation verification
���   └── */               # Individual skills (SKILL.md each)
├── commands/            # 84+ slash commands (.md files)
│   └── cc.md            # /cc command center (interactive menu)
├── prompts/             # 35+ prompt templates across 6 categories
├── hooks/               # 15 kit-native hooks (JS) + hooks.json (34 total w/ ECC) + hooks-standalone.json
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
├── compatibility/       # IDE guides + kz-matrix.itermcolors terminal theme
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

**Version:** 1.2

**Live:**
- GitHub repo: github.com/k3v80/claude-code-kit
- Landing page: k3v80.github.io/claude-code-kit
- One-line install: `curl -fsSL https://raw.githubusercontent.com/k3v80/claude-code-kit/main/install-remote.sh | bash`

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
- 16 kit-native hooks form the "Proactive Automation Suite" — context-guard, auto-checkpoint, cost-alert, confidence-gate, session-coach, pre-compact, self-verify, openclaw-adapter, etc.
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
- KZ Matrix iTerm2 profile at `compatibility/kz-matrix.itermcolors`
