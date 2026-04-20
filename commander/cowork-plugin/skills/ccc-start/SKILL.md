---
name: ccc-start
description: "First-run onboarding for CC Commander. Detects setup, introduces the 15 specialist agent personas, and drafts a personalized start plan. Use when the user types /ccc-start, just installed the plugin, says 'welcome me', 'onboard me', 'I just installed', 'first time', or wants a guided tour."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[new | existing | tour | skip]"
---

# /ccc-start — First-Run Onboarding

This is the welcome mat. User installed CC Commander, and the Desktop app routed them here. Goal: make them feel oriented in under 90 seconds, give them a real artifact (a plan file) to anchor the next session, and never force them to type a number.

## Response shape (EVERY time)

Output exactly these three sections in order:

### 1. Brand header (one line, markdown)

```
**CC Commander** · v{VERSION} · Welcome aboard · 15 agents · 27 skills · 5 MCPs
```

Read `VERSION` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` in a single Read call.

### 2. Context strip (one paragraph, markdown)

Detect setup with **three parallel checks** (one Bash call, chained with `&&`, silent on failure):
- `ls ~/.claude/plugins/*/plugin.json 2>/dev/null | wc -l` → other plugins installed
- `ls ~/.claude/plans/ 2>/dev/null | wc -l` → prior plans
- `git rev-parse --show-toplevel 2>/dev/null` → inside a repo?

Render a one-line summary:

> 🧭 Setup: `<N>` plugins installed · `<M>` existing plans · repo: `<name or "none">` · agents available: 15 · MCPs: 5

If first-time (no plugins, no plans, no repo): "🧭 Fresh install — let's set you up in under 2 minutes."

### 3. The picker — `AskUserQuestion` with 4 intents

**Never render a numbered list. Never tell the user to type a number.** Call `AskUserQuestion` with exactly these four options. Prepend ⭐ to the recommended one based on context (logic below).

```
question: "How do you want to start?"
header: "CC Commander onboarding"
multiSelect: false
options:
  - label: "🚀 Set up a new project"
    description: "Blank canvas — we scaffold a web app, API, CLI, or mobile app and write the first plan file together."
    preview: "Routes to /ccc-build after a 3-question spec interview. ~90 seconds."
  - label: "📦 Import existing project"
    description: "Point us at your repo — we scan, write CLAUDE.md, and recommend the right agents for your stack."
    preview: "Runs stack detection + writes a personalized plan to ~/.claude/plans/."
  - label: "🗺️ Just show me around"
    description: "Quick tour of the 15 agent personas, 27 skills, and 5 MCP servers. No commitment."
    preview: "Routes to /ccc-browse — browse agents and skills by category."
  - label: "⏭️ Skip — I know what I'm doing"
    description: "Drop me at the main /ccc hub. No onboarding."
    preview: "Jumps straight to the top-level picker."
```

**Recommendation logic** (⭐ on ONE option):
- Inside a git repo with code files but no `CLAUDE.md` → ⭐ "Import existing project"
- Fresh install, no repo detected → ⭐ "Set up a new project"
- Repo exists AND has CLAUDE.md → ⭐ "Just show me around"
- Argument `skip` passed → skip the picker, route straight to `/ccc`

## Handle the selection

### New project → spec interview → plan file

Cascade via `AskUserQuestion` (3 quick questions, ≤4 options each):

1. "What are you building?" → Web app / API / CLI / Mobile
2. "Who's the audience?" → Solo/team / SMB / Enterprise / Public
3. "What's the first milestone?" → MVP demo / First paying user / Open-source launch / Internal tool

Then write `~/.claude/plans/ccc-start-$(date +%Y-%m-%d).md` containing:
- Project type, audience, milestone
- 3 recommended agents from the 15 available (see matrix below)
- Next 3 concrete steps
- The `/ccc-build-<type>` command to run next

Finally: invoke `ccc-build` skill to scaffold.

### Import existing → scan + plan

Parallel Bash scan:
- `ls package.json pyproject.toml Cargo.toml go.mod 2>/dev/null` → stack
- `git log --oneline | head -5` → activity signal
- `grep -l "CLAUDE.md" . 2>/dev/null` → already configured?

Then invoke the `architect` agent via Agent tool with brief: "Scan this repo, detect the stack, recommend 3 CC Commander agents, write a CLAUDE.md if missing. Output a plan to `~/.claude/plans/ccc-start-$(date +%Y-%m-%d).md`."

Return: one-line summary + path to the plan.

### Show around → browse

Invoke `ccc-browse` skill inline. User picks a category, we cascade.

### Skip → main hub

Invoke `ccc` skill inline. No wrapping text — the next picker does the work.

## The 15 agents (for reference when recommending)

Read `${CLAUDE_PLUGIN_ROOT}/agents/` if you need the live frontmatter. Baseline matrix:

| Persona | Best for |
|---------|---------|
| 🏗️ architect | System design, tech selection, refactoring strategy |
| 🔨 builder | TDD implementation, feature work, bug fixes |
| 🐛 debugger | Root-cause investigation, Iron Law enforced |
| 🔍 reviewer | PR review, severity-rated findings |
| 🧪 qa-engineer | Test suites, coverage, edge cases |
| 🔐 security-auditor | OWASP audits, CVE mapping, remediation |
| ⚡ performance-engineer | Hot-path profiling, N+1, bundle size |
| 🎨 designer | UI/UX, frontend implementation, anti-slop |
| 🚀 devops-engineer | CI/CD, deploys, infra, monitoring |
| 🎯 product-manager | PRDs, user stories, Linear issues |
| 📝 technical-writer | Docs, READMEs, API reference |
| 🔬 researcher | Competitive, market, lit review |
| 📊 data-analyst | Cohort analysis, insights, viz specs |
| ✍️ content-strategist | Editorial calendars, content pillars |
| ⚙️ fleet-worker | Parallel batch work (migrations, sweeps) |

Pick **3** based on context signal (e.g. Next.js repo → designer + builder + qa-engineer).

## Anti-patterns — DO NOT do these

- ❌ Render a numbered list "1. New project, 2. Existing, ..." — always use AskUserQuestion
- ❌ Dump HTML fenced blocks expecting artifact rendering — Cowork Desktop shows them as code
- ❌ Run ASCII banners or box-drawing welcome art
- ❌ Tell the user to "type the number" — pickers only
- ❌ Reference the legacy CLI (`ccc` npm binary) — this is the Desktop plugin audience
- ❌ Hardcode VERSION — always read from plugin.json

## Brand rules

- **Always read `VERSION` from plugin.json** — the marketplace sometimes caches; if plugin.json has `v4.0.0-beta.6` and GitHub has newer, surface that in the context strip.
- **Emoji-forward, concise** — PM Consultant voice, decision up front.
- **The plan file is the artifact** — every onboarding flow ends with a real file the user can open.
- **Never mention legacy CLI modes** — `ccc --interactive`, `ccc --split`, etc. are out of scope here.

## Plan file template

When writing `~/.claude/plans/ccc-start-<date>.md`:

```markdown
# CC Commander Start Plan — <date>

**User path:** <new | existing | tour | skip>
**Project:** <name or "unnamed">
**Stack detected:** <list or "none">
**Recommended agents:** <3 agents with one-line why each>

## Next 3 steps

1. [ ] <concrete action with /ccc-<command>>
2. [ ] <concrete action>
3. [ ] <concrete action>

## Quick links

- `/ccc` — main hub
- `/ccc-browse` — browse all skills + agents
- `/ccc-plan` — write a feature plan
- [CC Commander docs](https://cc-commander.com)

---

Written by `/ccc-start` on <timestamp>.
```

## Tips for the agent executing this skill

1. Whole flow is ≤6 turns: header+context+picker → user clicks → cascade questions → write plan → dispatch. Don't overthink.
2. If the user passes `skip` as argument, bypass the picker entirely and invoke `ccc`.
3. If the user passes `new` / `existing` / `tour`, skip the picker and route to the matching branch.
4. Parallelize all Bash context detection into a single call — saves ~3 turns.
5. If `~/.claude/plans/` doesn't exist, create it with `mkdir -p` before Write.

---

**Bottom line:** header → context → 4-option picker → cascade → plan file. The plan file is proof the onboarding landed. User never types a number.
