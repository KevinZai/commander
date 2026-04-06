# CC Commander — Agent Reference (BIBLE-AGENT)

> **Read this file to control CC Commander from any AI agent platform.**
> 362 skills. 17 vendors. Headless CLI API. Works with Claude Code, OpenClaw, Cursor, Codex, any LLM agent.

---

## Platform Setup (Step-by-Step)

### Claude Code (native — recommended)

CCC installs directly into `~/.claude/`. Every skill, command, and hook is available natively.

```bash
# 1. Install
git clone --recursive https://github.com/KevinZai/cc-commander.git
cd cc-commander && ./install.sh --force

# 2. Verify
ccc --test     # 166 tests across 4 suites
ccc --status   # {"version":"<from package.json>","skills":362,"vendors":16,"health":"ok"}

# 3. Use inside Claude Code sessions
/ccc           # Full interactive menu (15 options, sub-menus, cancel support)
/ccc xray      # Project health scan
/ccc skills    # Browse 362 skills
/ccc refresh   # Update CLAUDE.md from latest template

# 4. Headless dispatch (from within Claude Code)
ccc --dispatch "Build auth with JWT" --json --model opus --budget 5

# 5. Split mode (tmux tabs — default when you type `ccc` in terminal)
ccc            # Each dispatch opens a new tmux tab
ccc --simple   # Menu-only, no tmux
```

### OpenClaw Agents

Any OpenClaw agent (Alfred, Neo, Codex, etc.) can use CCC as a project manager.

```bash
# 1. Ensure CCC is installed on the same machine as OpenClaw
ccc --status   # Must return {"health":"ok"}

# 2. Agent dispatches a task
result=$(ccc --dispatch "Build a REST API with auth" --json --model opus --budget 5)
echo "$result" | jq '.result'

# 3. Agent browses skills
ccc --list-skills --json | jq '.[] | select(.name | contains("auth"))'

# 4. Agent checks session history
ccc --list-sessions --json | jq '.[0]'

# 5. Register CCC as an OpenClaw tool in ~/.openclaw/openclaw.json:
# "tools": { "ccc": { "type": "cli", "command": "ccc", "capabilities": ["dispatch","list-skills","status"] } }

# 6. OpenClaw skill for detailed integration:
# Read: skills/openclaw-ccc-bridge/SKILL.md
```

### Cursor / Codex / Other Agents

CCC works with any agent that can run shell commands.

```bash
# 1. Install CCC globally
npm install -g cc-commander   # OR clone + ./install.sh

# 2. From agent: dispatch tasks
ccc --dispatch "Refactor the database layer" --json --cwd /path/to/project

# 3. From agent: search skills
ccc --list-skills --json | jq '.[] | select(.description | test("database"; "i"))'

# 4. From agent: health check
ccc --status
```

### Claude Desktop Cowork

```bash
# 1. Install the Cowork plugin
/plugin marketplace add KevinZai/cc-commander

# 2. Skills available in Cowork:
#    /cc-commander  — full 15-item menu
#    /cc-night-mode — 10-question spec → overnight build
#    /cc-knowledge  — search past lessons
#    /cc-plugins    — detect installed packages

# 3. Scheduled tasks via Cowork settings
```

### VS Code / Cursor Extension

```bash
# 1. Install
cd cc-commander/extension && code --install-extension .

# 2. Commands available in Command Palette:
#    CC Commander: Open      → launches ccc in terminal
#    CC Commander: Stats     → ccc --stats
#    CC Commander: Skills    → ccc --list-skills
#    CC Commander: Dispatch  → ccc --dispatch
#    CC Commander: Status    → ccc --status
```

---

## CLI API — Complete Reference

| Command | Output | Use When |
|---------|--------|----------|
| `ccc --dispatch "task" --json` | JSON | Run any task headlessly |
| `ccc --list-skills --json` | JSON array | Find skills by name/description |
| `ccc --list-sessions --json` | JSON array | Check session history |
| `ccc --status` | JSON | Health check (version, skills, vendors) |
| `ccc --template` | text | Get latest CLAUDE.md template |
| `ccc --test` | text | Validate installation (166 tests across 4 suites) |
| `ccc --stats` | text | Sessions, streaks, cost, level |

