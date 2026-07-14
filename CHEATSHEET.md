# CC Commander Cheatsheet
> CC Commander v6.7.2 — by Kevin Zicherman — commands, workflows, and power user tips
> Last updated: 2026-07-10 · See CHANGELOG.md for version history

> **Which document?** BIBLE.md = learning guide (read once). **CHEATSHEET.md = daily reference (you are here).** SKILLS-INDEX.md = skill discovery (search by keyword/category).

---

## Desktop Plugin Commands (v6.7.2)

CC Commander ships as a native **Claude Code Desktop** (aka Cowork Desktop) plugin — this is the primary product. Install once via **Settings → Plugin Marketplace → Add from GitHub** (`KevinZai/commander`). 76 plugin skills total (13 /ccc-* specialist workflows + 11 CCC domains + 6 channel/CI/ECC skills + 2 diagnostic/meta + 2 vendor-sourced + 11 lifecycle/session skills + deploy + rollback + onboard).

> **Cowork Desktop and Claude Code Desktop are the same app, two UI modes.** The plugin works identically in both.
> **New in v6.7.2 — Engagement Engine**
> - Hook delivery rebuilt on documented `systemMessage` / `additionalContext` fields.
> - Always-on skill suggestions now emit an `AskUserQuestion` chip (`Run` / `Dismiss` / `/ccc-browse`) instead of plain text once confidence is high.
> - New `/ccc-claudemd` skill (72nd plugin skill) audits `CLAUDE.md` drift with AUQ-gated fixes.
> - Verifier-separation and mandatory worktree isolation are now enforced across every write path (`ccc-migrate`, `ccc-orchestrate`, `ccc-plan-exec`, `ccc-fleet`).

### Plugin Installation

**Via Desktop GUI (recommended):**
1. Open **Settings → Plugin Marketplace**
2. Click **Add from GitHub** → enter `KevinZai/commander`
3. Find `commander` → click **Install**

**Via CLI (Claude Code terminal only):**
```bash
/plugin marketplace add KevinZai/commander
/plugin install commander
```

### /ccc-* Skills (76 plugin skills — 13 specialist workflows + 11 CCC domains + 6 channel/CI/ECC skills + Orchestrator/Executor + meta + vendor-sourced + lifecycle + session; core surface shown)

| Skill | Description | Tier |
|-------|-------------|------|
| `/ccc` | Main CCC hub — interactive menu, session overview | Free |
| `/ccc-build` | Build wizard — web, API, CLI with spec questions | Free |
| `/ccc-linear-board` | Linear issue browser — view, pick, create tasks | Free |
| `/ccc-research` | Deep research with citations and confidence scoring | Free |
| `/ccc-content` | Content creation — blog, social, email, copy | Free |
| `/ccc-session` | Session management — save, resume, context budget | Free |
| `/ccc-settings` | CCC settings — model, cost, theme, MCP, hooks | Free |
| `/ccc-domains` | Browse 11 CCC domains (200+ sub-skills) | Free |
| `/ccc-infra` | Infrastructure — fleet, cost, Synapse, Paperclip | Pro |
| `/ccc-knowledge` | Search knowledge base for past lessons | Pro |
| `/ccc-night-mode` | Autonomous overnight build — checkpoints, recovery | Pro |
| `/ccc-standup` | Generate standup update from recent git activity | Pro |
| `/ccc-code-review` | Multi-agent code review (3 reviewers, structured) | Pro |
| `/ccc-deploy-check` | Pre-deployment readiness gate | Pro |
| `/ccc-fleet` | Fleet Commander — launch, monitor, kill agent pool | Pro |
| `/ccc-brainstorm` | Guided ideation: problem framing → divergent ideas → shortlist | Free |
| `/ccc-qa` | QA workflow: test planning, coverage audit, edge-case generation | Free |
| `/ccc-loop` | Run any /ccc-* skill on a recurring interval | Free |
| `/ccc-hermes` | Hermes Gateway status, OAuth bridge health, token refresh | Free |
| `/ccc-nightwatch` | Remote YOLO permission relay — approve tool calls from mobile | Free |
| `/ccc-ci` | CI/CD gate: lint, test, build, branch checks, pre-push hooks | Free |
| `/ccc-orchestrate` | Cross-runtime Orchestrator/Executor — Fable/Opus goal file, GPT-5.5 or Sonnet executes, orchestrator verifies | Free |
| `/ccc-handoff` | Proactive context reset — dense handoff file, then start a fresh chat before quality decays | Free |
| `/ccc-adopt` | Adopt CCC doctrine in another repo — merge marked Orchestrator/Executor block into `CLAUDE.md` | Free |
| `/ccc-fable` | Arm the Fable Method — 12-gate session contract (`on` / `status` / `audit` / `off`) | Free |
| `/ccc-claudemd` | Audit CLAUDE.md against the codebase — stale paths, dead commands, drifted counts (AUQ-approved fixes only) | Free |

