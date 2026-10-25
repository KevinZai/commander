---
name: ccc-loop
description: "Pick the right loop primitive (turn, /goal, /loop interval or self-paced, ScheduleWakeup, Routines via /schedule), gate it, give it an independent verifier and a state file. Use when the user wants recurring, polling, run-until-done or unattended agent work."
allowed-tools:
  - Read
  - Write
  - Bash
  - Skill
  - Agent
  - ScheduleWakeup
  - AskUserQuestion
argument-hint: "[goal | interval | self-paced | routine | gate <idea>]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-loop — pick the right loop

**CC Commander** · $ccc-loop · the loop taxonomy hub: one gate before building a loop, a verifier that is not the worker, and a state file so a resumed loop does not repeat itself.

Claude Code has several loop primitives. Choose one deliberately instead of reaching for `/loop` by habit.

## When to use / when not to

- Use when work should repeat: poll a system, iterate until a measurable condition holds, or run on a cadence while nobody watches.
- Do not loop destructive operations (`$ccc-deploy`, `$ccc-rollback`, deletions); route them through `$ccc-ship`'s gate.
- Do not loop skills that write files without idempotency guards; repeated writes accumulate.
- One-off work that a single good prompt finishes is turn-based: run the skill directly.
- To chain separate loop sessions (spec → build → review → merge), use `$ccc-relay`.

## The loop types

| Type | Trigger | Stops when | Primitive | Best for |
|---|---|---|---|---|
| Turn-based | A user prompt | Claude judges the task done | Run the skill; encode manual checks in its `SKILL.md` | Short one-off tasks |
| Goal-based | A prompt, in real time | The goal is met or the turn cap hits; an evaluator checks the condition on every stop attempt | `/goal` | Work with a verifiable exit (test count, score, build passing) |
| Interval | A fixed interval | You cancel it, or the work completes | `/loop 5m <prompt>` (local session) | Active monitoring while you are at the keyboard |
| Self-paced / dynamic | The model picks the next wake-up each iteration | Same as interval | `/loop <prompt>` with no interval, which schedules each next tick with `ScheduleWakeup` | Polling whose right cadence depends on what the last check found (CI ETA, queue depth) |
| Routine | A cron schedule or a one-time time, in the cloud | You turn the Routine off | `/schedule` (Routines) | Recurring or unattended work that must survive the laptop closing |
| Proactive | An event or schedule, no human in real time | Each task exits on its own goal | Routine heartbeat + `/goal` for done + a Workflow to orchestrate + auto permission mode | Streams of well-defined work: triage, migrations, dependency upgrades |

Deterministic checks beat vague ones for every type: "`npm test` exits 0" and "score ≥ 90" are checkable; "looks good" is not.

## What happens

### 1. Run the should-loop gate

All four must hold, or the loop costs more than it returns:

1. **Recurs at least weekly.** A one-time job is better served by one good prompt.
2. **Verification is automated.** A test suite, type checker, linter or build can fail the work without a human. Without one you are back to reading every diff.
3. **The token budget absorbs the waste.** Loops re-read context, retry and explore whether or not a run ships anything.
4. **The agent has real tools.** Logs, a reproduction environment, the ability to run what it writes. Without them the loop iterates blind.

State which of the four pass. If any fails, say which one and recommend the turn-based alternative. Worked pass/fail examples: [references/loop-patterns.md](references/loop-patterns.md).

### 2. Pick the primitive

Ask with AskUserQuestion (Codex: ask the same question in plain text):

```
question: "How should this loop run?"
header: "Loop type"
options:
  - label: "🟢 /goal — run until a measurable condition holds"
    description: "Best when done is a number or exit code. An evaluator checks it every time Claude tries to stop."
  - label: "/loop on an interval"
    description: "Runs in this session every N minutes. Stops when the session closes."
  - label: "/loop self-paced"
    description: "The model picks each next wake-up with ScheduleWakeup. Good when the right cadence varies."
  - label: "Routine via /schedule"
    description: "Cloud run on a cron or a one-time time. Survives the laptop closing. Creates a Routine on your account."
```

Recommend `/goal` first whenever "done" can be stated as a number or a command result.

### 3. Write the stop condition

