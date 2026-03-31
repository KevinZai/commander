# CC Commander v1.6.0 -- Quick Reference Guide
> Print this. Keep it next to your monitor.

---

## Essential Commands

| Command | What It Does |
|---------|-------------|
| `/cc` | Command center -- interactive menu (skills, modes, prompts, settings, status) |
| `/init` | Project setup wizard -- creates CLAUDE.md with stack context |
| `/plan` | Spec-first planning -- interview, spec doc, fresh session execute |
| `/spawn` | Launch parallel Claude Code peers (Quick/Team/Swarm/Expert) |
| `/peers` | Claude Peers coordination -- discovery, messaging, patterns |
| `/verify` | Run verification suite before marking done |
| `/checkpoint` | Git checkpoint -- save state mid-work |
| `/build-fix` | Auto-resolve build errors |
| `/code-review` | Multi-agent code review (runs 3 reviewers) |
| `/tdd` | Test-driven workflow -- red/green/refactor cycle |
| `/save-session` | Persist session state to `~/.claude/sessions/` |
| `/resume-session` | Restore last saved session |
| `/orchestrate` | Multi-agent pipeline for complex work |
| `/quality-gate` | Run lint + typecheck + tests |
| `/complete` | Mark task complete with verification |
| `/audit` | Full interface/code quality audit |
| `/e2e` | Run Playwright E2E tests |
| `/refactor-clean` | Safe refactoring with test preservation |
| `/test-coverage` | Check test coverage |
| `/pr` | Create pull request |
| `/deploy` | Deploy to production |
| `/docs` | Generate/update documentation |
| `/learn` | Extract reusable patterns from current work |
| `/aside` | Quick side-task without losing main context |
| `/context-budget` | Visual context window usage analyzer |
| `/skill-create` | Create a new skill |
| `/skill-health` | Audit skill quality |
| `/prompt-optimize` | Optimize a prompt template |
| `/model-route` | Switch model for current task type |
| `/careful` | Enable maximum safety mode |
| `/devfleet` | Multi-agent dev fleet management |
| `/evolve` | Evolve skills based on usage patterns |
| `/paperclip` | Manage tasks in Paperclip |

## Built-in CLI Commands

| Command | What It Does |
|---------|-------------|
| `/help` | Show all commands and keyboard shortcuts |
| `/clear` | Clear conversation history |
| `/compact` | Compress context, keeping key info |
| `/model` | Switch model for session (`/model claude-haiku-4`) |
| `/think` | Enable extended thinking (`/think hard about X`) |
| `/review` | Built-in code review pass |
| `/cost` | Show token usage and session cost |
| `/doctor` | Diagnose Claude Code setup issues |
| `/add` | Add files/directories to context |
| `/new` | Start fresh conversation in same session |
| `/resume` | Resume a previous session from list |
| `/context` | Show current context summary |
| `/memory` | View/edit CLAUDE.md memory files |

## CLI Entry Points

| Command | What It Does |
|---------|-------------|
| `claude` | Start interactive REPL |
| `claude "task"` | One-shot task (non-interactive) |
| `claude -p "task"` | Print mode -- output to stdout, no session |
| `claude -c` | Continue last conversation |
| `claude --resume <id>` | Resume specific session |
| `claude update` | Update Claude Code |
| `claude mcp list` | List MCP servers |
| `claude config list` | List config values |

## Key CLI Flags

| Flag | What It Does |
|------|-------------|
| `--model <model>` | Override model |
| `--headless` | No interactive UI (CI/CD) |
| `--output-format json` | JSON output for scripting |
| `--max-turns <n>` | Limit agentic loop iterations |
| `--add-dir <path>` | Add directory to initial context |
| `--allowedTools <tools>` | Whitelist specific tools |
| `--verbose` | Show detailed tool call output |
| `--dangerously-skip-permissions` | Skip permission prompts (CI only) |

---

## Workflow Modes

Switch via `/cc mode <name>` or `"use mode-switcher skill, switch to <name> mode"`

| Mode | Use When | Key Behaviors |
|------|----------|---------------|
| `normal` | Default for most work | Balanced -- plan-first, verify-before-done |
| `design` | Building UIs, landing pages | Visual-first, design/animation skills, critique loop |
| `saas` | Building a SaaS product | Full lifecycle -- auth, billing, DB, deploy |
| `marketing` | Campaigns, content | Content + CRO -- SEO, copy, conversion |
| `research` | Competitive analysis, learning | Deep research -- citations, confidence, sources |
| `writing` | Blog posts, docs, reports | Long-form content -- structured drafts, editing |
| `night` | Batch jobs, migrations | Autonomous overnight -- checkpoints, recovery |
| `yolo` | Quick prototypes, demos | Max speed -- skip confirmations, auto-approve |
| `unhinged` | Hackathons, experiments | No guardrails -- experimental, creative |