> 🧠 **The Fable Method:** `/ccc-fable on` arms the 12-gate operating doctrine — never trust a single pass, loops need verifiers/state/stops, prove before you alarm, context is disposable/state is durable. Model-agnostic by design. Full doctrine: `commander/cowork-plugin/rules/fable-method.md`.

### Sub-agent personas (22)

Brain/hands architecture — each persona has a distinct role, model, and voice. Skills delegate to these automatically.

| # | Persona | Model | When to invoke |
|---|---------|-------|----------------|
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
| 16 | typescript-reviewer | Sonnet | TypeScript review: strict mode, async, ESM/CJS |
| 17 | python-reviewer | Sonnet | Python review: PEP 8, type hints, pytest, security |
| 18 | go-reviewer | Sonnet | Go review: idiomatic patterns, goroutine safety, error wrapping |
| 19 | rust-reviewer | Sonnet | Rust review: ownership/borrowing, lifetimes, unsafe blocks |
| 20 | java-reviewer | Sonnet | Java review: Spring patterns, null safety, checked exceptions |
| 21 | kotlin-reviewer | Sonnet | Kotlin review: coroutines, null safety, sealed classes |
| 22 | csharp-reviewer | Sonnet | C# review: async/await, nullable references, LINQ, DI |

### Lifecycle hook events (23)

23 events, 39 handlers — fire automatically every session (no configuration needed). v5.1.0 expanded from 9 → 23 events.

**Core events:**

| Event | When fires | Handlers |
|-------|-----------|----------|
| `SessionStart` | New session opens | 4 (init state, claude-md nudge, post-compact recovery, suggest ticker) |
| `SessionEnd` | Session cleanly closes | 2 (session save, summary) — moved from `Stop` in v5.1.0 |
| `UserPromptSubmit` | User hits Enter | 4 (suggest ticker, intent classifier, context warning, submit logger) |
| `PreToolUse` | Before any tool call | 3 (cost tracker, cost ceiling, secret leak guard) |
| `PostToolUse` | After tool completes | 3 (knowledge capture, quality gate, auto-format) |
| `Stop` | Session closes | 1 (legacy cleanup) |
| `Notification` | System-level notification | 1 (fleet notify) |
| `PreCompact` | Before context compaction | 1 (block if active subagents) |
| `PostCompact` | After compaction | 1 (context restoration hints) |
| `SubagentStart` | Subagent spawns | 1 (spawn time tracking) |
| `SubagentStop` | Subagent finishes | 1 (cost aggregation) |
| `PermissionRequest` | Tool permission prompt | 1 (permission gate / nightwatch relay) |
| `TaskCreated` | Background task starts | 1 (workflow/fleet tracking) |
| `TaskCompleted` | Background task finishes | 1 (workflow/fleet tracking) |
| **9 more** | `StopFailure`, `PostToolUseFailure`, `PostToolBatch`, `Elicitation`, `ElicitationResult`, `ConfigChange`, `UserPromptExpansion`, `InstructionsLoaded`, `Setup` | 9 (one each) |
| **TOTAL** | **23 events** | **39 handlers** |

### Dynamic Workflows + Ultracode (v5.1.0)

