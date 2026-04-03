# CC Commander — Agent Reference

## Quick Start for Agents

CCC is an interactive CLI project manager that sits above Claude Code sessions. It dispatches tasks headlessly via `ccc --dispatch "task" --json`, exposes a full skill catalog via `--list-skills --json`, and provides structured JSON results. Use it to plan, build, debug, and ship — with model selection, budget caps, and session tracking built in.

---

## CLI API

| Command | Output | Use When |
|---------|--------|----------|
| `ccc --dispatch "task" --json` | JSON object | Run any task headlessly |
| `ccc --dispatch "task" --json --model opus` | JSON object | High-complexity tasks |
| `ccc --dispatch "task" --json --budget 5` | JSON object | Cap spend at $5 |
| `ccc --dispatch "task" --json --cwd /path` | JSON object | Scope to a specific project |
| `ccc --list-skills --json` | JSON array | Find skills by name/category |
| `ccc --list-sessions --json` | JSON array | Check session history |
| `ccc --status` | JSON object | Health check before dispatch |
| `ccc --split` | tmux session | Multi-task visual mode (human use) |
| `ccc --stats` | text | Quick stats summary |

### Dispatch Override Flags

| Flag | Values | Default |
|------|--------|---------|
| `--model` | `sonnet`, `opus`, `haiku`, `opusplan` | level default |
| `--max-turns` | integer | 30 (guided), 40 (assisted), 50 (power) |
| `--budget` | dollar amount (e.g. `5`) | 3/5/10 by level |
| `--cwd` | absolute path | current working directory |

### JSON Response Schema

```json
{
  "session_id": "kc-build-jwt-auth-module",
  "status": "success",
  "cost": 1.23,
  "model": "claude-opus-4-6",
  "turns": 18,
  "result": "Task complete. Files modified: ...",
  "error": null
}
```

### Error Response Schema

```json
{
  "session_id": "kc-task-name",
  "status": "error",
  "error": "Budget exceeded / Tool failed / ...",
  "cost": 0.42,
  "turns": 5
}
```

---

## Dispatch Patterns

### Pattern 1: Simple task
```bash
ccc --dispatch "Build auth with JWT" --json --model opus
```

### Pattern 2: Project-scoped
```bash
ccc --dispatch "Fix the login bug" --json --cwd /Users/ai/clawd/projects/myapp
```

### Pattern 3: Parallel batch
```bash
ccc --dispatch "Write unit tests for auth module" --json &
ccc --dispatch "Write unit tests for billing module" --json &
wait
```

### Pattern 4: Check result with jq
```bash
result=$(ccc --dispatch "Build JWT auth" --json --model opus --budget 5)
echo "$result" | jq '.session_id, .cost, .result'
```

### Pattern 5: Find a skill before dispatching
```bash
ccc --list-skills --json | jq '.[] | select(.name | contains("auth"))'
```

### Pattern 6: Health check before CI dispatch
```bash
ccc --status | jq '.ok' && ccc --dispatch "Run E2E tests" --json
```

---

## Levels and Model Defaults

| Level | Model | Max Turns | Budget | Use For |
|-------|-------|-----------|--------|---------|
| `guided` (default) | sonnet | 30 | $3 | Everyday tasks |
| `assisted` | opus | 40 | $5 | Complex features |
| `power` | opus | 50 | $10 | Architecture, long sessions |

Level is configured in `~/.claude/commander/config.json`. Override per-dispatch with `--model` and `--budget`.

---

## Main Menu Structure (commander/adventures/main-menu.json)

| Key | Label | Action / Next Adventure |
|-----|-------|------------------------|
| `a` | Continue where I left off | `continue-work` (shown if hasActiveSession) |
| `o` | Open a project | `open_project` — imports local CLAUDE.md |
| `b` | Build something new | `build-something` |
| `c` | Create content | `create-content` |
| `d` | Research & analyze | `research` |
| `e` | Review what I built | `review-work` |
| `f` | Learn a new skill | `learn-skill` |
| `g` | Check my stats | `check-stats` |
| `l` | Linear board | `linear-board` (shown if hasLinear) |
| `n` | Night Mode | `night-build` — 8-hour autonomous build |
| `s` | Settings | `settings` |
| `t` | Change theme | `change_theme` |
| `/` | Type a command | `freeform_prompt` |
| `q` | Quit | `quit` |

## Sub-Menu: build-something (commander/adventures/build-something.json)

| Key | Label | Action |
|-----|-------|--------|
| `a` | A website or web app | freeform_build with context "Build a website: " |
| `b` | An API or backend service | freeform_build with context "Build an API: " |
| `c` | A CLI tool or script | freeform_build with context "Build a CLI tool: " |
| `d` | Something else — I'll describe it | freeform_build |

## Sub-Menu: ccc-domains (commander/adventures/ccc-domains.json)

| Key | Domain | Sub-Skills | Covers |
|-----|--------|-----------|--------|
| `a` | ccc-design | 35+ | UI/UX, animations, polish, responsive, a11y |
| `b` | ccc-marketing | 46 | Content, CRO, email, ads, analytics, SEO |
| `c` | ccc-saas | 20 | Auth, billing, API, database, deploy |
| `d` | ccc-testing | 15 | Unit, integration, E2E, load, security |
| `e` | ccc-devops | 20 | CI/CD, Docker, AWS, monitoring |
| `f` | All 11 CCC domains | — | show_all_mega |

---

## Skill Catalog — 280 Skills in 11 Domains

### CCC Domain Routers (load ONE to get the whole domain)

