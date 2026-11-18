---
name: ccc-build
description: "Build against the sprint contract or scaffold a new app; an independent verifier checks the acceptance criteria. Use to build or start a project."
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
argument-hint: "[contract | web-app | api | cli | mobile | spec | status | free-form idea]"
model: inherit
---

# /ccc-build — scaffold, verify, hand over

**CC Commander** · /ccc-build · build the sprint contract or scaffold from a template; nothing is called done until the `verifier` agent passes every acceptance criterion.

The lead session is the control plane: it interviews, dispatches and checks. An agent does the multi-file writing (`rules/workflow-first.md`), and a separate `verifier` agent with fresh context checks the result against the acceptance criteria (verifier ≠ worker). The user's selected model is preserved for the lead; the scaffold agent runs on `sonnet`, the builder and verifier on their own frontmatter tiers.

Plugin agents: when the Agent tool does not list `builder` or `verifier`, dispatch `general-purpose` and make its first instruction "Read `${CLAUDE_PLUGIN_ROOT}/agents/<agent>.md` and follow it." Scripts below use the plugin-root path; in a repo checkout use `commander/cowork-plugin/scripts/…`.

Codex: ask each picker as a plain-text question, run the scaffold inline or with `codex exec --json`, and skip session markers.

## When to use / when not to

- Use to implement an approved plan's sprint contract (`tasks/sprint-contract.md`, written by `/ccc-plan`), or for a new web app, API, CLI, or an idea that needs a spec before code.
- Use `/ccc-mobile` for mobile apps and `/ccc-plan` for a feature inside an existing codebase; this skill routes there.
- Use `/ccc-design` for a landing page or UI polish on an existing project.

## Arguments

| Invocation | Behavior |
|---|---|
| `/ccc-build` | Context strip; with an open or failed contract, the picker recommends building it |
| `/ccc-build contract` | Section C: build against `tasks/sprint-contract.md`, then verify |
| `/ccc-build web-app` / `api` / `cli` | Skip the picker, start at Q1 |
| `/ccc-build mobile` | Invoke the `ccc-mobile` skill; do not scaffold here |
| `/ccc-build spec` | Invoke the `ccc-plan` skill |
| `/ccc-build status` | Step 7 only |
| `/ccc-build <anything else>` | Treat the text as a free-form spec: echo it back, skip templates, start at Q1 |

## What happens

### 1. Context strip

Run in one Bash call, silent on failure:

```bash
git rev-parse --abbrev-ref HEAD 2>/dev/null
ls -1 | head -20
test -f package.json && head -20 package.json
test -f pnpm-lock.yaml && echo pnpm
node "${CLAUDE_PLUGIN_ROOT}/scripts/sprint-contract.mjs" status
```

Render one line:

> 🎯 Target: `<cwd basename>` · branch `<branch>` · <empty repo | Node project | Python project | other>

If the directory already holds a project, add: "I'll scaffold into a sub-directory so existing code is untouched." When the status JSON shows `"exists": true` and `status` is `open` or `failed`, add: `📝 Sprint contract: <title> · <criteria> criteria · <status>`.

### 2. Template picker

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-build.json` for the canonical labels and descriptions. Ask with AskUserQuestion (header "Build", question "What are we building?", single select). Offer four options, recommended first and marked 🟢:

- 🌐 Web app — Next.js + Tailwind + shadcn/ui; SSR, auth, Stripe-ready. For product sites, dashboards, SaaS frontends.
- 🔧 API / backend — TypeScript Fastify or Hono, Postgres via Supabase. For REST/GraphQL, webhooks, internal services.
- ⌨️ CLI tool — Node + commander, test scaffold, publish-ready. For dev tooling and scripts.
- 📝 From a spec — describe the idea in plain English; routes through `ccc-plan` first. When an open or failed sprint contract exists, show "🎯 Build the sprint contract — implement `tasks/sprint-contract.md`, then the verifier checks it" in this slot instead, as the 🟢 option.

Recommendation:

- Open or failed sprint contract → 🟢 Build the sprint contract (go to section C).
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

Write the scaffold's acceptance criteria to its own contract file (never over the active `tasks/sprint-contract.md`); add the tests criterion only when Q3 chose tests or production-ready:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/sprint-contract.mjs" new --out "tasks/contracts/scaffold-<slug>.md" --source scaffold \
  --title "<template> scaffold: <slug>" \
  --criterion "README install and build commands succeed :: cd <slug> && npm install && npm run build" \
  --criterion "Generated tests pass :: cd <slug> && npm test" \
  --criterion "Changes stay inside <slug>/ and tasks/ :: test -z \"\$(git status --porcelain | grep -vE ' (<slug>|tasks)/')\""
```

Use `pnpm` in those commands when the repo uses it. Then confirm with AskUserQuestion:

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
> 💡 You'll get the result here when the agent finishes, or run `/ccc-build status`.

Then show the recommended stack for the chosen template from [references/recommended-stack.md](references/recommended-stack.md), with its affiliate disclosure line.

### 6. Verify the scaffold (required before "Scaffold ready")

The agent's report is a claim. When it completes, the lead verifies independently:

