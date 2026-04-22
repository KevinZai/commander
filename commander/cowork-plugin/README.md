# CC Commander

> CC Commander — Guided AI PM for Claude Code. Brain/hands architecture with **17 specialist sub-agent personas** (architect · reviewer · builder · security-auditor · debugger · designer · qa-engineer · devops · data-analyst · content-strategist · product-manager · performance-engineer · researcher · technical-writer · fleet-worker · typescript-reviewer · python-reviewer). **30 plugin skills** incl **12 click-first `/ccc-*` workflows**. **8 lifecycle hooks × 16 handlers** (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification, PreCompact, SubagentStop). **9 bundled MCP servers**. Native Plan pane integration (EnterPlanMode + ExitPlanMode), spawn_task sidebar chips, mark_chapter session nav. 502+ skills across 11 CCC domains. Works in Claude Code Desktop, Cowork Desktop, CLI, Cursor, Windsurf, Cline, Continue, Codex. **Free forever.**

CC Commander is a guided AI PM plugin that orchestrates your entire development workflow — from planning to shipping. The plugin ships **30 native skills** (`/ccc-*`) organized as 12 click-first specialist workflows, 14 domain routers, 2 diagnostic/meta skills, and 2 vendor-sourced skills. They route into the broader CC Commander ecosystem of 502+ skills across 11 domains.

**Who's it for?**
- 👋 **New to AI coding agents?** Claude Cowork Desktop + CC Commander = the easiest on-ramp.
- 💻 **A developer?** Claude Code Desktop or CLI — same install, same skills, deeper hooks.
- 🔧 **In Cursor / Windsurf / Cline / Continue / Codex?** Hosted MCP endpoint — one URL, all skills.

It compounds knowledge across sessions, detects and sequences your installed tools, and provides guided flows for building, researching, reviewing, and deploying. Works standalone out of the box, gets supercharged when you connect your tools.

## Installation

### Installation Paths

Three ways to install CC Commander, depending on how you want to use it:

**1. Desktop plugin marketplace (recommended)**

The full plugin experience — 30 skills, 17 agents, 8 hooks, 9 pre-wired MCPs, free/pro tier gating. Plugin marketplace: `commander-hub` → slug `commander`.

```bash
/plugin marketplace add KevinZai/commander
/plugin install commander
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

Installs the CCC CLI (`ccc` command), all 502+ skills, hooks, commands, and templates into `~/.claude/`.

```bash
curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash
```

## Skills

28 plugin skills covering every phase of the development lifecycle. See [mintlify-docs/plugin/skills.mdx](../../mintlify-docs/plugin/skills.mdx) for the full catalog. Core surface:


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

15 purpose-built agents that skills delegate to automatically (core 5 shown — full list in `agents/`):

| Agent | Model | Purpose |
|-------|-------|---------|
| `builder` | Sonnet | Implements features and creates projects from specs — TDD, conventional commits, boring solutions |
| `reviewer` | Sonnet | Structured code review with severity ratings — security, performance, correctness, style |
| `researcher` | Sonnet | Deep research and synthesis — competitive analysis, audits, market research, literature review |
| `debugger` | Opus | Root-cause debugging — reproduces, isolates, traces, fixes with verified resolution |
| `fleet-worker` | Sonnet | General-purpose parallel worker — executes one assigned task and reports results |

## Lifecycle Hooks

8 hooks run automatically throughout every session:

| Event | Hook | Behavior | Tier |
|-------|------|---------|------|
| `SessionStart` | `session-start` | Loads prior context, surfaces active tasks, prints session footer | Free |
| `UserPromptSubmit` | `intent-classifier` | Prints skill recommendations based on intent (Pro-tier suggestion system — does not auto-route) | Pro |
| `PreToolUse` | `cost-tracker` | Tracks approximate tool call count, warns at ceiling | Pro |
| `PostToolUse` | `knowledge-capture` | Captures Write/Edit file touches to `auto-captures.jsonl` | Pro |
| `Stop` | `session-save` | Saves session state for seamless resume | Free |
| `Notification` | `fleet-notify` | Posts fleet agent status updates as they complete | Pro |
| `PreCompact` | `pre-compact-save` | Saves critical session state before context compaction | Free |
| `SubagentStop` | `subagent-reporter` | Reports subagent results back to orchestrator on completion | Pro |

> **Note:** UserPromptSubmit, PreToolUse, PostToolUse, Notification, and SubagentStop hooks are Pro-tier — they are no-ops on the free tier. SessionStart, Stop, and PreCompact run on all tiers.

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

## Sub-agent roster

15 specialist personas — each with a distinct role, model, and voice layer in `rules/personas/`:

| # | Persona | Model | When |
|---|---------|-------|------|
| 1 | architect | Opus | System design, tradeoffs, tech selection |
| 2 | reviewer | Sonnet | Multi-dim PR review with severity ratings |
| 3 | builder | Sonnet | MVP-first feature implementation |
| 4 | security-auditor | Opus | OWASP audits, threat modeling |
| 5 | debugger | Opus | Root-cause investigation (Iron Law) |
| 6 | designer | Sonnet | UI/UX critique, a11y, polish |
| 7 | qa-engineer | Sonnet | Edge-case hunt, coverage, breaking cases |
| 8 | devops-engineer | Sonnet | CI/CD, infra, deploys, runbooks |
| 9 | data-analyst | Sonnet | Insights, stats, visualization |
| 10 | content-strategist | Sonnet | Marketing copy, brand voice |
| 11 | product-manager | Opus | PRDs, scoping, user stories |
| 12 | performance-engineer | Sonnet | Hotpath hunting, benchmarking |
| 13 | researcher | Sonnet | Competitive + market analysis |
| 14 | technical-writer | Sonnet | Docs, API refs, tutorials |
| 15 | fleet-worker | Sonnet | Parallel scoped batch work |

## Hook catalog

8 lifecycle events, 16 handlers — fire automatically every session:

| Event | When fires | Handlers |
|-------|-----------|----------|
| SessionStart | New session opens | 3 (init state, claude-md nudge, post-compact recovery) |
| UserPromptSubmit | User hits Enter | 4 (suggest ticker, intent classifier, context warning, submit logger) |
| PreToolUse | Before any tool call | 3 (cost tracker, cost ceiling, secret leak guard) |
| PostToolUse | After tool completes | 1 (knowledge capture) |
| Stop | Session ends | 2 (session save, session end) |
| Notification | System-level notification | 1 (fleet notify) |
| PreCompact | Before context compaction | 1 (block if active subagents) |
| SubagentStop | Subagent finishes | 1 (dispatch results tracker) |
| **TOTAL** | **8 events** | **16 handlers** |

## vs aider

Aider is your pair programmer — diff-based file editing, any LLM, deep Git integration, terminal-native. CC Commander is your PM — brain/hands sub-agent architecture, 15 specialist personas, click-first workflows, lifecycle hooks that fire automatically. They're complementary: use aider for solo rapid file edits, CCC for multi-phase features that need planning, review, and fleet orchestration. See the [full comparison in the root README](../../README.md#vs-aider-positioning).

## Attribution

CCC by [Kevin Z](https://kevinz.ai) ([@kzic](https://x.com/kzic)) · [github.com/KevinZai/commander](https://github.com/KevinZai/commander) · MIT

Orchestrates: [gstack](https://github.com/garrytan/gstack) by Garry Tan · [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) by Every Inc · [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent
