---
name: ccc-build
description: "CC Commander — scaffold a project or feature with a guided spec interview. Routes into web app, API, CLI, or mobile templates; cascades into a 3-question spec flow; spawns a background Sonnet agent to scaffold. Use when the user types /ccc-build, /ccc build, picks 'Build' from the /ccc hub, or says 'scaffold', 'start a project', 'new app', 'create a CLI'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - TodoWrite
  - mcp__ccd_session__mark_chapter
argument-hint: "[template: web-app | api | cli | mobile | spec]"
---

# /ccc-build — Scaffold a project

Click-first build flow. Four templates, one spec interview, one background agent. User clicks a tile, answers 3 questions, walks away — the scaffold lands in their worktree while they wait.

## Response shape (EVERY time)

Output exactly these three sections in order:

### 1. Brand header (one line, markdown)

```
**CC Commander** · /ccc-build · Scaffold a project or feature
```

### 2. Context strip (one paragraph)

Detect target location with **three quick reads** (parallel Bash, silent on failure):
- `git rev-parse --abbrev-ref HEAD` → branch
- `ls -1 | head -20` → repo inventory (empty repo? existing project?)
- `test -f package.json && cat package.json | head -5` → detect existing stack

Render one line:
> 🧭 Target: `<cwd basename>` · branch: `<branch>` · <empty repo | Node project | Python project | other>

If an existing project is detected, add a gentle note: "I'll scaffold into a sub-directory so I don't clobber your current code."

### 3. The picker — `AskUserQuestion` with 4 templates

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-build.json` for canonical option data. Surface exactly 4 of the 5 non-back choices (drop "mobile" if the user's stack is backend-only; otherwise keep web-app / api / cli / mobile).

```
question: "What are we building?"
header: "CC Commander Build"
multiSelect: false
options:
  - label: "🌐 Web app"
    description: "Next.js + Tailwind + shadcn/ui — SSR, auth, Stripe-ready."
    preview: "Best for: product sites, dashboards, SaaS frontends. 3-question spec → 2-4 min scaffold."
  - label: "🔌 API / backend"
    description: "TypeScript Fastify or Hono, Postgres via Supabase, zero-boilerplate."
    preview: "Best for: REST or GraphQL backends, webhook handlers, internal services."
  - label: "⌨️ CLI tool"
    description: "Node + commander, figlet banner, test scaffold, publish-ready."
    preview: "Best for: dev tooling, scripts, publish-to-npm utilities."
  - label: "📝 From a spec"
    description: "Describe the idea in plain English — spec interview → plan → build."
    preview: "Best for: anything that doesn't fit a template. Routes through ccc-plan first."
```

**Recommendation logic** (prepend ⭐ to ONE label):
- Empty repo → ⭐ "Web app" (most common first-project)
- Existing Next.js / React → ⭐ "From a spec" (additive, not scaffold)
- `package.json` with `type: module` + no framework → ⭐ "CLI tool"

## Step 2 — Spec interview (after template pick)

Reuse the pattern from `skills/build/SKILL.md` — **3 questions, one at a time**, via separate `AskUserQuestion` calls. Do NOT batch them; each answer informs the next preview text.

**Q1 — Outcome goal:**
- A: "Works end-to-end — click-through demo"
- B: "Solid foundation — architecture first, features later"
- C: "Quick prototype — prove the concept"

**Q2 — Tech preferences:**
- A: "Pick what's best for the job"
- B: "Popular/mainstream stack"
- C: "Keep it simple — minimal deps"

**Q3 — Thoroughness:**
- A: "Just the basics"
- B: "Include tests (unit + integration)"
- C: "Production-ready (errors, logging, CI, docs)"

After Q3, print a one-paragraph spec back to the user for confirmation:

> 🧭 **Spec:** `<template>` using `<stack from Q2>`, thoroughness `<Q3>`. Target outcome: `<Q1>`. **Reply 'go' to scaffold, or edit the spec first.**

## Session markers

Call `mcp__ccd_session__mark_chapter` at these phase transitions:

| Trigger | title | summary |
|---------|-------|---------|
| After user confirms spec (before dispatching agent) | `"Spec drafted"` | `"<template> spec confirmed — scaffolding queued"` |
| Immediately after `Agent` tool call fires (background dispatch) | `"Scaffold generating"` | `"Sonnet agent scaffolding <template> in background"` |
| When agent reports completion (or user returns with status) | `"Scaffold ready"` | `"<slug>/ scaffold complete — <file-count> files created"` |

No `spawn_task` chips for build — scaffold blockers are reported in the agent's structured return and surfaced inline.

## Step 3 — Dispatch background agent

On user 'go', invoke the `Agent` tool with:

- `subagent_type: general-purpose`
- `model: sonnet`
- `run_in_background: true`
- `description: "Scaffold <template> project per spec"`
- `prompt:` the full confirmed spec + explicit instructions:
  - Use `pnpm` if repo root has `pnpm-lock.yaml`, else `npm`
  - Scaffold into `./<slug>/` sub-directory (never clobber existing files)
  - Write a `README.md` with 3 run commands
  - Create `tasks/spec-<YYYYMMDD>-<slug>.md` capturing the spec + agent run ID
  - Return a structured report: `{ status, files_created, next_commands, blockers }`

## Step 4 — Return progress card to user

After the background agent is dispatched, emit ONE short card:

> 🚀 **Scaffolding in background** — agent ID `<id>`, ETA ~2–4 min.
> 📂 Output will land in `./<slug>/`. Spec saved to `tasks/spec-<YYYYMMDD>-<slug>.md`.
> 💡 Come back with `/ccc-build status` or just open the folder. I'll ping when done.

## Anti-patterns — DO NOT do these

- ❌ Render a numbered list "1. Web app, 2. API, ..." — always `AskUserQuestion`
- ❌ Batch all 3 spec questions into one AUQ — one at a time, preview text compounds
- ❌ Block the UI by running the scaffold inline — ALWAYS `run_in_background: true`
- ❌ Scaffold into the CWD root if the repo is non-empty — always a sub-directory
- ❌ Offer more than 4 templates in the root picker — AUQ max is 4
- ❌ Forget to write the spec file — every scaffold gets a spec artifact

## Argument handling

- `/ccc-build` → root picker + full flow
- `/ccc-build web-app` → skip picker, jump to Q1 of spec interview
- `/ccc-build api` → same, for API
- `/ccc-build cli` → same, for CLI
- `/ccc-build mobile` → route to `ccc-mobile` skill, don't try to scaffold here
- `/ccc-build spec` → route to `ccc-plan` skill
- `/ccc-build <anything else>` → treat as a free-form spec; skip templates, jump to Q1 with the arg echoed back

## Brand rules

- Emoji-forward, concise — PM Consultant voice
- Spec confirmation uses 🧭, dispatch uses 🚀, blockers use ⚠️
- Never mention the CLI — this is the Desktop-plugin flow
- Always write `tasks/spec-<YYYYMMDD>-<slug>.md` so Review / Ship can find it later

---

**Bottom line:** four tiles → three questions → one background agent → one progress card. User never waits. Never types a number.
