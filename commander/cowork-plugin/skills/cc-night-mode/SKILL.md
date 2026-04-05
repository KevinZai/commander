---
name: cc-yolo-mode
description: "YOLO Mode — autonomous overnight build. Use when the user says 'yolo mode', 'yolo loop', 'night mode', 'overnight build', 'build while I sleep', 'autonomous build', 'continuous improvement loop'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - WebSearch
  - AskUserQuestion
---

# YOLO Mode — Autonomous Build System

Set it. Forget it. Wake up to shipped code.

## Mode Selection

Use AskUserQuestion:
- **Night Mode** — spec now, build overnight (8-hour scheduled run)
- **YOLO Mode** — spec now, build immediately with no confirmations
- **Cancel / Back to main menu**

## Spec Interview (10 Questions — ALL required)

Ask every question. Do not skip. Do not assume.

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

## Safety Guardrails

YOLO mode CANNOT and MUST NOT:
- Delete files without writing them first (always create before removing)
- Push to `main` or `master` directly — create a branch and PR instead
- Spend more than $10 per session — stop and report if approaching limit
- Modify files outside the current project directory
- Run `rm -rf` on any directory without explicit user confirmation
- Disable or bypass git hooks (`--no-verify` is banned)
- Commit secrets, API keys, or credentials to git

If any guardrail would be violated, stop execution, report the issue, and wait for user input.

## Cost Limits and Alerts

- **$10 hard ceiling** — execution stops automatically at $10
- **$7 soft warning** — pause and ask user: "At $7.00 of $10 budget. Continue?"
- Check cost after each Agent call: `ccc --stats --json 2>/dev/null`
- If `ccc` is unavailable, estimate: ~$0.003/1K input tokens, ~$0.015/1K output tokens (Sonnet)

## Execution Configuration

After spec is complete:
- Model: Opus for planning, Sonnet for execution
- Effort: max
- Budget: $10 ceiling
- Max turns: 100
- Self-testing: write tests, run them, fix failures before moving on
- Knowledge: check `~/.claude/commander/knowledge/` for relevant past lessons before starting

## YOLO Loop (Multi-Cycle Improvement)

When requested, run multiple build-review-improve cycles:
1. **Cycle 1**: Build from scratch using the spec
2. **Cycle 2+**: Review previous work, fix issues, add tests, improve quality
3. Write status after each cycle: `~/.claude/commander/yolo-status.txt`
4. Budget per cycle: $10 / N cycles (e.g., 3 cycles = $3.33 each)
5. After final cycle: extract all lessons to `~/.claude/commander/knowledge/`

## How to Cancel a Running Build

If the user returns and wants to stop:
1. Read `~/.claude/commander/yolo-status.txt` to see current cycle and progress
2. Use AskUserQuestion: "Stop now and commit what's done" vs "Let the current cycle finish"
3. If stopping: run tests on whatever is built, commit with `wip:` prefix, write status file
4. Extract any lessons learned so far before exiting

## Post-Build Checklist

After autonomous execution completes:
1. Run all tests — report results
2. Fix any test failures (up to 3 retry attempts)
3. Remove any `console.log` debug statements
4. Commit with conventional commit message (e.g., `feat: build X per YOLO spec`)
5. Extract lessons to `~/.claude/commander/knowledge/{timestamp}.json`
6. Write completion summary with: what was built, tests passing, cost, time elapsed

## Attribution
YOLO Mode by Kevin Z — CC Commander (kevinz.ai)
