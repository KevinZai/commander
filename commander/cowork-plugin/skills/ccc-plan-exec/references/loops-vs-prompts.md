# Loops, not prompts

A prompt is a one-shot: "do this whole thing." A loop is a structure plus a body that repeats: "for each item, do the body." The body is small, predictable and worth a capable model. The structure around it (the item list, the order, the guards) is scaffolding a cheap model handles well.

| | One-shot prompt | Loop (plan-exec) |
|---|---|---|
| Who plans | Capable model (wasteful) | Cheap, fast model |
| Who executes | Capable model | Capable model, per step |
| Cost shape | Expensive for scaffolding and thinking | Cheap for scaffolding, expensive only for thinking |
| Failure mode | Whole run dies; re-pay everything | One step retries; the rest survives |
| Verifiability | Monolithic | Step by step, each checkable |

If the work decomposes into "the same body, N times", it is a loop: plan it cheap.

## Terminology

"Loop" here means a repeating per-step body inside one run. The session-level loops (`/loop` interval re-prompts, Routines via `/schedule`, converge-until-gate loops) are catalogued in `/ccc-loop`. A plan-exec loop that must repeat until an external gate holds (tests green, criteria met) graduates to one of those gated primitives instead of hand-rolled retries.

## Phrasing a one-off

Phrase the request as a loop and Commander runs plan-exec for that task without changing the session model:

- "Plan-exec: for each route file, add the auth guard"
- "Draft a loop to migrate all `moment()` calls to `dayjs`, then execute it"
- "Write the plan cheap, run each step on Opus"
