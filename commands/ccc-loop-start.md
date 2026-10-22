---
description: "Set up a managed autonomous loop (sequential, continuous-pr, rfc-dag or infinite) with tests green first, an explicit stop condition, a runbook and a state file, then print the commands to start and monitor it. Use when preparing unattended or repeated agent work."
---

# /ccc-loop-start — set up a gated loop

**CC Commander** · /ccc-loop-start · a loop runbook with safety checks done, ready to launch and monitor.

## Usage

```
/ccc-loop-start [pattern] [--mode safe|fast]
```

`$ARGUMENTS`:
- `pattern` (optional): `sequential` · `continuous-pr` · `rfc-dag` · `infinite`
- `--mode` (optional): `safe` (default) runs strict quality gates and a checkpoint every iteration; `fast` runs reduced gates for speed

| Pattern | Use when | Typical primitive |
|---|---|---|
| `sequential` (default) | One task after another, each gated | `/goal` or `/loop` |
| `continuous-pr` | Every iteration lands as a PR that CI must pass | `/loop` or a Routine (`/schedule`) |
| `rfc-dag` | An RFC or spec splits into dependent units | Workflow tool (`/workflows`) |
| `infinite` | Exploratory parallel generation, still capped | Workflow tool or Agent fan-out |

## What happens

1. **Check the repository.**

   ```bash
   git status --short
   git rev-parse --abbrev-ref HEAD
   ```

   Ask the branch strategy with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Isolated worktree — each iteration's agent runs with `isolation: worktree`; the main checkout stays untouched
   - New branch — one loop branch, iterations commit there
   - Current branch — only when the tree is clean and the user accepts direct changes

   With uncommitted changes and a non-worktree choice, stop and ask the user to commit or stash first.

2. **Choose the pattern.** If `pattern` was not passed, ask with AskUserQuestion, recommending by this order: strict CI/PR control → `continuous-pr`; spec decomposition → `rfc-dag`; exploratory parallel generation → `infinite`; otherwise 🟢 `sequential`.

3. **Choose model routing.** The user's selected model is preserved unless they choose otherwise. Ask:
   - 🟢 Keep the session model for every step
   - Route bulk iterations to `sonnet` or `haiku` and the verify step to `opus` or `fable`
   - Mixed Codex executor — iterations through `codex exec -m gpt-6.1-sol`, verification by a Claude agent

4. **Run the safety checks.** All three must pass before the runbook is written.
   - Tests green: run the project's test command (`npm test`, `pnpm test`, `pytest`, `go test ./...` or `cargo test`, whichever the repo uses). On failure, stop and report; a loop must not start red.
   - Hooks on: if the ECC hook pack is installed, `echo "${ECC_HOOK_PROFILE:-standard}"` must not print `minimal`, and `ECC_DISABLED_HOOKS` must not list the quality hooks the mode relies on. In `safe` mode, a `minimal` profile stops the setup.
   - Explicit stop: write the stop condition as a check plus a cap, for example "`npm test` exits 0 and the issue list is empty, stop after 8 iterations". "Looks done" is not a stop condition.

5. **Write the runbook and state.**

   ```bash
   mkdir -p .claude/plans .claude/loop-state
   ```

   With the Write tool, write `.claude/plans/loop-<loop-name>.md` (pattern, mode, branch strategy, model routing, per-iteration gate, stop condition and cap, verifier, how to stop) and `.claude/loop-state/<loop-name>.json`:

   ```json
   {"name": "<loop-name>", "pattern": "<pattern>", "mode": "safe", "iteration": 0, "lastRun": null, "lastCheckpoint": null, "stopCondition": "<check + cap>", "failingChecks": [], "history": []}
   ```

   Validate the state file:

   ```bash
   node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("state ok")' .claude/loop-state/<loop-name>.json
   ```

   On a parse error, fix the JSON and rerun.

6. **Print the start and monitor commands.** Do not start the loop. Give the user the exact lines for the chosen primitive, for example:

   ```
   /goal <stop condition>, stop after <cap> tries
   /loop 15m follow .claude/plans/loop-<loop-name>.md for one iteration and update .claude/loop-state/<loop-name>.json
   ```

   For `rfc-dag` and `infinite`, name the Workflow or Agent fan-out and its concurrency cap. For a Routine, say that creating it needs the user's authorization at that moment through `/schedule`. Monitor with `/ccc-loop-status`, `/workflows` and `/usage`.

## Done when

- The three safety checks are reported pass, the runbook exists, the state file printed `state ok`, and the user has the exact start and monitor lines.

## Guardrails

- Never loop deploys, rollbacks, deletions, publishing or money-moving actions.
- The verify step runs in a fresh agent that did not do the work, prompted to refute.
- Never write the runbook while tests are red or the stop condition lacks a cap.
- Pushing, opening PRs and creating Routines each need the user's authorization in this conversation, asked when the loop reaches that step.

## See also

- `/ccc-loop-status` — inspect a running loop
- `/ccc-quality-gate` — the per-iteration gate
- `/ccc-checkpoint` — checkpoints between iterations
- `/ccc-harness-audit` — recovery when a loop churns
