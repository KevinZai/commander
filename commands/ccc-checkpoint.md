---
description: "Create, verify, list or clear named workflow checkpoints: a verified git snapshot logged with its SHA, compared later for changed files, tests and build. Use before risky steps and at feature milestones."
---

# /ccc-checkpoint — named workflow checkpoints

**CC Commander** · /ccc-checkpoint · snapshot a known-good state, then measure drift against it.

## Arguments

`$ARGUMENTS`: `create <name>` · `verify <name>` · `list` · `clear` (keeps the last 5).

The log is `.claude/checkpoints.log`, one line per checkpoint:

```
<YYYY-MM-DD-HH:MM> | <name> | <sha> | build=<PASS|FAIL> tests=<passed>/<failed|-> coverage=<pct|->
```

## Create

1. Run `/ccc-verify quick` (build and types). If it fails, report the errors and ask (AskUserQuestion, plain-text question where unavailable): 🟢 Stop and fix first · Create the checkpoint anyway, recorded as `build=FAIL`.
2. Ask how to snapshot:
   - 🟢 Commit — stage the tracked changes and commit as `chore: checkpoint <name>`.
   - Snapshot without committing — record a stash object that leaves the working tree untouched.

   ```bash
   # Commit
   git add -u && git commit -m "chore: checkpoint <name>"
   SHA=$(git rev-parse --short HEAD)

   # Snapshot without committing (falls back to HEAD when the tree is clean)
   SHA=$(git stash create "checkpoint <name>"); SHA=${SHA:-$(git rev-parse HEAD)}
   git stash store -m "checkpoint <name>" "$SHA" 2>/dev/null; SHA=$(git rev-parse --short "$SHA")
   ```

3. Append the log line, filling tests and coverage only if a test run happened in this step (otherwise `-`).

   ```bash
   mkdir -p .claude && echo "$(date +%Y-%m-%d-%H:%M) | <name> | $SHA | build=<PASS|FAIL> tests=- coverage=-" >> .claude/checkpoints.log
   ```

4. Verify with `tail -1 .claude/checkpoints.log` and `git cat-file -t $SHA` (expects `commit`), then report the name and SHA.

## Verify

1. Read the line for `<name>` from the log. If it is missing, list the available names and stop.
2. Compare the current state with the checkpoint SHA.

   ```bash
   git diff --name-status <sha>      # A = added, M = modified, D = deleted
   git diff --stat <sha>
   ```

3. Run `/ccc-verify` for the current build, test and coverage results.
4. Report:

   ```
   CHECKPOINT COMPARISON: <name>
   Files changed: <n> (added <a>, modified <m>, deleted <d>)
   Tests: <now> vs <then, or "not recorded">
   Coverage: <now> vs <then, or "not recorded">
   Build: <PASS|FAIL>
   ```

## List

Print every log line as a table of name, timestamp, SHA and status, where status comes from `git merge-base --is-ancestor <sha> HEAD`: `current` when the SHA equals HEAD, `behind` when HEAD contains it, `snapshot` when it is a stash entry (`git stash list --format=%h`), `diverged` otherwise.

## Clear

Ask first: 🟢 Keep all checkpoints · Trim the log to the last 5. Only on the second choice:

```bash
tail -n 5 .claude/checkpoints.log > .claude/checkpoints.log.tmp && mv .claude/checkpoints.log.tmp .claude/checkpoints.log
wc -l .claude/checkpoints.log
```

This trims the log only; commits and stash entries stay in git.

## Typical flow

```
/ccc-checkpoint create feature-start
  implement → /ccc-checkpoint create core-done
  test      → /ccc-checkpoint verify core-done
  refactor  → /ccc-checkpoint create refactor-done
  PR        → /ccc-checkpoint verify feature-start
```

## Done when

The command's verification output is shown: the new log line and SHA type for `create`, the comparison block for `verify`, the table for `list`, the remaining line count for `clear`.

## Guardrails

- Never push, amend, reset, or drop a stash as part of a checkpoint.
- Stage tracked changes only (`git add -u`); never add untracked files without the user naming them.

## See also

`/ccc-verify` · `/ccc-careful` · `/ccc-feature-start`
