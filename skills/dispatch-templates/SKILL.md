---
name: dispatch-templates
description: |
  Pre-built Dispatch task templates for common background workflows. Includes templates
  for overnight builds, batch PR reviews, dependency updates, security scans, performance
  benchmarks, content generation, data migrations, and monitoring setup. Each template
  has description, duration estimate, cost estimate, required permissions, and YAML config.
triggers:
  - /dispatch-template
  - dispatch template
  - dispatch templates
  - overnight build template
  - batch review template
  - background job template
---

# Dispatch Templates

Pre-built templates for common Dispatch background tasks. Each template is copy-paste ready -- adjust the config values for your project and submit.

## How to Use

1. Pick a template below
2. Copy the YAML config
3. Adjust paths and project-specific values
4. Save to `tasks/dispatch-{template-name}.yaml`
5. Submit: `claude dispatch submit --config tasks/dispatch-{template-name}.yaml`

## Template Index

| Template | Duration | Est. Cost | Use Case |
|---|---|---|---|
| overnight-build | 1-4h | $3-8 | Full build + test + deploy pipeline |
| batch-review | 30-90m | $2-6 | Review multiple PRs or files |
| dependency-update | 15-45m | $1-3 | Check and update all dependencies |
| security-scan | 15-30m | $1-3 | Full security audit |
| performance-benchmark | 10-30m | $0.50-2 | Run perf tests and generate report |
| content-generation | 30-60m | $2-5 | Batch content creation |
| data-migration | 30-120m | $2-8 | Schema migration with rollback |
| monitoring-setup | 15-30m | $1-2 | Configure monitoring and alerts |

---

## 1. overnight-build

Full build, test, and deploy pipeline. Designed for unattended overnight execution with retry logic and comprehensive reporting.

**Description:** Builds the entire project, runs all test suites (unit, integration, E2E), generates coverage reports, and optionally creates a release tag. Retries on transient failures.

**Estimated Duration:** 1-4 hours
**Estimated Cost:** $3.00-$8.00
**Required Permissions:** filesystem (full project), terminal (git, npm/pnpm, node)

```yaml
# tasks/dispatch-overnight-build.yaml
name: overnight-build
description: Full build + test + deploy pipeline
schedule: "0 1 * * *"  # 1:00 AM daily

task: |
  Execute the full overnight build pipeline for this project.

  Phase 1 — Preparation:
  - Pull latest from main branch (git pull --rebase origin main)
  - Install dependencies (npm ci or pnpm install --frozen-lockfile)
  - Read tasks/build-config.json for project-specific settings

  Phase 2 — Quality Gates:
  - Run linter (npm run lint)
  - Run TypeScript check (npx tsc --noEmit)
  - Run unit tests (npm test -- --coverage)
  - Run integration tests (npm run test:integration)
  - Run E2E tests if configured (npm run test:e2e)

  Phase 3 — Build:
  - Run production build (npm run build)
  - Verify build output exists and is non-empty
  - Record build size metrics

  Phase 4 — Report:
  - Write results to output/builds/{date}.md
  - Include: test counts, coverage %, build size, duration, errors
  - Update tasks/checkpoint.json with final status

  Phase 5 — Tag (if all gates pass):
  - Create git tag: build-{date}-{short-sha}
  - Do NOT push tag (human reviews first)

  If any phase fails:
  - Log the failure to output/builds/errors/{date}.log
  - Continue to the report phase (always generate a report)
  - Set checkpoint status to "failed" with phase name

context:
  skills:
    - overnight-runner
    - verification-loop
    - tdd-workflow
  mode: normal

options:
  maxTurns: 150
  costLimit: 8.00
  checkpoint: tasks/checkpoint.json
  errorLog: output/builds/errors/{date}.log

retry:
  maxAttempts: 3
  backoffSeconds: 1800
  retryOn:
    - timeout
    - network-error

notification:
  onComplete: terminal-notifier
  onFailure: telegram
```

---

## 2. batch-review

Review multiple PRs, files, or modules in sequence. Generates individual review reports and a summary.

**Description:** Iterates over a queue of review targets (PRs, files, or directories). For each target, runs coding standards checks, security review, and generates actionable feedback.

