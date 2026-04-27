---
name: ccc-plan
description: "Feature planning flow for CC Commander. Runs a structured 3-5 question spec interview, then delegates to the planner agent in the background to write an implementation plan to the session-bound plan path (from EnterPlanMode) so it renders in Claude Code Desktop's native Plan pane. Use when the user types /ccc-plan, says 'plan this feature', 'write a spec', 'help me plan', 'break this down', or before starting any multi-day work."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - EnterPlanMode
  - ExitPlanMode
  - mcp__ccd_session__mark_chapter
  - TodoWrite
argument-hint: "[new | bug | refactor | linear | <idea in quotes>]"
---

# /ccc-plan — Feature Planning Flow

User has an idea. Job: turn it into a structured plan file before any code gets written. We cascade through a spec interview, then fire the `planner` agent in the background to produce the plan at the **session-bound path** returned by `EnterPlanMode` — so it renders in Claude Code Desktop's native Plan pane. Return a one-line summary + path.

This is the "evals before specs before code" gate. Every multi-day feature routes through here.

## Step 0 — Detect and enter plan mode (ALWAYS first)

Before showing any UI, determine the session plan file path:

**If "Plan File Info" block is present in the system-reminder context** (Desktop already activated plan mode for this session, surfacing a path like `~/.claude/plans/<whimsy-name>.md`):
- Capture that path as `PLAN_PATH`
- Do NOT call `EnterPlanMode` again — it is already active

**If NO "Plan File Info" block is detected:**
- Call the `EnterPlanMode` tool — this switches the session into plan mode
- `EnterPlanMode` returns the session-bound path (e.g., `~/.claude/plans/spirited-oak-forest.md`)
- Capture that returned path as `PLAN_PATH`

`PLAN_PATH` is the canonical write target for the rest of this skill. Do not write to any other path under `~/.claude/plans/`.

> **Why this matters:** Desktop's native Plan pane only reads the session-bound path it created. Writing to a fixed `~/.claude/plans/ccc-<date>-<slug>.md` path produces a plan the pane cannot find — it shows "no plan yet" even after the skill runs.

## Step 1 — Mark chapter

Call `mcp__ccd_session__mark_chapter` with:
- `title`: `"Feature planning"`
- `summary`: one-line summary of what the user wants to plan (infer from any argument passed, or use "Structured feature plan" if unknown yet)

## Response shape (EVERY time, after steps 0-1)

Output exactly these three sections in order:

### 1. Brand header (one line, markdown)

```
**CC Commander** · v{VERSION} · Planner · spec-first, plan-before-code
```

Read `VERSION` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.

### 2. Context strip (one paragraph, markdown)

Detect planning context with a single parallel Bash call:
- `ls ~/.claude/plans/ 2>/dev/null | wc -l` → prior plans
- `git rev-parse --abbrev-ref HEAD 2>/dev/null` → current branch
- `ls tasks/todo.md 2>/dev/null` → active task list
- `git log --oneline -5 2>/dev/null` → recent activity

Render:

> 🧭 Planner: branch `<branch>` · `<N>` prior plans · tasks/todo.md: `<present|absent>` · last commit: `<age>`

If no project context: "🧭 No repo detected — planning will write to session plan path only."

### 3. The picker — `AskUserQuestion` with 4 paths

**Never render a numbered list. Never ask the user to type anything but free-form answers inside AskUserQuestion follow-ups.** Call `AskUserQuestion`:

```
question: "What kind of plan are we writing?"
header: "CC Commander planner"
multiSelect: false
options:
  - label: "💡 New feature from a description"
    description: "You describe the idea — we interview, then produce a full implementation plan."
    preview: "5 clarifying questions → planner agent → plan file. ~3-5 minutes."
  - label: "🐛 Plan a bug fix"
    description: "Bug-focused plan — reproduction, hypothesis, fix scope, regression tests, operationalization."
    preview: "Uses debugger + planner agents. Iron Law: no fix without root cause."
  - label: "♻️ Refactor existing code"
    description: "Refactor plan with before/after contracts, test-first safety net, incremental steps."
    preview: "Reads the code first, then plans. Safer for big changes."
  - label: "📌 Build from a Linear issue"
    description: "Pull a CC- issue — we turn the title + description into a scoped plan with acceptance criteria."
    preview: "Pulls via the linear MCP. Writes CC-<N> into the plan slug."
```

**Recommendation logic** (⭐):
- Argument is quoted text → treat as "New feature" description, skip picker, jump to interview
- Recent commits show test failures OR "fix:" / "bug:" prefix → ⭐ "Plan a bug fix"
- User came from `/ccc-review` with findings → ⭐ "Refactor existing code"
- Linear MCP connected + CC- branch prefix → ⭐ "Build from a Linear issue"
- Otherwise → ⭐ "New feature from a description"

