# Claude Code Cheatsheet
> CC Commander v2.1.0 — by Kevin Z — commands, workflows, and power user tips
> v2.1.0 — 2026-03-30

> **Which document?** BIBLE.md = learning guide (read once). **CHEATSHEET.md = daily reference (you are here).** SKILLS-INDEX.md = skill discovery (search by keyword/category).

---

## CCC Domains (Quick Reference)

Load ONE CCC domain to get an entire domain. Each has a router that dispatches to the right specialist.

| Domain | Load This | Skills Inside |
|--------|-----------|---------------|
| SEO & Content | `ccc-seo` | 19 skills — technical SEO, AI search, analytics, programmatic SEO |
| Design & Animation | `ccc-design` | 35+ skills — animations, effects, design systems, Impeccable suite |
| Testing & QA | `ccc-testing` | 15 skills — TDD, E2E, verification, visual, load testing |
| Marketing | `ccc-marketing` | 46 skills — content, CRO, channels, growth, sales |
| SaaS Building | `ccc-saas` | 20 skills — auth, billing, DB, API, frontend, metrics |
| DevOps & Cloud | `ccc-devops` | 20 skills — CI/CD, Docker, AWS, monitoring, Terraform |
| Research & Analysis | `ccc-research` | 8 skills — deep research, literature review, competitive analysis, data synthesis |
| Mobile Development | `ccc-mobile` | 7 skills — iOS, Android, React Native, Flutter, app store optimization |
| Security & Compliance | `ccc-security` | 9 skills — pen testing, OWASP, supply chain, secrets management, threat modeling |
| Data & Analytics | `ccc-data` | 8 skills — ETL pipelines, data warehousing, analytics, visualization, ML ops |

---

## Workflow Modes (NEW in v1.1)

Switch your entire workflow persona with one command. Each mode adjusts behavior, verbosity, risk tolerance, and auto-loaded skills.

| Mode | Behavior | Use when |
|------|----------|---------|
| `normal` | Balanced — plan-first, verify-before-done | Default for most work |
| `design` | Visual-first — design/animation skills, critique loop | Building UIs, landing pages |
| `saas` | Full SaaS lifecycle — auth, billing, DB, deploy | Building a SaaS product |
| `marketing` | Content + CRO — SEO, copy, conversion | Marketing campaigns, content |
| `research` | Deep research — citations, confidence, sources | Competitive analysis, learning |
| `writing` | Long-form content — structured drafts, editing | Blog posts, docs, reports |
| `night` | Autonomous overnight — checkpoints, recovery | Batch jobs, migrations |
| `yolo` | Max speed — skip confirmations, auto-approve | Quick prototypes, demos |
| `unhinged` | No guardrails — experimental, creative | Hackathons, experiments |

**Switch:** `/cc mode <name>` or `"use mode-switcher skill, switch to <name> mode"`

---

## Prompt Library (NEW in v1.1)

36+ battle-tested prompt templates across 6 categories:

| Category | Count | Examples |
|----------|-------|---------|
| Coding | 8 | Bug fix, code review, architecture review, TDD setup |
| Planning | 6 | Spec interview, evals-first, decomposition, handoff |
| Design | 5 | Design critique, accessibility audit, animation brief |
| Marketing | 6 | SEO content brief, cold email, landing page copy, ad creative |
| DevOps | 5 | CI failure investigation, deploy checklist, incident response |
| Meta | 5+ | Subagent dispatch, research, PR description, skill creation |

**Access:** `/cc prompts` or browse `prompts/` directory.

---

## ⌨️ Keyboard Shortcuts & Power Commands

| Command | Key | What It Does |
|---------|-----|-------------|
| `/btw` | — | Side question without polluting main context |
| `/aside` | — | Same idea — preserves context budget |
| Plan editor | `Ctrl+G` | Open current plan in your editor for review |
| `/compact` | — | Compress context (add "preserve X" rules in CLAUDE.md) |
| `@path/file` | — | Import file content into CLAUDE.md at load time |
| `/clear` | — | Reset context completely — use between unrelated tasks |
| `Option+T` | macOS | Toggle extended thinking on/off |
| `Ctrl+O` | — | Show thinking output (verbose mode) |

---

## 🎯 Skill Selection Guide

### "I need to build..."

