---
name: deploy-check
description: "Pre-deployment readiness gate — returns GO / CAUTION / NO-GO with reasoning"
usage: /deploy-check [environment]
version: 1.3.0
---

# Deploy Check — Pre-Deployment Readiness Gate

You are performing a comprehensive pre-deployment readiness check for **{{input}}**.

## Check Sequence

Run these checks in parallel where possible:

### 1. Git Status
- Run `git status` — any uncommitted changes?
- Run `git log --oneline -5` — recent commits look clean?
- Check if branch is ahead/behind remote
- Verify you're on the correct branch (not main/master unless deploying from main)

### 2. Test Suite
- Run the project's test command (detect from package.json, Makefile, etc.)
- Report pass/fail count
- Flag any skipped tests

### 3. Build Verification
- Run the build command
- Report success/failure
- Check for warnings

### 4. Code Quality
- Run linter if configured
- Check for `console.log` in source files
- Check for TODO/FIXME comments in recently changed files
- Verify no `.env` files are staged

### 5. Environment Check
- Compare `.env.example` (if exists) against required variables
- Flag any missing environment variables for target environment
- Check for hardcoded URLs or credentials

### 6. Dependency Audit
- Check for known vulnerabilities (`npm audit` / equivalent)
- Verify lock file is up to date

## Decision Matrix

Based on results, output ONE of:

```
DEPLOY CHECK: GO
All checks passed. Safe to deploy.
```

```
DEPLOY CHECK: CAUTION
Checks passed with warnings. Review before deploying:
- [list warnings]
```

```
DEPLOY CHECK: NO-GO
Critical issues found. Do NOT deploy:
- [list blockers]
```

## Output Format

```
DEPLOY CHECK: [GO/CAUTION/NO-GO]
Target: {{input}}
Branch: [branch name]
Commit: [short hash] [message]

Tests:     [X/Y passed]
Build:     [OK/FAIL]
Lint:      [OK/X issues]
Git:       [clean/dirty]
Deps:      [OK/X vulnerabilities]
Env:       [OK/X missing vars]

[If CAUTION or NO-GO, list specific issues with fix suggestions]
```
