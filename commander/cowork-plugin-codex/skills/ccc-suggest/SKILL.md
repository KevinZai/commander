---
name: ccc-suggest
description: "AI-powered 'what should I do next' advisor. Always running in the background (via UserPromptSubmit hook) — observes project state, user intent, and session history,…"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[loop | loop status | loop stop | describe current situation in plain English]"
---

# $ccc-suggest — The Intelligence Layer

This is CC Commander's headline feature. **The user never has to guess which tool to use.** An Opus-class reasoning pass runs over the current project state + user signals + recent session activity, then surfaces ONE concrete recommendation: the next `$ccc-*` workflow, CCC skill, or third-party plugin to invoke — with named reasoning.

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

**`$ccc-<workflow>`** — <one-line purpose>

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
  - label: "⭐ Go with recommended: $ccc-<workflow>"
    description: "<reasoning abstract>"
  - label: "Runner-up: $ccc-<alt-1>"
    description: "<when this would be better>"
  - label: "Deeper option: $ccc-<alt-2>"
    description: "<more investment, potentially more value>"
  - label: "Show all 12 $ccc-* options"
    description: "Open $ccc-browse for the full picker."
```

Default to the starred first option unless user actively picks an alternative.

## The reasoning heuristics (Opus prompt)

When running the reasoning step, the internal Opus call uses these heuristics, ranked by signal strength:

### Tier 0 — The three PM lenses (frame every pass)

Before ranking tier-1/2/3 signals, evaluate the project through all three PM lenses below. Every pass — explicit invocation AND ambient tick — runs all three and picks the strongest. **The loop is a PM, not a cheerleader:** it must be willing to say "stop building, scope this first." SCOPE outranks IMPROVE when both fire.

1. **IMPROVE** — "What skill or workflow could be implemented right now to make things better?" Missing tests → `$ccc-review` + TDD emphasis. Generic UI → `ccc-design` sub-skills. Slow feedback cycle → propose a new `/loop` recipe. Repeated manual step (same fix/check happening twice) → recommend encoding it as a skill or hook so future iterations don't repeat it — that is the PM's job, not the user's.
2. **SCOPE** — "Is the current work properly defined?" No plan file, vague acceptance criteria, or the task ballooning past its original ask → `$ccc-plan` or `spec-interviewer`. Scope creep detected in the diff vs. the stated goal → flag it explicitly, don't silently let it ride.
3. **AUDIT** — "What is currently unverified?" Branch ahead with no review → `$ccc-review`. Deps unaudited → security scan. Docs drifted from code → doc-sync. Tests green but coverage dropped → qa pass.

### Tier 1 — Strong signals (drive the recommendation)
- **Substantive task (multi-file / research / audit / migration / repo-wide)** → recommend running it workflow-first (the Workflow tool or `$ccc-fleet` / `$ccc-ultracode`); agents return conclusions, not file dumps. See `commander/cowork-plugin/rules/workflow-first.md`.
- **Isolated / parallel work described** (a background job, a separate *unrelated* task, "handle this independently", "while I'm away") → offer to spin it into its **own session** instead of derailing the current thread: a `spawn_task` chip in Cowork Desktop, or `/spawn quick <task>` in the CLI. Detected automatically every turn by the suggest ticker (`hooks/suggest-ticker.js` → `detectIsolationSignal`), deduped so it never nags. **Never spawn without the user's go-ahead.**
- **Branch is ahead of main + tests present** → `$ccc-review diff` (audit before PR)
- **Branch is ahead of main + no tests** → `$ccc-build` with TDD emphasis OR `$ccc-plan` if spec unclear
- **No CLAUDE.md + empty repo or only README** → `$ccc-start` (onboard + plan file)
- **CLAUDE.md exists + active tasks/todo.md** → continue the work; if last task is "plan", route to `$ccc-plan` resume; if "build", `$ccc-build`
- **Recent session crashed or interrupted** → resume via `$ccc-start` → "Import existing project"
- **Tests green + branch ahead + CHANGELOG staged** → `$ccc-ship preflight` (ready to release)
- **CI red / lint failing** → `$ccc-review` with perf+security focus first; fix before adding features
- **Dep audit flagged vulnerabilities** → `$ccc-review security` (critical before shipping)

### Tier 2 — Stack signals (modify the recommendation)
- **Next.js / React / Vite in package.json** → recommend `ccc-design` + Figma MCP in the tool list
- **Postgres / Supabase config** → recommend `ccc-saas` + Supabase MCP
- **GitHub Actions workflow** → recommend `ccc-devops` + GitHub MCP
- **Python ML imports** → recommend `ccc-research` + anthropic-skills via vendor
- **Multi-repo / monorepo** → recommend `ccc-fleet` (parallel agents)

### Tier 3 — User intent (overrides with explicit ask)
- User says "what's next" / "help me decide" / "which tool" → this skill activates directly
- User describes a task → pattern-match to workflow + skill, e.g. "audit security" → `$ccc-review security`
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
- `planning-with-files` — Manus-style persistent markdown planning. Complements `$ccc-plan`.
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
- `visual-explainer` — rich HTML/slide diagrams. Pairs perfectly with `$ccc-cheatsheet`.

When recommending one, include: name, purpose, install path (`install via $ccc-connect OR vendor submodule OR npm`). Make it one-click from the recommendation to install.

## Always-on mode — ambient intelligence with 4 involvement levels

`$ccc-suggest` is **auto-triggered on every user turn** via the `suggest-ticker.js` UserPromptSubmit hook. It runs a lightweight reasoning pass (Sonnet, not full Opus) and surfaces recommendations based on the current **involvement level**.

The level auto-adjusts based on real-time project analysis. Users can also override via `CCC_SUGGEST_LEVEL=<1|2|3|4>` env var.

### Level 1 — **Passive** (silent analytics)
- Reasoning runs but never displays
- Logs to `~/.claude/commander/suggest-log.jsonl` for telemetry + session learning
- Default when: project is green (tests pass, branch clean, no todos, recent session completed successfully)
- Use case: power users who know what they're doing; data collection for future improvements

### Level 2 — **Gentle nudge** (default)
- Shows a one-line suggestion at the BOTTOM of the response ONLY when confidence ≥ HIGH
- Format: `💡 **Suggested next:** $ccc-ship preflight — tests green, branch ahead, CHANGELOG staged. Ready to release?`
- Dismissible by user (any response that doesn't use the suggestion is fine — no nag)
- Default when: project has signals but no blockers (e.g. branch ahead of main, recent plan file)
- Use case: most users; low intrusion, high value

### Level 3 — **Assertive** (inline recommendation)
- Shows a boxed recommendation card at the TOP of the response
- Always includes confidence + reasoning + runner-up picks
- Format:
  ```
  ┌─ 🎯 CC Commander Suggests ─────────────────────┐
  │ ⭐ $ccc-review diff (HIGH confidence)          │
  │ Why: 18 files changed, 0 test files touched,   │
  │ and you're ahead of main by 3 commits.         │
  │ Alternatives: $ccc-ship preflight · $ccc-plan  │
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

