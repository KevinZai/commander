---
name: ccc-orchestrate
description: "Cross-runtime Orchestrator/Executor — Fable/Opus writes a goal file, GPT-5.6 Sol (codex) or a Sonnet subagent executes it, Fable/Opus verifies against acceptance criteria before reporting done."
allowed-tools:
  - Read
  - Bash
  - Write
  - Workflow
  - AskUserQuestion
---

# $ccc-orchestrate — Cross-Runtime Orchestrator/Executor

Orchestrate splits work across **two different model runtimes**, not just two tiers of the same one. A capable model (**Fable 5** or **Opus 4.8** — the calling session, i.e. "you") compresses a fuzzy request into a tight, testable **goal file**. Execution then happens **outside this runtime entirely** — on **GPT-5.6 Sol via the `codex` CLI**, or on a **Sonnet subagent** if codex isn't available. The orchestrator never writes production code itself.

**CC Commander** · Cross-Runtime Orchestrate · [Docs](https://commanderplugin.com)

> This is `$ccc-plan-exec` generalized past Claude-only: instead of plan (cheap Claude) → execute (capable Claude), it's plan (Fable/Opus) → execute (a *different runtime* — GPT-5.6 or Sonnet). The goal file is the interface between the two systems, so it has to have real teeth.

---

## Why cross-runtime

Fable/Opus is expensive per token but excellent at compressing a fuzzy request into a tight, unambiguous spec. GPT-5.6 Sol at high/xhigh reasoning is a strong, comparatively cheaper implementer for well-specified work. The split only pays for itself if the goal file is genuinely load-bearing — vague or hand-wavy acceptance criteria collapse the whole advantage, because the orchestrator ends up re-explaining the task on every re-dispatch anyway. Write the goal file as if the executor has zero conversational context, because on the codex path it does.

**Model guidance (GPT-5.6 family, `commander/adapters/codex/models.js`):** default the executor to **Sol** for real implementation work (deep dev — flagship reasoning). Drop to **Terra** for balanced, well-specified tasks where Sol's extra reasoning wouldn't change the output. Reserve **Luna** for cheap, mechanical steps (renames, boilerplate, formatting) inside a larger loop — never for the primary executor role.

---

## The two roles

1. **Orchestrator (Fable 5, effort high, or Opus 4.8 — this session)** — reads the request, asks clarifying questions if the scope is fuzzy, and writes a structured **goal file** to disk. Never edits production code in this mode.
2. **Executor (GPT-5.6 Sol via codex, or Sonnet subagent)** — reads the goal file verbatim as its entire brief and implements it. Does not re-plan, re-scope, or renegotiate the acceptance criteria.

The orchestrator resumes after execution to **verify against the goal file's done-when checklist**, not to re-review the diff from scratch.

---

## The goal file

A Skill.md-shaped markdown spec saved to a scratch path — use the session's scratchpad directory if available, else `/tmp/ccc-orchestrate/<slug>.md`.

```markdown
---
goal: <slug>
created: <ISO date>
orchestrator: fable-5 | opus-4.8
executor: codex-gpt-5.6-sol | codex-gpt-5.6-terra | codex-gpt-5.6-luna | sonnet-subagent
---

# Goal: <one-line outcome>

## Context
<the minimum the executor needs — no more>

## Steps
1. <concrete, ordered step>
2. <concrete, ordered step>
...

## Files in scope
- path/to/file.ts — <what changes>

## Files explicitly out of scope
- path/to/other.ts — <why it must not change>

## Done-when (acceptance criteria)
- [ ] <testable, verifiable condition>
- [ ] <testable, verifiable condition>
- [ ] `npx tsc --noEmit` passes (if TS project)
- [ ] Tests green: `<exact command>`

## Explicitly NOT required
- <anything that might look tempting but is out of scope>
```

Each acceptance-criteria line must be checkable by reading a diff or running a command — not a vibe. "Code is cleaner" is not a criterion. "`grep -c 'TODO' src/foo.ts` returns 0" is.

---

## Executor picker

Check codex availability before offering it:

```bash
which codex
```

Call `AskUserQuestion`:

```
question: "Who should execute the goal file?"
header: "Orchestrate Executor"
multiSelect: false
options:
  - label: "🤖 GPT-5.6 Sol via codex (recommended if installed)"
    description: "Shells out to the codex CLI with model=gpt-5.6-sol — flagship deep-reasoning tier. Different runtime, different failure modes than Claude — good adversarial diversity."
    preview: "Only offered when `which codex` succeeds. Terra/Luna available for lighter steps — see model guidance above."
  - label: "🎯 Sonnet subagent"
    description: "Stays in-Claude. Use when codex isn't installed, or you want a single-vendor audit trail."
    preview: "Dispatched via Workflow/Agent, model=sonnet, goal file as its full prompt."
```

If `which codex` fails, don't show the codex option — just note in your response: "codex CLI not found (`which codex` failed) — executing via Sonnet subagent instead."

---

## Isolation (MANDATORY before any executor dispatch)

The executor never touches the main tree directly (Fable Pillar 5). Before dispatching codex or the Sonnet subagent:

```bash
git worktree add .claude/worktrees/<goal-slug> -b goal/<goal-slug>
```

- Run the executor with **cwd = that worktree** (codex: spawn with the worktree as working directory; Sonnet: state the worktree path as the only edit root in the prompt).
- The goal file's first step for the executor is always: `git rev-parse --show-toplevel` must equal the worktree path — **abort if not**. Relative paths only from there.
- Never hand the executor the main repo's absolute path as an edit target.

---

## Execute phase

**Codex path** — build args via the real adapter interface in `commander/adapters/codex.js` (`adapter.buildArgs(prompt, opts)`), do not invent flags it doesn't expose:

```js
const codex = require('./commander/adapters/codex.js');
const args = codex.buildArgs(goalFileContents, { model: 'gpt-5.6-sol', approval: 'full-auto' });
```

`buildArgs` currently supports `model`, `approval`, `allowedTools`, `quiet` — there is **no documented reasoning-effort flag** in this adapter today. If xhigh reasoning on codex is needed, that's a TODO to add to `commander/adapters/codex.js`, not a flag to guess at. Pass the goal file's full contents as `prompt`.

**Sonnet path** — dispatch through the Workflow tool's agent equivalent, `model: sonnet`, with the goal file's contents as the entire prompt. No additional framing — the goal file already has context, steps, and scope.

---

## Verify phase (mandatory)

Back in the orchestrator session, read the executor's diff/output and check it line-by-line against the goal file's done-when checklist:

- ✅ All boxes checkable and true → report done.
- ❌ Any box unmet → **re-dispatch the executor with the specific gap only** ("criterion 3 unmet: tests still fail on X — fix that, do not touch anything else"). Do not re-plan the whole goal file and do not let the executor decide what "close enough" means.
- 🧹 **Isolation check (always):** `git -C <main-repo> status --porcelain | grep -v '^??'` must be EMPTY — the executor's work lives only in its worktree branch. Any tracked change in the main tree is a leak; stop and reconcile before reporting done.

If the goal needs repeated re-dispatch until criteria hold (a convergence loop, not a one-shot), run the verify cycle as a `/goal` loop from the ccc-loop taxonomy — it gives you the gate + iteration cap for free instead of hand-rolled retries.

Report back:
> 🧭 **Orchestrate: goal file at `<path>`, executed by `<codex-gpt-5.6-sol|codex-gpt-5.6-terra|codex-gpt-5.6-luna|sonnet-subagent>`.**
> Done-when: N/M criteria met.
> <if gaps: re-dispatching with the specific gap · if clean: ✅ all criteria verified>

---

## See also

- `$ccc-plan-exec` — same idea, Claude-only (cheap Claude plans, capable Claude executes). Use that when you want to stay in one vendor.
- `$ccc-handoff` — use if the orchestration spans enough turns that context grows large; write a handoff doc before compacting rather than losing the goal file's state.

---

## Anti-patterns — DO NOT

- ❌ Let the executor re-plan or renegotiate the goal file — it executes the steps as written; scope changes go back through the orchestrator
- ❌ Skip the acceptance-criteria verification step — "the executor said it's done" is not verification; read the diff against the checklist yourself
- ❌ Invent a codex CLI flag (like a reasoning-effort flag) that isn't in `commander/adapters/codex.js` — check the adapter first, file a TODO if it's missing
- ❌ Use this for a single trivial edit — the goal-file overhead only pays off when there's real ambiguity to compress; for a one-liner, just do it inline
- ❌ Re-plan from scratch on a failed verification — re-dispatch with the specific unmet criterion, not a fresh goal file
- ❌ Offer the codex executor option without confirming `which codex` succeeds first

---

**Bottom line:** orchestrator (Fable/Opus) compresses fuzzy intent into a goal file with teeth; executor (GPT-5.6 Sol via codex, or Sonnet) implements it in a different runtime; orchestrator verifies against the checklist before calling it done. Pay for Fable/Opus on the thinking, not the typing — and don't let the typing runtime decide what "done" means.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