**Estimated Duration:** 30-90 minutes
**Estimated Cost:** $2.00-$6.00
**Required Permissions:** filesystem (project), terminal (git, gh, npx)

```yaml
# tasks/dispatch-batch-review.yaml
name: batch-review
description: Review multiple PRs or code areas in sequence

task: |
  Review all items in tasks/review-queue.json.

  For each item:
  1. Read the target (PR diff, file, or directory)
  2. Check against coding-standards skill rules:
     - TypeScript strict mode compliance
     - Immutability patterns (no mutation)
     - Error handling at boundaries
     - File size limits (<800 lines)
     - Function size limits (<50 lines)
  3. Check for security issues per pentest-checklist:
     - Hardcoded secrets
     - SQL injection vectors
     - XSS vulnerabilities
     - Missing input validation
  4. Check for performance issues:
     - N+1 queries
     - Missing pagination
     - Unbounded loops
  5. Write individual review to output/reviews/{item-id}.md
  6. Rate severity: CRITICAL / HIGH / MEDIUM / LOW / INFO
  7. Mark item as reviewed in tasks/review-queue.json

  After all items:
  - Generate summary at output/reviews/summary-{date}.md
  - Include: total items reviewed, issue counts by severity, top 3 critical findings

  Review queue format:
  [
    {"id": "pr-42", "type": "pr", "target": "42"},
    {"id": "auth-module", "type": "directory", "target": "src/auth/"},
    {"id": "api-routes", "type": "file", "target": "src/routes/index.ts"}
  ]

context:
  skills:
    - review
    - coding-standards
    - pentest-checklist
    - task-commander
  mode: normal

options:
  maxTurns: 100
  costLimit: 6.00
  checkpoint: tasks/review-checkpoint.json
  skipOnError: true
```

---

## 3. dependency-update

Check all dependencies for updates, test each update, and create a PR with passing updates.

**Description:** Runs outdated checks, filters by update type, tests each update individually, keeps passing updates, reverts failing ones, and creates a consolidated PR.

**Estimated Duration:** 15-45 minutes
**Estimated Cost:** $1.00-$3.00
**Required Permissions:** filesystem (package files, lockfiles), terminal (npm/pnpm, git, gh, npx)

```yaml
# tasks/dispatch-dependency-update.yaml
name: dependency-update
description: Check and update all dependencies safely

task: |
  Update project dependencies with safety verification.

  Phase 1 — Audit:
  - Run npm audit (or pnpm audit)
  - Run npm outdated --json (or pnpm outdated --format json)
  - Categorize updates: patch, minor, major
  - Write audit report to output/deps/audit-{date}.json

  Phase 2 — Safe Updates (patch + minor):
  - Create branch: deps/update-{date}
  - For each patch/minor update:
    a. Install the update
    b. Run TypeScript check (npx tsc --noEmit)
    c. Run tests (npm test)
    d. If pass: keep update, record in output/deps/updated.json
    e. If fail: revert update, record in output/deps/failed.json
  - Commit all passing updates

  Phase 3 — Major Updates (report only):
  - Do NOT auto-update major versions
  - List them in output/deps/major-available.json with:
    - Current version
    - Available version
    - Changelog URL
    - Breaking changes summary (if available)

  Phase 4 — Report:
  - Write full report to output/deps/update-{date}.md
  - Include: updates applied, updates failed, majors available, security issues
  - Create PR via gh pr create if any updates were applied

context:
  skills:
    - verification-loop
  mode: normal

options:
  maxTurns: 80
  costLimit: 3.00
  checkpoint: tasks/deps-checkpoint.json

notification:
  onComplete: terminal-notifier
```

---

## 4. security-scan

Full security audit covering code, dependencies, configuration, and infrastructure.

**Description:** Comprehensive security scan using multiple analysis approaches. Generates a prioritized findings report with remediation guidance.

**Estimated Duration:** 15-30 minutes
**Estimated Cost:** $1.00-$3.00
**Required Permissions:** filesystem (full project), terminal (npm, git, grep)

