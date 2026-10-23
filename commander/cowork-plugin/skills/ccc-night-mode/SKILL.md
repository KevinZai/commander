---
name: ccc-night-mode
description: "Spec-first autonomous build that runs overnight or immediately in multi-cycle build and independent-review loops, checkpointing status each cycle and stopping at a budget. Use when the user says night mode, yolo mode, overnight build, or build while I sleep."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - Skill
  - AskUserQuestion
argument-hint: "[night | yolo | status | cancel | --power]"
model: opus
effort: high
disable-model-invocation: true
---

# /ccc-night-mode — autonomous overnight build

**CC Commander** · /ccc-night-mode · spec now, build unattended, wake up to a reviewed branch, a status file and a summary.

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md). Connectors are opt-in and absent by default.

## When to use / when not to

- Use for a well-specified build that can run for hours with an automated test suite as its bar.
- Use **Monitor & Maintain** for recurring work (CI watch, doc updater); it is safer than a one-shot YOLO run. For recurring cadence beyond one night, use `/ccc-loop` and a Routine.
- Do not use for work that needs continuous creative input, or for deploys and releases (use `/ccc-ship`).
- To approve permission prompts from a phone while it runs, pair with `/ccc-nightwatch`.

## Arguments

- `status` — read `~/.claude/commander/yolo-status.txt` and report progress without interrupting. Stop there.
- `cancel` — go to [Cancel a running build](#cancel-a-running-build).
- `night` / `yolo` — skip the mode picker.
- `--power` (or `detailed`) — open the full autonomous menu from [references/autonomous-mode.json](references/autonomous-mode.json): Monitor & Maintain (PR babysitter, build shepherd, test guardian, PR pruner, dependency watcher, cost monitor), Background Coding (implement from spec, post-merge sweep, doc updater, knowledge compounder), Batch Operations (CJS→ESM, class→hooks, multi-file rename, dependency upgrade, lint-rule enforcement) and Custom Loop. Render each menu level as an AskUserQuestion picker of at most 4 options, not as typed letters.

## What happens

### 1. Pick the mode

Ask with AskUserQuestion (Codex: plain-text question):

```
question: "How should the autonomous build run?"
header: "Mode"
options:
  - label: "🟢 Night Mode"
    description: "Spec now; the build starts at a time you pick and runs up to 8 hours. You review a branch in the morning."
  - label: "YOLO Mode"
    description: "Spec now; the build starts immediately in auto permission mode with no further check-ins."
  - label: "Monitor & Maintain"
    description: "Recurring watch loop (CI, builds, tests). Hands off to /ccc-loop."
  - label: "Cancel"
    description: "Back to the main menu. Nothing runs."
```

Monitor & Maintain: invoke `/ccc-loop` with the chosen watch target and stop here.

### 2. Run the spec interview

Ask all ten before any autonomous execution. Do not skip or assume; skipping leads to drift. Ask in plain text, a few at a time.

1. What are you building? Full project description.
2. Who is it for? Target users.
3. Most critical feature? The one thing that must work.
4. Tech stack? Languages, frameworks, databases, infrastructure.
5. What does done look like? Specific acceptance criteria.
6. What does broken look like? Failure modes to prevent.
7. Edge cases? Known tricky scenarios.
8. Testing requirements? Unit, integration, E2E, and the exact test command.
9. Deployment target? Where it runs. The build does not deploy.
10. Anything else? Constraints, and which credentials the build may read from the environment (never pasted into chat).

Write the answers to `.claude/loop-state/night-mode.json` with the Write tool (`stopCondition` = answer 5, `iteration: 0`, empty `history`), then validate:

```bash
mkdir -p .claude/loop-state ~/.claude/commander
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("state ok")' .claude/loop-state/night-mode.json
```

### 3. Prepare the run

1. Create a work branch; never build on `main` or `master`:
   ```bash
   git switch -c night/<task-slug>
   git status --short
   ```
2. Permissions: run in **auto permission mode**, the interactive default. Do not switch to `bypassPermissions`; if the user wants it, send them to `/ccc-yolo-setup`, which asks for explicit consent. The `ccc` CLI's own YOLO loop uses `--dangerously-skip-permissions` behind a typed `yes` confirmation, and `CCC_DISABLE_SKIP_PERMISSIONS=1` disables that path.
3. Load relevant lessons: `ls -t ~/.claude/commander/knowledge/*.json 2>/dev/null | head -5`, and read the ones that match the task.
4. Night Mode start time — ask with AskUserQuestion:
   - 🟢 **Start now in this session** — leave the session open; the run stops at 8 hours of wall-clock time.
   - **One-time Routine at a set time** — invoke the `schedule` skill to create a one-time Routine. It runs in a fresh cloud session against the pushed repository, so the branch must be pushed first. Creating the Routine and pushing each need the user's go now.
     1. Push the branch, then confirm it reached the remote (the command prints a ref line; empty output means the push failed):
        ```bash
        git push -u origin night/<task-slug>
        git ls-remote --heads origin night/<task-slug>
        ```
     2. Create the Routine with the `schedule` skill, then confirm it with the `schedule` skill's list action: the new Routine appears with the chosen one-time run time. If it is missing, report that and do not claim the build is scheduled.

### 4. Build in cycles (YOLO loop)

Ask how many cycles (3, 🟢 5, or 10). For each cycle:

1. **Build.** Delegate to the `builder` agent with the Agent tool: `model: "opus"` for planning, `model: "sonnet"` for execution, `effort: "xhigh"`, max 100 turns. Self-testing is mandatory: write tests, run the spec's test command, fix failures before moving on. Codex: `codex exec --json -m gpt-6.1-sol` with the same prompt.
2. **Review gate (verifier ≠ worker).** Dispatch a fresh `reviewer` agent, or the `ccc-deep-review` workflow, that did not write the cycle's code. It runs the tests itself, diffs the cycle's commits, and returns pass/fail with findings. The builder never certifies its own cycle; a cycle counts as done only when the reviewer passes it.
3. **Checkpoint.** Append the cycle, reviewer verdict, test result and cost to `~/.claude/commander/yolo-status.txt` and to `history` in `.claude/loop-state/night-mode.json`. Commit the cycle's work on the branch with a conventional message. Verify all three:
   ```bash
   tail -n 3 ~/.claude/commander/yolo-status.txt
   node -e 'const s=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("state ok, history:", s.history.length)' .claude/loop-state/night-mode.json
   git status --short && git log -1 --oneline
   ```
4. **Next cycle.** Fix the reviewer's findings, add tests, improve quality, then hit the review gate again.
5. **Stop check.** Stop early when `~/.claude/commander/yolo-stop` exists (remove it after reading), the budget is reached, or the stop condition is met and the reviewer passed.

Preserve the user's selected model wherever they chose one.

### 5. Watch the budget

- Default ceiling \$10 per run, split across cycles; reviewer runs count against the cycle budget.
- At 70% of the ceiling, pause and ask with AskUserQuestion: 🟢 "Stop now and commit what's done" / "Continue to the ceiling".
- Check real spend with `/usage` after each Agent call. Where the `ccc` CLI is installed, `ccc --stats` prints a Cost line.
- The plugin's cost-ceiling-enforcer hook also blocks after a tool-call budget (default 10.00 units = 1,000 calls; `costCeiling` in `~/.claude/commander/config.json`; `CCC_COST_OVERRIDE=1` overrides). It counts activity, not dollars.

### 6. Post-build checklist

1. Run the spec's test command and report the exact result.
2. Fix failures, at most 3 retry attempts.
3. Remove debug `console.log` statements.
4. Commit with a conventional message, for example `feat: build <task> per night-mode spec`.
5. Extract lessons to `~/.claude/commander/knowledge/<timestamp>.json` with the Write tool, then confirm the newest file is the one just written and parses:
   ```bash
   ls -t ~/.claude/commander/knowledge/*.json | head -1
   node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("lessons ok")' ~/.claude/commander/knowledge/<timestamp>.json
   ```
6. Write the completion summary: what was built, tests passing, reviewer verdict per cycle, cost, time elapsed. Write `COMPLETE` and the summary line to `~/.claude/commander/yolo-status.txt`, then confirm with `tail -n 2 ~/.claude/commander/yolo-status.txt`.

## Cancel a running build

Read `~/.claude/commander/yolo-status.txt`, then ask with AskUserQuestion: 🟢 "Stop now and commit what's done" / "Let the current cycle finish". To stop a CLI-driven loop between cycles: `touch ~/.claude/commander/yolo-stop`. On stop: run the tests on whatever is built, commit with a `wip:` prefix, extract lessons. Verify with `git log -1 --oneline` (shows the `wip:` commit), `git status --short` (clean), and the same `lessons ok` parse check as post-build step 5.

## If connectors are available

Each write below needs the user's go in this conversation, asked at the moment it happens.

- ~~project tracker: create a tracking issue before the run, comment progress per cycle, close it on success.
- ~~source control: create the branch named after the task; open a draft PR when the build completes.
- ~~chat: send a completion notice with the summary and PR link.

## Done when

- `git status --short` is clean on the work branch and `git branch --show-current` is not `main` or `master`.
- The spec's test command was run and its actual result is in the summary.
- Every cycle has an independent reviewer verdict in `~/.claude/commander/yolo-status.txt`, which ends with `COMPLETE` or a `wip:` stop note.
- `.claude/loop-state/night-mode.json` still prints `state ok`.

## Guardrails

- Never push to `main` or `master`; build on a branch and open a PR.
- Never exceed the budget ceiling; stop and report when it is reached.
- Never modify files outside the current project directory (Commander state under `~/.claude/commander/` excepted).
- Never run `rm -rf` without explicit user confirmation.
- Never use `--no-verify`; hook bypass is banned.
- Never commit secrets, API keys or credentials.
- Never deploy, publish or post; pushes, Routines, tracker and chat writes each need authorization at the moment.
- If any guardrail would be violated: stop, report the issue, and wait for the user.

## See also

- `/ccc-loop` — loop taxonomy, Routines and the should-loop gate.
- `/ccc-nightwatch` — remote approval while the build runs.
- `/ccc-yolo-setup` — permission mode and allowlist setup.
- `/ccc-review` — the independent review pass.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