| Domain | Sub-Skills | Invoke | What It Covers |
|--------|-----------|--------|----------------|
| `ccc-seo` | 19 | "Use the ccc-seo skill" | Technical SEO, AI search, programmatic SEO |
| `ccc-design` | 35+ | "Use the ccc-design skill" | Animations, design systems, landing pages, polish |
| `ccc-testing` | 15 | "Use the ccc-testing skill" | TDD, E2E, QA, regression, visual, load |
| `ccc-marketing` | 46 | "Use the ccc-marketing skill" | Content, CRO, email, ads, analytics, growth |
| `ccc-saas` | 20 | "Use the ccc-saas skill" | Auth, billing, database, API, metrics |
| `ccc-devops` | 20 | "Use the ccc-devops skill" | CI/CD, containers, AWS, monitoring, zero-downtime |
| `ccc-research` | 8 | "Use the ccc-research skill" | Deep research, competitive analysis, synthesis |
| `ccc-mobile` | 7 | "Use the ccc-mobile skill" | iOS, Android, React Native, Flutter |
| `ccc-security` | 9 | "Use the ccc-security skill" | Pen testing, OWASP, supply chain, secrets |
| `ccc-data` | 8 | "Use the ccc-data skill" | ETL, data warehouse, analytics, visualization |

### Essential Individual Skills by Use Case

| Skill | Invoke | Use When |
|-------|--------|----------|
| `spec-interviewer` | "use spec-interviewer skill" | Starting any feature > 1 day |
| `evals-before-specs` | "use evals-before-specs" | Define done BEFORE writing specs |
| `tdd-workflow` | "use tdd-workflow" | Write failing tests first |
| `review` | "use review skill" | Code review after implementing |
| `systematic-debugging` | "use systematic-debugging" | Need root cause of a bug |
| `operationalize-fixes` | "use operationalize-fixes" | After fixing: test → sweep → update rules |
| `verification-before-completion` | "use verification-before-completion" | Proof before marking done |
| `delegation-templates` | "use delegation-templates" | Dispatching to subagents |
| `dialectic-review` | "use dialectic-review" | FOR/AGAINST/Referee for hard decisions |
| `overnight-runner` | "use overnight-runner" | Unattended batch jobs |
| `strategic-compact` | "use strategic-compact" | Manual context compaction |
| `investigate` | "use investigate skill" | Never fix without root cause |
| `frontend-design` | "use frontend-design" | Anti-slop UI |
| `landing-page-builder` | "use landing-page-builder" | High-converting pages |
| `senior-devops` | "use senior-devops" | CI/CD, cloud, infrastructure |
| `gh-issues` | "use gh-issues" | Fetch issues → spawn subagents to fix |

---

## Build Type Selection

| Build Type | Time | Model | Key Skills |
|------------|------|-------|-----------|
| QUICK | <4h | sonnet | stack-specific only |
| DEEP | 1-5d | opus | spec-interviewer + tdd-workflow + ccc-testing |
| SAAS | 1-4wk | opus | ccc-saas + ccc-seo + ccc-testing + ccc-devops |
| OVERNIGHT | 6-12h | opus | overnight-runner + domain skills |

---

## Configuration

### Key State Files

| File | Purpose |
|------|---------|
| `~/.claude/commander/config.json` | Level, theme, model defaults, username |
| `~/.claude/commander/sessions/` | Session history (JSON per session) |
| `~/.claude/commander/knowledge.db` | Learned patterns from past sessions |

### Environment Variables

| Variable | Effect |
|----------|--------|
| `KZ_NO_COLOR=1` | Disable colors |
| `KZ_NO_ANIMATION=1` | Disable animations |
| `KZ_COACH_DISABLE=1` | Disable session coaching nudges |
| `KZ_COACH_INTERVAL=<ms>` | Override coaching interval |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` | Auto-compact at 70% context (dispatcher default) |

---

## Integration Points

### OpenClaw Bridge

- Auto-detected when OpenClaw gateway is running at `:18789`
- Skills sync bidirectionally: CCC skills appear in OpenClaw skill registry
- Events forward: OpenClaw tasks can trigger CCC dispatches
- Config: `skills/openclaw-native/SKILL.md`

### Linear MCP

- `l` key in main menu opens Linear board (requires `hasLinear` condition)
- Adventure file: `commander/adventures/linear-board.json`
- Issues appear as pickable tasks; selecting one dispatches to Claude Code
- Requires Linear MCP configured at `~/.claude/settings.json`

### Cowork Plugin (`commander/cowork-plugin/`)

- 4 skills for Claude Desktop autonomous mode
- Enables scheduled tasks and background dispatch from Cowork

### Claude Code `/ccc` Command

- `commands/cc.md` — interactive command center from inside a CC session
- Surfaces CCC menus and dispatch without leaving Claude Code

### Paperclip Bridge

- CCC can post task results to Paperclip at `localhost:3110`
- Used by OpenClaw Neo for tracked multi-step work

---

## Key File Paths

| Path | Contents |
|------|---------|
| `commander/engine.js` | Main interactive loop |
| `commander/dispatcher.js` | Claude Code dispatch (14 flags) |
| `commander/adventures/*.json` | All menu decision trees |
| `commander/tests/paths.test.js` | 18 E2E path tests |
| `skills/mega-*/` | CCC domain router + sub-skills |
| `commands/` | 88+ slash command definitions |
| `hooks/hooks.json` | 25 kit-native hook definitions |
| `SKILLS-INDEX.md` | Searchable skill index |
| `CHEATSHEET.md` | Human daily reference |