### Infrastructure CLI Commands

Nine service-management commands available from within Claude Code sessions:

| Command | Port | What It Does |
|---------|------|-------------|
| `/ccc fleet` | 4680 | Fleet Commander — dispatch and monitor multi-agent jobs |
| `/ccc syn` | 4682 | Synapse — observability, traces, memory timeline |
| `/ccc cost` | 3005 | Real-time cost dashboard (AO Dashboard) |
| `/ccc ao` | — | Composio AO — spawn parallel background agents |
| `/ccc cloudcli` | 4681 | Web session bridge — run Claude in browser, sync back |
| `/ccc paperclip` | 3110 | Pick up next Paperclip issue (enhanced flow) |
| `/ccc taskmaster` | — | TaskMaster task queue — next task, status, expand |

Access all via `/ccc infra` sub-menu. Use `ccc detect` to probe which services are currently running.

### Service Detector

`commander/service-detector.js` probes 8 services and 4 CLIs at startup:

```bash
ccc --detect   # JSON report of all service/CLI status
```

Services checked: Fleet (4680), CloudCLI (4681), Synapse (4682), AO Dashboard (3005), Paperclip (3110), n8n (5678), Ollama (11434), OpenClaw (18789).
CLIs checked: `gh`, `openclaw`, `pm2`, `docker`.

### Dispatch Flags

| Flag | Values | Default |
|------|--------|---------|
| `--model` | `sonnet`, `opus`, `haiku` | level-based (see below) |
| `--max-turns` | integer | 30/40/50 by level |
| `--budget` | dollars (e.g. `5`) | 3/5/10 by level |
| `--cwd` | absolute path | current directory |
| `--json` | — | Output as JSON (required for parsing) |

### Response Schema

**Success:**
```json
{"result": "Task complete. Files modified: ...", "session_id": "kc-build-auth", "cost_usd": 1.23}
```

**Error:**
```json
{"error": "Claude Code exited with code 1: ..."}
```

---

## Execution Model: Opus Plans, Sonnet Builds, Opus Audits

Every CCC dispatch runs as an **Opus orchestrator** that:
1. **Plans** the work (Opus — high reasoning)
2. **Delegates** implementation to Sonnet subagents (fast, cheap)
3. **Audits** the results (Opus — verifies correctness)

The dispatched Claude session runs as Opus 1M. It spawns Sonnet workers for actual code generation, file writes, and research. Opus reviews everything before marking done.

### Level Defaults

| Level | Orchestrator | Workers | Max Turns | Budget |
|-------|-------------|---------|-----------|--------|
| `guided` | opus (1M) | sonnet | 30 | $5 |
| `assisted` | opus (1M) | sonnet | 40 | $5 |
| `power` | opus (1M) | sonnet | 50 | $10 |

Override per-dispatch: `--model opus --max-turns 80 --budget 15`

---

## Dispatch Patterns for Agents

### Simple task
```bash
ccc --dispatch "Build auth with JWT" --json --model opus
```

### Scoped to a project
```bash
ccc --dispatch "Fix the login bug" --json --cwd /path/to/project
```

### Parallel batch (3 tasks simultaneously)
```bash
ccc --dispatch "Write tests for auth" --json &
ccc --dispatch "Write tests for billing" --json &
ccc --dispatch "Write API docs" --json &
wait
```

### Find the right skill first
```bash
skill=$(ccc --list-skills --json | jq -r '.[] | select(.name | contains("auth")) | .name' | head -1)
ccc --dispatch "Using the $skill skill, build JWT authentication" --json
```

### Chain: health check → dispatch → verify
```bash
health=$(ccc --status | jq -r '.health')
if [ "$health" = "ok" ]; then
  ccc --dispatch "Build the feature" --json --budget 5
fi
```

