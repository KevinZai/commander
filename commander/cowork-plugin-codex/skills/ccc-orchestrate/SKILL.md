---
name: ccc-orchestrate
description: "Cross-runtime Orchestrator/Executor — Fable/Opus writes a goal file, GPT-6 Astra (codex) or a Sonnet subagent executes it, Fable/Opus verifies against acceptance criteria before reporting done."
allowed-tools:
  - Read
  - Bash
  - Write
  - Workflow
  - AskUserQuestion
---

# $ccc-orchestrate — Cross-Runtime Orchestrator/Executor

Orchestrate splits work across **two different model runtimes**, not just two tiers of the same one. A capable model (**Fable 5.1** or **Opus 5** — the calling session, i.e. "you") compresses a fuzzy request into a tight, testable **goal file**. Execution happens on **GPT-6 Astra via the `codex` CLI**, or on a **Sonnet subagent** within Claude when that route is preferred or Codex is unavailable. The orchestrator never writes production code itself.

**CC Commander** · Cross-Runtime Orchestrate · [Docs](https://commanderplugin.com)

> This is `$ccc-plan-exec` generalized past Claude-only: instead of plan (cheap Claude) → execute (capable Claude), it's plan (Fable/Opus) → execute (a separate executor — Codex or Sonnet). The goal file is the interface between the two systems, so it has to have real teeth.

---

## Why cross-runtime

Use a goal file when a task benefits from a separate executor and independent verification. Include the minimum context, scope, constraints, and observable acceptance criteria the executor needs. This separation adds handoff cost; do not promise savings without workload evidence.

**Model guidance:** use Astra (`gpt-6-astra`) for demanding Codex execution, Terra for balanced bounded implementation, and Luna for clear mechanical steps. Preserve a user-selected supported tier. Verify installed CLI and account availability before selecting a model; Claude Fable 5.1 (`claude-fable-5-1`) and Opus are orchestrator options, not mandatory session overrides.

---

## The two roles

1. **Orchestrator (Fable 5.1, configured effort, or Opus 5 — this session)** — reads the request, asks clarifying questions if the scope is fuzzy, and writes a structured **goal file** to disk. Never edits production code in this mode.
2. **Executor (GPT-6 Astra via codex, or Sonnet subagent)** — reads the goal file verbatim as its entire brief and implements it. Preserves the accepted scope and reports contradictory, infeasible, or unauthorized requirements before continuing dependent work. Does not silently redefine acceptance criteria.

The orchestrator resumes after execution to **verify against the goal file's done-when checklist**, not to re-review the diff from scratch.

---

## The goal file

A Skill.md-shaped markdown spec saved to a scratch path — use the session's scratchpad directory if available, else `/tmp/ccc-orchestrate/<slug>.md`.

```markdown
---
goal: <slug>
created: <ISO date>
orchestrator: claude-fable-5-1 | opus-5
executor: codex-gpt-6-astra | codex-gpt-5.6-terra | codex-gpt-5.6-luna | sonnet-subagent
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
- [ ] The repository's configured type check passes (when applicable)
- [ ] Tests green: `<exact command>`

## Explicitly NOT required
- <anything that might look tempting but is out of scope>
```

Each acceptance-criteria line must be checkable by reading a diff or running a command — not a vibe. "Code is cleaner" is not a criterion. "The relevant regression test fails before the change and passes afterward" is.

---

## Executor picker

Check codex availability before offering it:

```bash
which codex
```

Honor an executor/model preference already given by the user. Otherwise choose a supported tier from task complexity, or use the available choice tool when the runtime tradeoff needs user input. Example when a real choice remains:

```
question: "Who should execute the goal file?"
header: "Orchestrate Executor"
multiSelect: false
options:
  - label: "🤖 GPT-6 Astra via codex (recommended if installed)"
    description: "Shells out to the codex CLI with model=gpt-6-astra — flagship deep-reasoning tier. Different runtime, different failure modes than Claude — good adversarial diversity."
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

**Codex path** — use the installed CLI's supported headless interface, preserving OAuth authentication and the isolated write root:

```bash
codex exec -C "<verified-worktree>" -s workspace-write -m gpt-6-astra - < "<goal-file>"
```

Verify `codex exec --help` before dispatch when CLI compatibility is uncertain. Inherit configured reasoning unless the task warrants a supported override; Astra does not support `none` or `minimal`. Do not add API-key chat authentication or bypass sandbox/approval controls. The legacy `commander/adapters/codex.js` emits older flags such as `--full-auto`; do not assume it supports a newer installed CLI. Updating that adapter is a separate code change.

**Sonnet path** — dispatch through an actually available Workflow/Agent equivalent, `model: sonnet`, with the goal file's contents as the entire prompt. No additional framing — the goal file already has context, steps, and scope.

---

## Verify phase (mandatory)

Back in the orchestrator session, read the executor's diff/output and check it line-by-line against the goal file's done-when checklist:

- ✅ All boxes checkable and true → report done.
- ❌ Any box unmet → **re-dispatch the executor with the specific gap only** ("criterion 3 unmet: tests still fail on X — fix that, do not touch anything else"). Do not re-plan the whole goal file and do not let the executor decide what "close enough" means.
- 🧹 **Isolation check:** compare the main checkout against its recorded pre-dispatch state. It must have no new changes from the executor; preserve any unrelated pre-existing edits. Keep the executor's changes in its assigned worktree, and investigate a new unexpected change without resetting other work.

If the goal needs repeated re-dispatch until criteria hold (a convergence loop, not a one-shot), run the verify cycle as a `/goal` loop from the ccc-loop taxonomy — it gives you the gate + iteration cap for free instead of hand-rolled retries.

Report back:
> 🧭 **Orchestrate: goal file at `<path>`, executed by `<codex-gpt-6-astra|codex-gpt-5.6-terra|codex-gpt-5.6-luna|sonnet-subagent>`.**
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
- ❌ Invent CLI flags or assume the legacy adapter supports the installed release — inspect `codex exec --help` and use the supported invocation
- ❌ Use this for a single trivial edit — the goal-file overhead only pays off when there's real ambiguity to compress; for a one-liner, just do it inline
- ❌ Re-plan from scratch on a failed verification — re-dispatch with the specific unmet criterion, not a fresh goal file
- ❌ Offer the codex executor option without confirming `which codex` succeeds first

---

The orchestrator (Fable/Opus) compresses fuzzy intent into a goal file with teeth; executor (GPT-6 Astra via codex, or Sonnet) implements it in a different runtime; orchestrator verifies against the checklist before calling it done. Pay for Fable/Opus on the thinking, not the typing — and don't let the typing runtime decide what "done" means.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
