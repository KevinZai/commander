---
name: ccc-loop
description: "Loop taxonomy hub — turn/goal/time/proactive loops, /goal + /loop + /schedule guidance, the should-loop gate, verifier-separation, and state-file conventions for recurring agent work."
---

# /ccc-loop — Loop Integration Guide

Claude Code has **four loop primitives**, not one. This skill is the entry point for all of them — pick the right primitive before you reach for `/loop` by habit.

## The 4 loop types

| Type | Trigger | Stop criteria | CC Commander primitive | Best for |
|---|---|---|---|---|
| **Turn-based** | A user prompt | Claude judges "done" itself | Just run the skill directly; encode your manual verification steps as a `SKILL.md` so Claude can self-check | Short one-off tasks |
| **Goal-based** | A manual prompt, real-time | Goal achieved OR max turns reached — an evaluator model checks your condition each time Claude tries to stop | `/goal` | Tasks with a verifiable exit criterion (test count, score threshold, build passing) |
| **Time-based** | An interval | You cancel it, or the work completes (PR merged, queue empty) | `/loop` (local) + `/schedule` (cloud) | Recurring work, polling external systems |
| **Proactive** | An event or schedule, no human in real time | Each task exits on its own goal; the routine runs until you turn it off | `/schedule` (heartbeat) + `/goal` (define done) + dynamic Workflow (orchestrate) + auto mode (no confirmation stops) | Recurring streams of well-defined work — bug triage, migrations, dependency upgrades |

Deterministic, quantitative checks beat vague ones for every type above — "tests pass" and "score ≥ 90" are checkable; "looks good" is not.

## Should this be a loop? (gate before you build one)

All four must be true, or the loop costs more than it returns:

1. **Recurs at least weekly** — a one-time job is better served by one good prompt.
2. **Verification is automated** — a test suite, type checker, linter, or build that can fail the work without a human in the room. No automated check means you're back to reading every diff — the exact job the loop was supposed to remove.
3. **Your token budget absorbs the waste** — loops re-read context, retry, explore. That burns tokens whether the run ships anything or not.
4. **The agent has real tools** — logs, a reproduction environment, the ability to run what it writes and see what breaks. Without that, the loop iterates blind.

**Worked example — PR Babysitter passes all 4:** recurs constantly (every push), CI is the automated verifier, cost is capped by the interval + turn limit, and it has real `gh`/`git` tools to act on what it finds. **Counter-example — "keep polishing this landing page copy" fails #2:** there's no automated verifier for "better copy," so it's a turn-based task with a human reviewing each pass, not a loop.

## `/goal` — deterministic stop conditions

**Claude Code v2.1.139+.**

```
/goal <what "done" looks like> [, stop after N tries]
```

The key mechanic: when you define success criteria up front, Claude doesn't self-judge "good enough" — an evaluator model checks your condition every time Claude tries to stop, and sends it back if unmet. Deterministic criteria (test pass count, score threshold, exact command output) work far better than subjective ones.

**One load-bearing constraint:** the evaluator does not run commands or read files itself — it judges only what Claude has already surfaced in the conversation. So the condition must state the check, not just the goal, so the proof lands in the transcript (e.g. "`npm test` exits 0", not just "tests pass"). A good condition names one measurable end state, states the check that proves it, and bounds runtime with a turn or time clause ("...or stop after 20 turns").

**Worked examples using CCC skills as the target:**

```
/goal run /ccc-review until there are zero 🔴 Critical or 🟠 High findings, stop after 5 passes
```

```
/goal get the /ccc-xray health score to 90 or above, stop after 5 tries
```

Both have a number to check against — "zero blockers," "score ≥ 90" — so the evaluator has something unambiguous to grade, not a vibe.

## `/loop` and `/schedule` — time-based

```
/loop [interval] <prompt-or-skill>
```

- `interval` — optional duration: `5m`, `30m`, `1h`. Omit to let Claude self-pace.
- Runs on your machine — closing it stops it. Interrupt anytime with `Ctrl+C` or the stop button in Cowork Desktop.

**Graduate to `/schedule`** when the work should survive your laptop closing — anything genuinely recurring (nightly checks, weekly scans) belongs in the cloud, not tied to a local session. `/loop` is for active monitoring while you're at the keyboard; `/schedule` is the heartbeat for proactive loops that run unattended.

`ccc-night-mode`'s 8-hour scheduled overnight run is a good default for a **one-off** overnight build. For anything that should recur on its own cadence indefinitely, `/schedule` is the right primitive — see `ccc-night-mode`/`ccc-nightwatch` for the local unattended-build and remote-approval patterns respectively.

## Common /loop + CCC patterns