## Handle the selection — spec interview cascade

Each path runs 3-5 `AskUserQuestion` calls in sequence, each with ≤4 options. User always has a free-form "Other — let me type it" option when the answer doesn't fit.

### New feature path (5 questions)

1. **"What's the user problem?"** — Saving time / Earning revenue / Removing friction / Other (type)
2. **"Who's the primary user?"** — Solo dev / Team of 2-10 / Enterprise / Public/consumer
3. **"What's the scope?"** — Prototype (1 day) / MVP (1 week) / Production (1 month) / Unsure
4. **"What does done look like?"** — Demo-able / First paying user / Tests green + deployed / Other
5. **"What's the biggest risk?"** — Tech unknowns / Scope creep / Integration pain / User adoption

### Bug fix path (4 questions)

1. **"Can you reproduce it?"** — Yes every time / Sometimes / Once / Not yet
2. **"Where does it manifest?"** — UI / API / Background job / Data layer
3. **"What's the blast radius?"** — Single user / Cohort / All users / Unknown
4. **"Root cause confidence?"** — Known / Strong hypothesis / Weak hypothesis / No idea

### Refactor path (4 questions)

1. **"What area are we refactoring?"** — One file / One module / Cross-cutting / Full app
2. **"Why now?"** — Performance / Maintainability / New requirement / Technical debt
3. **"Test coverage today?"** — >80% / 40-80% / <40% / Unknown
4. **"Backward compat required?"** — Full / Partial / Breaking OK / Internal only

### Linear issue path (3 questions)

1. **"Which issue?"** — cascade list from `mcp__linear__list_issues` (4 most recent open, plus "Other — paste ID")
2. **"Any new context since ticket was filed?"** — None / Yes (free form) / Skip
3. **"Scope change from the ticket?"** — Same scope / Narrower / Broader / Unclear

## After the interview — delegate to planner agent

Invoke the `planner` subagent via the Agent tool with:
- **model:** sonnet (fast, adequate for planning)
- **subagent_type:** general-purpose (or named `planner` if registered)
- **prompt:** Bundle the interview answers into a structured brief. Instruct the agent to:
  1. Read any relevant existing files (CLAUDE.md, package.json, relevant source)
  2. Produce a plan using the template below
  3. Write it to `PLAN_PATH` (the session-bound path from Step 0) — NOT to any fixed `ccc-<date>-<slug>.md` path
  4. First line of plan file must be the trace comment: `<!-- generated by /ccc-plan · <ISO timestamp> -->`
  5. Return ONLY: one-line summary

While the agent runs, show a progress note in the main thread: "🔄 planner agent drafting your plan — 30-60 seconds..."

## Plan file template (agent output format)

The planner agent writes markdown in this shape:

```markdown
<!-- generated by /ccc-plan · <ISO 8601 timestamp> -->
# <Feature title>

**Date:** <YYYY-MM-DD>
**Path:** <new | bug | refactor | linear>
**Branch:** <current branch or "none">
**Linear:** <CC-N or "none">

## Problem statement

<2-3 sentences, plain English.>

## Evals — what does done look like?

- [ ] <concrete verifiable criterion>
- [ ] <concrete verifiable criterion>
- [ ] <concrete verifiable criterion>

## Evals — what does broken look like?

- <failure mode 1>
- <failure mode 2>

## Plan

### Phase 1 — <name>
- [ ] <step> (est. <time>)
- [ ] <step> (est. <time>)

### Phase 2 — <name>
- [ ] <step>

### Phase 3 — <name>
- [ ] <step>

## Recommended agents

- **<agent>** — <why>
- **<agent>** — <why>

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| <risk> | H/M/L | <one-line> |

## Next command

```
/ccc-build <type>  # or /ccc-review or /ccc-ship
```

---

Generated by `/ccc-plan` — <timestamp>
```

## Mark chapter "Plan drafted"

After the planner agent returns, call `mcp__ccd_session__mark_chapter` with:
- `title`: `"Plan drafted — pending approval"`
- `summary`: the one-line summary returned by the planner agent

## Signal Desktop — ExitPlanMode

Call the `ExitPlanMode` tool. This signals Claude Code Desktop that the plan is ready for review. The native Plan pane then surfaces the plan and presents approve/modify/reject UI.

> **Why ExitPlanMode is required:** Writing the file alone is not enough. The Plan pane only activates after `ExitPlanMode` is called. Skipping this call means the user sees "no plan yet" even though the file was written correctly.

