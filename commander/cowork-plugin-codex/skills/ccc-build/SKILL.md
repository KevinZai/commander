---
name: ccc-build
description: "Scaffold a new web app, API or CLI from a three-question spec interview, built by a background agent and verified before it is called ready. Use when the user wants to build something new, start a project, create an app, or types $ccc-build."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - Skill
  - AskUserQuestion
  - mcp__ccd_session__mark_chapter
argument-hint: "[web-app | api | cli | mobile | spec | status | free-form idea]"
model: inherit
effort: medium
---

# $ccc-build — scaffold, verify, hand over

**CC Commander** · $ccc-build · a template pick, three spec questions, a background scaffold and a lead-verified result.

The lead session is the control plane: it interviews, dispatches and verifies. A background agent does the multi-file writing (`rules/workflow-first.md`). The user's selected model is preserved for the lead; only the scaffold agent is routed to `sonnet`.

Codex: ask each picker as a plain-text question, run the scaffold inline or with `codex exec --json`, and skip session markers.

## When to use / when not to

- Use for a new web app, API, CLI, or an idea that needs a spec before code.
- Use `$ccc-mobile` for mobile apps and `$ccc-plan` for a feature inside an existing codebase; this skill routes there.
- Use `$ccc-design` for a landing page or UI polish on an existing project.

## Arguments

| Invocation | Behavior |
|---|---|
| `$ccc-build` | Context strip, template picker, full flow |
| `$ccc-build web-app` / `api` / `cli` | Skip the picker, start at Q1 |
| `$ccc-build mobile` | Invoke the `ccc-mobile` skill; do not scaffold here |
| `$ccc-build spec` | Invoke the `ccc-plan` skill |
| `$ccc-build status` | Step 7 only |
| `$ccc-build <anything else>` | Treat the text as a free-form spec: echo it back, skip templates, start at Q1 |

## What happens

### 1. Context strip

Run in one Bash call, silent on failure:

```bash
git rev-parse --abbrev-ref HEAD 2>/dev/null
ls -1 | head -20
test -f package.json && head -20 package.json
test -f pnpm-lock.yaml && echo pnpm
```

Render one line:

> 🎯 Target: `<cwd basename>` · branch `<branch>` · <empty repo | Node project | Python project | other>

If the directory already holds a project, add: "I'll scaffold into a sub-directory so existing code is untouched."