### YOLO overnight build
```bash
ccc --dispatch "YOLO: Build complete SaaS with auth, billing, dashboard. 5 cycles." \
  --json --model opus --max-turns 100 --budget 10
```

---

## Main Menu (Source of Truth: commander/adventures/main-menu.json)

| Key | Label | Action |
|-----|-------|--------|
| `a` | Continue where I left off | Resume last session |
| `o` | Open a project | Import local CLAUDE.md |
| `b` | Build something new | → web / API / CLI / other |
| `c` | Create content | → blog / social / email / marketing / docs |
| `d` | Research & analyze | → competitive / market / code / SEO |
| `e` | Review what I built | Show recent sessions |
| `f` | Learn a new skill | Browse 362 skills |
| `g` | Check my stats | Dashboard, streaks, cost |
| `i` | Infrastructure | Fleet, Synapse, Cost, AO, CloudCLI, Paperclip, TaskMaster |
| `l` | Linear board | Pick/create issues (requires Linear MCP) |
| `n` | Night Mode | 10-question spec → Opus overnight build |
| `s` | Settings | Name, level, cost, theme |
| `t` | Change theme | 10 themes (CLI only) |
| `/` | Type a command | Free-text prompt |
| `q` | Quit | Exit |

---

## Component Counts

| Component | Count |
|-----------|-------|
| Skills | 362 |
| Commands | 87 |
| Hooks | 25 |
| Adventures | 14 |
| Vendors | 16 |
| Themes | 10 |
| Tests | 166 |
| Modes | 9 |

---

## Skill Catalog — 362 Skills in 11 Domains

### CCC Domain Routers (load ONE domain = all sub-skills)

| Domain | Skills | Invoke | Covers |
|--------|--------|--------|--------|
| `ccc-design` | 39 | "Use ccc-design" | UI/UX, animation, responsive, a11y, design systems |
| `ccc-marketing` | 45 | "Use ccc-marketing" | CRO, email, ads, social, SEO content, growth |
| `ccc-saas` | 20 | "Use ccc-saas" | Auth, billing, API, database, multi-tenant |
| `ccc-devops` | 20 | "Use ccc-devops" | CI/CD, Docker, AWS, monitoring, zero-downtime |
| `ccc-seo` | 19 | "Use ccc-seo" | Technical SEO, AI search, structured data |
| `ccc-testing` | 15 | "Use ccc-testing" | TDD, E2E, QA, regression, load testing |
| `ccc-data` | 8 | "Use ccc-data" | SQL, ETL, analytics, visualization |
| `ccc-security` | 8 | "Use ccc-security" | OWASP, pen testing, secrets, hardening |
| `ccc-research` | 8 | "Use ccc-research" | Competitive analysis, market research, SWOT |
| `ccc-mobile` | 8 | "Use ccc-mobile" | React Native, Expo, Flutter, app store |
| `ccc-makeover` | 3 | "Use ccc-makeover" | /xray audit + auto-fix + report card |

### Top Individual Skills

| Skill | Invoke | Use When |
|-------|--------|----------|
| `spec-interviewer` | "Use spec-interviewer" | Starting any feature > 1 day |
| `tdd-workflow` | "Use tdd-workflow" | Write failing tests first |
| `review` | "Use review" | Code review after implementing |
| `systematic-debugging` | "Use systematic-debugging" | Root cause analysis |
| `operationalize-fixes` | "Use operationalize-fixes" | After fix: test → sweep → update rules |
| `verification-before-completion` | "Use verification-before-completion" | Proof before marking done |
| `delegation-templates` | "Use delegation-templates" | Dispatching to subagents |
| `dialectic-review` | "Use dialectic-review" | FOR/AGAINST/Referee for hard decisions |
| `overnight-runner` | "Use overnight-runner" | Unattended batch jobs |
| `frontend-design` | "Use frontend-design" | Anti-slop UI design |
| `landing-page-builder` | "Use landing-page-builder" | High-converting pages |
| `senior-devops` | "Use senior-devops" | CI/CD, cloud, infrastructure |
| `gh-issues` | "Use gh-issues" | Fetch issues → spawn agents to fix |
| `openclaw-ccc-bridge` | "Use openclaw-ccc-bridge" | OpenClaw ↔ CCC integration |