## PM Loop mode — the always-on thinking PM

`$ccc-suggest loop` arms a recurring loop: start `/loop $ccc-suggest` (self-paced) or `/loop 30m $ccc-suggest` if the user gives an interval. Per the `$ccc-loop` taxonomy this is a **time-based** loop locally, and graduates to `/schedule $ccc-suggest` for teams who want it to survive laptop-close. See `$ccc-loop` for the full 4-type taxonomy this borrows from.

Each tick runs the existing project scan + the three PM lenses above, then surfaces **at most ONE** recommendation through the existing involvement-level system. A tick with nothing new to say stays silent at Level 1 — logging only, no nag.

**State file — dogfoods the `$ccc-loop` convention:** `.claude/loop-state/ccc-suggest.json`:

```json
{
  "iteration": 4,
  "lastRun": "2026-07-06T14:32:00Z",
  "attempted": ["/ccc-review diff", "/ccc-plan"],
  "dismissed": ["/ccc-ship preflight"],
  "history": []
}
```

**Hard rule:** a suggestion in `dismissed` is never re-surfaced unless its underlying signal materially changed (e.g. CI went from green to red). This is the anti-nag mechanism AND what makes the loop "learn" instead of repeating itself.

**Should-you-loop gate, applied to itself:** recurs constantly (every turn) ✓ · verifier = deterministic project-state signals (git/CI/todos), not self-judged ✓ · budget = cheap Sonnet-tier pass per tick, capped ✓ · real tools = git/gh/fs already wired via the ticker ✓. Passes all 4 — this is why `$ccc-suggest` is the one skill CCC recommends running as a standing loop rather than one-shot.

`$ccc-suggest loop status` reads the state file and prints iteration count + last recommendation + dismissed list. `$ccc-suggest loop stop` stops the loop — same mechanisms as `$ccc-loop` (Cowork Desktop stop button, `Ctrl+C`, or cancel the `/schedule` routine).

### Real-time project analysis signals (refreshed at most every ~30s of turn activity)

The ticker maintains a cached project state **per project** at
`~/.claude/commander/projects/<slug>/project-state.json`, where `<slug>` is
`basename(cwd)` + `-` + the first 8 hex chars of `sha256(cwd)` (the exact
algorithm is `projectSlug()` in `hooks/suggest-ticker.js`). To locate the
current project's file: `ls -d ~/.claude/commander/projects/$(basename "$PWD")-*`.
(The old flat `~/.claude/commander/project-state.json` is pre-v7.3.0 and no
longer written — treat it as stale.) Fields (exactly what `hooks/suggest-ticker.js`
`computeState()` writes):

