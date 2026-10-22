---
description: "Report an active loop's pattern, phase, last checkpoint, iteration count, failing checks and time or cost drift, with a continue, pause or stop recommendation. Use when checking on a running or stalled autonomous loop."
---

# /ccc-loop-status — check a running loop

**CC Commander** · /ccc-loop-status · one status block per active loop and a recommended intervention.

## Usage

```
/ccc-loop-status [--watch]
```

`$ARGUMENTS`: `--watch` (optional) refreshes the status periodically and reports changes.

## What happens

1. **Find loops.**

   ```bash
   ls -t .claude/loop-state/*.json 2>/dev/null
   ls -t .claude/plans/loop-*.md 2>/dev/null
   ```

   No state file: say no managed loop is recorded here and point to `/ccc-loop-start`. Also check the runtime's own loop surfaces when exposed: `/goal` with no arguments (active goal and turns used), `/workflows` (running workflows) and the Routines list through `/schedule`.

2. **Read each state file** with the Read tool and its runbook. A file that fails to parse is itself a failure signal; report it.

3. **Check live signals.**

   ```bash
   git log --oneline -5
   git status --short
   ```

   Run the gate command named in the runbook (for example the test command) to confirm the current state rather than trusting the last recorded result. Compare `iteration` with the cap, and `lastRun` with the expected interval.

4. **Report** per loop:

   ```
   Loop: <name> · <pattern> · <mode>
   Phase: <current phase> · iteration <n>/<cap>
   Last checkpoint: <time> (<commit or file>)
   Failing checks: <none | list with command and exit code>
   Drift: <elapsed vs expected; spend from /usage when available>
   Recommendation: 🟢 continue | 🟡 pause | 🔴 stop — <one-line reason>
   ```

   Recommend stop when the same root cause failed twice, the cap is reached, or iterations show no measurable progress. Recommend pause when spend or time drifts beyond the runbook's budget.

5. **Act only on request.** If the recommendation is pause or stop, ask with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Follow the recommendation — show how to stop it (Ctrl+C or the loop tag's stop button for `/loop`, `/goal clear`, turning off the Routine)
   - Keep it running — record the decision in the state file's `history`
   - Run `/ccc-harness-audit` — diagnose before deciding

## Watch mode

With `--watch`, use the built-in `loop` skill (`/loop 5m /ccc-loop-status`) so each refresh is its own turn, and report only changes since the previous refresh. Stop watching when the loop ends or the user says so.

## Guardrails

- Read-only except the `history` note in step 5; never edit code or stop a loop without the user's answer.
- Never report a check as passing without running it in this turn.

## See also

- `/ccc-loop-start` — set up a gated loop
- `/ccc-harness-audit` — recovery when a loop churns
- `/ccc-cost` — spend detail