---

## Proactive Skill Suggestions

Agents should proactively suggest CCC skills at key moments. Don't wait for the user to ask — recognize the context and offer the right skill.

| Context | Suggest | Reason |
|---------|---------|--------|
| User starts a new feature | `spec-interviewer` | Define requirements before building |
| Writing new code | `tdd-workflow` | Write failing tests first |
| Bug report or error | `systematic-debugging` | Root cause analysis, not guessing |
| Code review needed | `review` | Catch issues before merge |
| About to deploy | `deploy-check` | Pre-deploy verification gates |
| UI/frontend work | `ccc-design` | 39 sub-skills for design quality |
| SEO or content | `ccc-seo` | Technical SEO + AI discoverability |
| Security audit | `ccc-security` | OWASP, secrets, supply chain |
| Before marking done | `verification-before-completion` | Proof before completion |
| Hard decision | `dialectic-review` | FOR/AGAINST/Referee pattern |

### How to Suggest (by platform)

**Claude Code (native):** Use AskUserQuestion:
```
"I recommend the **tdd-workflow** skill here — you're about to write a new module and tests-first will catch edge cases early. Want me to load it?"
Options: [Use tdd-workflow] [Skip] [Show other options]
```

**OpenClaw:** Post suggestion to the channel, let user confirm:
```
ccc --list-skills --json | jq '.[] | select(.name == "tdd-workflow")'
# Then dispatch if confirmed:
ccc --dispatch "Using tdd-workflow skill: [task]" --json
```

**Cowork/VS Code:** Surface as a suggestion in the response with the skill invocation.

---

## Rich Footer Bar

Every CCC session displays a 12-segment status line:

```
━━ CCC{ver}│🔥Opus1M│🔑gAA│🧠▐██45%░░▌│⏱️▐██░░░░░▌│📅▐██░░░░░▌│💰$2.34│↑640K↓694K│⏰8h0m│🎯362│📋CC-150│📂~/project
```

_(Example — actual version comes from `status-line.js`)_

Segments: version · model · auth · context% · rate-limit% · daily-budget% · cost · tokens-in/out · duration · skills-count · Linear-ticket · cwd.

Color coding: green <60%, yellow <80%, red ≥80% for context/rate/budget meters.

---

## Proactive Intelligence Protocol

After every action, CCC suggests 3-4 next steps via `AskUserQuestion`. Agents can control this behavior:

| User says | Effect |
|-----------|--------|
| `"skip"` | Suppress suggestions for this session |
| `"just do it"` | Execute top suggestion without confirmation |
| `"auto"` | Auto-execute top suggestion for all subsequent actions |

---

## Intelligence Layer

CCC auto-adjusts every dispatch. No configuration needed.

### Complexity Scoring
```
scoreComplexity("fix typo")         → {score: 0,   turns: 10, budget: 1,  effort: "low"}
scoreComplexity("add feature")      → {score: 30,  turns: 20, budget: 3,  effort: "low"}
scoreComplexity("build SaaS")       → {score: 100, turns: 50, budget: 10, effort: "high"}
```
47 keyword signals, fuzzy regex matching, word count analysis.

### Stack Detection
Reads: package.json, Dockerfile, go.mod, Cargo.toml, pyproject.toml, .github/workflows
Detects: nextjs, react, vue, docker, python, rust, go, github-actions, orm, billing, testing
Also: monorepo detection, git branch, recent commit themes

### Skill Recommendations
`recommendSkills(task, techStack, limit)` — combines stack matching + keyword matching + usage history
Returns ranked, deduplicated list. Skills used successfully rank higher.