> Research preview — requires Claude Code v2.1.154+. Falls back to `Agent()` on older clients.

**4 bundled workflows** in `commander/cowork-plugin/workflows/`:

| Workflow | Backs | What it does |
|----------|-------|-------------|
| `ccc-audit` | `/ccc-xray` | Parallel audit — security · performance · architecture · test coverage |
| `ccc-deep-review` | `/ccc-review` | 4 Sonnet reviewers in parallel + reconciler |
| `ccc-migrate` | `/ccc-build` | Discover → transform → verify pipeline |
| `ccc-fleet` | `/ccc-fleet` | Fan-out / pipeline / judge patterns |

**Ultracode** = `xhigh` effort + workflow orchestration:

```
/ccc-ultracode               # guided path
/effort ultracode            # set for session
workflow: <task>             # one-off
```

### Plugin MCP Servers (11)

| MCP | Purpose |
|-----|---------|
| Linear | Issue tracking, sprint board |
| GitHub | PRs, CI status, code review |
| Slack | Progress notifications |
| Gmail | Email digest, standup context |
| Google Calendar | Schedule awareness, standup |
| Tavily | Real-time web search + research |
| Context7 | Current library/API docs (no hallucinated methods) |
| Google Drive | Brand docs, style guides, draft storage |
| Sequential Thinking | Complex multi-step reasoning primitive |
| Obsidian Skills | Obsidian vault integration — read/write notes, search vault, link memory to sessions (kepano/obsidian-skills, MIT) |

### vs aider

Aider = pair programmer (diff edits, any LLM, Git-native). CCC = AI PM (sub-agent architecture, 17 personas, lifecycle hooks, click-first workflows). Use both — they're complementary. [Full comparison →](README.md#vs-aiderchat--positioning)

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
| Design Makeover | `ccc-makeover` | 3 skills — `/xray` project audit + `/makeover` design swarm + report generation |

---

## Workflow Modes

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

## Prompt Library

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

### Split Mode (tmux)

| Command | What It Does |
|---------|-------------|
| `ccc --split` | Launch tabbed tmux mode |
| `Ctrl+A n` | Next tab |
| `Ctrl+A p` | Previous tab |
| `Ctrl+A 0` | Back to CCC menu tab |
| `Ctrl+A q` | Quit session |

### Agent API (Headless)

| Command | What It Does |
|---------|-------------|
| `ccc --dispatch "task"` | Run task, print result |
| `ccc --dispatch "task" --json` | JSON output (session_id, cost, result) |
| `ccc --list-skills --json` | All skills as JSON array |
| `ccc --list-sessions --json` | Session history as JSON |
| `ccc --status` | Health check JSON |

### Daemon Mode

| Command | What It Does |
|---------|-------------|
| `ccc --daemon` | Start background daemon |
| `ccc --daemon-stop` | Stop running daemon |
| `ccc --queue "task"` | Add task to queue |
| `ccc --queue-list` | Show pending tasks |

### Intelligence Layer

Automatic — no configuration needed:
- Task complexity scoring adjusts turns/budget per task
- Project stack detection (package.json, Dockerfile, etc.)
- Skill relevance filtering based on detected stack
- Smart retry on context overflow / rate limits
- Session learning from past outcomes

Override: `ccc --dispatch "task" --max-turns 50 --budget 10`

| Command | Key | What It Does |
|---------|-----|-------------|
| `/btw` | — | Side question without polluting main context |
| `/ccc-aside` | — | Same idea — preserves context budget |
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
| Code review | `/ccc-code-review` command or `review` skill |
| Important decision | `dialectic-review` (FOR/AGAINST/Referee agents) |
| Security audit | `pentest-checklist` + `container-security` |
| Design review | `design-review` + `audit` + `critique` |
| Business plan | `plan-ceo-review` + `saas-metrics-coach` |
| Engineering plan | `plan-eng-review` |

### Command vs Skill Routing

