# Claude Code Setup — Kevin's Team Kit

Production-tested Claude Code environment for Kevin + staff.
219 skills, 7 MCP servers, 65+ commands, full hook lifecycle.

## Quick Setup (5 min)

### 1. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Run the setup script
```bash
git clone https://github.com/k3v80/claude-code-kit.git /tmp/claude-code-kit
cd /tmp/claude-code-kit
chmod +x setup.sh && ./setup.sh
```

### 3. Set your API key
```bash
export ANTHROPIC_API_KEY="your-key-here"
# Or add to ~/.zshrc
```

### 4. Verify
```bash
claude --version
claude   # starts interactive session
```

## Update (Overwrite Existing)

**To update an existing install** (overwrites `~/.claude/` — backs up first):

```bash
cd /tmp/claude-code-kit && git pull origin main
chmod +x setup-overwrite.sh && ./setup-overwrite.sh
```

This replaces skills, commands, SKILLS-INDEX, CHEATSHEET, and hooks.
CLAUDE.md and settings.json are only replaced if you pass `--all`.

## What's Included

| Component | Count | Location |
|-----------|-------|----------|
| Skills | 219 | `~/.claude/skills/` |
| Commands | 65+ | `~/.claude/commands/` |
| MCP Servers | 7 | `~/.claude/settings.json` |
| Hooks | 22 | `~/.claude/hooks/hooks.json` |
| Plugins | 10 | `~/.claude/settings.json` |

## Key Files

- **`CLAUDE.md`** — Global instructions loaded every session
- **`settings.json`** — MCP servers, permissions, plugins, env
- **`SKILLS-INDEX.md`** — Searchable skill reference (categorized)
- **`CHEATSHEET.md`** — Commands + best practices quick reference
- **`hooks/hooks.json`** — Lifecycle hooks (auto-format, quality gates, etc.)

## New in v0.5 (2026-03-25)

| Skill | What it does |
|-------|-------------|
| `delegation-templates` | 7 structured subagent types with report formats and model selection |
| `dialectic-review` | FOR/AGAINST/Referee pattern for important decisions |
| `evals-before-specs` | Define success criteria before writing specs |
| `corrective-framing` | Present claims to trigger correction > "remember to X" |
| `operationalize-fixes` | Post-bug-fix: test → sweep → update instructions |
| `overnight-runner` | Autonomous batch jobs with checkpoints and retry |
| `aaio` | Agentic AI Optimization — robots.txt, JSON-LD, markdown twins |

## MCP Servers

| Server | Purpose | Needs |
|--------|---------|-------|
| `github` | GitHub API (personal repos) | `GITHUB_TOKEN` |
| `github-gn` | GitHub API (Guest Networks) | `GN_GITHUB_TOKEN` |
| `context7` | Library docs (say "use context7") | None (npm) |
| `n8n-mcp` | n8n workflow automation | n8n running |
| `playwright` | Browser automation + E2E | None (npm) |
| `granola` | Meeting notes/transcripts | Granola app |
| `claude-peers` | Agent-to-agent comms | Bun + server |

## For Staff: Customize

1. Edit `CLAUDE.md` — replace Kevin-specific paths/projects
2. Edit `settings.json` — point MCP servers to your own tokens
3. Remove skills you don't need (see SKILLS-INDEX.md)
4. Add project-level `CLAUDE.md` in each repo for stack-specific rules

## Stack-Specific Skills

### MyWiFi (Laravel + Vue.js)
`laravel-patterns`, `laravel-tdd`, `laravel-verification`, `mywifi-platform`, `wifi-captive-portal`

### Next.js / React
`frontend-patterns`, `frontend-design`, `landing-page-builder`, `e2e-testing`

### AWS
`aws-solution-architect`, `aws-lambda-best-practices`, `aws-s3-patterns`, `aws-cloudfront-optimization`, `aws-iam-security`
