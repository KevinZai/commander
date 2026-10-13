---
description: "Recommend the model tier and effort for the current task from its complexity, risk and budget. Use when choosing a model for a task or subagent."
---

# /ccc-model-route — pick the right tier

**CC Commander** · /ccc-model-route · a model and effort recommendation with a fallback, without changing your session.

## Usage

```bash
/ccc-model-route [task-description] [--budget low|med|high]
```

Arguments (`$ARGUMENTS`):

- `[task-description]` — optional free text. If empty, use the task currently under discussion; if there is none, ask the user for it.
- `--budget low|med|high` — optional. Low favors the cheaper tier when two tiers fit; high favors the stronger tier.

## Steps

1. Read the task and classify it on three axes: ambiguity (clear spec or open design), blast radius (local edit, shared module, data or security), and length (single step or long-horizon).
2. Map it to a tier with the heuristic below. Apply `--budget` only to break a tie between two adjacent tiers.
3. Pick an effort level (`low`, `medium`, `high`, `xhigh`) that matches the depth of reasoning needed. `max` is session-only; recommend it only for a one-off hard problem.
4. Name a fallback: the next tier up if the first attempt fails on quality, or the next tier down if it is too slow or costly for the result.
5. Report in the output shape below. Recommend only; do not switch the session model. The user's selected model is preserved unless they choose otherwise (`/model`, the Agent tool `model` and `effort` parameters, or a subagent's `model:` frontmatter).

## Routing heuristic

| Alias | Use for |
|---|---|
| `haiku` | deterministic, low-risk mechanical work: classification, extraction, renames, routing |
| `sonnet` | bounded edits, docs, focused reviews, routers |
| `opus` | default for implementation, refactors, review and orchestration |
| `fable` | architecture, migrations, threat models, ambiguous requirements, verification of load-bearing claims |

When the work is handed to Codex instead, the matching tiers are `gpt-6-luna` (mechanical), `gpt-6-sol` (bounded implementation), `gpt-6.1-sol` (default executor) and `gpt-6-astra` (deep work and verification).

## Output

```
Recommended: <alias> at effort <level>
Confidence:  <high | medium | low> — <what would change it>
Why:         <one or two sentences tied to ambiguity, blast radius, length>
Fallback:    <alias> — <when to switch>
```