```yaml
# tasks/dispatch-security-scan.yaml
name: security-scan
description: Full security audit of the codebase

task: |
  Run a comprehensive security audit of this project.

  Scan 1 — Dependency Vulnerabilities:
  - Run npm audit --json
  - Check for known CVEs in dependencies
  - Flag: critical and high severity findings

  Scan 2 — Secret Detection:
  - Scan all files for patterns: API keys, tokens, passwords, connection strings
  - Patterns: /[A-Za-z0-9]{32,}/, /sk-[a-zA-Z0-9]+/, /password\s*[:=]/i
  - Check .env files are in .gitignore
  - Check for committed .env files in git history

  Scan 3 — Code Vulnerabilities:
  - SQL injection: look for string concatenation in queries
  - XSS: look for dangerouslySetInnerHTML, unescaped user input
  - CSRF: check for token validation on state-changing routes
  - Auth: check for missing auth middleware on protected routes
  - Input validation: check for unvalidated user input at boundaries

  Scan 4 — Configuration:
  - CORS: check for overly permissive origins
  - HTTPS: check for HTTP-only endpoints
  - Headers: check for security headers (CSP, HSTS, X-Frame-Options)
  - Rate limiting: check for missing rate limits on auth endpoints

  Scan 5 — Infrastructure:
  - Dockerfile: check for running as root, unnecessary packages
  - Environment: check for production debug flags
  - Ports: check for unexpected exposed ports

  Output:
  - Write findings to output/security/scan-{date}.md
  - Format: severity | category | location | finding | remediation
  - Sort by severity (critical first)
  - Include executive summary at top with risk score (0-100)

context:
  skills:
    - pentest-checklist
    - harden
    - coding-standards
  mode: normal

options:
  maxTurns: 60
  costLimit: 3.00
```

---

## 5. performance-benchmark

Run performance tests, capture metrics, compare against baselines, and generate a trend report.

**Description:** Executes performance benchmarks, measures key metrics (response time, throughput, memory, bundle size), compares to historical baselines, and flags regressions.

**Estimated Duration:** 10-30 minutes
**Estimated Cost:** $0.50-$2.00
**Required Permissions:** filesystem (project, output), terminal (node, npm, curl)

```yaml
# tasks/dispatch-performance-benchmark.yaml
name: performance-benchmark
description: Run performance tests and generate trend report

task: |
  Execute performance benchmarks and compare to baseline.

  Benchmark 1 — Build Performance:
  - Measure: npm run build time (3 runs, take median)
  - Record: total time, peak memory, output size

  Benchmark 2 — Test Suite Performance:
  - Measure: npm test execution time
  - Record: total time, slowest 10 tests

  Benchmark 3 — Bundle Analysis (if applicable):
  - Measure: production bundle size
  - Record: total size, per-chunk sizes, tree-shaking effectiveness

  Benchmark 4 — API Response Times (if server project):
  - Start server in test mode
  - Hit key endpoints with curl (10 requests each, measure avg/p95/p99)
  - Record: response times, error rates

  Benchmark 5 — Memory Profile:
  - Run node --max-old-space-size=512 with production workload
  - Record: heap used, heap total, RSS, external

  Comparison:
  - Read baseline from output/benchmarks/baseline.json
  - Flag regressions: >10% slower, >20% larger, >15% more memory
  - Update baseline if explicitly requested in config

  Report:
  - Write to output/benchmarks/bench-{date}.md
  - Include charts (ASCII) for trends over last 10 runs
  - Highlight regressions in red (markdown bold)
  - Include actionable recommendations for regressions

context:
  skills:
    - benchmark
    - verification-loop
  mode: normal

options:
  maxTurns: 50
  costLimit: 2.00
  checkpoint: tasks/bench-checkpoint.json
```

---

## 6. content-generation

Batch content creation for SEO, documentation, marketing, or other written assets.

**Description:** Processes a content queue, generates drafts following brand guidelines, and writes outputs to a review directory. Supports human-gate pattern for items that need approval before publishing.

**Estimated Duration:** 30-60 minutes
**Estimated Cost:** $2.00-$5.00
**Required Permissions:** filesystem (templates, content, output), terminal (git)