| Intent | Quick (command) | Deep (skill) |
|--------|----------------|--------------|
| Code review | `/ccc-code-review` | `review` or `codex` |
| Test-driven dev | `/ccc-tdd` | `tdd-workflow` |
| Verify before done | `/ccc-verify` | `verification-loop` |
| End-to-end tests | `/ccc-e2e` | `e2e-testing` |
| Audit quality | `/ccc-audit` | `audit` skill |

> Commands = quick-fire (<5 min). Skills = deep-dive (10+ min with methodology).

---

## 🔥 Essential Commands (Daily Use)

| Command | What it does | Example |
|---------|-------------|---------|
| `/ccc-init` | Initialize project — creates `CLAUDE.md` with stack context | `/ccc-init` in project root |
| `/help` | Show all available commands and keyboard shortcuts | `/help` |
| `/clear` | Clear conversation history (frees context window) | `/clear` |
| `/compact` | Intelligently compress context, keeping key info | `/compact` |
| `/model` | Switch model for current session | `/model claude-opus-4-5` |
| `/think` | Enable extended thinking mode (deeper reasoning) | `/think hard about this architecture` |
| `/review` | Trigger code review pass on current changes | `/review` |
| `/ccc-cost` | Show token usage and cost for current session | `/ccc-cost` |
| `/doctor` | Diagnose Claude Code setup issues | `/doctor` |
| `/add` | Add files or directories to active context | `/add src/api/` |
| `/ccc-plan` | Spec-first planning — interview → spec doc → execute | `/ccc-plan build a Stripe checkout` |
| `/ccc-verify` | Run verification loop before claiming done | `/ccc-verify` |

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
| `/ccc-save-session` | Persist context to `~/.claude/sessions/` | `/ccc-save-session` |
| `/ccc-resume-session` | Reload last saved session on startup | `/ccc-resume-session` |
| `/ccc-context-budget` | Check how much context you're using | `/ccc-context-budget` |
| `/ccc-aside` | Quick side-task without losing main context | `/ccc-aside what does this regex do?` |
| `/context` | Show current context summary | `/context` |
| `/memory` | Manage memory files (view/edit CLAUDE.md) | `/memory` |
| `/compact` | Manual context compaction | `/compact` |
| `/strategic-compact` | Compact at logical breakpoints (skill) | use `strategic-compact` skill |
| `claude -c` | Continue last conversation from CLI | `claude -c` |
| `claude --resume <id>` | Resume specific session ID | `claude --resume abc123` |

### 🔁 /loop integration (Claude Code 2.1.154+)

Pair `/loop` with any `/ccc-*` skill for recurring execution. Claude Code Desktop renders a "loop" tag in the UI automatically.

```
/loop [interval] <skill-or-prompt>
```

| Loop command | What it does |
|---|---|
| `/loop 5m /ccc-doctor` | Plugin health every 5 min |
| `/ccc-tuneup` | Diagnose + safely remediate local CC Commander setup |
| `/ccc-tuneup --check` | Read-only audit scorecard (no mutations) |
| `/ccc-tuneup --fix` | Audit → chip picker → backup → archive → apply safe fixes |
| `/loop /ccc-review` | Self-paced branch audit |
| `/loop 30m /ccc-tasks` | Task list refresh |
| `/loop 1h /ccc-xray` | Periodic project health scan |
| `/loop /ccc-changelog` | Poll for new releases |

Stop: `Ctrl+C` or the stop button in Cowork Desktop. Avoid looping destructive skills (`/ccc-deploy`, `/ccc-rollback`). CCC status-line shows `🔁 loop` when `CLAUDE_LOOP_ACTIVE` is detected.

---

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

### Proactive Hooks (28 Kit-Native)

The kit ships 24 hooks that fire automatically — no prompting required. Disable any hook with its env var.

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

**PreCompact (1 hook)**

| Hook | What it does | Disable with |
|------|-------------|-------------|
| `pre-compact` | Saves session state and critical context before context compaction | `KZ_DISABLE_PRE_COMPACT=1` |

**PostToolUse (1 additional hook)**

| Hook | What it does | Disable with |
|------|-------------|-------------|
| `self-verify` | Auto-verifies file changes against stated intent, catches drift | `KZ_DISABLE_SELF_VERIFY=1` |

