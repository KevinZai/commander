---
name: retro
description: "[C:meta] — Periodic productivity retrospective — shipping summary, metrics, cost tracking, and reflection"
usage: /retro [week|sprint|month|YYYY-MM-DD..YYYY-MM-DD]
version: 1.3.0
---

# Retro — Productivity Retrospective
> Inspired by [gstack](https://github.com/garrytan/gstack) by Garry Tan

You are generating a productivity retrospective report for the current project.

## Parse Period

Determine the time range from **{{input}}**:
- Empty or `week` → last 7 days
- `sprint` → last 14 days
- `month` → last 30 days
- `YYYY-MM-DD..YYYY-MM-DD` → explicit date range

Set `$SINCE` and `$UNTIL` accordingly (e.g. `--since="7 days ago"`).

## Gather Data

Run these in parallel:

### 1. Git History
```bash
git log --since="$SINCE" --oneline --stat
git shortlog -sn --since="$SINCE"
git log --since="$SINCE" --format="%H" | wc -l
git diff --stat $(git log --since="$SINCE" --reverse --format="%H" | head -1)^..HEAD 2>/dev/null
```

### 2. Change Hotspots
```bash
git log --since="$SINCE" --name-only --format="" | sort | uniq -c | sort -rn | head -10
git log --since="$SINCE" --name-only --format="" | xargs -I{} dirname {} | sort | uniq -c | sort -rn | head -5
```

### 3. Session Data
- Check `~/.claude/sessions/` for session files modified within the period
- Count total sessions and estimate duration from file timestamps if possible
- Look for cost data in session metadata (model usage, token counts)

## Generate Report

Output the report using this structure:

```
RETRO: [period description]
Project: [repo name]
Branch: [current branch]
Period: [start date] → [end date]
```

### Shipping Summary

| Metric | Value |
|--------|-------|
| Total commits | N |
| Files changed | N |
| Lines added | +N |
| Lines removed | -N |
| Net LOC | +/-N |
| Contributors | N |

**What shipped** — group commits by conventional commit type:
- **feat:** list key features
- **fix:** list key fixes
- **refactor:** list refactors
- **docs/test/chore:** summarize briefly

### Productivity Metrics

| Metric | Value |
|--------|-------|
| Avg commits/day | N |
| Most active day | [day, count] |
| Largest commit | [hash — summary, +/-N lines] |

**Most changed files (top 5):**
1. `path/to/file` — N changes
2. ...

**Most active directories (top 3):**
1. `path/` — N changes
2. ...

### Cost & Usage

_If session data is available:_

| Metric | Value |
|--------|-------|
| Sessions | N |
| Estimated cost | $X.XX |
| Models used | list |

_If no session data found, note: "Session cost data not available for this period."_

### Patterns & Observations

Analyze and report:
- **Work distribution:** What percentage was features vs fixes vs refactoring vs docs?
- **Churn indicators:** Any files changed 5+ times? Flag them as potential design issues.
- **Large changesets:** Any single commit touching 10+ files? Could it have been split?
- **Streaks:** Any days with zero commits? Any unusually productive days?

### Retrospective

Ask the user these reflection questions:

> 1. What shipped that you're most proud of?
> 2. What took longer than expected? Why?
> 3. What would you do differently next period?
> 4. Is there tech debt accumulating that needs attention?

---

Keep the report scannable. Use tables for metrics, bullet lists for details. Skip any section where data is unavailable rather than showing empty tables.