```yaml
# tasks/dispatch-content-generation.yaml
name: content-generation
description: Batch content creation from a content queue

task: |
  Process all items in tasks/content-queue.json.

  For each content item:
  1. Read the brief (title, topic, target audience, word count, format)
  2. If brief references a template, load from templates/content/{template}.md
  3. Research context:
     - Read related existing content in content/ directory
     - Check brand-guidelines skill for tone and style rules
     - Review SEO requirements if specified
  4. Generate the draft following the brief
  5. Verify:
     - Word count within 10% of target
     - Heading structure (H1 > H2 > H3, no skips)
     - No placeholder text remaining
     - Links are real (if referencing internal pages)
  6. Write draft to output/content/drafts/{slug}.md
  7. If item has "gate": true, set status to "review-needed" (human must approve)
  8. Otherwise, set status to "done"
  9. Update tasks/content-queue.json

  Content queue format:
  [
    {
      "slug": "getting-started-guide",
      "title": "Getting Started with Our Platform",
      "topic": "onboarding tutorial",
      "audience": "new users",
      "wordCount": 1500,
      "format": "tutorial",
      "template": "tutorial-template",
      "seo": {"keyword": "getting started", "difficulty": "low"},
      "gate": false
    },
    {
      "slug": "enterprise-security",
      "title": "Enterprise Security Features",
      "topic": "security overview for enterprise buyers",
      "audience": "CISOs and IT directors",
      "wordCount": 2000,
      "format": "whitepaper",
      "gate": true
    }
  ]

  After all items:
  - Write summary to output/content/batch-{date}.md
  - Include: items generated, items gated, total word count, topics covered

context:
  skills:
    - brand-guidelines
    - seo-content-brief
    - task-commander
  mode: writing

options:
  maxTurns: 120
  costLimit: 5.00
  checkpoint: tasks/content-checkpoint.json
  skipOnError: true
```

---

## 7. data-migration

Schema migration with validation, rollback support, and progress tracking.

**Description:** Migrates data between schemas or formats. Processes records in batches with checkpoint support. Each batch is validated before proceeding. Includes rollback capability for the entire migration.

**Estimated Duration:** 30-120 minutes
**Estimated Cost:** $2.00-$8.00
**Required Permissions:** filesystem (data, output, tasks), terminal (node, jq)

```yaml
# tasks/dispatch-data-migration.yaml
name: data-migration
description: Schema migration with rollback support

task: |
  Execute data migration defined in tasks/migration-config.json.

  Pre-Flight:
  - Read migration config (source, target schema, transform rules)
  - Validate source data exists and is readable
  - Create backup: cp data/source.json data/backup/source-{date}.json
  - Initialize rollback log: output/migrations/rollback-{date}.json

  Migration Loop:
  For each record in source (batch size from config, default 50):
  1. Read batch of records
  2. Transform each record per transform rules:
     - Field mapping (rename, restructure)
     - Type coercion (string dates to ISO, etc.)
     - Default values for new required fields
     - Computed fields
  3. Validate each transformed record against target schema
  4. Write valid records to data/migrated/{batch-number}.json
  5. Log invalid records to output/migrations/invalid-{date}.json with:
     - Original record
     - Validation errors
     - Record ID for manual review
  6. Update checkpoint: tasks/migration-checkpoint.json
  7. Log rollback data (original -> transformed mapping)

  Post-Migration:
  - Merge all batches into data/target.json
  - Run integrity check: count source vs target records
  - Report:
    - Total records: X
    - Migrated successfully: Y
    - Validation failures: Z
    - Duration: Xm
  - Write report to output/migrations/migration-{date}.md

  Rollback (if requested or >20% failure rate):
  - Read rollback log
  - Restore from backup
  - Report what was rolled back and why

  Migration config format:
  {
    "source": "data/source.json",
    "targetSchema": "config/target-schema.json",
    "transformRules": "config/transform-rules.json",
    "batchSize": 50,
    "failureThreshold": 0.20,
    "autoRollback": true
  }

context:
  skills:
    - database-migrations
    - verification-loop
  mode: normal

options:
  maxTurns: 150
  costLimit: 8.00
  checkpoint: tasks/migration-checkpoint.json
  errorLog: output/migrations/errors-{date}.log

notification:
  onComplete: telegram
  onFailure: telegram
```

