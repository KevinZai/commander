---
name: dispatch-templates
description: |
  Pre-built Dispatch task templates for common background workflows. 8 ready-to-use
  templates: overnight-build, batch-review, dependency-update, security-scan,
  performance-benchmark, content-generation, data-migration, monitoring-setup.
  Each includes description, duration, cost estimate, permissions, and config.
triggers:
  - /dispatch-templates
  - dispatch template
  - background task template
  - dispatch recipe
disable-model-invocation: true
---

# Dispatch Templates

Pre-built templates for common Dispatch (background task) workflows. Copy, customize, and run. Each template includes everything needed for reliable unattended execution.

## Template Format

Every template provides:
- **Description** -- what the task does
- **Estimated Duration** -- typical wall-clock time
- **Estimated Cost** -- rough dollar estimate per run
- **Max Turns** -- recommended `--max-turns` setting
- **Permissions** -- required `.claude/settings.json` entries
- **Config** -- customizable parameters
- **Task Prompt** -- the exact prompt to pass to `claude --headless`
- **Checkpoint Schema** -- structure for crash recovery
- **Cron Schedule** -- suggested schedule (if recurring)

## Template 1: Overnight Build

Full CI pipeline executed overnight. Runs lint, typecheck, test, build, and optional E2E.

### Metadata

| Field | Value |
|---|---|
| Duration | 30 min -- 2 hours |
| Cost | $1.00 -- $5.00 |
| Max Turns | 80 |
| Schedule | `0 1 * * *` (daily at 1:00 AM) |
| Bible Skills | verification-loop, coding-standards |

### Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm run *)",
      "Bash(pnpm run *)",
      "Bash(npx tsc --noEmit)",
      "Bash(npx vitest *)",
      "Bash(npx playwright *)",
      "Read(*)",
      "Write(output/dispatch/builds/**)",
      "Write(tasks/checkpoint.json)"
    ]
  }
}
```

### Config

```json
{
  "template": "overnight-build",
  "config": {
    "steps": ["lint", "typecheck", "test", "build", "e2e"],
    "skipOnFailure": false,
    "e2eEnabled": true,
    "notifyOnComplete": true,
    "notifyMethod": "file",
    "outputDir": "output/dispatch/builds"
  }
}
```

### Task Prompt

```
Execute the overnight build pipeline. Read tasks/checkpoint.json for state.

Steps to execute in order:
1. LINT: Run npm run lint (or pnpm run lint). Capture warnings and errors.
2. TYPECHECK: Run npx tsc --noEmit. Capture type errors.
3. TEST: Run npm test (or pnpm test). Capture test results and coverage.
4. BUILD: Run npm run build (or pnpm run build). Verify output exists.
5. E2E (if enabled): Run npx playwright test. Capture results.

For each step:
- Update tasks/checkpoint.json with step name, status, start time
- Write step output to output/dispatch/builds/steps/{step-name}.log
- If step fails and skipOnFailure is false, log error and continue to next step
- If step fails and skipOnFailure is true, stop pipeline

After all steps:
- Write summary to output/dispatch/builds/{date}.md with pass/fail per step
- Set checkpoint status to "complete" or "partial"
- Write tasks/dispatch-complete.json notification flag
```

### Checkpoint Schema

```json
{
  "task": "overnight-build",
  "status": "in-progress",
  "startedAt": "2026-03-28T01:00:00Z",
  "currentStep": "test",
  "steps": {
    "lint": { "status": "pass", "duration": "12s", "warnings": 3 },
    "typecheck": { "status": "pass", "duration": "8s", "errors": 0 },
    "test": { "status": "running", "startedAt": "2026-03-28T01:01:00Z" },
    "build": { "status": "pending" },
    "e2e": { "status": "pending" }
  },
  "errors": []
}
```

---

## Template 2: Batch Review

Automated code review across multiple PRs or commits.

### Metadata

| Field | Value |
|---|---|
| Duration | 20 min -- 1 hour |
| Cost | $0.50 -- $3.00 |
| Max Turns | 60 |
| Schedule | `0 16 * * 5` (Friday 4:00 PM) |
| Bible Skills | coding-standards, review, pentest-checklist |

### Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(git log *)",
      "Bash(git show *)",
      "Bash(git diff *)",
      "Bash(gh pr list *)",
      "Bash(gh pr view *)",
      "Bash(gh pr review *)",
      "Read(**)",
      "Write(output/dispatch/reviews/**)",
      "Write(tasks/checkpoint.json)"
    ]
  }
}
```

