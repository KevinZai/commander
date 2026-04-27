---
name: night-mode
description: "Autonomous overnight build — set it, forget it, wake up to shipped code. Use when the user says 'night mode', 'yolo mode', 'overnight build', 'build while I sleep', 'autonomous build', 'continuous improvement loop', or 'build unattended'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[night | yolo | status | cancel]"
---

# /ccc:night-mode

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Autonomous build system for unattended work. Two modes: **Night Mode** (spec now, build overnight, 8-hour scheduled run) and **YOLO Mode** (spec now, build immediately, no confirmations). Full menu in `references/autonomous-mode.json`.

## Quick Mode (default)

Ask the user which mode via AskUserQuestion:

- **Night Mode** — scheduled overnight run, starts building when you close your laptop
- **YOLO Mode** — starts immediately, no confirmations, maximum autonomy
- **Monitor & Maintain** — watch CI, fix builds, guard tests (recurring loop)
- **Cancel / Back to main menu**

Then proceed to the 10-question Spec Interview.

## Power Mode

Full autonomous mode menu from `references/autonomous-mode.json`. Activate by passing `--power` or `detailed`. Includes:
- Monitor & Maintain (PR Babysitter, Build Shepherd, Test Guardian, PR Pruner, Dependency Watcher, Cost Monitor)
- Background Coding (implement from spec, post-merge sweep, doc updater, knowledge compounder)
- Batch Operations (CJS→ESM, class→hooks, multi-file rename, dependency upgrade, lint rule enforcement)
- Custom Loop (describe what + how often)

### Spec Interview (10 Questions — ALL required before autonomous execution)

Ask every question. Do not skip or assume.

1. **What are you building?** — Full project description
2. **Who is it for?** — Target users/audience
3. **Most critical feature?** — The one thing that MUST work
4. **Tech stack?** — Languages, frameworks, databases, infrastructure
5. **What does DONE look like?** — Specific acceptance criteria
6. **What does BROKEN look like?** — Failure modes to prevent
7. **Edge cases?** — Known tricky scenarios to handle
8. **Testing requirements?** — Unit, integration, E2E expectations
9. **Deployment target?** — Where it runs (Vercel, AWS, Docker, local)
10. **Anything else?** — Additional context, constraints, API keys needed

### Execution Configuration

After spec is complete, delegate to the `builder` agent via Agent tool:
- Model: Opus for planning, Sonnet for execution
- Effort: max | Budget: $10 ceiling | Max turns: 100
- Self-testing: write tests, run them, fix failures before moving on
- Pre-load relevant lessons from `~/.claude/commander/knowledge/` before starting

### YOLO Loop (Multi-Cycle)

1. **Cycle 1**: Build from spec
2. **Cycle 2+**: Review, fix issues, add tests, improve quality
3. Write status after each cycle: `~/.claude/commander/yolo-status.txt`
4. Budget per cycle: $10 / N cycles
5. After final cycle: extract all lessons to `~/.claude/commander/knowledge/`

### Cost Limits

- **$10 hard ceiling** — execution stops at $10
- **$7 soft warning** — pause and ask user: "At $7 of $10 budget. Continue?"
- Check after each Agent call: `ccc --stats --json 2>/dev/null`

### Cancel a Running Build

If user returns and wants to stop: read `~/.claude/commander/yolo-status.txt`, ask "Stop now and commit what's done" vs "Let current cycle finish". On stop: run tests on whatever is built, commit with `wip:` prefix, extract lessons.

## Safety Guardrails (ALWAYS ENFORCED)

- Never push to `main` or `master` directly — create a branch and PR instead
- Never spend more than $10 per session — stop and report if approaching limit
- Never modify files outside the current project directory
- Never run `rm -rf` without explicit user confirmation
- Never use `--no-verify` (git hook bypass is banned)
- Never commit secrets, API keys, or credentials

If any guardrail would be violated: stop execution, report the issue, wait for user input.

### Post-Build Checklist

1. Run all tests — report results
2. Fix test failures (up to 3 retry attempts)
3. Remove `console.log` debug statements
4. Commit with conventional commit message (`feat: build X per night-mode spec`)
5. Extract lessons to `~/.claude/commander/knowledge/{timestamp}.json`
6. Write completion summary: what was built, tests passing, cost, time elapsed

## If Connectors Available

If **~~project tracker** is connected:
- Create a tracking issue before the overnight run starts
- Post progress updates as comments during the build
- Close the issue when the build completes successfully

If **~~source control** is connected:
- Auto-create a branch named after the task
- Open a draft PR when the build is complete

If **~~chat** is connected:
- Send a completion notification with summary and PR link when the build finishes

## Tips

1. Always run the Spec Interview before any autonomous execution — skipping it leads to drift.
2. `status` argument reads `~/.claude/commander/yolo-status.txt` to report current progress without interrupting.
3. For recurring loops (CI monitor, doc updater), use Monitor & Maintain — it's safer than a one-shot YOLO run.