| Scenario | Skills to Use |
|----------|--------------|
| REST API | `api-design` + `backend-patterns` + `tdd-workflow` |
| Next.js app | `frontend-patterns` + `nextjs-app-router` + `shadcn-ui` |
| Landing page | `landing-page-builder` + `frontend-design` + `signup-flow-cro` |
| Laravel feature | `laravel-patterns` + `laravel-tdd` + `laravel-verification` |
| Vue app | `vue-nuxt` |
| AWS infra | `aws-solution-architect` + relevant AWS skill |
| Docker setup | `docker-development` + `container-security` |
| Database schema | `database-designer` + `postgres-patterns` |
| Drizzle + Neon | `drizzle-neon` |
| Auth system | `better-auth` |
| Monorepo | `turborepo-monorepo` |
| Tailwind v4 | `tailwind-v4` |
| Fastify API | `fastify-api` |
| MCP server | `mcp-server-patterns` |
| Email | `email-systems` + `sendgrid-automation` |
| Stripe billing | `stripe-subscriptions` + `billing-automation` |

### "I need to improve..."

| Scenario | Skills to Use |
|----------|--------------|
| Performance | `optimize` + `harden` |
| Design quality | `critique` → `bolder`/`quieter` → `polish` |
| SEO | `seo-optimizer` + `ai-seo` + `site-architecture` |
| AI discoverability | `aaio` (robots.txt, JSON-LD, markdown twins, agent-ready) |
| Conversion | `signup-flow-cro` + `analytics-conversion` |
| Animations | `animate` + `motion-design` |
| Visual effects | `svg-animation` + `particle-systems` + `webgl-shader` |
| Agent instructions | `corrective-framing` (present claims > "remember to X") |

### "I need to review..."

| Scenario | Skills to Use |
|----------|--------------|
| Code review | `/code-review` command or `review` skill |
| Important decision | `dialectic-review` (FOR/AGAINST/Referee agents) |
| Security audit | `pentest-checklist` + `container-security` |
| Design review | `design-review` + `audit` + `critique` |
| Business plan | `plan-ceo-review` + `saas-metrics-coach` |
| Engineering plan | `plan-eng-review` |

### Command vs Skill Routing

| Intent | Quick (command) | Deep (skill) |
|--------|----------------|--------------|
| Code review | `/code-review` | `review` or `codex` |
| Test-driven dev | `/tdd` | `tdd-workflow` |
| Verify before done | `/verify` | `verification-loop` |
| End-to-end tests | `/e2e` | `e2e-testing` |
| Audit quality | `/audit` | `audit` skill |

> Commands = quick-fire (<5 min). Skills = deep-dive (10+ min with methodology).

---

## 🔥 Essential Commands (Daily Use)

| Command | What it does | Example |
|---------|-------------|---------|
| `/init` | Initialize project — creates `CLAUDE.md` with stack context | `/init` in project root |
| `/help` | Show all available commands and keyboard shortcuts | `/help` |
| `/clear` | Clear conversation history (frees context window) | `/clear` |
| `/compact` | Intelligently compress context, keeping key info | `/compact` |
| `/model` | Switch model for current session | `/model claude-opus-4-5` |
| `/think` | Enable extended thinking mode (deeper reasoning) | `/think hard about this architecture` |
| `/review` | Trigger code review pass on current changes | `/review` |
| `/cost` | Show token usage and cost for current session | `/cost` |
| `/doctor` | Diagnose Claude Code setup issues | `/doctor` |
| `/add` | Add files or directories to active context | `/add src/api/` |
| `/plan` | Spec-first planning — interview → spec doc → execute | `/plan build a Stripe checkout` |
| `/verify` | Run verification loop before claiming done | `/verify` |

### CLI Entry Points

| Command | What it does | Example |
|---------|-------------|---------|
| `claude` | Start interactive REPL session | `claude` |
| `claude "task"` | One-shot task (non-interactive) | `claude "fix the TypeScript errors"` |
| `claude -p "task"` | Print mode — output to stdout, no session | `claude -p "explain this code" < file.ts` |
| `claude --print "task"` | Same as `-p` | `claude --print "summarize" < README.md` |
| `claude -c` | Continue last conversation | `claude -c` |
| `claude --continue` | Same as `-c` | `claude --continue` |
| `claude --resume <id>` | Resume specific session by ID | `claude --resume abc123` |
| `claude update` | Update Claude Code to latest version | `claude update` |
| `claude mcp` | MCP server management subcommand | `claude mcp list` |
| `claude config` | Manage configuration | `claude config list` |