## Final response in the main thread

After ExitPlanMode returns:

```
✅ Plan written to the session plan path (visible in the Desktop Plan pane)
   <one-line summary from the agent>

The Plan pane is now active — approve, modify, or reject from there.
Next: `/ccc-build <type>` to start, or review the plan first.
```

Then offer one more `AskUserQuestion`:

```
- "🔨 Start building now (go to /ccc-build)"
- "👀 Show me the plan in chat"
- "📌 File this to Linear as a new issue"
- "↩️ Done for now"
```

## Optional — Save project-local copy

After ExitPlanMode, ask:

```
AskUserQuestion:
  question: "Save a copy to tasks/plans/<slug>.md for git tracking?"
  options:
    - label: "✅ Yes — save a project copy"
      description: "Copies the plan to tasks/plans/<slug>.md. Good for git history + team sharing."
    - label: "⏭️ No — session copy is enough"
      description: "Skip. The session plan path is already written."
```

If yes:
1. Derive `<slug>` as kebab-case summary of the feature (6-8 words max)
2. Run `mkdir -p tasks/plans/` via Bash
3. Copy `PLAN_PATH` → `tasks/plans/<slug>.md`
4. Confirm: "📄 Project copy saved to `tasks/plans/<slug>.md`"

This is a second artifact — not a replacement for `PLAN_PATH`. The Desktop Plan pane reads `PLAN_PATH`; the project copy is for git history and team sharing.

## TodoWrite — Phase 1 tasks

After the flow completes (with or without the optional copy), call `TodoWrite` with the Phase 1 tasks extracted from the plan. Mark them all as `pending`. This seeds the session todo list so the user can track progress immediately.

## Anti-patterns — DO NOT do these

- ❌ Dump a 500-line markdown spec in the chat — always write to file
- ❌ Render numbered lists of questions and ask user to type answers — always AskUserQuestion
- ❌ Output HTML artifacts expecting Cowork Desktop to render them
- ❌ Block on the planner agent — fire it and let the user see progress
- ❌ Write the plan in the foreground — delegate to subagent for clean context
- ❌ Skip the eval section — "what does done look like" is non-negotiable
- ❌ Reference legacy CLI planning — no `ccc --plan` or `ccc build --spec` commands
- ❌ Write plan to `~/.claude/plans/ccc-<date>-<slug>.md` (fixed name). Use the session-bound path from `EnterPlanMode` instead — Desktop's Plan pane only reads the path it created, not fixed filenames.
- ❌ Skip `ExitPlanMode`. Writing the file alone does NOT trigger the Plan pane. The tool call is required to signal Desktop that the plan is ready for review.

## Brand rules

- **Always read `VERSION` from plugin.json** — never hardcode.
- **Plan files always go to `PLAN_PATH`** (session-bound from EnterPlanMode) — never to a fixed `ccc-<date>` path.
- **Slug kebab-case, 6-8 words max** — for optional project-local copy only.
- **Every plan has evals section** — both success and failure criteria.
- **Emoji-forward, PM Consultant voice** — decision up front, reasoning terse.
- **Trace comment first line** — `<!-- generated by /ccc-plan · <ISO timestamp> -->` for auditability.

## Tips for the agent executing this skill

1. **Step 0 is non-negotiable** — always detect or enter plan mode before anything else. `PLAN_PATH` must be set before the planner agent runs.
2. The interview is 3-5 turns. Keep questions tight — the planner agent fills in detail.
3. Pass the full `PLAN_PATH` to the planner subagent in the prompt. The agent must write to that exact path, not construct its own.
4. If `EnterPlanMode` fails (tool not available in this context), fall back: write to `~/.claude/plans/ccc-$(date +%Y-%m-%d)-<slug>.md` and note in the response that the Desktop Plan pane may not detect it automatically.
5. If the Linear path is picked and MCP isn't connected, fall back: ask the user to paste the issue title + description free-form.
6. If the user passes a quoted idea as argument (e.g. `/ccc-plan "magic link auth"`), skip the picker AND question 1 — use that as the problem statement and start at question 2.
7. Pass `model: sonnet` to the Agent tool — opus is overkill for plan synthesis.
8. Always call `ExitPlanMode` after writing — even if the user dismisses early. The Plan pane only activates on the tool call.

---

**Bottom line:** detect/enter plan mode → mark chapter → 4-path picker → 3-5 cascading questions → planner agent writes plan to session path → mark chapter "drafted" → ExitPlanMode triggers Desktop Plan pane → optional project copy → TodoWrite phase 1 tasks. User never sees a wall of spec in chat; it's always an artifact surfaced in the native Plan pane.