---

## Mega-Skills Quick Reference

Load ONE mega-skill to get an entire domain. Each has a router that dispatches to the right specialist.

| Mega-Skill | Sub-Skills | What It Covers |
|-----------|------------|----------------|
| `mega-seo` | 19 | Technical SEO, AI search, analytics, programmatic SEO |
| `mega-design` | 35+ | Animations, SVG, motion, effects, design systems, Impeccable suite |
| `mega-testing` | 15 | TDD, E2E (Playwright), verification, QA, visual/load testing |
| `mega-marketing` | 46 | Content, CRO, channels, growth, intelligence, sales |
| `mega-saas` | 20 | Auth, billing, database, API, frontend stack, metrics |
| `mega-devops` | 20 | CI/CD, Docker, AWS, monitoring, zero-downtime, Terraform |
| `mega-research` | 8 | Deep research, literature review, competitive analysis, data synthesis |
| `mega-mobile` | 7 | iOS, Android, React Native, Flutter, app store optimization |
| `mega-security` | 9 | Pen testing, OWASP, supply chain, secrets, threat modeling |
| `mega-data` | 8 | ETL, data warehousing, analytics, visualization, ML ops |

---

## Hook Lifecycle

```
SessionStart --> [load context, detect pkg manager]
      |
PreToolUse --> [validate tool call, block dangerous ops]
      |
  [Tool executes]
      |
PostToolUse --> [auto-format, typecheck, cost track, checkpoint]
      |
PreCompact --> [save state before context compression]
      |
   Stop --> [verify files, persist session, coach, notify]
```

## Kit-Native Hooks (16 total)

### PreToolUse (3 hooks)

| Hook | What It Does | Disable |
|------|-------------|---------|
| `careful-guard` | Blocks destructive commands (rm -rf, DROP TABLE, force push) | `KZ_DISABLE_CAREFUL_GUARD=1` |
| `pre-commit-verify` | TypeScript check before git commit -- blocks on tsc errors | `KZ_DISABLE_PRE_COMMIT_VERIFY=1` |
| `confidence-gate` | Warns on multi-file bash ops (sed -i on globs, find -exec) | `KZ_DISABLE_CONFIDENCE_GATE=1` |

### PostToolUse (8 hooks)

| Hook | What It Does | Disable |
|------|-------------|---------|
| `context-guard` | Warns at ~70% context, auto-saves session | `KZ_DISABLE_CONTEXT_GUARD=1` |
| `auto-checkpoint` | Git-stash checkpoint every 10 file edits | `KZ_DISABLE_AUTO_CHECKPOINT=1` |
| `cost-alert` | Alerts at ~$0.50 (30 calls) and ~$2.00 (60 calls) | `KZ_DISABLE_COST_ALERT=1` |
| `auto-notify` | Notifications on significant events (PR, deploy) | `KZ_DISABLE_AUTO_NOTIFY=1` |
| `auto-lessons` | Captures errors/corrections to tasks/lessons.md | `KZ_DISABLE_AUTO_LESSONS=1` |
| `preuse-logger` | Logs tool usage for cost analysis | `KZ_DISABLE_PREUSE_LOGGER=1` |
| `rate-predictor` | Predicts remaining session duration from call rate | `KZ_DISABLE_RATE_PREDICTOR=1` |
| `self-verify` | Verifies file changes against stated intent, catches drift | `KZ_DISABLE_SELF_VERIFY=1` |

### Stop (3 hooks)

| Hook | What It Does | Disable |
|------|-------------|---------|
| `session-end-verify` | Checks modified files, leftover console.log | `KZ_DISABLE_SESSION_END_VERIFY=1` |
| `status-checkin` | Session end status summary | `KZ_DISABLE_STATUS_CHECKIN=1` |
| `session-coach` | Periodic coaching nudges (skill tips, reminders) | `KZ_COACH_DISABLE=1` |

### PreCompact (1 hook)

| Hook | What It Does | Disable |
|------|-------------|---------|
| `pre-compact` | Saves state + critical context before compaction | `KZ_DISABLE_PRE_COMPACT=1` |

### OpenClaw (1 hook)

| Hook | What It Does | Disable |
|------|-------------|---------|
| `openclaw-adapter` | Bridge to OpenClaw agent platform | `KZ_DISABLE_OPENCLAW_ADAPTER=1` |