### Key CLI Flags

| Flag | What it does | Example |
|------|-------------|---------|
| `--model <model>` | Set model (overrides config) | `--model claude-haiku-4` |
| `--headless` | Run without interactive UI (CI/CD) | `--headless` |
| `--output-format json` | JSON output for scripting | `--output-format json` |
| `--output-format stream-json` | Streaming JSON (token by token) | `--output-format stream-json` |
| `--add-dir <path>` | Add directory to initial context | `--add-dir ./src` |
| `--allowedTools <tools>` | Whitelist specific tools only | `--allowedTools "Read,Write,Bash"` |
| `--disallowedTools <tools>` | Block specific tools | `--disallowedTools "Bash"` |
| `--max-turns <n>` | Limit agentic loop iterations | `--max-turns 10` |
| `--verbose` | Show detailed tool call output | `--verbose` |
| `--no-color` | Disable ANSI color output | `--no-color` |
| `--dangerously-skip-permissions` | Skip all permission prompts (CI only) | `--dangerously-skip-permissions` |
| `--debug` | Enable debug logging | `--debug` |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+Enter` | Insert newline (multi-line input) |
| `↑` / `↓` | Browse input history |
| `Ctrl+C` | Cancel current generation |
| `Ctrl+D` | Exit Claude Code |
| `Ctrl+R` | Reverse search history |
| `Tab` | Autocomplete slash commands |
| `Escape` | Cancel current input |

---

## ⚡ Session Management

| Command / Flag | What it does | Example |
|----------------|-------------|---------|
| `/new` | Start a fresh conversation in same session | `/new` |
| `/resume` | Resume a previous session by picking from list | `/resume` |
| `/save-session` | Persist context to `~/.claude/sessions/` | `/save-session` |
| `/resume-session` | Reload last saved session on startup | `/resume-session` |
| `/context-budget` | Check how much context you're using | `/context-budget` |
| `/aside` | Quick side-task without losing main context | `/aside what does this regex do?` |
| `/context` | Show current context summary | `/context` |
| `/memory` | Manage memory files (view/edit CLAUDE.md) | `/memory` |
| `/compact` | Manual context compaction | `/compact` |
| `/strategic-compact` | Compact at logical breakpoints (skill) | use `strategic-compact` skill |
| `claude -c` | Continue last conversation from CLI | `claude -c` |
| `claude --resume <id>` | Resume specific session ID | `claude --resume abc123` |

### `.claude/` Directory Structure

```
.claude/
├── settings.json          # Project-level permissions + config
├── settings.local.json    # Local overrides (gitignore this)
└── commands/              # Custom slash commands
    └── mycommand.md       # /mycommand definition

