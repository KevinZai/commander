---
name: ccc-retro
description: "Generate a retrospective for a period: what shipped, commit and churn metrics, hotspots, cost when a source exists, and reflection questions. Use at the end of a week, sprint or month, or when the user asks for a retro."
usage: /ccc-retro [week|sprint|month|YYYY-MM-DD..YYYY-MM-DD]
version: 1.3.0
---

# /ccc-retro — productivity retrospective

**CC Commander** · /ccc-retro · a scannable report of what shipped in the period, where the churn was, and what to change next.

## Arguments

Parse the period from `$ARGUMENTS`:

| Input | Range |
|---|---|
| empty or `week` | last 7 days |
| `sprint` | last 14 days |
| `month` | last 30 days |
| `YYYY-MM-DD..YYYY-MM-DD` | explicit range, inclusive |

Set `SINCE` and `UNTIL` (for example `SINCE="7 days ago"`, `UNTIL="now"`, or the two dates). Reject any other input with the accepted forms and stop.

## What happens

1. **Confirm a repository.** Run `git rev-parse --show-toplevel`; if it fails, say a retro needs a git repository and stop. Record the repo name and `git branch --show-current`.
2. **Gather git data** (run these in parallel):

   ```bash
   git log --since="$SINCE" --until="$UNTIL" --oneline --no-merges
   git rev-list --count --no-merges --since="$SINCE" --until="$UNTIL" HEAD
   git shortlog -sn --no-merges --since="$SINCE" --until="$UNTIL" HEAD
   git log --since="$SINCE" --until="$UNTIL" --no-merges --numstat --format="" \
     | awk '{a+=$1; d+=$2} END {print "added", a+0, "removed", d+0}'
   git log --since="$SINCE" --until="$UNTIL" --no-merges --name-only --format="" \
     | sort | uniq -c | sort -rn | head -10
   git log --since="$SINCE" --until="$UNTIL" --no-merges --name-only --format="" \
     | awk 'NF' | xargs -n1 dirname | sort | uniq -c | sort -rn | head -5
   git log --since="$SINCE" --until="$UNTIL" --no-merges --format="%ad" --date=format:%a | sort | uniq -c
   git log --since="$SINCE" --until="$UNTIL" --no-merges --shortstat --format="%h %s"
   ```

   If the commit count is 0, report "No commits in this period" with the range and skip to step 5.
3. **Gather session and cost data**, each optional:
   - Claude Code transcripts for this project: files under `~/.claude/projects/` whose directory name matches the repo path, modified within the period (`find ~/.claude/projects -name '*.jsonl' -newermt "<start date>"`). Count them as sessions.
   - Cost: use `/ccc-cost`'s sources. When `ccusage` is installed (opt-in, absent by default; `command -v ccusage`), run `ccusage daily --json --since <YYYYMMDD> --until <YYYYMMDD>` and sum the period. Otherwise write "Session cost data not available for this period."
4. **Analyze:**
   - Group commit subjects by conventional-commit type (`feat`, `fix`, `refactor`, then `docs`/`test`/`chore`).
   - Work distribution: share of commits per type.
   - Churn: files changed 5 or more times in the period; flag them as possible design issues.
   - Large changesets: commits touching 10 or more files; note whether they could have been split.
   - Streaks: days with zero commits and unusually busy days.
   - Largest commit by lines changed, from the `--shortstat` output.
5. **Write the report** in the format below, then ask the reflection questions.

## Output format

```text
RETRO: <period description>
Project: <repo name> · Branch: <branch> · Period: <start> → <end>
```

**Shipping summary**

| Metric | Value |
|---|---|
| Commits | <n> |
| Files changed | <n> |
| Lines added / removed | +<n> / -<n> |
| Net lines | <±n> |
| Contributors | <n> |

**What shipped** — key `feat:` and `fix:` items, then `refactor:`, then a one-line summary of docs, test and chore work.

**Productivity**

| Metric | Value |
|---|---|
| Avg commits per day | <n> |
| Most active day | <day, count> |
| Largest commit | <hash — subject, ±n lines> |

Most changed files (top 5) and most active directories (top 3), each as `path — n changes`.

**Cost and usage** — sessions, cost for the period, models reported by the source; or the "not available" line.

**Patterns and observations** — distribution, churn, large changesets, streaks.

**Retrospective** — ask the user, in plain text:

1. What shipped that you are most proud of?
2. What took longer than expected, and why?
3. What would you do differently next period?
4. Is tech debt accumulating that needs attention?

Use tables for metrics and bullets for detail. Omit any section whose data is unavailable instead of printing an empty table.

## Done when

Every number in the report comes from a command run in this session, and the reflection questions have been asked.

## Guardrails

- Read-only: no commits, file writes or tracker updates. Saving the retro or posting it anywhere needs the user's request.
- Do not estimate cost when no cost source answered.

## See also

`/ccc-cost` · `/ccc-compound` · `/ccc-status` · the `retro` skill (adapted from gstack's retro)
