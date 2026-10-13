---
name: ccc-makeover
description: "Score project health with X-Ray, apply the top recommendations in impact order with your OK for each, and show the before and after score. Use when you want the highest-impact project health fixes applied and measured."
---

# /ccc-makeover — fix the top X-Ray findings

**CC Commander** · /ccc-makeover · baseline score, approved fixes in impact order, and a re-scored before/after.

## Usage

```
/ccc-makeover [--dry-run] [--auto] [--max N] [--category CAT]
```

`$ARGUMENTS`:
- `--dry-run` — list the recommendations and stop; nothing changes
- `--auto` — apply every target without the per-target picker (only when passed in this request)
- `--max N` — at most N targets (default 5)
- `--category CAT` — one dimension: `security`, `testing`, `devops`, `quality`, `docs` or `architecture`

## What happens

1. **Baseline.** Run `/ccc-xray`. With the `ccc` CLI installed, take the numbers from its scorer so the before and after use the same rubric:

   ```bash
   CCC_ROOT="$(cd "$(dirname "$(realpath "$(command -v ccc)")")/.." && pwd)"
   node -e 'const x=require(process.argv[1]+"/commander/xray-report").generateReport(process.cwd());console.log(JSON.stringify({overall:x.health.overall,dimensions:x.health.dimensions,maturity:x.maturity,recs:x.recommendations.map(r=>({skill:r.skill,category:r.category,score:r.score,explanation:r.explanation}))}))' "$CCC_ROOT"
   ```

   Record the overall score, each dimension score and the maturity level. If neither the scorer nor `/ccc-xray` produces a scorecard, stop and report why.

2. **Pick targets.** Sort recommendations by impact score, highest first. Keep only `--category` when given, then at most `--max N`. Show them:

   ```
   Current health: 42/100 (maturity 2 · Managed)
   [1/5] No test files (impact 90) -> /ccc-tdd
   [2/5] No CI pipeline (impact 85) -> ccc-devops
   [3/5] No CLAUDE.md (impact 80) -> project-kickoff
   ```

   If a recommended skill is not installed here, name the closest installed command (for example `/ccc-tdd` for missing tests) and say so. With `--dry-run`, stop here.

3. **Apply, one at a time.** Unless `--auto` was passed, ask for each target with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Apply — run the recommended skill or command for this target
   - Skip — move to the next target
   - Stop — end the makeover and go to step 5

4. **Check each fix.** After every applied target run the project's test command (`npm test`, `pnpm test`, `pytest`, `go test ./...` or `cargo test`, whichever the repo uses) and `git status --short`. On a failure, stop and ask:
   - 🟢 Fix it — make a targeted fix and rerun the tests
   - Keep the changes and stop — report the failure as open
   - Revert this target — `git restore` the files it touched, after confirming, since it discards those edits

5. **Re-score.** Rerun step 1 with the same scope. Compute the delta per dimension and overall from the two scorecards, not from memory:

   ```
   Before: 42/100 (2 · Managed)   After: 71/100 (3 · Defined)   +29
   security 40 -> 40 · testing 10 -> 70 · devops 20 -> 65 · docs 50 -> 80
   ```

6. **Record.** Write `tasks/makeover-<YYYYMMDD>.md` with the baseline and final scores, maturity before and after, each target as applied, skipped or failed, and every test command run with its result. Confirm with `ls -la tasks/makeover-<YYYYMMDD>.md`.

## Done when

- The final score came from a re-scan in this turn, every applied target has a recorded test result, and the makeover file exists.

## Guardrails

- Never apply a target without the step 3 answer unless `--auto` was passed in this request.
- Never report a score improvement without the step 5 re-scan.
- Never continue past a failing test run without the user's choice.
- Never commit, push or open a PR; hand off to `/ccc-pr` when the user wants that.

## See also

- `/ccc-xray` — the scan and recommendations this builds on
- `/ccc-quality-gate` — gate the changes
- `/ccc-test-coverage` — fill test gaps the scan finds