### Config

```json
{
  "template": "batch-review",
  "config": {
    "scope": "week",
    "minSeverity": "medium",
    "autoPostReview": false,
    "includeSecurityCheck": true,
    "maxCommits": 50,
    "outputDir": "output/dispatch/reviews"
  }
}
```

### Task Prompt

```
Run batch code review for the past week.

1. Run git log --since="1 week ago" --oneline --no-merges to list recent commits.
2. For each commit (up to 50):
   a. Run git show {hash} to read the diff
   b. Check against coding-standards rules:
      - File size (<800 lines)
      - Function size (<50 lines)
      - No deep nesting (>4 levels)
      - Proper error handling
      - No hardcoded secrets
   c. Check for security issues: SQL injection, XSS, CSRF, exposed secrets
   d. Note missing or insufficient tests
   e. Rate severity: critical, high, medium, low
3. Write individual commit reviews to output/dispatch/reviews/commits/{hash}.md
4. Write aggregated review to output/dispatch/reviews/week-{date}.md
5. Format: ## Summary, ## Issues (grouped by severity), ## Recommendations
6. Update tasks/checkpoint.json after each commit review
```

### Checkpoint Schema

```json
{
  "task": "batch-review",
  "status": "in-progress",
  "scope": "2026-03-21..2026-03-28",
  "totalCommits": 32,
  "reviewedCommits": 15,
  "lastReviewed": "abc1234",
  "findings": {
    "critical": 0,
    "high": 2,
    "medium": 5,
    "low": 8
  }
}
```

---

## Template 3: Dependency Update

Safe dependency updates with test verification and rollback.

### Metadata

| Field | Value |
|---|---|
| Duration | 15 min -- 45 min |
| Cost | $0.50 -- $2.00 |
| Max Turns | 50 |
| Schedule | `0 6 * * 1` (Monday 6:00 AM) |
| Bible Skills | verification-loop |

### Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(npm outdated *)",
      "Bash(npm audit *)",
      "Bash(npm update *)",
      "Bash(npm install *)",
      "Bash(pnpm outdated *)",
      "Bash(pnpm update *)",
      "Bash(pnpm install *)",
      "Bash(npx tsc --noEmit)",
      "Bash(npm test)",
      "Bash(pnpm test)",
      "Bash(git *)",
      "Bash(gh pr create *)",
      "Read(**)",
      "Write(package*.json)",
      "Write(pnpm-lock.yaml)",
      "Write(output/dispatch/deps/**)",
      "Write(tasks/checkpoint.json)"
    ]
  }
}
```

### Config

```json
{
  "template": "dependency-update",
  "config": {
    "updateLevel": "minor",
    "createPR": true,
    "branchName": "deps/auto-update-{date}",
    "runTests": true,
    "runTypecheck": true,
    "rollbackOnFailure": true,
    "outputDir": "output/dispatch/deps"
  }
}
```

### Task Prompt

```
Run safe dependency updates.

1. Create branch deps/auto-update-{date} from main.
2. Run npm outdated (or pnpm outdated) to list available updates.
3. Filter updates by level: only patch and minor (no major unless explicitly listed).
4. For each update:
   a. Install the update
   b. Run npx tsc --noEmit (typecheck)
   c. Run npm test (or pnpm test)
   d. If both pass: keep update, record in checkpoint
   e. If either fails: revert update (git checkout package*.json pnpm-lock.yaml),
      log failure reason in checkpoint
5. Run npm audit to check for known vulnerabilities.
6. Write report to output/dispatch/deps/{date}.md:
   - Updated packages (name, old version, new version)
   - Failed updates (name, reason)
   - Remaining vulnerabilities from audit
7. If any updates succeeded and createPR is true:
   - Commit changes with message "chore(deps): auto-update dependencies"
   - Create PR via gh pr create with the report as body
8. Update tasks/checkpoint.json with final status.
```

### Checkpoint Schema

```json
{
  "task": "dependency-update",
  "status": "in-progress",
  "branch": "deps/auto-update-2026-03-28",
  "updates": {
    "succeeded": [
      { "name": "@types/node", "from": "20.11.0", "to": "20.12.0" }
    ],
    "failed": [
      { "name": "vitest", "from": "1.6.0", "to": "1.7.0", "reason": "test failures" }
    ],
    "skipped": [
      { "name": "next", "from": "14.0.0", "to": "15.0.0", "reason": "major version" }
    ]
  },
  "auditFindings": 2,
  "prUrl": null
}
```

---

## Template 4: Security Scan

Comprehensive security audit combining dependency audit, secret scanning, and code analysis.

### Metadata

| Field | Value |
|---|---|
| Duration | 15 min -- 30 min |
| Cost | $0.50 -- $2.00 |
| Max Turns | 40 |
| Schedule | `0 3 * * 0` (Sunday 3:00 AM) |
| Bible Skills | pentest-checklist, harden |

### Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(npm audit *)",
      "Bash(pnpm audit *)",
      "Bash(git log *)",
      "Bash(git diff *)",
      "Read(**)",
      "Write(output/dispatch/security/**)",
      "Write(tasks/checkpoint.json)"
    ]
  }
}
```

