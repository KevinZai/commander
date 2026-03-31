---
name: ccc-xray
description: Run a full project health scan across 6 dimensions and get actionable skill recommendations
---

# /ccc-xray

Run a comprehensive project X-Ray analysis.

## What It Does

1. **Scans** the current project for signals across 6 dimensions:
   - Security (secrets, lockfiles, dependency age)
   - Testing (coverage, E2E, test files)
   - DevOps (CI/CD, Docker, deploy config)
   - Quality (linting, formatting, file sizes)
   - Documentation (README, CLAUDE.md, API docs)
   - Architecture (error handling, validation, modularity)

2. **Scores** each dimension 0-100 and calculates overall health

3. **Assigns maturity level** (1-5: Initial through Optimizing)

4. **Recommends skills** sorted by impact score

## Usage

```
/ccc-xray
```

## Output

Markdown report with:
- Overall health score and maturity level
- Per-dimension score bars
- Prioritized recommendations with skill links
- Quick-fix commands for each finding
