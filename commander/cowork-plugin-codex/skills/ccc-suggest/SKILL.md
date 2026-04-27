---
name: ccc-suggest
description: "AI-powered 'what should I do next' advisor. Always running in the background (via UserPromptSubmit hook) — observes project state, user intent, and session history, then recommends the exact next /ccc-* workflow, CCC skill, or third-party plugin to use, with reasoning. Use when the user asks 'what next', 'what should I do', 'which tool', 'recommend', 'help me decide', or is stuck. Eliminates information paralysis for beginners. [Commander]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[optional: describe current situation in plain English]"
---

# /ccc-suggest — The Intelligence Layer

This is CC Commander's headline feature. **The user never has to guess which tool to use.** An Opus-class reasoning pass runs over the current project state + user signals + recent session activity, then surfaces ONE concrete recommendation: the next `/ccc-*` workflow, CCC skill, or third-party plugin to invoke — with named reasoning.

> No more info paralysis. No more "what's the right plugin for this?" No more browsing 500+ skills. You get a ⭐ **Recommended next step** with specific tool names.

## Response shape

Exactly four sections:

### 1. Brand header + context

```
**CC Commander Suggest** · Opus-class routing · Reading your project state…
```

Then a context card showing what was detected.

### 2. Project scan (parallel reads, <2s)

Run all of these in a SINGLE `Bash` invocation (parallelized with `&` + `wait`):

- `git rev-parse --abbrev-ref HEAD` — current branch
- `git log --oneline -5` — recent activity
- `git diff --stat origin/main..HEAD 2>/dev/null | tail -1` — branch ahead?
- `ls CLAUDE.md package.json pyproject.toml Cargo.toml .env 2>/dev/null | wc -l` — project signals
- `cat package.json 2>/dev/null | jq -r '.dependencies // empty | keys[]?' 2>/dev/null | head -20` — JS stack
- `ls tasks/todo.md tasks/plan-*.md 2>/dev/null` — open tasks
- `ls -t ~/.claude/sessions/*.tmp 2>/dev/null | head -1` — last session
- `ls ~/.claude/plugins/cache/*/*/1*/.claude-plugin/plugin.json 2>/dev/null | wc -l` — installed plugins
- `claude mcp list 2>/dev/null | grep -c '^ '` — connected MCPs

### 3. The recommendation

Use **Opus-class reasoning** (this skill runs on Opus when available; Sonnet fallback). Output EXACTLY this structure:

```markdown
## ⭐ Recommended next step

**`/ccc-<workflow>`** — <one-line purpose>

**Why this, now:** <3-5 sentences of concrete reasoning. Reference specific signals from the project scan. Name the alternative options you considered and rejected.>

**Specific tools you'll use:**
- 🛠️ **<primary skill/agent>** — <why it fits>
- 🧩 **<secondary skill/agent/MCP>** — <why it complements>
- 🌐 **<optional third-party plugin>** — <when it becomes relevant>

**Estimated time:** <X minutes>
**Cost:** <rough $ estimate if multi-agent or hosted MCP>
**Confidence:** <HIGH / MEDIUM / LOW, with reasoning>
```

### 4. Runner-up picks (via AskUserQuestion)

If the user wants alternatives, offer them:

```
question: "Prefer something else?"
header: "Alternatives"
multiSelect: false
options:
  - label: "⭐ Go with recommended: /ccc-<workflow>"
    description: "<reasoning abstract>"
  - label: "Runner-up: /ccc-<alt-1>"
    description: "<when this would be better>"
  - label: "Deeper option: /ccc-<alt-2>"
    description: "<more investment, potentially more value>"
  - label: "Show all 12 /ccc-* options"
    description: "Open /ccc-browse for the full picker."
```

Default to the starred first option unless user actively picks an alternative.

## The reasoning heuristics (Opus prompt)

When running the reasoning step, the internal Opus call uses these heuristics, ranked by signal strength:

### Tier 1 — Strong signals (drive the recommendation)
- **Branch is ahead of main + tests present** → `/ccc-review diff` (audit before PR)
- **Branch is ahead of main + no tests** → `/ccc-build` with TDD emphasis OR `/ccc-plan` if spec unclear
- **No CLAUDE.md + empty repo or only README** → `/ccc-start` (onboard + plan file)
- **CLAUDE.md exists + active tasks/todo.md** → continue the work; if last task is "plan", route to `/ccc-plan` resume; if "build", `/ccc-build`
- **Recent session crashed or interrupted** → resume via `/ccc-start` → "Import existing project"
- **Tests green + branch ahead + CHANGELOG staged** → `/ccc-ship preflight` (ready to release)
- **CI red / lint failing** → `/ccc-review` with perf+security focus first; fix before adding features
- **Dep audit flagged vulnerabilities** → `/ccc-review security` (critical before shipping)