### Knowledge Compounding
Every session → lesson extracted (keywords, category, tech, errors, successes)
Time decay: <7 days = 2x, <30 days = 1.5x, older = 1x
Fuzzy matching + cross-category boost (web↔react, api↔backend)

### Smart Retry
Rate limit → wait 60s + retry. Context overflow → reduce turns 40% + retry. Budget exceeded → clear error.

Override per-dispatch with --max-turns, --budget, --model.

---

## Testing

166 tests across 4 suites:
- paths.test.js (18) — adventure files, navigation, module exports
- hooks.test.js (61) — lifecycle hooks
- intelligence.test.js (57) — scoring, knowledge, skills, project import
- error-handling.test.js (30) — error logger, action module structure

Plus: smoke.sh (6 CLI flag tests), prepublishOnly gate. Run: `node --test tests/*.test.js`

---

## Security

- All shell calls use execFileSync with array args (no injection)
- Default: --permission-mode auto (not --dangerously-skip-permissions)
- YOLO mode only: skipPermissions enabled (intentional)
- CI: PII scan, npm audit, secret detection on every push
- Errors: friendly message + error ID, never raw stack traces

---

## Cancel / Stop

| Context | How to Cancel |
|---------|--------------|
| During any build (simple mode) | Press `Escape` or `q` |
| During YOLO loop | `touch ~/.claude/commander/yolo-stop` |
| In split mode (tmux) | Switch to Claude tab → `Ctrl+C` |
| From another process | Kill the `claude` child process |

---

## Daemon Mode (Background Agent)

```bash
ccc --daemon                    # Start persistent daemon
ccc --queue "task" --priority 1 # Add high-priority task
ccc --queue-list                # Show queue
ccc --daemon-stop               # Stop
tail -f ~/.claude/commander/daemon-log.txt  # Watch logs
```

| Config | Default | Flag |
|--------|---------|------|
| Tick interval | 5 min | `--interval N` (seconds) |
| Tick budget | 15 sec | `--tick-budget N` (seconds) |
| Dream interval | 1 hour | `--dream N` (minutes) |

Queue: `~/.claude/commander/queue/` · Log: `~/.claude/commander/daemon-log.txt` · PID: `~/.claude/commander/daemon.pid`

---

## Environment Variables

| Variable | Effect |
|----------|--------|
| `CC_NO_COLOR=1` | Disable colors |
| `CC_NO_ANIMATION=1` | Disable animations |
| `CC_COACH_DISABLE=1` | Disable coaching nudges |
| `CC_COACH_INTERVAL=N` | Responses between nudges (default: 5) |
| `CC_OPENCLAW_ENABLED=1` | Enable OpenClaw event sync |
| `CC_OPENCLAW_URL` | Gateway URL (default: localhost:18789) |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` | Auto-compact at 70% context |
| `CCC_TMUX_SESSION` | Set when inside tmux split |
| `CCC_SIMPLE=1` | Force simple mode (no tmux) |
| `KC_LINEAR_PROJECT` | Linear project name for session sync |
| `KC_LINEAR_TEAM` | Linear team key for issue creation |

---

## Key Files

| Path | What |
|------|------|
| `commander/adventures/*.json` | Menu definitions (14 adventures, source of truth) |
| `commander/dispatcher.js` | Claude Code dispatch logic + Intelligence Layer |
| `commander/engine.js` | Interactive menu engine |
| `skills/` | 362 skill definitions (SKILL.md each) |
| `commands/ccc.md` | /ccc command for Claude Code sessions |
| `BIBLE.md` | Full methodology (2000+ lines, human-readable) |
| `BIBLE-AGENT.md` | This file (agent-optimized) |
| `CLAUDE.md.template` | CLAUDE.md template for new projects |
| `SKILLS-INDEX.md` | Searchable skill directory |

---

## License

MIT License. Intelligence Layer (4 files) has additional Commons Clause — free to use, not to sell.
See LICENSE-INTELLIGENCE.md.
