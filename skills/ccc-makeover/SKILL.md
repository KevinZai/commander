---
name: ccc-makeover
description: "Score project health with an X-Ray scan, apply the top recommendations one at a time with the user's OK, and show a before/after report card. Use when the user asks for a health check, wants the top issues fixed, or asks for a project score or report card."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
argument-hint: "[xray | makeover | report-card] [--dry-run] [--auto] [--max N] [--category CAT]"
model: inherit
effort: medium
disable-model-invocation: true
---

# /ccc-makeover — audit, fix, re-score

**CC Commander** · ccc-makeover · an X-Ray score, approved fixes in impact order, and a before/after report card.

This domain has no sub-skill directories. It runs three modes, and the scan in every mode comes from `/ccc-xray` (the `ccc-xray` skill when the Commander plugin is installed, otherwise the toolkit command `commands/ccc-xray.md`). `/ccc-xray` owns the dimensions, scoring and maturity levels; this skill never redefines them. The user's selected model is preserved.

Codex: invoke `$ccc-xray` and ask each picker as a plain-text question.

## Modes

| Mode | What it does |
|---|---|
| `xray` | Read-only health scan: per-dimension scores, overall score, maturity level, ranked recommendations |
| `makeover` | Baseline scan, apply the top recommendations one at a time, re-scan, record the delta |
| `report-card` | Score bars per dimension, maturity level and history from earlier makeovers |

Scan dimensions: Security (secrets exposure, lockfiles, dependency age) · Testing (coverage, E2E, test files) · DevOps (CI/CD, Docker, deploy config) · Quality (linting, formatting, file size) · Documentation (README, CLAUDE.md, API docs) · Architecture (error handling, input validation, modularity).

## When to use / when not to

- Use on an unfamiliar codebase, before a release, after a sprint to measure improvement, or when someone asks how healthy the codebase is.
- Use `/ccc-xray` alone for a scan with no follow-up, `ccc-design` for a visual refresh, `ccc-security` for a focused security review.

## What happens

1. **Pick the mode.** An argument or a clear intent selects it. Otherwise ask with AskUserQuestion (header "Makeover"):

   - 🟢 X-Ray scan — score the project; nothing changes
   - Makeover — scan, then fix the top recommendations one at a time with your OK
   - Report card — current scores and history from earlier makeovers

2. **X-Ray.** Invoke `ccc-xray` with the Skill tool (or follow `commands/ccc-xray.md`). Present its scorecard as-is.

3. **Makeover.**
   1. Baseline: run the X-Ray scan (full scope, or the `--category` dimension: security, testing, devops, quality, docs, architecture). Record the overall and per-dimension scores.
   2. Targets: take the recommendations in X-Ray's impact order; keep at most `--max N` (default 5).
   3. Dry run: with `--dry-run`, list the targets with their recommended fix and stop.
   4. Apply one at a time. For each target ask with AskUserQuestion: 🟢 Apply — run the recommended skill or fix · Skip — next target · Stop — go to step 6. Skip the question only when `--auto` was passed in this request.
   5. Check each fix: run the project's test command (`npm test`, `pnpm test`, `pytest`, `go test ./...` or `cargo test`, whichever the repo uses) and `git status --short`. On failure, stop and ask: 🟢 Fix it and re-run · Keep the changes and stop, reporting the failure · Revert this target with `git restore <files>` (confirm first; it discards those edits).
   6. Re-score: run the X-Ray scan again with the same scope. Compute each delta from the two scorecards, not from memory.
   7. Record: write `tasks/makeover-<YYYYMMDD>.md` with baseline and final scores, maturity before and after, each target as applied, skipped or failed, and the test commands run with their results.

4. **Report card.** Use this session's latest scorecard, or run the scan. Read history with `ls tasks/makeover-*.md 2>/dev/null`. Render one bar per dimension, ten blocks per 100 points (`███████░░░ 72`), the overall score, the maturity level, and one history row per earlier makeover (date, before → after).

## Done when

- X-Ray: the scorecard came from a scan run in this turn.
- Makeover: the final scorecard came from the step 3.6 re-scan, every applied target has a recorded test result, and `ls -la tasks/makeover-<YYYYMMDD>.md` shows the record.
- Report card: every number shown traces to a scorecard or a `tasks/makeover-*.md` file.

## Guardrails

- Never apply a fix without the step 3.4 picker unless `--auto` was passed in this request.
- Never report a score improvement without the re-scan.
- Never continue past a failing test run without the user's choice.
- Never discard edits without explicit confirmation.
- Never commit, push or open a PR; those need authorization in this conversation and belong to the ship workflow.

## See also

- `/ccc-xray` — the scanner and rubric this skill builds on
- `ccc-testing` — fill the test gaps the scan finds
- `ccc-security` — deeper security review
- `ccc-devops` — CI/CD and deploy gaps