### Config

```json
{
  "template": "security-scan",
  "config": {
    "scanDependencies": true,
    "scanSecrets": true,
    "scanCode": true,
    "scanPermissions": true,
    "severityThreshold": "medium",
    "outputDir": "output/dispatch/security"
  }
}
```

### Task Prompt

```
Run comprehensive security scan.

Phase 1 -- Dependency Audit:
- Run npm audit (or pnpm audit)
- Catalog vulnerabilities by severity (critical, high, medium, low)
- For critical/high: note available fix version

Phase 2 -- Secret Scanning:
- Search codebase for patterns: API keys, tokens, passwords, connection strings
- Patterns: /[A-Za-z0-9]{32,}/, /sk-[a-zA-Z0-9]+/, /-----BEGIN.*KEY-----/
- Check .env files are in .gitignore
- Verify no secrets in git history (last 100 commits): git log -p --all -S 'password' --since="3 months ago"

Phase 3 -- Code Analysis:
- Check for SQL injection (raw query strings with interpolation)
- Check for XSS (unescaped HTML output)
- Check for insecure HTTP (non-HTTPS URLs in production code)
- Check for eval() or Function() usage
- Check for unsafe deserialization

Phase 4 -- Permission Review:
- Review .claude/settings.json for overly broad permissions
- Check for any --dangerously-skip-permissions usage in scripts
- Verify CORS configuration

Write security report to output/dispatch/security/{date}.md:
- Executive summary (pass/fail with severity counts)
- Detailed findings grouped by phase
- Remediation recommendations with priority
Update tasks/checkpoint.json after each phase.
```

### Checkpoint Schema

```json
{
  "task": "security-scan",
  "status": "in-progress",
  "currentPhase": "secret-scanning",
  "phases": {
    "dependency-audit": { "status": "complete", "findings": 3 },
    "secret-scanning": { "status": "running" },
    "code-analysis": { "status": "pending" },
    "permission-review": { "status": "pending" }
  },
  "totalFindings": 3,
  "criticalFindings": 0
}
```

---

## Template 5: Performance Benchmark

Run performance benchmarks and track regressions over time.

### Metadata

| Field | Value |
|---|---|
| Duration | 20 min -- 1 hour |
| Cost | $0.50 -- $2.00 |
| Max Turns | 50 |
| Schedule | `0 2 * * 3` (Wednesday 2:00 AM) |
| Bible Skills | benchmark |

### Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run bench*)",
      "Bash(pnpm run bench*)",
      "Bash(npx vitest bench *)",
      "Bash(node --max-old-space-size=* *)",
      "Bash(hyperfine *)",
      "Bash(git log *)",
      "Read(**)",
      "Write(output/dispatch/benchmarks/**)",
      "Write(tasks/checkpoint.json)"
    ]
  }
}
```

### Config

```json
{
  "template": "performance-benchmark",
  "config": {
    "suites": ["api", "rendering", "database", "startup"],
    "iterations": 3,
    "warmupIterations": 1,
    "regressionThreshold": 10,
    "compareWith": "main",
    "outputDir": "output/dispatch/benchmarks"
  }
}
```

### Task Prompt

```
Run performance benchmarks and compare against baseline.

