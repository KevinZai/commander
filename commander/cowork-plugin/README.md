# CCC — Claude Code Commander

> 15 plugin skills + 450+ CCC ecosystem skills. One plugin. Your AI work, managed by AI.

CCC is an AI project manager plugin for Claude Desktop that orchestrates your entire development workflow — from planning to shipping. The plugin ships 15 native skills (`/ccc:*`) that route into the broader CCC ecosystem of 450+ skills across 11 domains. It compounds knowledge across sessions, detects and sequences your installed tools, and provides guided flows for building, researching, reviewing, and deploying. Works standalone out of the box, gets supercharged when you connect your tools.

## Installation

### Installation Paths

Three ways to install CCC, depending on how you want to use it:

**1. Desktop plugin marketplace (recommended)**

The full plugin experience — 15 skills, 5 agents, 6 hooks, 8 pre-wired MCPs, free/pro tier gating.

```bash
claude plugins add ccc
# or from GitHub directly:
claude plugins add KevinZai/commander
```

**2. Cherry-pick individual skills (skills CLI compatible)**

Install individual CCC skills using the `npx skills@latest` CLI — compatible with Matt Pocock's skills ecosystem (15K stars) and the skillsmp.com community marketplace.

```bash
npx skills@latest add KevinZai/commander/skills/ccc-design
npx skills@latest add KevinZai/commander/skills/ccc-marketing
npx skills@latest add KevinZai/commander/skills/night-mode
```

Use this when you want one specific skill without the full plugin, or when mixing CCC skills with skills from `anthropics/skills`, `mattpocock/skills`, or `skillsmp.com`.

**3. Full CLI install**

Installs the CCC CLI (`ccc` command), all 456+ skills, hooks, commands, and templates into `~/.claude/`.

```bash
curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash
```

## Skills

15 skills covering every phase of the development lifecycle:

| Skill | Trigger | Description |
|-------|---------|-------------|
| `commander` | "manage my project", "help me build" | Interactive hub — dispatches to all other skills |
| `build` | "build something", "new project", "create app" | Guided build wizard — web, API, CLI, or anything |
| `research` | "research", "analyze", "competitive analysis", "audit" | Deep research with structured reports |
| `standup` | "standup", "daily update", "what did I do" | Auto-generate standup from recent activity |
| `code-review` | "review code", "PR review", "before I merge" | Security, performance, correctness, and style |
| `deploy-check` | "ready to ship?", "pre-deploy", "deployment gate" | Pre-deployment readiness gate |
| `night-mode` | "night mode", "build while I sleep", "autonomous build" | Overnight autonomous build — set and forget |
| `fleet` | "parallel agents", "swarm", "run in parallel" | Launch parallel agents for fan-out tasks |
| `linear-board` | "linear board", "show issues", "what should I work on" | View sprint board, pick a task, sync status |
| `knowledge` | "what did we learn", "past lessons", "search knowledge" | Search the compounding knowledge base |
| `session` | "resume session", "continue where I left off" | Resume work, review history, pick up mid-task |
| `content` | "write post", "blog", "social media", "marketing copy" | Create blog posts, emails, social, and docs |
| `infra` | "infrastructure", "service status", "check ports" | Probe local services — fleet, cost, Paperclip |
| `domains` | "design skills", "marketing skills", "ccc domains" | Browse all 11 CCC domain skill sets |
| `settings` | "settings", "change theme", "configure Linear" | Theme, cost ceiling, Linear setup, preferences |

## Specialized Agents

5 purpose-built agents that skills delegate to automatically:

| Agent | Model | Purpose |
|-------|-------|---------|
| `builder` | Sonnet | Implements features and creates projects from specs — TDD, conventional commits, boring solutions |
| `reviewer` | Sonnet | Structured code review with severity ratings — security, performance, correctness, style |
| `researcher` | Sonnet | Deep research and synthesis — competitive analysis, audits, market research, literature review |
| `debugger` | Opus | Root-cause debugging — reproduces, isolates, traces, fixes with verified resolution |
| `fleet-worker` | Sonnet | General-purpose parallel worker — executes one assigned task and reports results |

## Lifecycle Hooks

6 hooks run automatically throughout every session:

| Event | Hook | Behavior | Tier |
|-------|------|---------|------|
| `SessionStart` | `session-start` | Loads prior context, surfaces active tasks, prints session footer | Free |
| `UserPromptSubmit` | `intent-classifier` | Prints skill recommendations based on intent (Pro-tier suggestion system — does not auto-route) | Pro |
| `PreToolUse` | `cost-tracker` | Tracks approximate tool call count, warns at ceiling | Pro |
| `PostToolUse` | `knowledge-capture` | Captures Write/Edit file touches to `auto-captures.jsonl` | Pro |
| `Stop` | `session-save` | Saves session state for seamless resume | Free |
| `Notification` | `fleet-notify` | Posts fleet agent status updates as they complete | Pro |

