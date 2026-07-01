---
name: ccc-plan-exec
description: "Write loops, not prompts — a cheap/fast model drafts the plan or loop, a capable model (Opus/Fable) executes each step. Two-phase routing tied to dispatcher complexity tiers."
allowed-tools:
  - Read
  - Bash
  - Workflow
  - AskUserQuestion
---

# /ccc-plan-exec — Plan Cheap, Execute Capable

Plan-exec splits work into two phases on two models. A **cheap, fast model drafts the plan** — the step list, the loop body, the structure. Then a **capable model (Opus/Fable) executes each step**. You write a *loop*, not a one-shot prompt: the structure is decided once, cheaply, then run N times against the expensive reasoner only where reasoning earns its cost.

**CC Commander** · Plan-Exec Mode · [Docs](https://commanderplugin.com)

> Plan-exec is the canonical workflow-first doctrine (`commander/cowork-plugin/rules/workflow-first.md`) applied to *cost*: **let the cheap model decide the shape, let the capable model do the thinking.** Motto: "Pay for Fable on the thinking, not the typing."

---

## Write loops, not prompts

A **prompt** is a one-shot: "do this whole thing." A **loop** is a structure plus a body that repeats: "for each item, do the body." The loop body is small, predictable, and capable-model-worthy. The structure around it — the item list, the order, the guards — is boring scaffolding a cheap model nails for cents.

| | One-shot prompt | Loop (plan-exec) |
|---|---|---|
| Who plans | Capable model (wasteful) | Cheap/fast model |
| Who executes | Capable model | Capable model, per step |
| Cost shape | Pay expensive for scaffolding + thinking | Pay cheap for scaffolding, expensive only for thinking |
| Failure mode | Whole run dies, re-pay everything | One step retries, rest survives |
| Verifiability | Monolithic blob | Step-by-step, each checkable |

If the work decomposes into "the same body, N times," it's a loop. Plan it cheap.

---

## The two phases

1. **PLAN (cheap/fast)** — a fast model (Sonnet/Haiku tier) drafts the loop: enumerate the steps/items, define the per-step body, set the guard/verify condition, and flag which steps actually need deep reasoning. Output is a structured plan, not code that ships.
2. **EXECUTE (capable)** — Opus or Fable runs the per-step body against the plan, step by step. The expensive model only touches the parts the plan marked as reasoning-heavy; trivial steps can stay on the cheap model.

The handoff is the plan artifact. The cheap phase never edits production code; the capable phase never re-derives the structure.

---

## Tie-in: dispatcher complexity routing

This maps directly onto `commander/dispatcher.js`'s model ladder — `model` plans cheap, `fallback`/escalation executes capable:

| Tier | Plan model | Execute model | Use when |
|------|-----------|---------------|----------|
| `guided` | sonnet → haiku | sonnet | Mechanical loops (rename, format, bulk-edit) — cheap planner, cheap executor |
| `assisted` | sonnet | opus | Mixed loops — cheap plan, capable execution per step |
| `power` | sonnet/opus | fable → opus | Reasoning-heavy bodies (design per module, hard migrations) — pay Fable on the thinking |

The dispatcher already scores complexity via `COMPLEXITY_SIGNALS`. Plan-exec uses that score to pick the **execute** model and lets the **plan** model stay one tier cheaper. Never flip the lead session's model mid-run — delegate the capable phase to a subagent/workflow instead.

---

## One-off without a session flip

Phrase the request as a loop and CC Commander runs plan-exec for that single task without changing your session model:

- "Plan-exec: for each route file, add the auth guard"
- "Draft a loop to migrate all `moment()` calls to `dayjs`, then execute it"
- "Write the plan cheap, run each step on Opus"

---

## Mode picker

Call `AskUserQuestion` to let the user choose the execute tier:

```
question: "How should I run the plan-exec loop?"
header: "Plan-Exec"
multiSelect: false
options:
  - label: "⚡ Cheap plan + cheap execute (guided)"
    description: "Mechanical loop — sonnet/haiku both phases. Bulk renames, formatting, repetitive edits."
    preview: "Lowest cost. Use when no step needs deep reasoning."
  - label: "🎯 Cheap plan + Opus execute (assisted)"
    description: "Sonnet drafts the loop, Opus runs each step. The default plan-exec balance."
    preview: "Pay capable only on execution. Best general choice."
  - label: "🔥 Cheap plan + Fable execute (power)"
    description: "Sonnet/Opus drafts, Fable executes reasoning-heavy bodies, opus fallback."
    preview: "Pay for Fable on the thinking. Hard migrations, design-per-module."
  - label: "📋 Just draft the plan (no execute yet)"
    description: "Run only the cheap planning phase. Review the loop before spending on execution."
    preview: "Returns the step list + per-step body. You approve, then run execute."
```

Prepend ⭐ to the best match:
- "rename" / "format" / "bulk" / mechanical keywords → ⭐ guided
- Mixed work, no strong signal → ⭐ assisted
- "migrate" / "redesign" / "architecture" / per-module reasoning → ⭐ power
- "review the plan first" / high-risk / large blast radius → ⭐ just draft

---

## After user picks

1. **Plan phase** — dispatch the cheap model to produce the structured loop: ordered steps, the per-step body, the verify condition, and a `reasoning: high|low` flag per step.
2. **Confirm** — for `power` or large loops, show the plan and the per-step model assignment before spending on execution.
3. **Execute phase** — run each step's body on its assigned model. Route the whole loop through the **Workflow tool** when it's multi-file or multi-step (keep the lead context slim — agents return conclusions, not file dumps). Trivial steps stay cheap; flagged steps escalate to the execute model.

Report back:
> 📋 **Plan-exec running** — cheap plan drafted (N steps), executing on `<execute-model>`.
> Steps marked `reasoning: high` route to the capable model; the rest stay cheap.
> Each step verifies before the next runs — one failure retries that step, not the whole loop.

---

## Anti-patterns — DO NOT

- ❌ Plan AND execute on the same expensive model — that's a one-shot prompt, not plan-exec; you re-pay for scaffolding
- ❌ Let the cheap plan phase write or edit production code — it drafts the loop only; execution is the capable phase's job
- ❌ Run the whole loop on the capable model when only some steps need reasoning — route per step using the plan's `reasoning` flag
- ❌ Flip the lead session's model mid-run — delegate the capable phase to a subagent/workflow instead (never switch models mid-session)
- ❌ Skip the verify condition between steps — a loop with no per-step guard hides failures until the end and re-pays the whole run
- ❌ Use plan-exec for a genuinely single, atomic task — if there's no repeating body, just do it inline

---

**Bottom line:** plan-exec = cheap model writes the loop, capable model runs the steps. Decompose into a repeating body, plan it for cents, and spend Opus/Fable only where the thinking lives.
