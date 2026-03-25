# Claude Code Cheatsheet
> The complete reference for Claude Code CLI — commands, workflows, and power user tips
> v0.5 — 2026-03-25

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

*See `SKILLS-INDEX.md` for the full searchable skill library.*
*Skills live in `~/.claude/skills/` — load any with: "use the `skill-name` skill"*