With ECC installed, 19 additional hooks bring the total to 35.

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `KZ_NO_COLOR` | (unset) | Disable ANSI colors in kit output |
| `KZ_NO_ANIMATION` | (unset) | Disable intro animations |
| `KZ_COACH_DISABLE` | (unset) | Disable session coach entirely |
| `KZ_COACH_INTERVAL` | 10 | Coach nudge interval (# of responses between nudges) |
| `KZ_DISABLE_CAREFUL_GUARD` | (unset) | Disable destructive command blocker |
| `KZ_DISABLE_CONTEXT_GUARD` | (unset) | Disable context usage warnings |
| `KZ_DISABLE_AUTO_CHECKPOINT` | (unset) | Disable auto git-stash checkpoints |
| `KZ_DISABLE_COST_ALERT` | (unset) | Disable cost threshold alerts |
| `KZ_DISABLE_SELF_VERIFY` | (unset) | Disable file change verification |
| `KZ_DISABLE_PRE_COMPACT` | (unset) | Disable pre-compaction state save |
| `KZ_DISABLE_AUTO_LESSONS` | (unset) | Disable auto lesson capture |
| `KZ_DISABLE_PRE_COMMIT_VERIFY` | (unset) | Disable TypeScript check before commit |
| `KZ_DISABLE_CONFIDENCE_GATE` | (unset) | Disable multi-file op warnings |
| `KZ_DISABLE_RATE_PREDICTOR` | (unset) | Disable session duration prediction |

---

## Spawn Patterns

| Pattern | Agents | Use Case |
|---------|--------|----------|
| Quick | 1 | Single focused task |
| Team | 2-3 | Related tasks in parallel |
| Swarm | 4-8 | Large build, many files |
| Expert | 2+ | Dialectic review, consensus |

---

## Prompt Templates (36+)

| Category | Count | Templates |
|----------|-------|-----------|
| Coding | 10 | API design, code review, debug, docs, optimize, refactor, schema, security audit, test gen, TS strict |
| Planning | 5 | Architecture decision, feature plan, migration, spec interview, tech debt |
| Design | 5 | Animation polish, component design, design system, landing page, responsive audit |
| Marketing | 5 | Ad copy, competitor analysis, email campaign, SEO content, social media |
| DevOps | 5 | CI/CD pipeline, deploy strategy, Docker setup, incident response, monitoring |
| Meta | 6 | Cost optimize, mode switch, overnight runner, parallel research, session handoff, task commander |

Access: `/cc prompts` or browse `prompts/` directory.

---

## Starter Templates

| Template | Stack | What You Get |
|----------|-------|-------------|
| `nextjs-shadcn-starter` | Next.js 15 + shadcn/ui + Better Auth + Drizzle + Neon | Full SaaS: auth, dashboard, DB, middleware |
| `turborepo-fullstack-starter` | Turborepo + Next.js + Fastify + shared packages | Monorepo: web app, API, shared types |
| `marketing-site-starter` | Next.js 15 + MDX + PostHog + Framer Motion | Marketing: hero, pricing, blog, analytics |

---

## Skill Selection Guide

| I need to... | Use these skills |
|-------------|-----------------|
| Build a REST API | `api-design` + `backend-patterns` + `tdd-workflow` |
| Build a Next.js app | `nextjs-app-router` + `shadcn-ui` + `tailwind-v4` |
| Build a landing page | `landing-page-builder` + `frontend-design` + `signup-flow-cro` |
| Build a SaaS product | `mega-saas` (loads 20 skills) |
| Set up auth | `better-auth` |
| Design a database | `database-designer` + `postgres-patterns` |
| Fix a bug | `investigate` + `systematic-debugging` |
| Review code | `/code-review` (quick) or `codex` (deep adversarial) |
| Make an important decision | `dialectic-review` (FOR/AGAINST/Referee) |
| Improve SEO | `seo-optimizer` + `ai-seo` + `aaio` |
| Improve performance | `optimize` + `harden` + `benchmark` |
| Polish design | `critique` -> `bolder`/`quieter` -> `polish` |
| Set up CI/CD | `mega-devops` (loads 20 skills) |
| Run overnight build | `overnight-runner` |

---

## Power Combos

| Goal | Workflow |
|------|----------|
| New feature | `/plan` -> spec -> `/tdd` -> implement -> `/verify` -> `/code-review` -> `/pr` |
| Bug fix | `investigate` -> root cause -> `/tdd` -> fix -> `operationalize-fixes` -> `/verify` |
| Design work | `/plan` -> `brainstorming` -> `frontend-design` -> `/verify` -> `design-review` |
| Content/SEO | `seo-content-brief` -> write -> `seo-optimizer` + `aaio` -> `/verify` |
| New project | `project-kickoff` -> CLAUDE.md + tasks -> `/plan` -> build |
| Subagent dispatch | `delegation-templates` -> structured prompt -> report -> accept/reject |

---

## File Structure

```
~/.claude/
  CLAUDE.md              <-- Global instructions (always loaded)
  SKILLS-INDEX.md        <-- Searchable skill directory
  settings.json          <-- Global permissions + MCP servers
  commands/              <-- Slash command definitions (.md)
  hooks.json             <-- Hook configuration
  hooks/                 <-- Hook scripts (.js)
  skills/                <-- Installed skill directories
  sessions/              <-- Saved session state
  learned-skills/        <-- Auto-saved patterns

.claude/                 <-- Per-project (in repo root)
  settings.json          <-- Project permissions + config
  settings.local.json    <-- Local overrides (gitignore)
  commands/              <-- Project-specific slash commands
```

## CLAUDE.md Hierarchy

| File | Scope | Priority |
|------|-------|----------|
| `~/.claude/CLAUDE.md` | Global | Base -- universal rules |
| `./CLAUDE.md` | Project | Override -- stack-specific |
| `./src/CLAUDE.md` | Subdirectory | Highest -- component-specific |

## Memory Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Permanent project context -- stack, commands, rules |
| `tasks/todo.md` | Active task list -- resume point each session |
| `tasks/lessons.md` | Learned patterns -- check at session start |
| `tasks/spec-YYYYMMDD.md` | Spec documents from `/plan` |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Cancel current input |
| `Ctrl+C` | Cancel current generation |
| `Ctrl+D` | Exit Claude Code |
| `Ctrl+R` | Reverse search history |
| `Shift+Enter` | Insert newline (multi-line input) |
| `Up/Down` | Browse input history |
| `Tab` | Autocomplete slash commands |
| `Option+T` | Toggle extended thinking (macOS) |

---

## Model Selection

| Model | Cost | Best For |
|-------|------|---------|
| `claude-opus-4-5` | $$$ ($15/$75 per 1M tokens) | Architecture, deep reasoning, audits |
| `claude-sonnet-4-5` | $$ ($3/$15 per 1M tokens) | General development, most tasks |
| `claude-haiku-4` | $ ($0.25/$1.25 per 1M tokens) | Fast iteration, bulk ops, simple tasks |

Rule: Never change models mid-session -- spawn a subagent with the desired model instead.

---

## KZ Status Line

```
-- KZ |================    | 62% | Opus | $1.24 | in:89K out:14K | 23m | +142-37 | my-project
```

| Element | Shows |
|---------|-------|
| Context gauge | Usage % (green -> yellow -> orange -> red -> DANGER) |
| Model | Opus / Sonnet / Haiku |
| Cost | Session cost (USD) |
| Tokens | Input + output counts |
| Duration | Session time |
| Lines | +added -removed |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Context window full | `/save-session` then start new session |
| Build keeps failing | `/build-fix` or `systematic-debugging` skill |
| Hook not firing | Check `~/.claude/hooks/` permissions (must be executable) |
| MCP not connecting | `claude mcp list` to verify, check server logs |
| Wrong model for task | `/model <name>` or `--model` flag |
| Slow response | Switch to `claude-haiku-4` |
| Cost too high | `/cost` to check, use `/cc` cost tracking |
| Agent stuck in loop | `Ctrl+C`, then be more specific |
| Stale library docs | Add `"use context7"` to prompt |
| `/doctor` shows issues | `claude update` then re-run `/doctor` |
| Missing skill | Search `SKILLS-INDEX.md` -- there's probably one |
| Session context lost | Check `~/.claude/sessions/` for auto-saved state |
| Global settings bloat | Use project `.claude/settings.json` instead |
| No verification | Always `/verify` before marking done |

---

## Install / Uninstall

```bash
# One-line remote install
curl -fsSL https://raw.githubusercontent.com/KevinZai/cc-commander/main/install-remote.sh | bash

# Local install
./install.sh              # Interactive install
./install.sh --dry-run    # Preview without changes
./install.sh --verify     # Validate existing installation
./install.sh --force      # Skip confirmation prompts

# Remove
./uninstall.sh            # Clean removal (preserves CLAUDE.md + settings.json)
```

---

*CC Commander v1.6.0 -- kevinzai.github.io/cc-commander*
*280+ skills | 10 mega-skills | 88+ commands | 37 hooks | 36+ prompts | 9 modes | 4 themes | 3 templates*