1. Load previous benchmark results from output/dispatch/benchmarks/baseline.json
   (if it doesn't exist, this run becomes the baseline).
2. For each benchmark suite:
   a. Run warmup iteration (discard results)
   b. Run 3 measured iterations
   c. Calculate: mean, median, p95, min, max
   d. Compare against baseline
   e. Flag regressions >10% as warnings, >25% as critical
3. Write results to output/dispatch/benchmarks/{date}.json (structured)
4. Write human-readable report to output/dispatch/benchmarks/{date}.md:
   - Summary table: suite, current, baseline, change %
   - Regressions highlighted
   - Improvements noted
5. If no regressions, update baseline.json with current results.
6. Update tasks/checkpoint.json after each suite.
```

### Checkpoint Schema

```json
{
  "task": "performance-benchmark",
  "status": "in-progress",
  "currentSuite": "rendering",
  "suites": {
    "api": {
      "status": "complete",
      "mean": 45.2,
      "baseline": 42.1,
      "changePercent": 7.4,
      "regression": false
    },
    "rendering": { "status": "running", "iteration": 2 },
    "database": { "status": "pending" },
    "startup": { "status": "pending" }
  }
}
```

---

## Template 6: Content Generation

Batch content creation from briefs with quality gates.

### Metadata

| Field | Value |
|---|---|
| Duration | 30 min -- 1.5 hours |
| Cost | $1.00 -- $5.00 |
| Max Turns | 100 |
| Schedule | `0 10 * * 2,4` (Tuesday/Thursday 10:00 AM) |
| Bible Skills | brand-guidelines, seo-content-brief, content-strategy |

### Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(wc *)",
      "Read(**)",
      "Write(output/dispatch/content/**)",
      "Write(tasks/checkpoint.json)",
      "Write(tasks/content-queue.json)"
    ]
  }
}
```

### Config

```json
{
  "template": "content-generation",
  "config": {
    "queueFile": "tasks/content-queue.json",
    "outputDir": "output/dispatch/content/drafts",
    "minWordCount": 800,
    "maxWordCount": 2500,
    "tone": "professional",
    "includeMetadata": true,
    "humanGateOnSensitive": true
  }
}
```

### Task Prompt

```
Process content generation queue.

Read tasks/content-queue.json. For each item where status is "pending":
1. Read the content brief (title, target audience, keywords, outline)
2. If item.gate is true, skip it (needs human review first)
3. Generate draft following brand-guidelines skill:
   - Match specified tone
   - Include target keywords naturally
   - Follow outline structure
   - Stay within word count (800-2500 words)
4. Add frontmatter: title, date, author, keywords, word count, status: "draft"
5. Write to output/dispatch/content/drafts/{slug}.md
6. Update item status to "drafted" in tasks/content-queue.json
7. Update tasks/checkpoint.json

After all items:
- Write batch summary to output/dispatch/content/batch-{date}.md
- Include: items processed, items skipped (gated), total word count
```

### Checkpoint Schema

```json
{
  "task": "content-generation",
  "status": "in-progress",
  "totalItems": 8,
  "processed": 3,
  "skipped": 1,
  "lastProcessed": "seo-guide-2026",
  "totalWords": 4200
}
```

---

## Template 7: Data Migration

Migrate data between formats or systems with validation and rollback.

### Metadata

| Field | Value |
|---|---|
| Duration | 1 -- 4 hours |
| Cost | $2.00 -- $8.00 |
| Max Turns | 200 |
| Schedule | Manual (one-time or as-needed) |
| Bible Skills | overnight-runner, verification-loop |

### Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(node *)",
      "Bash(git *)",
      "Read(**)",
      "Write(output/dispatch/migration/**)",
      "Write(data/migrated/**)",
      "Write(tasks/checkpoint.json)"
    ]
  }
}
```

### Config

```json
{
  "template": "data-migration",
  "config": {
    "sourceDir": "data/source",
    "targetDir": "data/migrated",
    "transformRules": "data/transform-rules.json",
    "validationSchema": "data/target-schema.json",
    "batchSize": 50,
    "dryRun": false,
    "rollbackOnError": true,
    "outputDir": "output/dispatch/migration"
  }
}
```

### Task Prompt

```
Execute data migration with validation.

Read tasks/checkpoint.json for resume state. If starting fresh, initialize checkpoint.

1. Load transform rules from data/transform-rules.json
2. Load validation schema from data/target-schema.json
3. List all source files in data/source/
4. For each source file (resume from checkpoint.lastProcessed):
   a. Read source data
   b. Apply transform rules
   c. Validate against target schema
   d. If valid: write to data/migrated/{filename}
   e. If invalid: log validation errors, skip file
   f. Update checkpoint after every file (crash recovery)

After all files:
- Write migration report to output/dispatch/migration/{date}.md:
  - Total files, migrated, failed, skipped
  - Validation error summary
  - Data integrity checks
- Set checkpoint status to "complete"