~/.claude/
├── CLAUDE.md              # Global context (always loaded)
├── SKILLS-INDEX.md        # Skill quick-reference
├── settings.json          # Global config
├── sessions/              # Saved session state
├── learned-skills/        # Learned patterns (continuous-learning)
├── commands/              # Global custom commands
├── hooks/                 # Lifecycle hook scripts
└── skills/                # Installed skill directories
```

### Hook Lifecycle (ECC)

| Hook | When it fires | Common use |
|------|-------------|------------|
| `SessionStart` | On every session start | Load context, detect package manager |
| `PreToolUse` | Before any tool call | Block dangerous patterns, lint check |
| `PostToolUse` | After tool completes | Auto-format, typecheck, PR logging |
| `Stop` | When agent stops | Cost tracking, session persistence, sound |
| `PreCompact` | Before context compaction | Save state snapshot |

### Proactive Hooks (15 Kit-Native)

The kit ships 15 hooks that fire automatically — no prompting required. Disable any hook with its env var.

**PreToolUse (3 hooks)**

| Hook | What it does | Disable with |
|------|-------------|-------------|
| `careful-guard` | Blocks destructive commands (rm -rf, DROP TABLE, force push) | `KZ_DISABLE_CAREFUL_GUARD=1` |
| `pre-commit-verify` | TypeScript check before git commit — blocks on tsc errors | `KZ_DISABLE_PRE_COMMIT_VERIFY=1` |
| `confidence-gate` | Warns on multi-file bash operations (sed -i on globs, find -exec) | `KZ_DISABLE_CONFIDENCE_GATE=1` |

**PostToolUse (6 hooks)**

| Hook | What it does | Disable with |
|------|-------------|-------------|
| `auto-notify` | Notifications on significant events (PR created, deploy) | `KZ_DISABLE_AUTO_NOTIFY=1` |
| `preuse-logger` | Logs tool usage for cost analysis | `KZ_DISABLE_PREUSE_LOGGER=1` |
| `context-guard` | Warns at ~70% context, auto-saves session | `KZ_DISABLE_CONTEXT_GUARD=1` |
| `auto-checkpoint` | Git-stash checkpoint every 10 file edits | `KZ_DISABLE_AUTO_CHECKPOINT=1` |
| `cost-alert` | Cost proxy alerts at ~$0.50 (30 calls) and ~$2.00 (60 calls) | `KZ_DISABLE_COST_ALERT=1` |
| `auto-lessons` | Captures errors and corrections to tasks/lessons.md | `KZ_DISABLE_AUTO_LESSONS=1` |
| `rate-predictor` | Predicts remaining session duration from tool call rate | `KZ_DISABLE_RATE_PREDICTOR=1` |

**Stop (3 hooks)**

| Hook | What it does | Disable with |
|------|-------------|-------------|
| `status-checkin` | Session end status summary | `KZ_DISABLE_STATUS_CHECKIN=1` |
| `session-end-verify` | Verifies modified files, checks for leftover console.log | `KZ_DISABLE_SESSION_END_VERIFY=1` |
| `session-coach` | Periodic coaching nudges — skill tips, checkpoint reminders | `KZ_COACH_DISABLE=1` |

**PreCompact (1 hook)**

| Hook | What it does | Disable with |
|------|-------------|-------------|
| `pre-compact` | Saves session state and critical context before context compaction | `KZ_DISABLE_PRE_COMPACT=1` |

**PostToolUse (1 additional hook)**

| Hook | What it does | Disable with |
|------|-------------|-------------|
| `self-verify` | Auto-verifies file changes against stated intent, catches drift | `KZ_DISABLE_SELF_VERIFY=1` |

**Session Coach** fires every N responses (default: 10). Customize interval with `KZ_COACH_INTERVAL=20` (number of responses between nudges). Disable entirely with `KZ_COACH_DISABLE=1`.

With ECC installed, 19 additional hooks bring the total to 34. Without ECC, the 15 kit-native hooks work standalone via `hooks-standalone.json`.

---

## 🧠 Context & Memory

### CLAUDE.md Hierarchy

| File | Scope | Priority | Purpose |
|------|-------|----------|---------|
| `~/.claude/CLAUDE.md` | Global | Base | Universal rules, coding standards, workflow |
| `./CLAUDE.md` | Project | Override | Stack-specific rules, active tasks, architecture |
| `./src/CLAUDE.md` | Subdirectory | Highest | Component-specific rules (optional) |

### Memory Files

| File | What to put there |
|------|------------------|
| `CLAUDE.md` | Permanent project context — stack, commands, rules |
| `tasks/todo.md` | Active task list — resume point each session |
| `tasks/lessons.md` | Learned patterns — check at session start |
| `tasks/spec-YYYYMMDD.md` | Spec documents from `/plan` |
| `~/.claude/learned-skills/` | Auto-saved patterns from `continuous-learning` |

### Project Settings vs Global

| Setting | Where | Example |
|---------|-------|---------|
| Tool permissions | `.claude/settings.json` | Allow Bash in this project only |
| Model preference | `.claude/settings.json` | Use Sonnet for this project |
| Global rules | `~/.claude/settings.json` | Never do X across all projects |
| API key | `ANTHROPIC_API_KEY` env var | `export ANTHROPIC_API_KEY=...` |

### Project CLAUDE.md Template

```markdown
# CLAUDE.md — [Project Name]

## Stack
- Framework: [Next.js 15 / Laravel 11 / etc.]
- Language: [TypeScript / PHP / Python]
- Database: [PostgreSQL / MySQL / SQLite]
- Testing: [Vitest / PHPUnit / Pytest]

## Build & Test
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Architecture
[Key decisions, patterns, folder structure]

## Active Tasks
See `tasks/todo.md`