1. `ls -R <slug> | head -100` — every path in `files_created` exists.
2. Run the README's install and build/start commands, for example `cd <slug> && npm install && npm run build`. Each must exit 0.
3. If Q3 chose tests or production-ready, run the generated test command (for example `cd <slug> && npm test`) and record pass/fail counts.
4. `git status --short` — changes are confined to `<slug>/` and `tasks/`.

5. Independent check: dispatch the `verifier` agent (Agent tool, foreground) with "Verify `tasks/contracts/scaffold-<slug>.md` in this checkout and return your JSON verdict." Pipe its JSON to `node "${CLAUDE_PLUGIN_ROOT}/scripts/sprint-contract.mjs" record - "tasks/contracts/scaffold-<slug>.md"`; exit 0 means PASS, exit 2 means FAIL.

All pass (steps 1–4 and the recorded verdict is PASS): mark chapter "Scaffold ready" ("<slug>/ scaffold complete — <N> files created, verified") and report the commands run with their results. Then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/activation.mjs" first-result ccc-build` (once-only record; sends `first_result` only when telemetry is opted in; do not mention its output).

Any failure: do not mark ready. Report the exact command and its output, then ask with AskUserQuestion:

- 🟢 Fix it — apply a targeted fix and re-run step 6
- Re-scaffold — dispatch step 4 again with the failure appended to the prompt
- Abandon — leave the files for inspection; nothing else changes

### C. Build against the sprint contract

1. **Read the contract.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/sprint-contract.mjs" validate`. With no contract (`"exists": false`), say "No sprint contract yet — `/ccc-plan` writes one from an approved plan." and invoke the `ccc-plan` skill only if the user agrees; never invent criteria here. With errors, report them and stop. With `status: verified` and `current: true` from `status`, say it is already verified at this commit and stop.
2. **Build.** Dispatch the `builder` agent (Agent tool, `effort: "high"`, `run_in_background: true` when the work is more than a few files) with: the contract path and its criteria, the plan path from the contract's `source`, "implement only what these criteria need; run each `check:` command yourself before returning; do not edit `tasks/sprint-contract.md`; return JSON `{ status, files_changed, checks_run, blockers }`." Mark chapter "Building sprint contract" when the tool exists.
3. **Verify, independently.** When the builder returns, its report is a claim. Dispatch the `verifier` agent (foreground, fresh context; never the builder and never the lead's own reading): "Verify `tasks/sprint-contract.md` in this checkout and return your JSON verdict." Then record it:

   ```bash
   cat <<'VERDICT' | node "${CLAUDE_PLUGIN_ROOT}/scripts/sprint-contract.mjs" record -
   <the verifier's JSON block>
   VERDICT
   ```

   The script recomputes the verdict from the per-criterion results (a missing or evidence-free criterion fails), updates `Status:`, ticks passed criteria and appends the evidence to the contract's verification log. Exit 0 = PASS, exit 2 = FAIL.
4. **Gate.** PASS: reply `✅ Sprint contract verified — <n>/<n> criteria pass (verifier, <head>)` with one line per criterion and its evidence, then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/activation.mjs" first-result ccc-build` (records the first finished result once; sends `first_result` only when telemetry is opted in; do not mention its output). FAIL: show each failing or unverified criterion with the verifier's evidence and ask with AskUserQuestion: 🟢 Fix and re-verify (send the failures back to the builder, then step 3 again) · Show the full verification log · Stop here. Allow at most two fix rounds; after that, stop and report what still fails.
5. **Hand-off.** On PASS, suggest `/ccc-review` for the diff and `/ccc-ship` (the user types it) for pre-flight.

### 7. Status

For `/ccc-build status`: read the newest `tasks/spec-*.md`, report whether its agent has returned, and if it has, whether step 6 ran and what it found. If step 6 has not run, run it now.

## Done when

- Contract path: `record` exited 0 (PASS) in this turn and the reply quotes each criterion's evidence; on FAIL the reply says not done and lists what failed.
- Scaffold path: `./<slug>/` exists, the README commands and (when chosen) the tests exited 0 in this turn, and `git status --short` shows changes only in `<slug>/` and `tasks/`.
- `tasks/spec-<YYYYMMDD>-<slug>.md` exists so `/ccc-review` and `/ccc-ship` can find the spec.

## Guardrails

- Never scaffold into the repo root when it is non-empty; always a sub-directory.
- Never run the scaffold inline in the lead session when the Agent tool is available; the user should not wait.
- Never emit "Scaffold ready", "done" or "verified" from a builder's self-report or the lead's own reading; only a recorded verifier PASS counts.
- Never edit the acceptance criteria to make a failing check pass; change the code, or send the user to `/ccc-plan` to revise the contract.
- Never publish packages, push, or deploy from this skill; `/ccc-ship` and `/ccc-deploy` own those and ask first.
- Never render the templates or questions as a typed list; use pickers with at most four options.

## See also

- `/ccc-plan` — spec and plan for work that does not fit a template
- `/ccc-mobile` — mobile apps
- `/ccc-design` — landing pages and UI polish
- `/ccc-ship` — release the verified result

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
