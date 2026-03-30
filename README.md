# Claude Code Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-D97706?logo=anthropic&logoColor=white)](https://claude.ai/code)
[![Skills](https://img.shields.io/badge/Skills-280+-4F46E5)](./SKILLS-INDEX.md)
[![Hooks](https://img.shields.io/badge/Hooks-37-D97706)](./hooks/)
[![Mega Skills](https://img.shields.io/badge/Mega_Skills-10-4F46E5)](./SKILLS-INDEX.md)
[![Version](https://img.shields.io/badge/Version-1.4-D97706)](./CHANGELOG.md)

**The Complete Claude Code Command Center — by Kevin Z**

> 280+ skills | 10 mega-skills | 88+ commands | 37 hooks | 4 themes | 9 modes | Real-time dashboard

```bash
curl -fsSL https://raw.githubusercontent.com/k3v80/claude-code-kit/main/install-remote.sh | bash
```

---

## The Story

A non-technical CEO scanned every Claude Code article, plugin, and skill — 200+ sources. Tested everything. Kept what worked. Threw away what didn't. One install. Under 60 seconds.

[Read the full story →](https://kevinz.ai)

---

## What's Inside

| Component | Count | Description |
|-----------|-------|-------------|
| **Skills** | 280+ | Structured instruction sets Claude loads on demand |
| **Mega-Skills** | 10 | Domain routers that dispatch to 20-46 sub-skills each |
| **Commands** | 88+ | Slash commands for planning, review, orchestration |
| **Hooks** | 37 | Lifecycle automation (18 kit-native + 19 ECC) |
| **Prompt Templates** | 41 | Battle-tested prompts across 6 categories |
| **Workflow Modes** | 9 | Task-specific behavior presets |
| **Themes** | 4 | Visual skins for terminal and dashboard |
| **Starter Templates** | 3 | Next.js, API, CLI project scaffolds |
| **Dashboard** | 1 | Real-time React monitoring UI |

## Quick Start

```bash
# 1. Install
curl -fsSL https://raw.githubusercontent.com/k3v80/claude-code-kit/main/install-remote.sh | bash

# 2. Open Command Center
/cc

# 3. Start building
/plan "Build a REST API with auth"
```

### Installation Modes

```bash
./install.sh                    # Interactive (choose mode)
./install.sh --mode=full        # Everything
./install.sh --mode=essentials  # Skills + commands + hooks + config
./install.sh --mode=scripts     # Terminal libraries only
./install.sh --mode=dashboard   # Dashboard only
./install.sh --mode=config      # Just CLAUDE.md + settings.json
```

## Mega-Skills

Each mega-skill is a domain router that dispatches to specialist sub-skills automatically.

| Mega-Skill | Sub-Skills | Domain |
|-----------|-----------|--------|
| `mega-seo` | 19 | Technical SEO, content, analytics, schema |
| `mega-design` | 35+ | UI/UX, Impeccable polish suite, visual effects |
| `mega-testing` | 15 | Unit, integration, E2E, load, security testing |
| `mega-marketing` | 46 | Content, CRO, growth, email, ads, analytics |
| `mega-saas` | 20 | Auth, billing, API, deploy, monitoring |
| `mega-devops` | 20 | CI/CD, Docker, AWS, Terraform, monitoring |
| `mega-research` | 8 | Deep analysis, multi-source research |
| `mega-mobile` | 7 | React Native, Flutter, iOS, Android |
| `mega-security` | 9 | OWASP, pentest, compliance, audit |
| `mega-data` | 8 | SQL, ETL, visualization, ML pipelines |

## Theme System

4 switchable visual skins for terminal and dashboard:

| Theme | Description |
|-------|-------------|
| **Claude Anthropic** (default) | Warm amber on deep navy — professional |
| **OLED Black** | Pure black for OLED displays |
| **Matrix** | Classic green-on-black with CRT scanline overlay |
| **Surprise Me** | Random palette from 5 curated options |

```bash
/theme set oled      # Switch skin
/theme list          # See all options
CC_THEME=matrix      # Set via env var
```

## Dashboard

Real-time React monitoring UI with 3 views:

- **Live**: Agent cards, context gauge, cost tracker, task progress, metrics grid
- **History**: GitHub-style activity heatmap, agent timeline, searchable session history
- **Analytics**: Cost charts, token gauge, skill usage radar, period metrics

```bash
cd ~/.claude/dashboard && npm run dev
```

## Workflow Modes

| Mode | Behavior |
|------|----------|
| `normal` | Balanced — standard workflow |
| `design` | Visual-first, critique loops, Impeccable suite |
| `saas` | Full SaaS lifecycle — auth, billing, deploy |
| `marketing` | Content, CRO, growth channel expertise |
| `research` | Deep analysis, multi-source research |
| `writing` | Technical writing, documentation |
| `night` | Autonomous overnight with checkpoints |
| `yolo` | Maximum speed, skip confirmations |
| `unhinged` | No guardrails — experimental |

```bash
/cc mode design    # Switch to design mode
```

## The Kevin Z Method

7 golden rules distilled from 200+ community articles and 14 months of production use:

1. **Plan before coding** — `/plan` for every multi-step task
2. **Context is milk** — Fresh context beats deep context
3. **Verify, don't trust** — Always `/verify` before done
4. **Subagents = fresh context** — Parallel peers for independent work
5. **CLAUDE.md is an investment** — Rules compound like interest
6. **Boring solutions win** — Push back on AI complexity bias
7. **Operationalize every fix** — Every bug becomes infrastructure

Full methodology in [BIBLE.md](BIBLE.md).

## Hook Lifecycle

37 hooks fire automatically at 5 lifecycle stages:

| Stage | Example Hooks |
|-------|--------------|
| **SessionStart** | Load session context, detect package manager, OpenClaw sync |
| **PreToolUse** | Block destructive commands, confidence gate |
| **PostToolUse** | Context guard, auto-checkpoint, cost alert, self-verify, status reporter |
| **PreCompact** | Save state before context compaction |
| **Stop** | Console.log audit, session persistence, cost tracking |

Every hook can be individually disabled via environment variable.

## Stock Claude Code vs Claude Code Kit

| Feature | Stock | Kit |
|---------|-------|-----|
| Skills | 0 | 280+ |
| Commands | Built-in only | 88+ custom |
| Hooks | 0 | 37 automation hooks |
| Modes | 1 | 9 workflow modes |
| Dashboard | None | Real-time React UI |
| Themes | Default | 4 switchable skins |
| Methodology | None | The Kevin Z Method |
| Multi-agent | Basic | Task Commander + Spawn Manager |
| Cost control | None | Auto-alerts + budget tracking |
| Context safety | None | Auto-checkpoint + context guard |

## Integrations

- **OpenClaw**: Native integration with 38-agent AI platform
- **Claude Peers**: Multi-instance collaboration patterns
- **Everything Claude Code (ECC)**: Compatible — adds 21 more hooks
- **VS Code / Cursor**: Snippets and IDE guides included

## Contributing

PRs welcome. The kit is designed to be extended:

```
skills/your-skill/SKILL.md    # Add a new skill
commands/your-command.md       # Add a slash command
hooks/your-hook.js             # Add a lifecycle hook
```

## License

MIT License. See [LICENSE](LICENSE).

---

## Author

**Kevin Zicherman** — CEO of [MyWiFi Networks](https://mywifi.io). Not a researcher. Not a pundit. An operator who ships.

- Web: [kevinz.ai](https://kevinz.ai)
- X: [@kzic](https://x.com/kzic)
- GitHub: [k3v80](https://github.com/k3v80)

---

**Claude Code Kit v1.5** — Built by Kevin Z

*Distilled from 200+ community sources. One install. Under 60 seconds.*