> **Note:** UserPromptSubmit, PreToolUse, PostToolUse, and Notification hooks are Pro-tier — they are no-ops on the free tier. Only SessionStart and Stop run on all tiers.

## Quick Start

1. Install the plugin
2. Say "manage my project" — the `commander` skill opens an interactive menu
3. Pick a workflow: build, research, standup, review, or night mode
4. Connect tools (optional) for richer results

No configuration required to start. The intent classifier (Pro-tier) prints skill recommendations — select the suggested skill to proceed.

## Dual Mode

**Quick Mode** (default) — Guided workflows with 2-3 clarifying questions. Picks sensible defaults. Perfect for getting started fast.

**Power Mode** — Full control with expert features, detailed options, and structured output. Pass `--power` to any skill:

```
/ccc:build my-saas-app --power
/ccc:research competitor.com --power
/ccc:fleet "run security audit on all services" --power
```

## Connected Tools

The plugin is tool-agnostic — it works with any MCP server in each category. `.mcp.json` pre-configures 8 defaults:

| Category | Pre-configured in .mcp.json | What It Enables |
|----------|---------------------------|-----------------|
| Project tracker | Linear | Sprint board, issue sync, task routing |
| Source control | GitHub | PR diffs, commit history, branch status |
| Chat | Slack | Team discussions, standup channels |
| Email | Gmail | Standup distribution, status updates |
| Calendar | Google Calendar | Sprint planning, meeting context |
| Web search | Tavily | Real-time web data, competitive intel, news |
| Library docs | Context7 | Current API docs — no hallucinated methods |
| Files | Google Drive | Brand docs, style guides, draft storage |
| Knowledge base | _(available via CONNECTORS.md)_ | Notion, Confluence, Coda — prior decisions, runbooks |
| CI/CD | _(available via CONNECTORS.md)_ | GitHub Actions, CircleCI — deploy gate data |
| Monitoring | _(available via CONNECTORS.md)_ | Datadog, Grafana — logs and metrics for debugging |

Every skill works standalone. Connected tools make it faster and more complete.

> **Setup note:** Tavily requires an API key — set `TAVILY_API_KEY` in your shell. Context7 and Google Drive are plug-and-play.

> Placeholders like `~~project tracker` in skill output refer to whatever tool is connected in that category. See [CONNECTORS.md](CONNECTORS.md) for the full connector reference.

## Knowledge Compounding

CCC learns from every session. The `knowledge-capture` hook captures Write/Edit file touches to `auto-captures.jsonl` after each action. The `knowledge` skill lets you search, browse by category, and see what patterns have emerged over time.

```
/ccc:knowledge search "rate limiting"
/ccc:knowledge recent
/ccc:knowledge category performance
```

Lessons compound across projects and teammates.

## Skills Reference

| Skill | Key Trigger Phrases |
|-------|-------------------|
| `commander` | "help me build", "manage my project", "open commander", "what should I work on" |
| `build` | "build something", "new project", "create app", "I want to make", "start a project" |
| `research` | "research", "analyze", "audit", "investigate", "competitive analysis", "deep dive" |
| `standup` | "standup", "daily update", "what did I do", "yesterday today blockers", "team update" |
| `code-review` | "review code", "PR review", "check changes", "is this safe?", "before I merge" |
| `deploy-check` | "deploy check", "ready to ship?", "pre-deploy", "should I deploy?" |
| `night-mode` | "night mode", "overnight build", "build while I sleep", "autonomous build" |
| `fleet` | "parallel agents", "swarm", "launch workers", "fan out", "multi-agent" |
| `linear-board` | "linear board", "show issues", "pick a task", "sprint board", "open issues" |
| `knowledge` | "what did we learn", "past lessons", "search knowledge", "knowledge base" |
| `session` | "resume session", "continue where I left off", "review work", "show sessions" |
| `content` | "write post", "blog", "social media", "email campaign", "marketing copy" |
| `infra` | "infrastructure", "service status", "check ports", "what services are running" |
| `domains` | "ccc domains", "design skills", "marketing skills", "show categories" |
| `settings` | "settings", "change theme", "configure", "set up linear", "cost ceiling" |

## Attribution

CCC by [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic)) · [github.com/KevinZai/commander](https://github.com/KevinZai/commander) · MIT

Orchestrates: [gstack](https://github.com/garrytan/gstack) by Garry Tan · [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) by Every Inc · [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent
