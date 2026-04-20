---
name: ccc-plan
description: "Feature planning flow for CC Commander. Runs a structured 3-5 question spec interview, then delegates to the planner agent in the background to write an implementation plan to ~/.claude/plans/. Use when the user types /ccc-plan, says 'plan this feature', 'write a spec', 'help me plan', 'break this down', or before starting any multi-day work."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[new | bug | refactor | linear | <idea in quotes>]"
---

# /ccc-plan — Feature Planning Flow

User has an idea. Job: turn it into a structured plan file before any code gets written. We cascade through a spec interview, then fire the `planner` agent in the background to produce `~/.claude/plans/ccc-<date>-<slug>.md`. Return a one-line summary + path.

This is the "evals before specs before code" gate. Every multi-day feature routes through here.

## Response shape (EVERY time)

Output exactly these three sections in order:

### 1. Brand header (one line, markdown)

```
**CC Commander** · v{VERSION} · Planner · spec-first, plan-before-code
```

Read `VERSION` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.

### 2. Context strip (one paragraph, markdown)

Detect planning context with a single parallel Bash call:
- `ls ~/.claude/plans/ccc-*.md 2>/dev/null | wc -l` → prior plans
- `git rev-parse --abbrev-ref HEAD 2>/dev/null` → current branch
- `ls tasks/todo.md 2>/dev/null` → active task list
- `git log --oneline -5 2>/dev/null` → recent activity

Render:

> 🧭 Planner: branch `<branch>` · `<N>` prior plans · tasks/todo.md: `<present|absent>` · last commit: `<age>`

If no project context: "🧭 No repo detected — planning will write to `~/.claude/plans/` only."

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
  3. Write it to `~/.claude/plans/ccc-$(date +%Y-%m-%d)-<slug>.md` where `<slug>` is a kebab-case summary of the feature (6-8 words max)
  4. Return ONLY: one-line summary + absolute path

While the agent runs, show a progress note in the main thread: "🔄 planner agent drafting your plan — 30-60 seconds..."

## Plan file template (agent output format)

The planner agent writes markdown in this shape:

```markdown
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

## Final response in the main thread

After the planner agent returns:

```
✅ Plan written: ~/.claude/plans/ccc-<date>-<slug>.md
   <one-line summary from the agent>

Next: `/ccc-build <type>` to start, or `Read` the plan to review first.
```

Then offer one more `AskUserQuestion`:

```
- "🔨 Open the plan and start building now"
- "👀 Show me the plan first"
- "📌 File this to Linear as a new issue"
- "↩️ Done for now"
```

## Anti-patterns — DO NOT do these

- ❌ Dump a 500-line markdown spec in the chat — always write to file
- ❌ Render numbered lists of questions and ask user to type answers — always AskUserQuestion
- ❌ Output HTML artifacts expecting Cowork Desktop to render them
- ❌ Block on the planner agent — fire it and let the user see progress
- ❌ Write the plan in the foreground — delegate to subagent for clean context
- ❌ Skip the eval section — "what does done look like" is non-negotiable
- ❌ Reference legacy CLI planning — no `ccc --plan` or `ccc build --spec` commands

## Brand rules

- **Always read `VERSION` from plugin.json** — never hardcode.
- **Plan files always go to `~/.claude/plans/`** — consistent discoverability.
- **Slug kebab-case, 6-8 words max** — readable filenames, no timestamps inside the slug.
- **Every plan has evals section** — both success and failure criteria.
- **Emoji-forward, PM Consultant voice** — decision up front, reasoning terse.

## Tips for the agent executing this skill

1. The interview is 3-5 turns. Keep questions tight — the planner agent fills in detail.
2. Always create `~/.claude/plans/` with `mkdir -p` before Write — it may not exist on fresh installs.
3. If the Linear path is picked and MCP isn't connected, fall back: ask the user to paste the issue title + description free-form.
4. If the user passes a quoted idea as argument (e.g. `/ccc-plan "magic link auth"`), skip the picker AND question 1 — use that as the problem statement and start at question 2.
5. Pass `model: sonnet` to the Agent tool — opus is overkill for plan synthesis.

---

**Bottom line:** 4-path picker → 3-5 cascading questions → planner agent writes plan file → one-line summary returned. User never sees a wall of spec in the chat; it's always an artifact they can open.