```json
{
  "timestamp": "2026-07-10T01:15:00Z",
  "branch": "feature/xyz",
  "defaultBranch": "origin/main",
  "aheadMain": 3,
  "behindMain": 0,
  "hasClaudeMd": true,
  "claudeMdAgeDays": 12,
  "openTodos": 1,
  "lastSession": "/Users/you/.claude/sessions/2026-07-09-abc.tmp",
  "stack": ["nextjs", "tailwind", "supabase"],
  "testsStatus": "passing",
  "ciStatus": "passing",
  "lintStatus": "unknown",
  "securityAlerts": 0,
  "lintErrors": 0,
  "recommendedLevel": 2,
  "pmLenses": { "audit": true, "scope": false, "improve": false },
  "lastRecommendation": null
}
```

Signal sources: `ciStatus` from a ≤10-min cached `gh run list --limit 1 --json conclusion` (stale cache refreshes in a detached background process — the hook never blocks); `testsStatus` / `lintStatus` / `securityAlerts` from the PostToolUse cache at `~/.claude/commander/last-test-result.json` (30-min TTL); `defaultBranch` via `git symbolic-ref refs/remotes/origin/HEAD` (fallback `origin/main`). Status values are `passing | failing | unknown`. `hasClaudeMd` + `claudeMdAgeDays` feed the CLAUDE.md drift recommendations (`$ccc-claudemd` at age > 30d, `$ccc-adopt` when missing). `lastRecommendation` is populated by explicit `$ccc-suggest` runs, not by the ticker.

### Marketing positioning (the headline feature)

> **"An Opus-class AI watches your project in real time and always tells you the next best move. You never have to know which of 502+ tools to use — the plugin knows for you."**

This is the headline differentiator. Other plugins ship tools. CC Commander ships **the decision** about which tool to use.

### User overrides

- `CCC_SUGGEST_LEVEL=1..4` — hard-lock the level
- `CCC_SUGGEST_DISABLE=1` — disable ambient mode entirely
- `$ccc-suggest --level=3 --force` — one-turn override
- `$ccc-suggest --history` — show last 10 recommendations + what user actually picked
- `$ccc-suggest --tune` — enter a quick AUQ flow to calibrate what level of involvement the user wants

## Fable escalation rule

When session intent is strongly deep-reasoning (≥2 of: architecture / redesign / migration / threat model / system design / refactor entire / plan the / roadmap; OR prompt >800 chars with planning verbs), surface **once per session** (never nag):

> 🧠 **Deep-reasoning session detected** — consider `/model claude-fable-5[1m]` (Fable deep mode, 1M ctx, adaptive thinking always-on). CCC routes subagents cost-efficiently either way.

- Fire at most ONCE per day (marker file `~/.claude/commander/fable-nudge-<date>`).
- Never trigger on casual or short prompts.
- Never block or delay the response — append as a lightweight suggestion only.
- The `intent-classifier.js` UserPromptSubmit hook handles automatic detection; this skill surfaces it in explicit `$ccc-suggest` runs.

## Anti-patterns

- ❌ Generic "you could try X" recommendations — always cite specific signals
- ❌ More than ONE starred recommendation — we eliminate decision fatigue, so one ⭐ only
- ❌ Recommending without reading project state — the scan is non-negotiable
- ❌ Vague time estimates — say "~15 min" or "~1 hour", not "a while"
- ❌ Recommending third-party plugins without install path — always name the install step
- ❌ Running the full Opus pass on every single message — the background ticker uses Sonnet; Opus only when user explicitly invokes `$ccc-suggest`

## Confidence calibration

- **HIGH** — multiple tier-1 signals agree + stack signals confirm (e.g. "branch ahead + tests green + CHANGELOG staged" → `$ccc-ship` with HIGH confidence)
- **MEDIUM** — one tier-1 signal + user intent compatible (e.g. "empty repo + user said 'build a SaaS'" → `$ccc-build` with MEDIUM)
- **LOW** — no tier-1 signals + user intent ambiguous → show 3 alternatives via AUQ

## Voice

Speak in the PM Consultant voice with the semantic emoji palette from `rules/common/response-style.md` (🎯 focus · 💡 idea · 🟢 approve · 🟡 caution · 🔴 block · ⏭️ next) — every recommendation ends with a decisive **🟢 my call** + one-line rationale, never a hedge.

## Brand positioning (the value prop)

This skill IS the value prop of CC Commander for beginners:
- **No info paralysis** — one recommended next step, always
- **Opus-class reasoning** — not a dumb routing table; full project context
- **Named tools + plugins** — "use `claude-mem` for this" not "use a memory tool"
- **Reasoning shown** — never a black box, always "because X / Y / Z"

The CLI version of the same capability: `ccc --suggest` (headless, JSON output for CI).

## Tips for execution

1. Run the project scan FIRST, in parallel, in ONE Bash call. Don't sequential-read files.
2. The Opus pass is expensive — only on explicit `$ccc-suggest` invocation. The background hook uses Sonnet.
3. If scan reveals no actionable signals: say so, recommend `$ccc-start` for onboarding.
4. Every recommendation has a "what not to do" implicit — by picking ONE, you're hiding 11 others. That's intentional. Commit to the call.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
