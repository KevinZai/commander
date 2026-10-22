# Fleet model tiers

Reference for `/ccc-fleet`. Route each agent by role. Aliases track the newest model in each line (see `docs/reference/platform-facts-2026-10.md` in the Commander repository). The coordinator stays on the user's selected model unless the user chooses otherwise.

| Role | Alias | Agent `effort` | Use |
|---|---|---|---|
| Conductor (this session) | user's choice | session setting | Decomposition, synthesis, merge decisions |
| Director / verifier | `fable` or `opus` | `high` | Architecture brief, refuting load-bearing claims |
| Lead / worker | `sonnet` or `opus` | `medium` | Implementation slices, multi-file features |
| Specialist / bulk | `haiku` | `low` | Lint, formatting, docs, trivial single-file edits |

## Complexity scoring (Commander CLI checkout only)

`commander/dispatcher.js` exports `scoreComplexity(task)` (returns `{ score, turns, budget, effort }`, score 0 to 100) and `selectModelForComplexity(score)`: 0–29 → `haiku`, 30–65 → `sonnet`, 66–85 → `opus`, 86+ → `fable`. In a checkout of the Commander repository, score each slice before routing:

```bash
node -e 'const d=require("./commander/dispatcher.js"); const r=d.scoreComplexity(process.argv[1]); console.log(r.score, d.selectModelForComplexity(r.score))' "<slice description>"
```

Outside that checkout, route by the role table above.

## Pinned fleets

A pinned fleet runs every workflow agent on one model (all `sonnet` for cost, all `fable` for depth). The Workflow tool reads `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`; it must be in the session environment before the run starts:

```bash
printenv CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL   # empty means role-based routing
```

To pin, the user launches with the variable set (for example `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL=sonnet claude`) or adds it to `env` in their settings. Changing settings is the user's call; do not edit them as a side effect. The pin does not affect Agent-tool dispatch, which takes `model` per call.