### Tier 2 — Stack signals (modify the recommendation)
- **Next.js / React / Vite in package.json** → recommend `ccc-design` + Figma MCP in the tool list
- **Postgres / Supabase config** → recommend `ccc-saas` + Supabase MCP
- **GitHub Actions workflow** → recommend `ccc-devops` + GitHub MCP
- **Python ML imports** → recommend `ccc-research` + anthropic-skills via vendor
- **Multi-repo / monorepo** → recommend `ccc-fleet` (parallel agents)

### Tier 3 — User intent (overrides with explicit ask)
- User says "what's next" / "help me decide" / "which tool" → this skill activates directly
- User describes a task → pattern-match to workflow + skill, e.g. "audit security" → `/ccc-review security`
- User asks about a specific domain → route to `ccc-<domain>` domain router + name sub-skills

## Named third-party plugins for context (the "amazing OSS" callouts)

When relevant to the current task, NAME SPECIFIC 3RD-PARTY PLUGINS from the vendor ecosystem. Users should know these exist — discovery is our job, not theirs. The top-20 plugins by star count + active maintenance:

**For design:**
- `impeccable` — the design-language-hardening skill. Use when UI output feels generic.
- `frontend-design` (Anthropic) — anti-slop aesthetic engine.
- `ui-ux-pro-max-skill` — 67K star production design intelligence.

**For memory / context:**
- `claude-mem` — session memory + context injection. ✅ Already in core plugin as MCP.
- `hindsight` — agent memory that learns from past work.
- `beads` — memory upgrade for coding agents.

**For research / browsing:**
- `last30days-skill` — multi-source research (Reddit/X/YT/HN/web).
- `context7` — up-to-date library docs. ✅ Already in core.
- `dev-browser` — real browser for agents.

**For planning:**
- `planning-with-files` — Manus-style persistent markdown planning. Complements `/ccc-plan`.
- `bmad-method` — Breakthrough Method for Agile AI Development.

**For agent orchestration:**
- `wshobson/agents` — 100+ specialized subagents. Complementary to our 17 personas.
- `superpowers` — agentic skills framework.
- `caveman` — 65% token reduction mode. ✅ Already in vendor.

**For code quality:**
- `everything-claude-code` — 159K star full harness optimization.
- `claude-task-master` — task management drop-in.
- `promptfoo` — test prompts + red-teaming.

**For specialized domains:**
- `marketingskills` — CRO, copywriting, growth. ✅ Concept already in ccc-marketing.
- `pm-skills` — 100+ PM skills.
- `andrej-karpathy-skills` — Karpathy's LLM coding observations baked in.

**For live visibility:**
- `claude-hud` — status bar + tool tracking. ✅ Already in vendor.
- `visual-explainer` — rich HTML/slide diagrams. Pairs perfectly with `/ccc-cheatsheet`.

When recommending one, include: name, purpose, install path (`install via /ccc-connect OR vendor submodule OR npm`). Make it one-click from the recommendation to install.

## Always-on mode — ambient intelligence with 4 involvement levels

`/ccc-suggest` is **auto-triggered on every user turn** via the `suggest-ticker.js` UserPromptSubmit hook. It runs a lightweight reasoning pass (Sonnet, not full Opus) and surfaces recommendations based on the current **involvement level**.

The level auto-adjusts based on real-time project analysis. Users can also override via `CCC_SUGGEST_LEVEL=<1|2|3|4>` env var.

### Level 1 — **Passive** (silent analytics)
- Reasoning runs but never displays
- Logs to `~/.claude/commander/suggest-log.jsonl` for telemetry + session learning
- Default when: project is green (tests pass, branch clean, no todos, recent session completed successfully)
- Use case: power users who know what they're doing; data collection for future improvements

