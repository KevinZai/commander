# CLAUDE.md — The Claude Code Bible

## What This Is

The Claude Code Bible — by Kevin Z. A comprehensive Claude Code configuration toolkit: 220+ skills, 6 mega-skills, 84+ commands, 23 hooks, 3 templates. Built by scanning 200+ articles from the Claude Code community and distilling into one install.

## Project Structure

```
├── skills/              # 220+ skills organized by category
│   ├── mega-*/          # 6 mega-skills (router + sub-skills)
│   ├── init-decision-tree/  # /init project wizard
│   ├── confidence-check/    # Pre-execution confidence assessment
│   ├── four-question-validation/  # Post-implementation verification
│   └── */               # Individual skills (SKILL.md each)
├── commands/            # 84+ slash commands (.md files)
│   └── cc.md            # /cc command center (interactive menu)
├── hooks/               # 23 hooks (JS) + hooks.json + hooks-standalone.json
├── templates/           # 3 starter templates (nextjs, api, cli)
├── lib/                 # Terminal art libraries (bash + JS)
├── docs/                # GitHub Pages landing site
│   ├── index.html       # Single-page marketing site
│   └── assets/          # CSS, JS, images
├── kevin/               # Kevin's personal overlay (not installed by default)
│   ├── install-kevin.sh # Layer Kevin-specific config after public install
│   ├── CLAUDE.md.kevin  # Kevin's CLAUDE.md (full MCP, OpenClaw)
│   ├── settings.json.kevin  # Kevin's settings (all MCP servers)
│   └── hooks/           # Kevin-specific hooks (Paperclip, OpenClaw)
├── compatibility/       # IDE compatibility guides
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

**Version:** 1.0

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
- Tests run via `node --test tests/hooks.test.js` (Node.js built-in test runner)
