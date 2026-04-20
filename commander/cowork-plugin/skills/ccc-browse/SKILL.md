---
name: ccc-browse
description: "Visual, filterable catalog of every CC Commander skill, agent, and command. Cascades from broad category picker into 4-at-a-time detail cards. Use when the user types /ccc-browse, says 'show me all the skills', 'what can CC do', 'list agents', 'skill catalog', or wants to browse before committing."
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[domains | workflows | agents | all]"
---

# /ccc-browse — Skill + Agent Catalog

A click-first browser for the entire CC Commander surface: 11 CCC domains, 9 workflow skills, 15 specialist agents, plus meta skills. User never scrolls a wall of markdown — we cascade through `AskUserQuestion` 4-at-a-time.

## Response shape (EVERY time)

Output exactly these three sections in order:

### 1. Brand header (one line, markdown)

```
**CC Commander** · v{VERSION} · Browser · 27 skills · 15 agents · 11 domains
```

Read `VERSION` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.

### 2. Context strip (one paragraph, markdown)

Count categories live with a single Bash call:
- `ls ${CLAUDE_PLUGIN_ROOT}/skills/ | wc -l` → total skills
- `ls ${CLAUDE_PLUGIN_ROOT}/agents/*.md | wc -l` → agents
- `ls ${CLAUDE_PLUGIN_ROOT}/skills/ccc-* -d 2>/dev/null | wc -l` → ccc-* skills

Render:

> 🧭 Catalog: `<N>` skills · `<M>` agents · `<K>` CCC domains · filter by category below.

### 3. The picker — `AskUserQuestion` with 4 categories

**Never dump a numbered list. Never ask the user to type a name.** Call `AskUserQuestion`:

```
question: "What do you want to browse?"
header: "CC Commander catalog"
multiSelect: false
options:
  - label: "🎯 Domains (11)"
    description: "MEGA skills — design, marketing, saas, devops, seo, testing, security, data, research, mobile, makeover."
    preview: "Each domain bundles 8-45 sub-skills behind one entry point. Pick one to drill in."
  - label: "🛠️ Workflows (9)"
    description: "Step-by-step skills — plan, build, review, ship, start, learn, xray, linear, fleet."
    preview: "These are the click-first workflows you'll use 80% of the time."
  - label: "🤖 Agents (15)"
    description: "Specialist personas — architect, builder, debugger, reviewer, qa, security, designer, devops, pm, writer, researcher, data, content, perf, fleet."
    preview: "Each agent has a persona voice. Delegate to one from any /ccc flow."
  - label: "🗺️ Show everything as grid"
    description: "One-shot overview — sorted table of all skills + agents with one-line descriptions."
    preview: "No cascading. Dump once and let the user scan. Use when they're window-shopping."
```

Recommendation (⭐):
- First-time browser (no prior `/ccc-browse` use in session) → ⭐ "Workflows (9)" — most actionable
- User came from `/ccc-start` → ⭐ "Domains (11)"
- Argument `all` passed → skip picker, go straight to grid

## Handle the selection

### Domains (11) → cascade

Read `${CLAUDE_PLUGIN_ROOT}/skills/` glob for `ccc-<name>` directories excluding meta (`ccc`, `ccc-start`, `ccc-browse`, `ccc-plan`, etc.).

First `AskUserQuestion` (4 of 11):
```
- 🎨 ccc-design · 39 sub-skills · UI/UX, animation, a11y
- 📢 ccc-marketing · 46 sub-skills · CRO, content, SEO, growth
- 💼 ccc-saas · 21 sub-skills · auth, billing, multi-tenant
- ⋯ Next 4 domains
```

Second `AskUserQuestion` (4 of 11):
```
- 🚀 ccc-devops · 21 sub-skills · CI/CD, deploys, infra
- 🔎 ccc-seo · 20 sub-skills · technical + AI search
- 🧪 ccc-testing · 15 sub-skills · TDD, E2E, coverage
- ⋯ Next 3 domains
```

Third `AskUserQuestion` (3 of 11 + back):
```
- 🔐 ccc-security · 8 sub-skills · OWASP, secrets, CVE
- 📊 ccc-data · 8 sub-skills · SQL, ETL, viz
- 🔬 ccc-research · 8 sub-skills · competitive, lit review
- ↩️ Back to categories
```