### Level 2 — **Gentle nudge** (default)
- Shows a one-line suggestion at the BOTTOM of the response ONLY when confidence ≥ HIGH
- Format: `💡 **Suggested next:** /ccc-ship preflight — tests green, branch ahead, CHANGELOG staged. Ready to release?`
- Dismissible by user (any response that doesn't use the suggestion is fine — no nag)
- Default when: project has signals but no blockers (e.g. branch ahead of main, recent plan file)
- Use case: most users; low intrusion, high value

### Level 3 — **Assertive** (inline recommendation)
- Shows a boxed recommendation card at the TOP of the response
- Always includes confidence + reasoning + runner-up picks
- Format:
  ```
  ┌─ 🎯 CC Commander Suggests ─────────────────────┐
  │ ⭐ /ccc-review diff (HIGH confidence)          │
  │ Why: 18 files changed, 0 test files touched,   │
  │ and you're ahead of main by 3 commits.         │
  │ Alternatives: /ccc-ship preflight · /ccc-plan  │
  └────────────────────────────────────────────────┘
  ```
- Default when: project has BLOCKERS (failed CI, security alerts, lint errors, stale CLAUDE.md drift)
- Use case: beginners or pressure situations; the AI is actively guiding

### Level 4 — **Autopilot** (execute unless objected)
- Skips AskUserQuestion for the top recommendation and just **runs it** after a 5-second countdown (user can say "stop" / "wait" / "no" to cancel)
- Level 4 only kicks in automatically when:
  1. Confidence is HIGH
  2. The recommendation is a READ-ONLY action (analysis, review, preview) — NEVER an action that writes to disk or network
  3. User has explicitly set `CCC_SUGGEST_LEVEL=4` (never auto-activates; opt-in only)
- Use case: heavy solo dev, night mode, autonomous overnight runs

### Auto-adjustment rules (the "brain" decides the level)

The ambient ticker re-evaluates the level at the start of every turn using these signals:

| Signal | Level shift |
|---|---|
| CI failing OR security alert OR open PR with red checks | → Level 3 (assertive) |
| Branch clean + tests green + no todos + recent success | → Level 1 (passive) |
| User said "what next" / "help" / "stuck" | → Level 3 one-turn override |
| User said "autopilot" / "yolo" / "go" | → Level 4 one-turn override |
| `CCC_SUGGEST_LEVEL` env var set | → hard-override to that level for whole session |
| `CCC_SUGGEST_DISABLE=1` | → disables ambient mode entirely (Level 0) |
| Night mode / overnight autonomous session detected | → Level 4 (with the read-only safety constraint) |

### Real-time project analysis signals (refreshed every 5 turns)

The ticker maintains a cached project state in `~/.claude/commander/project-state.json` refreshed at most every 5 turns (or on SessionStart). Fields:

```json
{
  "timestamp": "2026-04-20T01:15:00Z",
  "branch": "feature/xyz",
  "behindMain": 0,
  "aheadMain": 3,
  "testsStatus": "green",
  "ciStatus": "passing",
  "openTodos": 2,
  "lastSession": "2026-04-19T23:00:00Z",
  "stack": ["nextjs", "tailwind", "supabase"],
  "connectedMCPs": ["tavily", "claude-mem", "github"],
  "securityAlerts": 0,
  "lintErrors": 0,
  "recommendedLevel": 2,
  "lastRecommendation": {
    "skill": "/ccc-review diff",
    "confidence": "HIGH",
    "reasoning": "branch ahead by 3 commits, tests green, ready for PR review"
  }
}
```

### Marketing positioning (the headline feature)

> **"An Opus-class AI watches your project in real time and always tells you the next best move. You never have to know which of 502+ tools to use — the plugin knows for you."**

This is the headline differentiator. Other plugins ship tools. CC Commander ships **the decision** about which tool to use.

### User overrides

- `CCC_SUGGEST_LEVEL=1..4` — hard-lock the level
- `CCC_SUGGEST_DISABLE=1` — disable ambient mode entirely
- `/ccc-suggest --level=3 --force` — one-turn override
- `/ccc-suggest --history` — show last 10 recommendations + what user actually picked
- `/ccc-suggest --tune` — enter a quick AUQ flow to calibrate what level of involvement the user wants

## Anti-patterns

- ❌ Generic "you could try X" recommendations — always cite specific signals
- ❌ More than ONE starred recommendation — we eliminate decision fatigue, so one ⭐ only
- ❌ Recommending without reading project state — the scan is non-negotiable
- ❌ Vague time estimates — say "~15 min" or "~1 hour", not "a while"
- ❌ Recommending third-party plugins without install path — always name the install step
- ❌ Running the full Opus pass on every single message — the background ticker uses Sonnet; Opus only when user explicitly invokes `/ccc-suggest`

## Confidence calibration

- **HIGH** — multiple tier-1 signals agree + stack signals confirm (e.g. "branch ahead + tests green + CHANGELOG staged" → `/ccc-ship` with HIGH confidence)
- **MEDIUM** — one tier-1 signal + user intent compatible (e.g. "empty repo + user said 'build a SaaS'" → `/ccc-build` with MEDIUM)
- **LOW** — no tier-1 signals + user intent ambiguous → show 3 alternatives via AUQ

## Brand positioning (the value prop)

This skill IS the value prop of CC Commander for beginners:
- **No info paralysis** — one recommended next step, always
- **Opus-class reasoning** — not a dumb routing table; full project context
- **Named tools + plugins** — "use `claude-mem` for this" not "use a memory tool"
- **Reasoning shown** — never a black box, always "because X / Y / Z"

The CLI version of the same capability: `ccc --suggest` (headless, JSON output for CI).

## Tips for execution

1. Run the project scan FIRST, in parallel, in ONE Bash call. Don't sequential-read files.
2. The Opus pass is expensive — only on explicit `/ccc-suggest` invocation. The background hook uses Sonnet.
3. If scan reveals no actionable signals: say so, recommend `/ccc-start` for onboarding.
4. Every recommendation has a "what not to do" implicit — by picking ONE, you're hiding 11 others. That's intentional. Commit to the call.
