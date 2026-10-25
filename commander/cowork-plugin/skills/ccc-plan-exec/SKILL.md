---
name: ccc-plan-exec
description: "Plan cheap, execute capable: a fast model drafts the loop (steps, per-step body, verify condition), a capable model runs each step in an isolated worktree with an independent verifier. Use when work repeats one body over many items, or the user says plan-exec, write a loop, or types /ccc-plan-exec."
allowed-tools:
  - Read
  - Bash
  - Agent
  - Workflow
  - AskUserQuestion
argument-hint: "[\"loop description in quotes\"]"
disable-model-invocation: true
---

# /ccc-plan-exec — plan cheap, execute capable

**CC Commander** · /ccc-plan-exec · a repeated job split into a cheap planning pass and capable per-step execution, each step verified before the next.

The cheap model decides the shape; the capable model does the thinking. This is `rules/workflow-first.md` applied to cost. Background and examples: [references/loops-vs-prompts.md](references/loops-vs-prompts.md).

## When to use / when not to

- Use when the work is the same body repeated over N items: per-file edits, per-module migrations, bulk renames, per-route guards.
- Use `/ccc-plan` for a one-time feature plan, and just do a single atomic task inline; with no repeating body there is nothing to loop.
- A loop that must repeat until an external gate holds (tests green) belongs in a gated loop from `/ccc-loop`.

## Tiers

The tiers match `commander/dispatcher.js` (`guided`, `assisted`, `power`, scored by `COMPLEXITY_SIGNALS`). The planning model stays one tier cheaper than the execute model.

| Tier | Plan model | Execute model | Use when |
|---|---|---|---|
| `guided` | `sonnet` (`haiku` for trivial lists) | `sonnet`, fallback `haiku` | Mechanical: rename, format, bulk edit |
| `assisted` | `sonnet` | `opus`, fallback `sonnet` | Mixed: cheap plan, capable execution per step |
| `power` | `sonnet` or `opus` | `fable`, fallback `opus` | Reasoning-heavy bodies: hard migrations, design per module |

The lead session's model is never switched. Capable work runs in subagents or workflow agents with an explicit `model`, so the user's selected model is preserved.

## What happens

### 1. Capture the loop

Use the argument as the loop description. If there is none, ask in one plain sentence what the repeated job is and over which items.

### 2. Pick the tier

Ask with the tier picker under Decision points.

### 3. Plan phase (cheap)

Call `Agent` with `subagent_type: "general-purpose"`, the tier's plan model, `effort: "low"` for `guided` or `"medium"` otherwise, and a prompt that asks for, and only for:

1. The ordered item list (paths or identifiers, discovered with read-only commands).
2. The per-step body as one instruction template.
3. The per-step verify condition: a command when it is mechanical (`node --check <file>`, the project's test command, a `grep`), or a reading check otherwise.
4. A `reasoning: high | low` flag per step.

The plan phase never edits files. If it returns edits or an empty item list, stop and report.

### 4. Confirm

For `power`, for more than about 20 steps, or for "just draft the plan", show the step list with each step's model and verify condition, then ask with the "run it" picker. "Just draft" ends here.

### 5. Isolate (required when the loop writes code)

```bash
git rev-parse --show-toplevel            # MAIN_ROOT
git -C "$MAIN_ROOT" status --porcelain > "<scratchpad>/plan-exec-baseline.txt"
git -C "$MAIN_ROOT" worktree add ".claude/worktrees/<loop-slug>" -b "loop/<loop-slug>"
```

Every executor's first command is `git rev-parse --show-toplevel`; it must equal the worktree path, or the executor aborts. Executors use relative paths inside the worktree only. Never hand an executor the main checkout's absolute path. If `worktree add` fails (branch exists, dirty index), report the error and stop.

### 6. Execute phase (capable)

- More than a few steps or files: run the loop through the `Workflow` tool so agents return conclusions, not file dumps. Each step is an `agent()` call with `model` set from its `reasoning` flag (`high` → the tier's execute model, `low` → the plan model) and `effort` to match.
- A handful of steps: call `Agent` per step with the same `model` and `effort` choice.
- Run steps sequentially when they touch the same files; run independent steps in parallel.

### 7. Verify each step (verifier ≠ worker)

A step's "done" does not advance the loop. A separate check does:

- Mechanical condition: run the command yourself in the worktree and read the exit code.
- Reading condition: a fresh `Agent` on `haiku` or `sonnet` with `subagent_type: "Explore"`, prompted to refute the step's claim and to default to refuted when unsure.

On failure, retry that step once with the verifier's reason attached; on a second failure, stop the loop and report the step, the reason and the steps already done.

### 8. Final isolation check

```bash
git -C "$MAIN_ROOT" status --porcelain | diff "<scratchpad>/plan-exec-baseline.txt" -
git -C ".claude/worktrees/<loop-slug>" diff --stat HEAD
```

The first command must print nothing (no new changes leaked into the main checkout). The second lists what the loop changed.

Progress card while it runs:

```
📊 Plan-exec running — N steps planned on <plan-model>, executing on <execute-model>.
Steps flagged reasoning: high use the capable model; the rest stay cheap.
Each step is verified before the next; a failure retries that step only.
```

## Decision points

Tier picker (step 2). Put the best match first, marked 🟢: mechanical keywords (rename, format, bulk) → guided; migrate, redesign, architecture or per-module reasoning → power; high risk, large blast radius or "review the plan first" → just draft; otherwise → assisted.

```
question: "How should I run this plan-exec loop?"
header: "Plan-Exec"
multiSelect: false
options:
  - label: "🎯 Cheap plan + Opus execute (assisted)"
    description: "Sonnet drafts the loop, Opus runs each step. The general default."
  - label: "🔧 Cheap plan + cheap execute (guided)"
    description: "Sonnet/Haiku both phases. Lowest cost; for mechanical loops only."
  - label: "🧠 Cheap plan + Fable execute (power)"
    description: "Fable on reasoning-heavy steps, Opus fallback. Highest cost per step."
  - label: "📝 Just draft the plan"
    description: "Planning phase only. Review the loop before spending on execution."
```

Run-it picker (step 4): 🟢 Run as planned / Edit the plan first (describe the change) / Cancel.

## Done when

- Every step's verify condition passed, as checked by step 7, or the loop stopped at a named failing step.
- Step 8's first command printed nothing.
- The report names the worktree path, the branch `loop/<loop-slug>`, the `diff --stat` summary, and which model ran which steps. Merging the branch is left to the user.

## Guardrails

- Never plan and execute on the same expensive model; that is a one-shot prompt.
- Never let the plan phase write or edit files.
- Never switch the lead session's model; delegate capable work with an explicit `model`.
- Never advance past a step without its independent verify.
- Never run a code-writing loop outside its worktree, and never merge, push or delete the loop branch or worktree; those need the user's explicit go-ahead.
- On Codex: ask the tier question in plain text, and run steps with `codex exec -m <model> --cd <worktree>` (`gpt-6-luna` for guided, `gpt-6.1-sol` for assisted, `gpt-6-astra` for power) instead of `Agent`/`Workflow`.

## See also

- `/ccc-plan` — one-time feature plan with evals
- `/ccc-loop` — session-level loops: `/loop`, Routines, gated loops
- `/ccc-fleet` — parallel fan-out with independent verifiers
- `/ccc-orchestrate` — hand a goal file to a Codex or Sonnet executor

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
