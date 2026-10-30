# Loop patterns, state file and token budget

Reference for `/ccc-loop`. Load when picking a concrete command, writing a state file, or sizing a loop's cost.

## Common loop + Commander patterns

| Command | What it does | Best for |
|---|---|---|
| `/loop 5m /ccc-doctor` | Plugin health check every 5 minutes | Monitoring during active development |
| `/loop /ccc-review` | Self-paced branch audit that iterates until clean | Continuous code quality |
| `/loop /ccc-suggest` | Always-on PM: improve/scope/audit lenses each tick, state-file-backed anti-nag | Ambient project intelligence in long sessions |
| `/loop 30m /ccc-tasks` | Task-list refresh every half hour | Long work sessions |
| `/loop /ccc-changelog` | Polls until a new release appears | Watching upstream dependencies |
| `/loop 1h /ccc-xray` | Periodic project health scorecard | Background quality gate |
| `/goal run /ccc-review until there are zero 🔴 Critical or 🟠 High findings, stop after 5 passes` | Deterministic stop instead of polling | Cleanup passes where "done" is a number |
| `/goal get the /ccc-xray health score to 90 or above, stop after 5 tries` | Quality gate expressed as a threshold | Health-score-driven fix loops |
| `/schedule` a nightly `/ccc-devops security-scan` | Cloud Routine that survives the laptop closing | Recurring infra and security checks (see `ccc-devops` § Routines) |

Reach for `/goal` instead of `/loop` whenever "keep going until X is true" has a real number behind X. Polling every 5 minutes to see whether a score crossed 90 is strictly worse than an evaluator that checks the condition on every stop attempt.

## Should-loop gate: worked examples

- **Passes all four — PR babysitter.** Recurs on every push; CI is the automated verifier; cost is capped by the interval plus a turn limit; it has real `gh`/`git` tools to act on what it finds.
- **Fails gate 2 — "keep polishing this landing page copy".** No automated verifier exists for "better copy", so it is a turn-based task with a human reviewing each pass.

## State-file convention

Any loop that must resume across runs (not just self-pace inside one session) writes:

```
.claude/loop-state/<loop-name>.json
```

```json
{
  "iteration": 3,
  "lastRun": "2026-07-06T14:32:00Z",
  "attempted": ["fix-1", "fix-2"],
  "stopCondition": "zero blocking findings",
  "history": [
    { "iteration": 1, "result": "2 blockers found", "ts": "..." },
    { "iteration": 2, "result": "1 blocker found", "ts": "..." }
  ]
}
```

Without it, each pass repeats the previous mistake because it does not know what was already tried.

Prior art in this repository (follow the pattern, do not edit from here):

- `skills/desktop-preview-loop` writes `.preview-loop.json` to persist project config across preview-loop runs.
- `ccc-night-mode` writes progress to `<config dir>/commander/yolo-status.txt` (the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`) after each cycle.
- `ccc-relay` extends this shape with a `relay` block (`phase`, `next`, `signal`, `handoff`).

New loop-capable skills use the `.claude/loop-state/<loop-name>.json` shape rather than a new ad-hoc file.

## Managing token usage

- Pilot before a big fan-out: dynamic Workflows can spawn many agents. Test on a small slice first.
- Use scripts for deterministic checks: a test runner or linter is cheaper than re-deriving the same verification by reasoning each pass.
- Match the interval to the real change frequency; do not poll faster than the thing changes.
- Review spend: `/usage` breaks cost down by skill, subagent and MCP; `/goal` with no arguments shows turns and tokens so far; `/workflows` shows each workflow agent's usage and can stop one mid-run.
- Right-size the primitive: small tasks do not need a multi-agent loop; use the cheapest model tier that can do the job.