## Rules
[Project-specific rules that override global]
```

---

## 🛠 Development Workflow

### Planning & Execution

| Command | When to Use | Example |
|---------|-------------|---------|
| `/plan` | Before ANY multi-step task. Spec-first. | `/plan add OAuth login` |
| `/orchestrate` | Multi-agent pipeline for complex work | `/orchestrate` |
| `/build-fix` | Auto-resolve build errors after `npm run build` fails | `/build-fix` |
| `/verify` | Run full verification before claiming done | `/verify` |
| `/checkpoint` | Git checkpoint — save state mid-work | `/checkpoint` |
| `/complete` | Mark task complete with verification | `/complete` |
| `spec-interviewer` | Interview → spec doc → fresh session execute | use skill |
| `writing-plans` | Structured planning before implementation | use skill |
| `executing-plans` | Execute written plans with review checkpoints | use skill |

### Plan Workflow
```
/plan
→ Claude asks 5-7 clarifying questions
→ You answer them
→ Claude writes spec to tasks/spec-YYYYMMDD.md
→ You approve
→ New session with spec as context
→ Execute from spec
```
**Why:** Specs survive context compaction. Prevents 3–5 wasted attempts.

### Code Quality

| Command | When to Use |
|---------|-------------|
| `/code-review` | Multi-agent code review (runs 3 reviewers) |
| `/tdd` | Start test-driven workflow (write test → implement → refactor) |
| `/quality-gate` | Run quality checks (lint, type, test) |
| `/refactor-clean` | Safe refactoring with test preservation |
| `/review` | Built-in code review pass |
| `/test` | Run test suite |
| `/test-coverage` | Check test coverage |
| `/e2e` | Run Playwright E2E tests |
| `tdd-workflow` | TDD: red/green/refactor cycle (skill) |
| `review` | Structured code review (skill) |

### Debugging

| Command | What it does |
|---------|-------------|
| `systematic-debugging` skill | 4-phase root cause analysis before fixing |
| `investigate` skill | Root cause investigation — never fix without cause |
| `/debug` | Start debugging workflow |
| `/fix` | Apply fix after root cause identified |
| `/explain` | Explain what code does |

### Documentation

| Command | What it does |
|---------|-------------|
| `/docs` | Generate/update documentation |
| `/update-docs` | Refresh all doc files |
| `/update-codemaps` | Refresh code maps |
| `document-release` skill | Post-ship doc update (README, ARCH, CONTRIBUTING) |

### Parallel Work with Subagents

```
You: Build the API endpoint AND the test suite
Claude: [spawns 2 subagents — one for API, one for tests]
```

| Skill | What it does |
|-------|-------------|
| `subagent-driven-development` | Multi-agent parallel execution patterns |
| `dispatching-parallel-agents` | 2+ independent tasks, no shared state |
| `iterative-retrieval` | Progressive context retrieval for subagents |
| `using-git-worktrees` | Isolated branches for parallel work |

### Full Feature Workflow
```
/plan → approve spec → /tdd → implement → /verify → /code-review → /pr → /deploy
```

### Bug Fix Workflow
```
investigate skill → root cause → /tdd → fix → /verify → /pr
```

---

## 📦 Skills System

### Using Skills

| Action | How |
|--------|-----|
| Load a skill | Say "use `skill-name` skill" or "follow the `skill-name` skill" |
| Find a skill | `grep -i "keyword" ~/.claude/SKILLS-INDEX.md` |
| List all skills | `ls ~/.claude/skills/` |
| Install skill (ECC) | Skills auto-load from `~/.claude/skills/` |
| Create new skill | `/skill-create` or use `skill-creator` skill |
| Audit skills | `/skill-health` or `skill-stocktake` skill |

### Skill File Format

```
~/.claude/skills/
└── skill-name/
    └── SKILL.md        # The skill definition file
```

SKILL.md front matter:
```yaml
---
name: skill-name
version: 1.0.0
description: |
  What this skill does in 2-3 lines.
triggers:
  - "phrase that activates this skill"
---
```

### Key Meta-Skills

| Skill | What it does |
|-------|-------------|
| `using-superpowers` | How to find and use skills (read this first) |
| `skill-stocktake` | Audit skill quality (quick scan / full) |
| `session-startup` | Session startup protocol |
| `brainstorming` | Pre-creative ideation (use BEFORE creative work) |

---

## ⚙️ Configuration

### `.claude/settings.json` Structure

```json
{
  "model": "claude-sonnet-4-5",
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git *)",
      "Read(**)",
      "Write(src/**)"
    ],
    "deny": [
      "Bash(rm -rf *)"
    ]
  },
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Configuration Options

