<div align="center">

```
 ██████╗ ██████╗     ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗ ███████╗██████╗
██╔════╝██╔════╝    ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝██╔══██╗
██║     ██║         ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║█████╗  ██████╔╝
██║     ██║         ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗
╚██████╗╚██████╗    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝███████╗██║  ██║
 ╚═════╝ ╚═════╝     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝
```

### 280+ skills. One command. Your AI work, managed by AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-D97706?logo=anthropic&logoColor=white)](https://claude.ai/code)
[![Skills](https://img.shields.io/badge/Skills-280+-4F46E5)](./SKILLS-INDEX.md)
[![Hooks](https://img.shields.io/badge/Hooks-37-D97706)](./hooks/)
[![Mega Skills](https://img.shields.io/badge/Mega_Skills-10-4F46E5)](./SKILLS-INDEX.md)
[![Version](https://img.shields.io/badge/Version-1.5.2-D97706)](./CHANGELOG.md)

**by [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic))**

[Install](#install) · [CC Commander](#cc-commander) · [Skills](#skills--mega-skills) · [The Method](#the-kevin-z-method) · [BIBLE.md](BIBLE.md)

</div>

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/k3v80/claude-code-kit/main/install-remote.sh | bash
```

One command. Under 60 seconds. Works with any existing Claude Code setup.

```bash
# Or clone and install manually
git clone https://github.com/k3v80/claude-code-kit.git
cd claude-code-kit && ./install.sh
```

<details>
<summary>Installation modes</summary>

```bash
./install.sh                    # Interactive (choose mode)
./install.sh --mode=full        # Everything
./install.sh --mode=essentials  # Skills + commands + hooks + config
./install.sh --mode=scripts     # Terminal libraries only
./install.sh --mode=dashboard   # Dashboard only
./install.sh --mode=config      # Just CLAUDE.md + settings.json
```

</details>

---

## CC Commander

> The interactive CLI that manages your Claude Code sessions. Not a plugin — an OS layer.

```bash
node bin/kc.js          # Launch interactive mode
npx kit-commander       # Or via npm
```

```
 ██████╗ ██████╗     ██████╗███╗   ███╗██████╗
██╔════╝██╔════╝    ██╔════╝████╗ ████║██╔══██╗
██║     ██║         ██║     ██╔████╔██║██║  ██║
██║     ██║         ██║     ██║╚██╔╝██║██║  ██║
╚██████╗╚██████╗    ╚██████╗██║ ╚═╝ ██║██████╔╝
 ╚═════╝ ╚═════╝     ╚═════╝╚═╝     ╚═╝╚═════╝
  280+ skills. One command. Your AI work, managed by AI.

  Welcome back, Kevin! You're on a 7-day streak.
  main · 3 files modified · 42 sessions · 12 badges

  ━━━ CC Commander ━━━

  What would you like to do?

    ❯ Open a project          Import local CLAUDE.md + .claude/ context
      Build something new     Code, websites, APIs, CLI tools
      Create content          Marketing, social media, writing
      Research & analyze      Deep dives, competitive analysis
      Review what I built     Recent sessions and results
      Learn a new skill       Browse 280+ skills and guides
      Check my stats          Streaks, achievements, cost tracking
      Settings                Name, level, cost ceiling, animations
      Change theme            Switch visual style
```

### Not just coding

Commander manages ALL your AI work — code, marketing, content, social media, research. Pick from a menu. Commander handles the rest.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   Build something ─── Web app, API, CLI tool     │
│   Create content ──── Blog, social, email, docs  │
│   Research ────────── Competitive, SEO, audit    │
│                                                  │
│   Every dispatch starts in plan mode.            │
│   Auto-compact at 70% context.                   │
│   Cost ceiling per user level.                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4 themes

Switch anytime from the menu or settings.

```
CYBERPUNK    ████████████  (neon pink → cyan)
FIRE         ████████████  (amber → deep orange)
GRAFFITI     ████████████  (yellow → pink → blue)
FUTURISTIC   ████████████  (soft blue → purple)
```

### Progressive disclosure

| Level | Unlock | Experience |
|-------|--------|------------|
| **Guided** | Default | Everything is multiple choice. Never see a command. |
| **Assisted** | 5 sessions | Multiple choice + freeform. See what Claude does. |
| **Power** | 20 sessions | Full access. Direct skill invocation. Skip spec flow. |

### Backwards compatible

Commander is an overlay. It reads your CLAUDE.md and `.claude/` — never writes to them:

```
CC Commander reads ──→ CLAUDE.md, .claude/skills/, .claude/settings.json
CC Commander writes ──→ ~/.claude/commander/ (separate)
Your Claude Code ────→ Unchanged. Works exactly the same with or without Commander.
```

### Stats dashboard

```
╭──────────────────────────────────────────╮
│  Sessions:  42          Streak:   7 days │
│  Badges:    12          Cost:     $8.50  │
╰──────────────────────────────────────────╯

  Cost trend: ▁▄▂█▅ ▃
  Activity:   ▒▒ ▓▓ ▒▒ ██ ██ ░░ ▓▓
  🔥🔥🔥🔥🔥🔥🔥  7-day streak!

  Level: POWER  Next: MAX
  ▌████████████████████▐ 10/10
```

### CLI flags

```bash
node bin/kc.js --test       # 18-point self-test
node bin/kc.js --stats      # Quick stats without TUI
node bin/kc.js --repair     # Fix corrupt state
node bin/kc.js --help       # Full usage
node bin/kc.js --version    # CC Commander v1.5.2
```

---

## The Intelligence Layer

CC Commander auto-detects installed packages and orchestrates them:

```
┌── INSTALLED PACKAGES ──────────────────────────────────────────┐
│                                                                │
│  gstack (Garry Tan)              54.6K ★                       │
│  ├── /office-hours               Requirements interview        │
│  ├── /plan-ceo-review            Product gate                  │
│  ├── /plan-eng-review            Architecture gate             │
│  ├── /qa                         Real browser QA               │
│  └── /ship                       Ship checklist                │
│                                                                │
│  Compound Engineering (Every)    11.5K ★                       │
│  ├── /ce:brainstorm              Explore requirements          │
│  ├── /ce:plan                    Research-driven planning       │
│  ├── /ce:work                    Execute with tracking          │
│  ├── /ce:review                  6+ reviewer ensemble           │
│  └── /ce:compound                Extract lessons → knowledge    │
│                                                                │
│  Superpowers (Jesse Vincent)     121K ★                        │
│  ├── /plan                       Structured planning            │
│  ├── /tdd                        Test-driven development        │
│  ├── /code-review                Code quality review            │
│  └── /verify                     Verification loop              │
│                                                                │
│  + Everything Claude Code, Simone, and more                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 8-Step Orchestrated Build

Commander auto-selects the best tool for each phase:

```
Phase              Tool                         Fallback
─────────────────────────────────────────────────────────
1. Clarify         /office-hours (gstack)       CC Commander spec flow
2. Decide          /plan-ceo-review (gstack)    Plan mode dispatch
3. Plan            /ce:plan (CE)                Claude Code plan mode
4. Execute         /ce:work (CE)                Headless dispatch
5. Review          /ce:review (CE, 6+ agents)   /simplify
6. Test            /qa (gstack, real browser)    /verify
7. Learn           CC Commander knowledge        (always active)
8. Ship            /ship (gstack)               git commit + push
```

### Knowledge Compounding

Every session makes the next one smarter:

```
Session 1: Fix auth bug → 3 hours debugging
           ↓ knowledge extracted automatically
Session 47: Similar auth issue surfaces
           ↓ knowledge injected into prompt
           "We hit this before. Solution: ___"
           ↓ fixed in 10 minutes
```

### Night Mode

Start before bed. Wake up to shipped code.

```
Night Mode asks 10 detailed questions:
  1. What are you building?
  2. Who is it for?
  3. Most critical feature?
  4. Tech stack?
  5. What does DONE look like?
  6. What does BROKEN look like?
  7. Edge cases?
  8. Testing requirements?
  9. Deployment target?
  10. Anything else?

Then dispatches: Opus | max effort | $10 budget | 100 turns | self-testing
```

---

## Skills & Mega-Skills

280+ skills that Claude loads on demand. 10 mega-skills that route to specialist sub-skills.

```
/mega-design ───→ 35+ sub-skills (UI, UX, animations, polish)
/mega-marketing ─→ 46 sub-skills (CRO, email, ads, content, SEO)
/mega-saas ─────→ 20 sub-skills (auth, billing, API, deploy)
/mega-testing ──→ 15 sub-skills (unit, integration, E2E, load)
/mega-devops ───→ 20 sub-skills (CI/CD, Docker, AWS, monitoring)
/mega-seo ──────→ 19 sub-skills (technical SEO, schema, analytics)
/mega-security ─→ 9 sub-skills (OWASP, pentest, compliance)
/mega-research ─→ 8 sub-skills (deep analysis, multi-source)
/mega-mobile ───→ 7 sub-skills (React Native, Flutter, iOS)
/mega-data ─────→ data pipelines, analysis, visualization
```

### Commands (88+)

```bash
# Planning
/plan "Build a REST API"      # Spec-first planning
/cc                            # Command center menu

# Quality
/verify                        # Verification loop
/code-review                   # Multi-agent review
/simplify                      # 3 parallel review agents

# Development
/tdd                           # Test-driven workflow
/build-fix                     # Auto-resolve build errors
/checkpoint                    # Git checkpoint

# Orchestration
/orchestrate                   # Multi-agent pipeline
/batch "Update all tests"     # Parallel codebase changes
/loop 5m "check deploy"       # Recurring tasks
```

### Hooks (37)

```
SessionStart ──→ Load context, detect tools, OpenClaw sync
PreToolUse ────→ Block rm -rf, confidence gate, verify commits
PostToolUse ───→ Auto-checkpoint, context guard, cost alert
PreCompact ────→ Save state before compaction
Stop ──────────→ Console.log audit, session save, cost tracking
```

---

## What's Inside

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   280+ SKILLS          10 MEGA-SKILLS    88+ COMMANDS   │
│   ─────────            ──────────────    ────────────   │
│   Structured           Domain routers    Slash commands  │
│   instruction sets     with 20-46 sub-   for planning,  │
│   Claude loads         skills each       review, deploy  │
│   on demand                                             │
│                                                         │
│   37 HOOKS             41 PROMPTS        9 MODES        │
│   ────────             ──────────        ──────         │
│   Lifecycle            Battle-tested     Task-specific   │
│   automation           templates         behavior        │
│   (18 kit + 19 ECC)   across 6 cats     presets         │
│                                                         │
│   4 THEMES             3 TEMPLATES       1 DASHBOARD    │
│   ────────             ───────────       ───────────    │
│   Cyberpunk, Fire      Next.js, API      Real-time      │
│   Graffiti, Future     CLI scaffolds     React UI       │
│                                                         │
│   CC COMMANDER         PROJECT IMPORT    FULL DOCS      │
│   ────────────         ──────────────    ─────────      │
│   Interactive CLI      Reads CLAUDE.md   BIBLE.md +     │
│   with arrow-key       Never modifies    CHEATSHEET +   │
│   menus + themes       your .claude/     SKILLS-INDEX   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Stock Claude Code vs Kit

| Feature | Stock | Claude Code Kit |
|---------|-------|----------------|
| Skills | 0 | **280+** |
| Commands | Built-in only | **88+ custom** |
| Hooks | 0 | **37 automation hooks** |
| Modes | 1 | **9 workflow modes** |
| Dashboard | None | **Real-time React UI** |
| Themes | Default | **4 switchable skins** |
| Methodology | None | **The Kevin Z Method** |
| Multi-agent | Basic | **Task Commander + Spawn Manager** |
| Cost control | None | **Auto-alerts + budget tracking** |
| Context safety | None | **Auto-checkpoint + context guard** |
| Session management | None | **CC Commander — persistent tracking** |
| Non-coder support | None | **Guided mode — multiple choice menus** |

---

## The Kevin Z Method

7 golden rules distilled from 200+ community articles and 14 months of production use:

```
┌─ THE 7 RULES ──────────────────────────────────────────┐
│                                                        │
│  1. Plan before coding        /plan every multi-step   │
│  2. Context is milk           Fresh + condensed = best │
│  3. Verify, don't trust       /verify before done      │
│  4. Subagents = fresh ctx     Parallel, no bloat       │
│  5. CLAUDE.md is investment   Rules compound over time  │
│  6. Boring solutions win      Push back on complexity   │
│  7. Operationalize every fix  Every bug → infra        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Full methodology: [BIBLE.md](BIBLE.md) (2000 lines, 7 chapters, appendices)

---

## The Story

A non-technical CEO scanned every Claude Code article, plugin, and skill — 200+ sources across X/Twitter, Reddit, Medium, YouTube, and GitHub. Tested everything. Kept what worked. Threw away what didn't.

The result: **Claude Code Kit** — the complete setup. And **CC Commander** — the first interactive CLI that manages your AI work through multiple-choice menus.

One install. Under 60 seconds. Works with your existing setup.

[Read the full story →](https://kevinz.ai)

---

## Contributing

PRs welcome. The kit is designed to be extended:

```
skills/your-skill/SKILL.md    # Add a new skill
commands/your-command.md       # Add a slash command
hooks/your-hook.js             # Add a lifecycle hook
commander/adventures/X.json    # Add a Commander flow
```

---

## License

MIT License. See [LICENSE](LICENSE).

---

<div align="center">

**CC Commander v1.5.2** — by [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic))

*280+ skills. One command. Your AI work, managed by AI.*

```
╭─────────────────────────────────────────────────╮
│                                                 │
│   Not a researcher. Not a pundit.               │
│   An operator who ships.                        │
│                                                 │
╰─────────────────────────────────────────────────╯
```

</div>
