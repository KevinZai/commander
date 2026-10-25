---
name: ccc-makeover
description: "Score project health with $ccc-xray, apply the top fixes one at a time with your OK, and show a before/after report card. Use to fix top issues."
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
---

# $ccc-makeover — audit, fix, re-score

**CC Commander** · $ccc-makeover · X-Ray score, approved fixes in impact order, and a before/after report card.

`$ccc-xray` owns the scan, its dimensions and its scoring rubric; this skill does not redefine them. The user's selected model is preserved.

Codex: invoke `$ccc-xray` and ask each picker as a plain-text question.

## When to use / when not to

- Use on an unfamiliar codebase, before a release, after a sprint to measure improvement, or when someone asks "how healthy is this codebase?".
- Use `$ccc-xray` alone for a read-only score, `$ccc-code-review` (or `/code-review ultra`) for a line-level review, `$ccc-design` for a visual refresh.

## What happens

### 1. Pick the mode

An argument (`xray`, `makeover`, `report-card`) or a clear intent selects the mode. Otherwise ask with AskUserQuestion (header "Makeover"):

- 🟢 X-Ray scan — score the project; nothing changes
- Makeover — scan, then fix the top recommendations one at a time with your OK
- Report card — current scores, maturity level and history from earlier makeovers

### 2. X-Ray

Invoke the `ccc-xray` skill with the Skill tool. Use its scorecard as-is: per-dimension 0–100 scores, its health bands and its fix-first rule.

### 3. Makeover

1. **Baseline.** Invoke `ccc-xray` with the full scope (or the `--category` focus). Record the overall score and each dimension score.
2. **Pick targets.** Take the critical rows, then the needs-attention rows, ordered by `$ccc-xray`'s fix-first rule (security first, then CI when nothing deploys, then lowest score). Keep at most `--max N` (default 5). With `--category CAT`, keep only that dimension.
3. **Dry run.** With `--dry-run`, list the targets with their recommended fix and stop.
4. **Apply, one at a time.** For each target ask with AskUserQuestion:
   - 🟢 Apply — run the recommended skill or targeted fix
   - Skip — move to the next target
   - Stop — end the makeover and go to step 6
   Skip the question only when the user passed `--auto` in this request.
5. **Check each fix.** After every applied target, run the project's test command (`npm test`, `pnpm test`, `pytest`, `go test ./...` or `cargo test`, whichever the repo uses) and `git status --short`. On a failure, stop and ask:
   - 🟢 Fix it — make a targeted fix and re-run the tests
   - Keep the changes and stop — report the failure as open
   - Revert this target — `git restore` the files it touched (asks for confirmation first, since it discards those edits)
6. **Re-score.** Invoke `ccc-xray` again with the same scope. Compute the delta per dimension and overall from the two scorecards, not from memory.
7. **Record.** Write `tasks/makeover-<YYYYMMDD>.md`: baseline and final scores, maturity level before and after, each target as applied / skipped / failed, and the test commands run with their results.

### 4. Report card

1. Use this session's latest `$ccc-xray` scorecard; if there is none, invoke `ccc-xray` with the quick scope.
2. Read every `tasks/makeover-*.md` (`ls tasks/makeover-*.md 2>/dev/null`) for history.
3. Render one bar per dimension, ten blocks per 100 points (`███████░░░ 72`), the overall score, the maturity level, and a history row per earlier makeover (date, before → after).

Maturity level from the overall score:

| Overall | Level |
|---|---|
| 90–100 | 5 · Optimizing |
| 80–89 | 4 · Measured |
| 60–79 | 3 · Defined |
| 40–59 | 2 · Managed |
| 0–39 | 1 · Initial |

## Done when

- X-Ray: the scorecard came from `ccc-xray` in this turn.
- Makeover: the final scorecard came from a re-scan in this turn, every applied target has a recorded test result, and `tasks/makeover-<YYYYMMDD>.md` exists (`ls -la tasks/makeover-<YYYYMMDD>.md`).
- Report card: every number shown traces to a scorecard or a `tasks/makeover-*.md` file.

## Guardrails

- Never apply a fix without the step 3.4 picker unless `--auto` was passed in this request.
- Never report a score improvement without the step 3.6 re-scan.
- Never continue past a failing test run without the user's choice.
- Never commit, push, or open a PR; when the user wants that, ask them to type `$ccc-ship` (it is not invocable from here).
- Never discard edits without an explicit confirmation.

## See also

- `$ccc-xray` — the scanner and rubric this skill builds on
- `$ccc-code-review` — line-level review of the changes
- `$ccc-testing` — fill the test gaps the scan finds
- `$ccc-ship` — release once the score is where you want it

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