---

## 8. monitoring-setup

Configure monitoring, health checks, alerting rules, and dashboards for a project.

**Description:** Sets up comprehensive monitoring infrastructure. Configures health endpoints, log aggregation rules, alert thresholds, and generates monitoring documentation.

**Estimated Duration:** 15-30 minutes
**Estimated Cost:** $1.00-$2.00
**Required Permissions:** filesystem (project config, output), terminal (node, curl)

```yaml
# tasks/dispatch-monitoring-setup.yaml
name: monitoring-setup
description: Configure monitoring and alerting for the project

task: |
  Set up monitoring infrastructure based on tasks/monitoring-config.json.

  Step 1 — Health Endpoint:
  - Create or verify /api/health endpoint exists
  - Response should include: status, version, uptime, dependencies
  - Verify it returns 200 when healthy, 503 when degraded

  Step 2 — Uptime Checks:
  - Generate uptime check config for key endpoints
  - Check interval: 60s for critical, 300s for standard
  - Alert after 2 consecutive failures
  - Write config to monitoring/uptime-checks.json

  Step 3 — Log Aggregation Rules:
  - Define structured log format (JSON with timestamp, level, service, message)
  - Create log rotation config (7 day retention, 100MB max per file)
  - Define alert-worthy log patterns:
    - ERROR level: immediate alert
    - WARN level with rate >10/min: alert
    - Specific patterns: "out of memory", "connection refused", "timeout"
  - Write rules to monitoring/log-rules.json

  Step 4 — Alert Rules:
  - CPU > 80% for 5 min: warning
  - CPU > 95% for 2 min: critical
  - Memory > 80% for 5 min: warning
  - Memory > 95% for 1 min: critical
  - Disk > 85%: warning
  - Disk > 95%: critical
  - Error rate > 1% of requests: warning
  - Error rate > 5% of requests: critical
  - Response time p95 > 2s: warning
  - Response time p99 > 5s: critical
  - Write rules to monitoring/alert-rules.json

  Step 5 — Dashboard Config:
  - Create dashboard layout with panels:
    - Request rate (line chart, 5m intervals)
    - Error rate (line chart, 5m intervals)
    - Response time distribution (heatmap)
    - Active connections (gauge)
    - CPU/Memory usage (line chart)
    - Disk usage (gauge)
    - Recent errors (log table, last 50)
  - Write dashboard to monitoring/dashboard.json

  Step 6 — Runbook:
  - Generate runbook at monitoring/RUNBOOK.md covering:
    - How to check system health
    - Common alerts and their resolution steps
    - Escalation path
    - Restart procedures
    - Rollback procedures

  Step 7 — Validation:
  - Verify all generated config files are valid JSON
  - Verify health endpoint responds
  - Verify alert rules cover all critical metrics
  - Write validation report to output/monitoring/setup-{date}.md

context:
  skills:
    - infra-runbook
    - verification-loop
  mode: normal

options:
  maxTurns: 60
  costLimit: 2.00

notification:
  onComplete: terminal-notifier
```

---

## Creating Custom Templates

To create your own Dispatch template:

1. Copy the YAML structure from any template above
2. Customize the `task` field with your specific workflow
3. Set appropriate `skills` in context
4. Estimate cost based on complexity (roughly $0.50 per 15 minutes of execution)
5. Set `maxTurns` to 2x your estimated need (safety margin)
6. Always include `checkpoint` for tasks over 30 minutes
7. Always include `notification` so you know when it finishes
8. Save to `tasks/dispatch-{your-template}.yaml`
9. Test with a small subset before full execution

## Quick Reference

```bash
# Run any template
claude dispatch submit --config tasks/dispatch-{template}.yaml

# Override cost limit
claude dispatch submit --config tasks/dispatch-overnight-build.yaml --cost-limit 10.00

# Dry run (validate config without executing)
claude dispatch submit --config tasks/dispatch-security-scan.yaml --dry-run

# Resume from checkpoint
claude dispatch resume <dispatch-id>
```