**Session Coach** was retired 2026-07-10 — its heuristics now feed the plugin suggest engine (`CCC_SUGGEST_MODE` / `CC_COACH_DISABLE=1` still silences the stack-hint suggestions).

CCC ships with 24 kit-native hooks that work standalone via `hooks-standalone.json`.

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
| `tasks/spec-YYYYMMDD.md` | Spec documents from `/ccc-plan` |
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
| `/ccc-plan` | Before ANY multi-step task. Spec-first. | `/ccc-plan add OAuth login` |
| `/ccc-orchestrate` | Fable/Opus plans a goal file; GPT-5.5 via `codex` or Sonnet executes; orchestrator verifies | `/ccc-orchestrate` |
| `/ccc-handoff` | Save dense handoff state and resume in a fresh chat before context quality decays | `/ccc-handoff` |
| `/ccc-adopt` | Add the Orchestrator/Executor doctrine to an existing project's `CLAUDE.md` | `/ccc-adopt` |
| `/ccc-build-fix` | Auto-resolve build errors after `npm run build` fails | `/ccc-build-fix` |
| `/ccc-verify` | Run full verification before claiming done | `/ccc-verify` |
| `/ccc-checkpoint` | Git checkpoint — save state mid-work | `/ccc-checkpoint` |
| `/ccc-complete` | Mark task complete with verification | `/ccc-complete` |
| `spec-interviewer` | Interview → spec doc → fresh session execute | use skill |
| `writing-plans` | Structured planning before implementation | use skill |
| `executing-plans` | Execute written plans with review checkpoints | use skill |

### Plan Workflow
```
/ccc-plan
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
| `/ccc-code-review` | Multi-agent code review (runs 3 reviewers) |
| `/ccc-tdd` | Start test-driven workflow (write test → implement → refactor) |
| `/ccc-quality-gate` | Run quality checks (lint, type, test) |
| `/ccc-refactor-clean` | Safe refactoring with test preservation |
| `/review` | Built-in code review pass |
| `/test` | Run test suite |
| `/ccc-test-coverage` | Check test coverage |
| `/ccc-e2e` | Run Playwright E2E tests |
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
| `/ccc-docs` | Generate/update documentation |
| `/ccc-update-docs` | Refresh all doc files |
| `/ccc-update-codemaps` | Refresh code maps |
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
/ccc-plan → approve spec → /ccc-tdd → implement → /ccc-verify → /ccc-code-review → /ccc-pr → /ccc-deploy
```