### 2. Template picker

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-build.json` for the canonical labels and descriptions. Ask with AskUserQuestion (header "CC Commander Build", question "What are we building?", single select). Offer four options, recommended first and marked 🟢:

- 🌐 Web app — Next.js + Tailwind + shadcn/ui; SSR, auth, Stripe-ready. For product sites, dashboards, SaaS frontends.
- 🔧 API / backend — TypeScript Fastify or Hono, Postgres via Supabase. For REST/GraphQL, webhooks, internal services.
- ⌨️ CLI tool — Node + commander, test scaffold, publish-ready. For dev tooling and scripts.
- 📝 From a spec — describe the idea in plain English; routes through `ccc-plan` first.

Recommendation:

- Empty repo → 🟢 Web app.
- Existing Next.js or React project → 🟢 From a spec (additive work, not a scaffold).
- `package.json` with `"type": "module"` and no framework → 🟢 CLI tool.
- Otherwise → 🟢 Web app.

A mobile request typed into the free-text answer routes to `ccc-mobile`. "From a spec" routes to `ccc-plan`.

### 3. Spec interview

Ask three questions, one AskUserQuestion call each, so each answer shapes the next description. Never batch them.

- Q1 Outcome: 🟢 Works end-to-end (click-through demo) · Solid foundation (architecture first) · Quick prototype (prove the concept).
- Q2 Stack: 🟢 Pick what's best for the job · Popular/mainstream stack · Keep it simple (minimal dependencies).
- Q3 Thoroughness: 🟢 Include tests (unit + integration) · Just the basics · Production-ready (errors, logging, CI, docs).

Derive `<slug>` from the template and Q1 (kebab-case, unique in the cwd). Print the spec back:

> 📝 Spec: `<template>` using `<stack from Q2>`, thoroughness `<Q3>`, outcome `<Q1>`, output `./<slug>/`.

Then confirm with AskUserQuestion:

- 🟢 Scaffold it — dispatch the background agent now
- Edit the spec — re-ask the question the user names
- Cancel — nothing is written

### 4. Dispatch the background agent

On "Scaffold it", call `mcp__ccd_session__mark_chapter` (title "Spec drafted", summary "<template> spec confirmed — scaffolding queued") when the tool is available, then call the Agent tool:

- `subagent_type: general-purpose`
- `model: sonnet`, `effort: medium`
- `run_in_background: true`
- `description: "Scaffold <template> project per spec"`
- `prompt`: the confirmed spec plus these instructions:
  - Use `pnpm` if the repo root has `pnpm-lock.yaml`, else `npm`.
  - Write only inside `./<slug>/`; never modify files outside it.
  - Write `<slug>/README.md` with the install, run and test commands.
  - Write `tasks/spec-<YYYYMMDD>-<slug>.md` with the spec and the agent id.
  - Return JSON: `{ "status", "files_created", "next_commands", "blockers" }`.

Right after the call returns, mark chapter "Scaffold generating" ("Sonnet agent scaffolding <template> in background").

### 5. Progress card

Emit one short card:

> 🚀 Scaffolding in background — agent `<id>`.
> 📦 Output: `./<slug>/` · spec: `tasks/spec-<YYYYMMDD>-<slug>.md`.
> 💡 You'll get the result here when the agent finishes, or run `$ccc-build status`.

Then show the recommended stack for the chosen template from [references/recommended-stack.md](references/recommended-stack.md), with its affiliate disclosure line.

### 6. Verify the scaffold (required before "Scaffold ready")

The agent's report is a claim. When it completes, the lead verifies independently:

1. `ls -R <slug> | head -100` — every path in `files_created` exists.
2. Run the README's install and build/start commands, for example `cd <slug> && npm install && npm run build`. Each must exit 0.
3. If Q3 chose tests or production-ready, run the generated test command (for example `cd <slug> && npm test`) and record pass/fail counts.
4. `git status --short` — changes are confined to `<slug>/` and `tasks/`.

All pass: mark chapter "Scaffold ready" ("<slug>/ scaffold complete — <N> files created, verified") and report the commands run with their results.

Any failure: do not mark ready. Report the exact command and its output, then ask with AskUserQuestion:

- 🟢 Fix it — apply a targeted fix and re-run step 6
- Re-scaffold — dispatch step 4 again with the failure appended to the prompt
- Abandon — leave the files for inspection; nothing else changes

### 7. Status

For `$ccc-build status`: read the newest `tasks/spec-*.md`, report whether its agent has returned, and if it has, whether step 6 ran and what it found. If step 6 has not run, run it now.

## Done when

- `./<slug>/` exists, the README commands and (when chosen) the tests exited 0 in this turn, and `git status --short` shows changes only in `<slug>/` and `tasks/`.
- `tasks/spec-<YYYYMMDD>-<slug>.md` exists so `$ccc-review` and `$ccc-ship` can find the spec.

## Guardrails

- Never scaffold into the repo root when it is non-empty; always a sub-directory.
- Never run the scaffold inline in the lead session when the Agent tool is available; the user should not wait.
- Never emit "Scaffold ready" from the agent's self-report alone.
- Never publish packages, push, or deploy from this skill; `$ccc-ship` and `$ccc-deploy` own those and ask first.
- Never render the templates or questions as a typed list; use pickers with at most four options.

## See also

- `$ccc-plan` — spec and plan for work that does not fit a template
- `$ccc-mobile` — mobile apps
- `$ccc-design` — landing pages and UI polish
- `$ccc-ship` — release the verified result

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
