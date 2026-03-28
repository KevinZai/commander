# The Claude Code Bible — by Kevin Z

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-00ff41?logo=anthropic&logoColor=white)](https://claude.ai/code)
[![Skills](https://img.shields.io/badge/Skills-260+-00d4ff)](./SKILLS-INDEX.md)
[![Hooks](https://img.shields.io/badge/Hooks-34-ff6b35)](./hooks/)
[![Mega Skills](https://img.shields.io/badge/Mega_Skills-10-ff6b35)](./SKILLS-INDEX.md)
[![Version](https://img.shields.io/badge/Version-1.1-00ff41)](./CHANGELOG.md)
[![Terminal](https://img.shields.io/badge/Terminal-CLI-00ff41?logo=gnometerminal&logoColor=white)](#install)

> **260+ skills. 10 mega-skills. 35+ prompt templates. 9 workflow modes. One install. The comprehensive guide and toolkit for Claude Code.**

A non-technical CEO scanned every Claude Code article, plugin, and skill on the internet — top 200+ posts from X, Reddit, Medium, YouTube — tested every community pack, and distilled it all into one toolkit.

---

## Install

### One-Line Install (paste anywhere)

```bash
curl -fsSL https://raw.githubusercontent.com/k3v80/claude-code-bible/main/install-remote.sh | bash
```

This auto-detects your system, installs Claude Code if needed, downloads the toolkit, backs up your existing config, and runs the interactive installer.

### Manual Install

```bash
git clone https://github.com/k3v80/claude-code-bible.git
cd claude-code-bible
./install.sh
```

### VS Code

Install the [Claude Code extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) then run the one-line install above in any terminal. The toolkit automatically works inside VS Code. Pre-configured tasks available via **Terminal > Run Task**.

### Uninstall

```bash
./uninstall.sh
```

Removes kit components (skills, commands, hooks, lib, templates, reference docs). Preserves your `CLAUDE.md` and `settings.json`. Offers to restore from backup.

## What's Inside

| Component | Count | Location |
|-----------|-------|----------|
| Skills | 260+ | `~/.claude/skills/` |
| Commands | 84+ | `~/.claude/commands/` |
| Hooks | 34 (15 kit-native + 19 ECC) | `~/.claude/hooks/hooks.json` |
| Mega-Skills | 10 | `~/.claude/skills/mega-*/` |
| Prompt Templates | 35+ | `~/.claude/prompts/` |
| Workflow Modes | 9 | `~/.claude/skills/mode-switcher/` |
| Starter Templates | 3 | `~/.claude/templates/` |
| Reference Docs | 3 | `BIBLE.md`, `CHEATSHEET.md`, `SKILLS-INDEX.md` |

## /cc Command Center

Type `/cc` in any Claude Code session to access the interactive command center:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CLAUDE CODE BIBLE  //  COMMAND CENTER       v1.1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [1] Skills Browser    — 260+ skills by category
  [2] Mega-Skills       — 10 domain packs w/ sub-skills
  [3] Settings          — model, permissions, hooks, MCP
  [4] Grill Me          — Socratic planning probe
  [5] Confidence Check  — pre-execution confidence assessment
  [6] Mode Switcher     — 9 workflow modes
  [7] Status            — kit health, tasks, version
  [8] Quick Reference   — cheatsheet highlights
  [9] /init             — project wizard
  [10] Prompt Library   — 35+ templates across 6 categories
```

| Sub-command | What it does |
|-------------|-------------|
| `/cc skills` | Browse skills by category |
| `/cc mega seo` | Drill into a mega-skill |
| `/cc grill` | 7 Socratic questions — no plan mode |
| `/cc confidence` | Pre-execution confidence 0-100% |
| `/cc mode <name>` | Switch workflow mode (9 modes) |
| `/cc prompts` | Browse 35+ prompt templates |
| `/cc status` | Health dashboard |

## Mega-Skills

Load ONE skill, get the entire domain. Each mega-skill has a router that dispatches to the right specialist.

| Mega-Skill | Skills | Domain |
|------------|--------|--------|
| `mega-seo` | 19 | Technical SEO, AI search, content strategy, analytics |
| `mega-design` | 35+ | Animations, effects, design systems, Impeccable polish suite |
| `mega-testing` | 15 | TDD, E2E, verification, QA, regression, load testing |
| `mega-marketing` | 46 | Content, CRO, channels, growth, sales |
| `mega-saas` | 20 | Auth, billing, DB, API, frontend, metrics |
| `mega-devops` | 20 | CI/CD, Docker, AWS, monitoring, Terraform |
| `mega-research` | 8 | Deep research, literature review, competitive analysis, data synthesis |
| `mega-mobile` | 7 | iOS, Android, React Native, Flutter, app store optimization |
| `mega-security` | 9 | Pen testing, OWASP, supply chain, secrets management, threat modeling |
| `mega-data` | 8 | ETL pipelines, data warehousing, analytics, visualization, ML ops |

## Workflow Modes

Switch your entire development persona with one command. Each mode adjusts Claude's behavior, verbosity, risk tolerance, and skill loading.

| Mode | What it does |
|------|-------------|
| `normal` | Balanced defaults — plan-first, verify-before-done |
| `design` | Visual-first — loads design/animation skills, critique loop |
| `saas` | Full SaaS lifecycle — auth, billing, DB, deploy pipeline |
| `marketing` | Content + CRO focus — SEO, copy, conversion optimization |
| `research` | Deep research mode — citations, confidence levels, source verification |
| `writing` | Long-form content — blog posts, docs, technical writing |
| `night` | Autonomous overnight — checkpoints, error recovery, notifications |
| `yolo` | Maximum speed — skip confirmations, auto-approve, ship fast |
| `unhinged` | No guardrails — experimental, creative, push boundaries |

Switch via `/cc mode <name>` or `"use mode-switcher skill, switch to <name> mode"`.

## Prompt Library

35+ battle-tested prompt templates across 6 categories, ready to paste or invoke:

| Category | Templates | Examples |
|----------|-----------|---------|
| Coding | 8 | Bug fix, code review, architecture review, TDD setup |
| Planning | 6 | Spec interview, evals-first, decomposition, handoff |
| Design | 5 | Design critique, accessibility audit, animation brief |
| Marketing | 6 | SEO content brief, cold email, landing page copy, ad creative |
| DevOps | 5 | CI failure investigation, deploy checklist, incident response |
| Meta | 5+ | Subagent dispatch, research, PR description, skill creation |

Access via `/cc prompts` or browse `prompts/` directory.

## The Kevin Z Method

Every project starts with `/init` — an interactive wizard that asks:

1. **Project Identity** — name, stack, deployment target
2. **Build Type** — QUICK (<4h), DEEP (1-5 days), SAAS (1-4 weeks), OVERNIGHT (6-12h autonomous)
3. **Domain Deep-Dive** — task-specific questions per build type
4. **Output Generation** — auto-generates CLAUDE.md, tasks/, settings.json

## Key Innovations

### Confidence Check (from SuperClaude)
Before executing any plan, self-assess confidence 0-100%. High confidence → proceed. Low confidence → ask questions first. Saves 25-250x tokens by preventing wrong-direction work.

### Four-Question Validation
Post-implementation check: (1) Tests passing? (2) Requirements met? (3) No unverified assumptions? (4) Evidence? Catches 94% of AI errors.

### Quick Start Bundles

| Bundle | Skills | For |
|--------|--------|-----|
| Web Wizard | `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` + `drizzle-neon` | Full-stack web apps |
| Security Engineer | `pci-compliance` + `container-security` + `github-actions-security` | Security audits |
| Content Creator | `mega-marketing` + `mega-seo` + `blog-engine` | Content & SEO |
| Full Stack SaaS | `mega-saas` + `mega-devops` + `mega-testing` | SaaS products |

## KZ Status Line

A persistent footer appears under every Claude Code response showing live session data:

```
━━ KZ ▐████████████░░░░░░░░▌ 62% │ Opus │ $1.24 │ in:89K out:14K │ 23m │ +142-37 │ my-project
```

Shows context gauge (color-coded zones), model, cost, tokens, duration, lines changed, rate limits, and project name. Auto-configured on install via `settings.json`.

## Proactive Automation (15 Hooks)

The kit ships 15 lifecycle hooks that run automatically — no prompting required. They guard against mistakes, track costs, checkpoint work, and coach you toward better workflows.

| Lifecycle | Hook | What it does |
|-----------|------|-------------|
| PreToolUse | `careful-guard` | Blocks destructive commands (rm -rf, DROP TABLE, force push) |
| PreToolUse | `pre-commit-verify` | Runs TypeScript check before git commit |
| PreToolUse | `confidence-gate` | Warns on risky multi-file bash operations |
| PostToolUse | `auto-notify` | Notifications on significant events (PR created, deploy, etc.) |
| PostToolUse | `preuse-logger` | Logs tool usage for cost analysis |
| PostToolUse | `context-guard` | Warns at ~70% context usage, auto-saves session |
| PostToolUse | `auto-checkpoint` | Git-stash checkpoint every 10 file edits |
| PostToolUse | `cost-alert` | Cost proxy alerts at ~$0.50 and ~$2.00 thresholds |
| PostToolUse | `auto-lessons` | Captures errors and corrections to tasks/lessons.md |
| PostToolUse | `rate-predictor` | Predicts session duration from tool call rate |
| Stop | `status-checkin` | Session end status summary |
| Stop | `session-end-verify` | Verifies modified files, checks for console.log |
| Stop | `session-coach` | Periodic coaching nudges — skill tips, workflow reminders (toggleable via `KZ_COACH_DISABLE=1`) |
| PreCompact | `pre-compact` | Saves session state and critical context before context compaction |
| PostToolUse | `self-verify` | Auto-verifies file changes against stated intent, catches drift |

With ECC installed, 19 additional hooks bring the total to 34. Without ECC, the 15 kit-native hooks work standalone via `hooks-standalone.json`.

## KZ Matrix Terminal Theme

OLED black background + bright green text + cyan accents. Import the iTerm2 profile:

```bash
open compatibility/kz-matrix.itermcolors
```

Color values for other terminals (Alacritty, Warp, Kitty) in [compatibility/README.md](compatibility/README.md).

## IDE Compatibility

The toolkit customizes **Claude Code itself** (via `~/.claude/`), not your IDE. It works everywhere Claude Code runs:

| Environment | Status |
|-------------|--------|
| Terminal (`claude` CLI) | Full support |
| VS Code (Claude Code extension) | Full support + task shortcuts |
| Cursor | Full support |
| JetBrains (IntelliJ, WebStorm) | Full support |
| Any terminal running `claude` | Full support |

Install once. Works everywhere.

## Key Files

| File | Purpose |
|------|---------|
| `BIBLE.md` | The Kevin Z Method — 7 chapters + appendices |
| `CHEATSHEET.md` | Daily reference — commands, shortcuts, power combos |
| `SKILLS-INDEX.md` | Searchable skill directory (260+ skills by category) |
| `CLAUDE.md` | Global behavior instructions (loaded every session) |
| `settings.json` | MCP servers, permissions, model selection |

## Installer Options

```bash
./install.sh              # Interactive install
./install.sh --dry-run    # Preview without changes
./install.sh --verify     # Validate existing installation
./install.sh --force      # Skip confirmation prompts
./uninstall.sh            # Clean removal with backup restore
```

## Testing

```bash
node --test tests/hooks.test.js    # Run hook test harness (53 tests)
```

Tests validate all 15 kit-native hooks, verify hook file existence, check JS syntax, and exercise the proactive automation suite (context-guard, auto-checkpoint, cost-alert, confidence-gate, session-coach, pre-compact, self-verify, etc.).

## For Staff: Customize

1. Edit `CLAUDE.md` — replace paths/projects for your setup
2. Edit `settings.json` — point MCP servers to your tokens
3. Add project-level `CLAUDE.md` in each repo for stack-specific rules
4. Run `/init` in any project to generate tailored config
5. Type `/cc` to explore skills, settings, and workflows

## Built With

- [Claude Code](https://claude.ai/code) by Anthropic
- 200+ articles from the Claude Code community
- Patterns from SuperClaude Framework, Everything Claude Code, and Trail of Bits
- Tested on real projects (MyWiFi Networks, DMHub, trading systems)

See [CONTRIBUTORS.md](docs/CONTRIBUTORS.md) for full source credits.

## License

MIT