| Option | Description | Example |
|--------|-------------|---------|
| `model` | Default model for this project | `"claude-opus-4-5"` |
| `permissions.allow` | Whitelist tool patterns | `["Bash(npm *)"]` |
| `permissions.deny` | Blacklist tool patterns | `["Bash(rm -rf *)"]` |
| `env` | Environment variables | `{"PORT": "3000"}` |
| `includeCoAuthoredBy` | Add co-authored-by to commits | `true` |
| `cleanupPeriodDays` | Session cleanup days | `30` |

### Model Selection

| Model | Best for | Cost |
|-------|---------|------|
| `claude-opus-4-5` | Architecture, complex reasoning, audits | $$$ |
| `claude-sonnet-4-5` | General development, most tasks | $$ |
| `claude-haiku-4` | Fast iteration, simple tasks, bulk ops | $ |
| `/model <name>` | Switch mid-session | `/model claude-haiku-4` |

**Rule:** Never change models mid-session — spawn a subagent with the desired model instead.

### API Keys & Auth

| Method | How |
|--------|-----|
| Environment variable | `export ANTHROPIC_API_KEY=sk-ant-...` |
| `.env` file (project) | `ANTHROPIC_API_KEY=sk-ant-...` |
| 1Password CLI | `op run -- claude ...` |
| Config file | `~/.claude/settings.json` → `apiKey` |

### `claude config` Subcommand

| Command | What it does |
|---------|-------------|
| `claude config list` | List all config values |
| `claude config get <key>` | Get a specific value |
| `claude config set <key> <value>` | Set a config value |
| `claude config reset <key>` | Reset to default |

---

## 🔌 MCP (Model Context Protocol)

### MCP Management

| Command | What it does |
|---------|-------------|
| `claude mcp list` | List installed MCP servers |
| `claude mcp add <name>` | Add an MCP server |
| `claude mcp remove <name>` | Remove an MCP server |
| `claude mcp get <name>` | Show server config |
| `claude mcp serve` | Start MCP server (SDK) |

### MCP Config Location

```json
// ~/.claude/settings.json (global) or .claude/settings.json (project)
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
    }
  }
}
```

### Available MCP Servers (Quick Reference)

| Say this... | To use... | For... |
|-------------|-----------|--------|
| `"use context7"` | context7 MCP | Latest library/API docs (not stale training data) |
| `"check the repo"` | github MCP | Issues, PRs, CI status |
| `"run the workflow"` | n8n-mcp | n8n automation |
| `"screenshot this"` | playwright MCP | Visual verification, E2E testing |
| `"check my notes"` | granola MCP | Meeting transcripts |
| `"message the agent"` | claude-peers MCP | Agent-to-agent comms |

### Build an MCP Server

```typescript
// Use the mcp-server-patterns skill
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// See skills/mcp-server-patterns/SKILL.md for full patterns
```

---

## 🏗 Advanced Patterns

### Headless / CI Mode

```bash
# One-shot task, no prompts
claude --headless -p "run the test suite and report failures"

# JSON output for scripting
claude --output-format json -p "analyze this file" < file.ts | jq '.result'

# Stream JSON (token by token)
claude --output-format stream-json -p "generate this" | process_stream.sh

# Skip all permission prompts (CI only — use with caution)
claude --dangerously-skip-permissions --headless -p "fix lint errors"

# Max turns limit (prevent infinite loops in CI)
claude --max-turns 20 --headless -p "fix all TypeScript errors"
```

### Piping & Shell Integration

```bash
# Pipe input to Claude
cat error.log | claude -p "what's causing this error?"

# Pipe output
claude -p "generate a .gitignore for Node.js" > .gitignore

# Chain with other tools
git diff HEAD~1 | claude -p "summarize these changes for a PR description"

# Process multiple files
find src -name "*.ts" | xargs claude -p "check for any security issues in these files"
```

### Git Worktrees (Parallel Development)

```bash
# Skill: using-git-worktrees
git worktree add ../feature-branch feature/my-feature
cd ../feature-branch
claude  # Full context window for this branch
```

### Custom Slash Commands

```markdown
<!-- ~/.claude/commands/my-command.md or .claude/commands/my-command.md -->
# /my-command

This command does X when invoked.

## Steps
1. Read the current file
2. ...
```
Invoke: `/my-command` in any Claude Code session.