(One more pass for ccc-mobile + ccc-makeover.)

On pick → invoke that domain's skill (e.g. `ccc-design`) which runs its own sub-picker.

### Workflows (9) → cascade

Workflows = the click-first skills. Cascade 4-at-a-time:

First picker:
```
- 🚀 /ccc-start · first-run onboarding
- 📋 /ccc-plan · feature planning flow
- 🔨 /ccc-build · scaffold web/API/CLI/mobile
- 🔍 /ccc-review · audit diff/security/perf
```

Second picker:
```
- 🚢 /ccc-ship · deploy + PR workflow
- 🎓 /ccc-learn · extract patterns from session
- 🩻 /ccc-xray · full project health scorecard
- 📌 /ccc-linear · Linear issue board
```

Third picker:
```
- ⚙️ /ccc-fleet · parallel agent batch work
- ↩️ Back to categories
```

On pick → invoke the skill inline.

### Agents (15) → cascade

Read `${CLAUDE_PLUGIN_ROOT}/agents/*.md` frontmatter. Cascade 4-at-a-time across 4 pickers:

Pass 1: architect, builder, debugger, reviewer
Pass 2: qa-engineer, security-auditor, performance-engineer, designer
Pass 3: devops-engineer, product-manager, technical-writer, researcher
Pass 4: data-analyst, content-strategist, fleet-worker, ↩️ Back

Each option:
- `label: "<emoji> <name>"`
- `description: "<first sentence of agent's frontmatter description>"`
- `preview: "Best for: <one-line use case>. Model: <opus|sonnet>. Trigger: /ccc-<flow>."`

On pick → offer two actions via second `AskUserQuestion`:
```
- "Delegate a task to <agent> now" → prompts for task, calls Agent tool
- "Show me the full persona definition" → Read the .md file, render it
- "Which flows use this agent?" → Grep for the agent name in skills/
- "↩️ Back"
```

### Show everything as grid → one-shot dump

Render a single markdown table, sorted alphabetically:

```markdown
| Type | Name | One-liner |
|------|------|-----------|
| 🤖 agent | architect | System design, trade-offs, tech selection |
| 🎯 domain | ccc-design | 39 skills — UI/UX, animation, a11y |
| 🛠️ workflow | ccc-build | Scaffold web/API/CLI/mobile from spec |
| ... | ... | ... |
```

After the grid, one `AskUserQuestion` with 4 follow-ups: "Launch one" / "Filter by keyword" / "Browse categories instead" / "Done".

## Anti-patterns — DO NOT do these

- ❌ Render a single markdown list with 30+ rows and ask the user to type a name
- ❌ Dump raw HTML in code blocks expecting artifact rendering
- ❌ Output ASCII banners or box-drawing tables for the catalog
- ❌ Put more than 4 options in a single `AskUserQuestion` — max 4, always include a "Back" option on cascades
- ❌ Read every agent .md eagerly up front — read on demand only
- ❌ Reference legacy CLI browse commands — this is Desktop-plugin only

## Brand rules

- **Always read `VERSION` from plugin.json** — never hardcode.
- **One-line descriptions only** in picker options — detail goes in the `preview` field.
- **Back option on every cascade past level 1** — lets users un-dive without restarting.
- **Counts always live** — read from filesystem, never hardcode "39 sub-skills" if the count can shift.

## Dispatch after selection

After a user picks any skill or agent, the handler:
1. Reads the SKILL.md (or agent .md) frontmatter
2. Echoes one paragraph of what's about to happen
3. Invokes the skill/agent inline

Never require the user to leave `/ccc-browse` and type another slash command. We stay in-flow.

## Tips for the agent executing this skill

1. Parallel the three count Bash calls into one. Saves a turn.
2. When cascading, maintain a simple state in your responses: "Page 1 of 3 · 4 of 11 shown".
3. If `argument-hint` is `domains`, `workflows`, `agents`, or `all`, skip the root picker and jump to that path.
4. Agent descriptions are in `${CLAUDE_PLUGIN_ROOT}/agents/*.md` frontmatter — read the whole file only on user drill-in.

---

**Bottom line:** four top-level categories → cascaded 4-at-a-time pickers → user drills in → we dispatch to the target skill. No scrolling, no typing, no numbered lists.