CRITICAL: Write checkpoint after EVERY file. This migration may take hours.
If you hit context limits, save checkpoint and exit. The retry wrapper will resume.
```

### Checkpoint Schema

```json
{
  "task": "data-migration",
  "status": "in-progress",
  "sourceDir": "data/source",
  "totalFiles": 1200,
  "migratedFiles": 487,
  "failedFiles": 3,
  "skippedFiles": 0,
  "lastProcessed": "record-487.json",
  "errors": [
    { "file": "record-102.json", "error": "Missing required field: email" },
    { "file": "record-256.json", "error": "Invalid date format in createdAt" },
    { "file": "record-401.json", "error": "Duplicate ID detected" }
  ],
  "startedAt": "2026-03-28T01:00:00Z",
  "lastUpdated": "2026-03-28T02:15:00Z"
}
```

---

## Template 8: Monitoring Setup

Configure monitoring dashboards, alerts, and health checks.

### Metadata

| Field | Value |
|---|---|
| Duration | 15 min -- 30 min |
| Cost | $0.50 -- $1.50 |
| Max Turns | 40 |
| Schedule | Manual (run after deploy or infra changes) |
| Bible Skills | infra-runbook, metrics-dashboard |

### Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(curl *)",
      "Bash(node *)",
      "Bash(git *)",
      "Read(**)",
      "Write(monitoring/**)",
      "Write(output/dispatch/monitoring/**)",
      "Write(tasks/checkpoint.json)"
    ]
  }
}
```

### Config

```json
{
  "template": "monitoring-setup",
  "config": {
    "services": [
      { "name": "api", "url": "http://localhost:3000/health", "interval": 60 },
      { "name": "gateway", "url": "http://localhost:18789/status", "interval": 30 },
      { "name": "paperclip", "url": "http://localhost:3110/health", "interval": 60 }
    ],
    "alertThresholds": {
      "responseTimeMs": 5000,
      "errorRatePercent": 5,
      "memoryUsagePercent": 85
    },
    "dashboardFormat": "markdown",
    "outputDir": "output/dispatch/monitoring"
  }
}
```

### Task Prompt

```
Set up monitoring for configured services.

1. For each service in config:
   a. Verify health endpoint is reachable (curl with 10s timeout)
   b. Record response time, status code, response body
   c. If unhealthy: log error and continue to next service

2. Generate monitoring configuration:
   a. Create monitoring/health-checks.json with check definitions
   b. Create monitoring/alerts.json with alert thresholds
   c. Create monitoring/dashboard.md with current status table

3. Run baseline health check (3 iterations per service):
   a. Record response times
   b. Calculate baseline averages
   c. Write to monitoring/baseline.json

4. Generate monitoring report:
   - Service status table (name, url, status, avg response time)
   - Alert configuration summary
   - Recommendations for unhealthy services

Write report to output/dispatch/monitoring/{date}.md
Update tasks/checkpoint.json after each service check.
```

### Checkpoint Schema

```json
{
  "task": "monitoring-setup",
  "status": "in-progress",
  "services": {
    "api": { "status": "healthy", "avgResponseMs": 45, "checks": 3 },
    "gateway": { "status": "checking", "checks": 1 },
    "paperclip": { "status": "pending" }
  },
  "configGenerated": false,
  "baselineComplete": false
}
```

---

## Quick Start

### Using a Template

1. Copy the template config to your project:

```bash
# Create dispatch config
mkdir -p tasks output/dispatch
```

2. Initialize the checkpoint:

```bash
echo '{"task":"overnight-build","status":"ready","steps":[]}' > tasks/checkpoint.json
```

3. Run the Dispatch task:

```bash
claude --headless --max-turns 80 \
  "$(cat tasks/dispatch-prompt.md)"
```

4. Check results:

```bash
cat tasks/checkpoint.json | jq .status
ls output/dispatch/builds/
```

### Customizing Templates

Templates are starting points. Customize by:
- Adjusting `--max-turns` for your project size
- Modifying permissions for your tool stack
- Changing output paths to match your project structure
- Adding project-specific steps to the task prompt
- Tuning checkpoint frequency for your crash tolerance

### Combining Templates

Chain templates for comprehensive pipelines:

```bash
# Run security scan, then build, then benchmark
claude --headless --max-turns 40 "Run security-scan template"
claude --headless --max-turns 80 "Run overnight-build template"
claude --headless --max-turns 50 "Run performance-benchmark template"
```

Or combine into a single mega-task:

```bash
claude --headless --max-turns 200 \
  "Execute pipeline: security-scan -> overnight-build -> performance-benchmark.
   Run each phase sequentially. If security-scan finds critical issues, stop.
   Write combined report to output/dispatch/pipeline/{date}.md"
```