### SDK Usage

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const response = await client.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});
```

See `claude-api` skill for full patterns including tool use, streaming, vision.

### Learning & Pattern Extraction

| Command | What it does |
|---------|-------------|
| `/learn` | Extract reusable patterns from current work |
| `/instinct-status` | View learned patterns inventory |
| `/instinct-export` | Export learned instincts |
| `/instinct-import` | Import learned instincts |
| `continuous-learning-v2` skill | Auto-extract patterns via hooks |
| `rules-distill` | Distill rules from experience |

### Project Management Commands

| Command | What it does |
|---------|-------------|
| `/paperclip` | Manage tasks in Paperclip |
| `/projects` | List active projects |
| `/pm2` | Manage PM2 processes |
| `/pr` | Create pull request |
| `/deploy` | Deploy to production |
| `project-kickoff` skill | Initialize new project (CLAUDE.md + tasks + hooks) |

---

## 📊 Cost & Token Management

### Session Cost Tracking

| Method | How |
|--------|-----|
| `/cost` | Show cost for current session |
| `cache-monitor` skill | Analyze cache efficiency from JSONL logs |
| JSONL logs | `~/.claude/agents/*/sessions/*.jsonl` |
| Agent-HQ dashboard | `http://localhost:3005/api/costs` |
| `/context-budget` | See how much context is used |

### Token Optimization

| Strategy | How |
|----------|-----|
| Cache hit optimization | Keep static content at top of CLAUDE.md |
| Manual compact | `/compact` at logical breakpoints |
| Strategic compact | Use `strategic-compact` skill at key moments |
| Subagents for isolation | Each subagent gets full context window |
| Fresh sessions for big tasks | `/save-session` → new session → `/resume-session` |
| Haiku for simple tasks | `--model claude-haiku-4` for bulk/fast ops |
| `/aside` for side questions | Preserves main context budget |

### Model Cost Comparison

| Model | Input (per 1M) | Output (per 1M) | Best Use |
|-------|---------------|-----------------|---------|
| claude-opus-4-5 | $15 | $75 | Architecture, deep reasoning |
| claude-sonnet-4-5 | $3 | $15 | General development |
| claude-haiku-4 | $0.25 | $1.25 | Fast tasks, bulk ops |

### Context Budget Rules
1. Static content first in CLAUDE.md (improves cache hit rate)
2. Never change tools/models mid-session (kills cache)
3. Don't edit CLAUDE.md mid-session (cache invalidation)
4. Use subagents for parallel work (each has fresh context)
5. Compact before context hits 75% — not after it's full

---

## 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| `claude: command not found` | `npm install -g @anthropic-ai/claude-code` |
| Auth error / API key not found | `export ANTHROPIC_API_KEY=sk-ant-...` |
| Tool permission denied | Add to `.claude/settings.json` → `permissions.allow` |
| Context window full | `/compact` or `/clear` or start new session with `/save-session` first |
| Stale library docs | Add `"use context7"` to your prompt |
| Forgot what was in context | `/context` to see summary |
| Build keeps failing | `/build-fix` or `systematic-debugging` skill |
| Agent stuck in loop | `Ctrl+C` to cancel, then be more specific |
| Wrong model for task | `--model <model>` flag or `/model` in session |
| Global permissions bloat | Use project-level `.claude/settings.json` instead |
| Changing models mid-session | Spawn subagent with different model instead |
| No verification before done | Always `/verify` or `verification-before-completion` skill |
| Huge context window | `/save-session` → start fresh → `/resume-session` |
| Missing skill for task | Check `SKILLS-INDEX.md` — there's probably one |
| Session context lost | Check `~/.claude/sessions/` for auto-saved state |
| `/doctor` shows issues | Run `claude update` then re-run `/doctor` |
| MCP server not connecting | `claude mcp list` to verify, check server logs |
| Hooks not firing | Check `~/.claude/hooks/` permissions (must be executable) |
| Rate limit hit | Switch to Haiku for bulk work, or wait/retry |

---

## ⚠️ Common Mistakes

| Mistake | Fix |
|---------|-----|
| Building from scratch | Check `SKILLS-INDEX.md` first |
| No plan for multi-step work | Always `/plan` before complex tasks |
| Verifying by asking, not running | Always `/verify` or run tests yourself |
| Editing global settings for one project | Use `.claude/settings.json` per project |
| Huge prompt, tiny output | Break into spec → subagents → verify |
| Forgetting lessons | Check `tasks/lessons.md` at session start |
| Context bloat from side questions | Use `/aside` for side questions |
| One-shot for 3-day tasks | `/plan` → spec → fresh sessions |

---

## 🏗️ Power Combos

| Goal | Combo |
|------|-------|
| New feature (full cycle) | `/plan` → approve spec → `/tdd` → implement → `/verify` → `/code-review` → `/pr` → `/deploy` |
| Bug fix | `investigate` skill → root cause → `/tdd` → fix → `operationalize-fixes` → `/verify` → `/pr` |
| Design work | `/plan` → `brainstorming` → `frontend-design` → `/verify` → `design-review` → ship |
| Content/SEO | `seo-content-brief` → `content-strategy` → write → `seo-optimizer` + `aaio` → `/verify` |
| Feature kickoff | `evals-before-specs` → `/plan` → spec → implement → verify against evals |
| Overnight batch | `overnight-runner` → checkpoint file → wrapper script → notification |
| Subagent dispatch | `delegation-templates` → structured prompt → report validation → accept/reject |
| Performance | `audit` → `optimize` → `harden` → benchmark → `canary` monitor |
| QA cycle | `qa` skill → fix bugs → `document-release` → deploy |
| New project | `project-kickoff` → CLAUDE.md + tasks → `/plan` → build |

---

## 📖 /cc Command Center

CC Commander includes an interactive command center accessible via `/cc`:

| Command | What it does |
|---------|-------------|
| `/cc` | Main menu — all options |
| `/cc skills` | Browse 441+ skills by category |
| `/cc mega [name]` | Drill into a CCC domain's sub-skills |
| `/cc settings` | View current model, permissions, MCP, hooks |
| `/cc grill` | 7 Socratic questions (no plan mode) |
| `/cc confidence` | Pre-execution confidence assessment (0-100%) |
| `/cc mode <name>` | Switch workflow mode (9 modes available) |
| `/cc prompts` | Browse 36+ prompt templates by category |
| `/cc status` | Kit health dashboard |
| `/cc help` | Compact reference |

---

## 📊 Status Line

Persistent footer under every response — auto-configured on install:

```
━━ KZ ▐████████████░░░░░░░░▌ 62% │ Opus │ $1.24 │ in:89K out:14K │ 23m │ +142-37 │ my-project
```

| Element | What it shows |
|---------|--------------|
| Context gauge | Usage % with color zones (green → yellow → orange → red → DANGER) |
| Model | Opus / Sonnet / Haiku |
| Cost | Session cost in USD |
| Tokens | Input + output token counts |
| Duration | Session time |
| Lines | +added -removed |
| Rate limits | 5h and 7d usage % (when available, turns red at 80%+) |
| Project | Current directory name |

Configured via `statusLine` in `settings.json`. Script: `lib/statusline.sh`.

---

## 🖥️ Terminal Theme

Import the CC Commander iTerm2 profile for the intended visual experience:

```bash
open compatibility/kz-matrix.itermcolors
```

OLED black background + bright green text + cyan accents. Color values for other terminals in `compatibility/README.md`.

---

*See `SKILLS-INDEX.md` for the full searchable skill library.*
*Skills live in `~/.claude/skills/` — load any with: "use the `skill-name` skill"*

---

## CC Commander Quick Reference

```bash
# Launch
ccc              # Interactive mode (arrow-key menus)
npx kit-commander           # Via npm
kc                          # Global alias

# Flags
ccc --test       # 22-point self-test
ccc --stats      # Quick stats
ccc --repair     # Fix corrupt state
ccc --help       # Usage
ccc --version    # Version

# Themes
Cyberpunk, Fire, Graffiti, Futuristic  # Switch via menu or settings

# YOLO Mode
10 questions → Opus + max effort + $10 + 100 turns + self-testing
YOLO Loop: 3-10 cycles of build → review → improve

# Dispatch defaults by level
Guided:   sonnet / medium / $2 / 30 turns
Assisted: opusplan / medium / $3 / 40 turns
Power:    opusplan / high / $5 / 50 turns

# State
~/.claude/commander/state.json      # Preferences, theme, active session
~/.claude/commander/sessions/       # Session history
~/.claude/commander/knowledge/      # Learned lessons
~/.claude/commander/yolo-status.txt # YOLO Loop progress

# Backwards compatible
Commander READS your CLAUDE.md — never modifies .claude/
Use Commander or regular Claude Code interchangeably
```