| Loop command | What it does | Best for |
|---|---|---|
| `/loop 5m /ccc-doctor` | Plugin health check every 5 min | Monitoring during active dev |
| `/loop /ccc-review` | Self-paced branch audit, iterates until clean | Continuous code quality |
| `/loop /ccc-suggest` | Always-on PM — improve/scope/audit lenses each tick, state-file-backed anti-nag | Ambient project intelligence during long sessions |
| `/loop 30m /ccc-tasks` | Task list refresh on a half-hour cadence | Long work sessions |
| `/loop /ccc-changelog` | Polls until a new release appears | Watching upstream deps |
| `/loop 1h /ccc-xray` | Periodic project health scorecard | Background quality gate |
| `/goal run /ccc-review until zero blocking findings, stop after 5 passes` | Deterministic stop instead of polling — no interval to guess at | Cleanup passes where "done" is a real number, not a schedule |
| `/goal get /ccc-xray score to 90+, stop after 5 tries` | Same — quality gate expressed as a threshold, not a timer | Health-score-driven fix loops |
| `/schedule nightly /ccc-devops security-scan` | Cloud routine, survives laptop close | Recurring infra/security checks (see `ccc-devops` § Routines Integration) |

Reach for `/goal` instead of `/loop` whenever "keep going until X is true" has a real number behind X — polling every 5 minutes to check if a score crossed 90 is strictly worse than an evaluator that checks the exact condition each pass.

## The verifier-separation rule (non-negotiable)

**The agent that does the work must not be the agent that grades it.** Without a real, independent check, you don't have a loop — you have an agent agreeing with itself on repeat.

Apply this in CCC with either:
- The **Agent tool** — spawn a *second* agent/persona for the check step (fresh context, not anchored on the first agent's reasoning). E.g. a `builder` persona writes the fix, a `reviewer` persona (see `commander/cowork-plugin/agents/reviewer.md`) grades it independently.
- The **`/code-review` skill** or `/ccc-review` — route the verification step through a dedicated review pass instead of letting the implementer self-certify.

When an individual result fails the bar, don't just fix that instance — encode the fix into a skill or check so future iterations of the loop don't repeat it.

## State-file convention

Any CCC loop skill that needs to resume across runs (not just self-pace within one session) should write a state file at:

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

Without this, each pass repeats the same mistake because it doesn't know what was already tried — the state file is what lets a resumed loop pick up where it left off instead of starting from zero.

**Prior art already in this repo (pattern to follow, not to edit here):**
- `skills/desktop-preview-loop` writes `.preview-loop.json` to persist project config across preview-loop runs.
- `ccc-night-mode` writes progress to `~/.claude/commander/yolo-status.txt` after each cycle.

New loop-capable skills should prefer the `.claude/loop-state/<loop-name>.json` shape above over inventing a new ad-hoc file per skill.

## Managing token usage

- **Pilot before a big fan-out** — dynamic Workflows can spawn hundreds of agents. Test on a small slice first.
- **Use scripts for deterministic checks** — a test runner or linter is cheaper than re-deriving the same verification via reasoning every pass.
- **Match interval to actual change frequency** — don't poll a thing more often than it changes.
- **Review spend** — `/usage` breaks down cost by skill/subagent/MCP; `/goal` with no args shows turns + tokens so far; `/workflows` shows each agent's token usage and lets you stop one mid-run.
- **Right-size the primitive** — small tasks don't need a multi-agent loop; use the cheapest model that can do the job.

## When NOT to use any loop primitive

Fails the should-you-loop gate above, OR:
- Destructive operations (`/ccc-deploy`, `/ccc-rollback`) — use the `/ccc-ship` gate instead, never a bare loop
- Skills that write files without idempotency guards — repeated writes will accumulate
- One-off tasks where a single good prompt (turn-based) already gets you there

## Stopping a loop

- **Cowork Desktop:** click the stop button in the loop tag at the bottom of the UI
- **Terminal:** `Ctrl+C`
- **`/goal`:** met condition clears it automatically; `/goal clear` removes it early (aliases: stop, cancel)
- **`/schedule`:** cancel the routine from wherever it's managed (cloud dashboard / CLI)

## Status-line indicator

CCC's status-line shows `🔁` when `CLAUDE_LOOP_ACTIVE` is set by the runtime, so you can see at a glance that a loop is running.

## Tip

Pair `/loop` with `/ccc-suggest` off (`CCC_SUGGEST_MODE=off`) during tight monitor loops to suppress between-turn suggestion output.

---

**Bottom line:** four loop types, one gate before you build any of them, a verifier that isn't the same agent as the worker, and a state file so a resumed loop doesn't repeat itself. `/goal` for "keep going until X is true," `/loop` for "keep going every N minutes while I'm here," `/schedule` for "keep going forever, even after I close my laptop."

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