### Bug Fix Workflow
```
investigate skill → root cause → /ccc-tdd → fix → /ccc-verify → /ccc-pr
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
version: 6.7.2
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

### Skill Tiers (Installation)

Install only the skills you need — smaller tiers save ~10k tokens per session:

```bash
./install.sh --skills=essential   # ~30 core skills (default, saves ~10k tokens)
./install.sh --skills=recommended # ~100 skills for most developers
./install.sh --skills=full        # All 466+ skills (legacy behavior)
```

| Tier | Count | When to use |
|------|-------|------------|
| `essential` | ~30 | Default — covers 90% of use cases |
| `recommended` | ~100 | Active builders across multiple domains |
| `full` | 459 | Legacy behavior, maximum coverage |

You can always load an on-demand skill mid-session: `"use the skill-name skill"`

---

## ⚙️ Configuration

### `.claude/settings.json` Structure

```json
{
  "model": "claude-sonnet-5",
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
| `claude-sonnet-5` | General development, most tasks (latest/best Sonnet) | $$ |
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
| `/ccc-learn` | Extract reusable patterns from current work |
| `/ccc-instinct-status` | View learned patterns inventory |
| `/ccc-instinct-export` | Export learned instincts |
| `/ccc-instinct-import` | Import learned instincts |
| `continuous-learning-v2` skill | Auto-extract patterns via hooks |
| `rules-distill` | Distill rules from experience |

### Project Management Commands

| Command | What it does |
|---------|-------------|
| `/ccc-paperclip` | Manage tasks in Paperclip |
| `/ccc-projects` | List active projects |
| `/ccc-pm2` | Manage PM2 processes |
| `/ccc-pr` | Create pull request |
| `/ccc-deploy` | Deploy to production |
| `project-kickoff` skill | Initialize new project (CLAUDE.md + tasks + hooks) |

---

## 📊 Cost & Token Management

### Model Ladder (v6.0)

| Model | Role | Input | Output | Use |
|-------|------|-------|--------|-----|
| **Fable 5** | Deep reasoning escalation | $10/MTok | $50/MTok | `/model claude-fable-5[1m]` when 🧠 deep thinking needed (once/day nudge) |
| **Opus 4.8** | Everyday session default | $5/MTok | $25/MTok | Main thread, heavy implementation, Fable fallback |
| **Sonnet 5** | General dev, 16 sub-agents (latest/best Sonnet) | $3/MTok | $15/MTok | Default for most delegated work — reviewers + builders + QA |
| **Sonnet 4.6** | General dev, prior Sonnet | $3/MTok | $15/MTok | Predecessor to Sonnet 5 |
| **Haiku 4.5** | Fast bulk ops | $1/MTok | $5/MTok | Bulk tasks, hooks, high-turn ops |

**Savings tracking:** `ccc --savings` shows estimated cost vs all-Opus baseline (±30%). Smart routing via `selectModelForComplexity(0-100)`: 0-29→haiku, 30-65→sonnet, 66-85→opus, 86-100→fable.

### Session Cost Tracking

| Method | How |
|--------|-----|
| `/ccc-cost` | Show cost for current session |
| `ccc --savings` | Daily savings estimate vs all-Opus baseline |
| `cache-monitor` skill | Analyze cache efficiency from JSONL logs |
| JSONL logs | `~/.claude/agents/*/ccc-sessions/*.jsonl` |
| Agent-HQ dashboard | `http://localhost:3005/api/costs` |
| `/ccc-context-budget` | See how much context is used |

### Token Optimization

| Strategy | How |
|----------|-----|
| Cache hit optimization | Keep static content at top of CLAUDE.md |
| Manual compact | `/compact` at logical breakpoints |
| Strategic compact | Use `strategic-compact` skill at key moments |
| Subagents for isolation | Each subagent gets full context window |
| Fresh sessions for big tasks | `/ccc-save-session` → new session → `/ccc-resume-session` |
| Haiku for simple tasks | `--model claude-haiku-4` for bulk/fast ops |
| `/ccc-aside` for side questions | Preserves main context budget |

### Model Cost Comparison

| Model | Input (per 1M) | Output (per 1M) | Best Use |
|-------|---------------|-----------------|---------|
| claude-opus-4-5 | $15 | $75 | Architecture, deep reasoning |
| claude-sonnet-5 | $3 | $15 | General development (latest/best Sonnet) |
| claude-sonnet-4-5 | $3 | $15 | General development (prior Sonnet) |
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
| Context window full | `/compact` or `/clear` or start new session with `/ccc-save-session` first |
| Stale library docs | Add `"use context7"` to your prompt |
| Forgot what was in context | `/context` to see summary |
| Build keeps failing | `/ccc-build-fix` or `systematic-debugging` skill |
| Agent stuck in loop | `Ctrl+C` to cancel, then be more specific |
| Wrong model for task | `--model <model>` flag or `/model` in session |
| Global permissions bloat | Use project-level `.claude/settings.json` instead |
| Changing models mid-session | Spawn subagent with different model instead |
| No verification before done | Always `/ccc-verify` or `verification-before-completion` skill |
| Huge context window | `/ccc-save-session` → start fresh → `/ccc-resume-session` |
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
| No plan for multi-step work | Always `/ccc-plan` before complex tasks |
| Verifying by asking, not running | Always `/ccc-verify` or run tests yourself |
| Editing global settings for one project | Use `.claude/settings.json` per project |
| Huge prompt, tiny output | Break into spec → subagents → verify |
| Forgetting lessons | Check `tasks/lessons.md` at session start |
| Context bloat from side questions | Use `/ccc-aside` for side questions |
| One-shot for 3-day tasks | `/ccc-plan` → spec → fresh sessions |

---

## 🏗️ Power Combos

| Goal | Combo |
|------|-------|
| New feature (full cycle) | `/ccc-plan` → approve spec → `/ccc-tdd` → implement → `/ccc-verify` → `/ccc-code-review` → `/ccc-pr` → `/ccc-deploy` |
| Bug fix | `investigate` skill → root cause → `/ccc-tdd` → fix → `operationalize-fixes` → `/ccc-verify` → `/ccc-pr` |
| Design work | `/ccc-plan` → `brainstorming` → `frontend-design` → `/ccc-verify` → `design-review` → ship |
| Content/SEO | `seo-content-brief` → `content-strategy` → write → `seo-optimizer` + `aaio` → `/ccc-verify` |
| Feature kickoff | `evals-before-specs` → `/ccc-plan` → spec → implement → verify against evals |
| Overnight batch | `overnight-runner` → checkpoint file → wrapper script → notification |
| Subagent dispatch | `delegation-templates` → structured prompt → report validation → accept/reject |
| Performance | `audit` → `optimize` → `harden` → benchmark → `canary` monitor |
| QA cycle | `qa` skill → fix bugs → `document-release` → deploy |
| New project | `project-kickoff` → CLAUDE.md + tasks → `/ccc-plan` → build |

---

## 📖 /ccc Command Center (Desktop plugin)

CC Commander v6.7.2 — the Desktop plugin is the primary surface. Invoke the interactive hub with plain `/ccc` in Claude Desktop:

| Command | What it does |
|---------|-------------|
| `/ccc` | Main menu — interactive hub, session overview |
| `/ccc-build` | Build wizard — web, API, CLI with spec questions |
| `/ccc-domains` | Browse 11 CCC domains (200+ sub-skills) |
| `/ccc-settings` | View model, cost, theme, MCP, hooks |
| `/ccc-session` | Save, resume, context budget |
| `/ccc-research` | Deep research with citations and confidence scoring |
| `/ccc-content` | Blog, social, email, copy |
| `/ccc-knowledge` | Search past lessons (Pro) |
| `/ccc-code-review` | Multi-agent code review (Pro) |
| `/ccc-deploy-check` | Pre-deploy readiness gate (Pro) |

> **CLI-only users:** Some `/cc *` commands (grill, confidence, mode, prompts) remain in the CLI build. See `docs/cli.md` for the CLI-only command set.

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

Import the CCC iTerm2 profile for the intended visual experience:

```bash
open compatibility/kz-matrix.itermcolors
```

OLED black background + bright green text + cyan accents. Color values for other terminals in `compatibility/README.md`.

---

*See `SKILLS-INDEX.md` for the full searchable skill library.*
*Skills live in `~/.claude/skills/` — load any with: "use the `skill-name` skill"*

---

## Token Optimization (context-mode)

context-mode sandboxes tool output into SQLite + FTS5. 98% context reduction.

| Command | What it does |
|---------|-------------|
| `ctx_execute <lang> <code>` | Run in sandbox — only summary enters context |
| `ctx_search <query>` | BM25 search over all sandboxed results |
| `ctx_batch_execute` | Run multiple commands, all indexed |
| `ctx_stats` | Session token savings breakdown |
| `ctx_doctor` | Verify context-mode health (runtimes, FTS5, hooks) |
| `ctx_purge` | Delete all indexed content |

### Full Optimization Stack

| Layer | Tool | Savings |
|-------|------|---------|
| Tool output | context-mode | 98% (SQLite + FTS5) |
| CLI filtering | RTK | 99.5% |
| Skill loading | _tiers.json | ~10k tokens |
| Rate rotation | ClaudeSwap | 2 accounts |
| Prompt cache | Extended TTL | 90% discount |

---

## CC Commander v6.7.2 Quick Reference (CLI)

```bash
# Launch
ccc              # Interactive mode (arrow-key menus)
npx kit-commander           # Via npm
ccc                         # Global binary

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