- **`/goal`.** Give the user the exact line to type: `/goal <measurable end state, and the check that proves it>, stop after N tries`. The evaluator does not run commands or read files; it judges only what is already in the transcript. So the condition must name the check (for example "`npm test` exits 0", not "tests pass") so the proof lands in the conversation. Examples:
  ```
  /goal run $ccc-review until there are zero 🔴 Critical or 🟠 High findings, stop after 5 passes
  /goal get the $ccc-xray health score to 90 or above, stop after 5 tries
  ```
- **`/loop`.** Invoke the built-in `loop` skill with the Skill tool, passing `[interval] <prompt-or-skill>`; `interval` is a duration such as `5m`, `30m`, `1h`, or omitted for self-paced. Each iteration's prompt states its own exit ("stop when the PR is merged or CI is red twice").
- **Self-paced inside one task.** When the next check time depends on this iteration's result, call `ScheduleWakeup` with the delay you chose and the reason. Confirm the tool is exposed in this runtime first; if it is not (Codex included), fall back to `/loop` with a fixed interval or a `codex exec` rerun.
- **Routine.** Invoke the built-in `schedule` skill with the Skill tool to create, list, update or run a Routine (recurring cron or one-time run). Each firing starts fresh, so its prompt must be standalone and name the state file from step 5. Routines can publish private artifacts without asking; say so when proposing one.

### 4. Separate the verifier from the worker

The agent that does the work must not grade it. Otherwise the loop is an agent agreeing with itself on repeat.

- Spawn a second agent with the Agent tool for the check step, in fresh context and prompted to refute (for example a `builder` fixes, a `reviewer` from `commander/cowork-plugin/agents/reviewer.md` grades). Codex: run the check with `codex exec` or `codex review --uncommitted`.
- Or route the check through `$ccc-review` or the built-in `/code-review`.
- When a result fails the bar, encode the fix into a skill or check so later iterations do not repeat it.

### 5. Leave durable state

A loop that must resume across runs writes `.claude/loop-state/<loop-name>.json` (`iteration`, `lastRun`, `attempted`, `stopCondition`, `history`). Full shape and prior art: [references/loop-patterns.md](references/loop-patterns.md).

```bash
mkdir -p .claude/loop-state
```

Write the file with the Write tool, then validate it:

```bash
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("state ok")' .claude/loop-state/<loop-name>.json
```

On a parse error, fix the JSON and rerun before starting the loop.

### 6. Start it and report

Start the chosen primitive (or hand the user the `/goal` line), then report: primitive, interval or schedule, stop condition, cap, verifier, state-file path, and how to stop it.

## Stopping a loop

- Cowork Desktop: the stop button in the loop tag at the bottom of the window.
- Terminal: `Ctrl+C`.
- `/goal`: clears itself when met; `/goal clear` (aliases `stop`, `cancel`) removes it early.
- Routines: turn the Routine off or delete it through the `schedule` skill or wherever Routines are managed.

## Status and quiet mode

- The Commander status line shows `🔁` while the runtime sets `CLAUDE_LOOP_ACTIVE`.
- During tight monitor loops, set `CCC_SUGGEST_MODE=off` to suppress between-turn suggestion output.
- Spend: `/usage`, `/goal` with no arguments, and `/workflows`. More cost guidance: [references/loop-patterns.md](references/loop-patterns.md).

## Done when

- The gate result is stated (four checks, pass or fail each).
- The loop has a measurable stop condition with a cap, a named verifier that is not the worker, and, if it resumes across runs, a state file that printed `state ok`.
- The loop was started (loop or Routine reported back), or the user received the exact `/goal` line, or the user chose not to loop.

## Guardrails

- Never loop deploys, rollbacks, deletions, publishing or money-moving actions.
- Never let the worker certify its own output.
- Creating a Routine, posting to a tracker or chat, and pushing each need the user's authorization in this conversation, asked with a picker at that moment.
- Never poll faster than the watched thing changes.
- Preserve the user's selected model; change the tier only when they choose to.

## See also

- `$ccc-relay` — chain separate loop sessions with gated hand-offs.
- `$ccc-night-mode` — one-off overnight build with per-cycle checkpoints.
- `$ccc-nightwatch` — approve permission prompts remotely while a loop runs.
- `$ccc-fleet` — parallel workers inside one step.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
