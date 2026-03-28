---
name: dispatch-bible
description: |
  Claude's Dispatch background task execution system optimized for Bible workflows.
  Covers what Dispatch is, Bible-optimized extensions, background task patterns,
  Task Commander integration, error handling, cost tracking, and completion notifications.
triggers:
  - /dispatch
  - dispatch task
  - background task
  - dispatch bible
  - run in background
  - async task
---

# Dispatch Bible

## What Is Dispatch?

Dispatch is Claude's background task execution system. It runs tasks asynchronously -- you submit a task, Claude processes it in the background, and you get notified when it completes. Unlike interactive sessions, Dispatch tasks:

- Run without human interaction after submission
- Execute in isolated contexts (no shared conversation state)
- Can be scheduled, queued, and prioritized
- Track their own costs and resource usage
- Support retry and error recovery

## When to Use Dispatch

```
Decision Tree:
  Is the task interactive? -------> YES --> Use normal Claude Code session
                |
                NO
                |
  Does it need results NOW? ------> YES --> Use headless mode (claude --headless)
                |
                NO
                |
  Is it a one-off background job? -> YES --> Use Dispatch
                |
                NO
                |
  Is it recurring/scheduled? ------> YES --> Use Cowork (see cowork-bible skill)
```

**Use Dispatch for:**
- Overnight builds and test suites
- Batch processing (100+ items)
- Long-running code reviews
- Data migrations
- Security scans
- Performance benchmarks
- Report generation
- Dependency audits

**Do not use Dispatch for:**
- Tasks that need human judgment mid-execution
- Quick one-off questions
- Tasks that modify shared state (race conditions)
- Anything requiring real-time interaction

## Bible-Optimized Dispatch Extensions

### Task Commander Integration

Dispatch tasks work naturally with Bible's task-commander pattern. Structure your dispatch payload to include a task list:

```json
{
  "task": "Execute the task list in tasks/dispatch-queue.json using task-commander patterns",
  "context": {
    "projectRoot": "/path/to/project",
    "skills": ["task-commander", "verification-loop"],
    "taskFile": "tasks/dispatch-queue.json"
  },
  "options": {
    "maxTurns": 100,
    "costLimit": 5.00,
    "checkpoint": true
  }
}
```

Task Commander format for dispatch:

```json
{
  "dispatchId": "batch-review-2026-03-28",
  "tasks": [
    {
      "id": "review-auth",
      "description": "Review auth module for security issues",
      "status": "pending",
      "priority": "P0",
      "estimatedMinutes": 15,
      "skills": ["review", "pentest-checklist"]
    },
    {
      "id": "review-api",
      "description": "Review API routes for consistency and error handling",
      "status": "pending",
      "priority": "P1",
      "estimatedMinutes": 20,
      "skills": ["review", "api-design"]
    },
    {
      "id": "review-db",
      "description": "Review database queries for N+1 and injection",
      "status": "pending",
      "priority": "P1",
      "estimatedMinutes": 10,
      "skills": ["review", "postgres-patterns"]
    }
  ],
  "completionCriteria": "All tasks status=done or status=blocked with explanation"
}
```

### Mode Integration

Set the Bible mode for your Dispatch task to load appropriate rules:

```json
{
  "task": "Run full security audit",
  "context": {
    "mode": "normal",
    "skills": ["pentest-checklist", "harden"]
  }
}
```

Available modes: `normal`, `design`, `saas`, `marketing`, `research`, `writing`, `night`, `yolo`, `unhinged`

### Verification Loop

Dispatch tasks should always verify their own work. Include the verification-loop skill:

```json
{
  "task": "Implement feature X and verify",
  "context": {
    "skills": ["verification-loop", "tdd-workflow"],
    "verificationSteps": [
      "TypeScript compiles: npx tsc --noEmit",
      "Tests pass: npm test",
      "No console.log in production code",
      "Conventional commit message format"
    ]
  }
}
```

## Background Task Patterns

### Pattern 1: Batch Processing

Process a queue of independent items. Each item is a checkpoint.

```json
{
  "pattern": "batch",
  "task": "Process all items in tasks/batch-queue.json",
  "options": {
    "maxTurns": 200,
    "costLimit": 10.00,
    "checkpointFile": "tasks/checkpoint.json",
    "errorLog": "output/errors.log",
    "skipOnError": true
  }
}
```

The Dispatch agent follows this loop:
1. Read checkpoint (or start from beginning)
2. Pick next unprocessed item
3. Process item
4. Update checkpoint
5. If error and `skipOnError`: log error, mark item failed, continue
6. If error and not `skipOnError`: halt and report
7. Repeat until queue empty

### Pattern 2: Pipeline

Sequential stages where each stage's output feeds the next.

```json
{
  "pattern": "pipeline",
  "stages": [
    {
      "name": "fetch",
      "task": "Download data from API endpoints listed in config/sources.json",
      "output": "data/raw/"
    },
    {
      "name": "transform",
      "task": "Clean and normalize data in data/raw/ using schema in config/transform.json",
      "input": "data/raw/",
      "output": "data/cleaned/"
    },
    {
      "name": "analyze",
      "task": "Run analysis on data/cleaned/ and generate report",
      "input": "data/cleaned/",
      "output": "output/analysis-{date}.md"
    }
  ],
  "options": {
    "haltOnStageFailure": true,
    "checkpointPerStage": true
  }
}
```

### Pattern 3: Fan-Out / Fan-In

Dispatch multiple independent subtasks, then aggregate results.

```json
{
  "pattern": "fan-out",
  "subtasks": [
    {
      "id": "security-scan",
      "task": "Run security audit on src/",
      "skills": ["pentest-checklist"],
      "output": "output/scans/security.json"
    },
    {
      "id": "perf-scan",
      "task": "Run performance benchmarks",
      "skills": ["benchmark"],
      "output": "output/scans/performance.json"
    },
    {
      "id": "quality-scan",
      "task": "Run code quality analysis",
      "skills": ["coding-standards"],
      "output": "output/scans/quality.json"
    }
  ],
  "aggregation": {
    "task": "Read all output/scans/*.json and generate unified report at output/full-report-{date}.md",
    "skills": ["business-analytics"]
  }
}
```

### Pattern 4: Retry with Backoff

For tasks that may fail transiently (API limits, network issues).

```json
{
  "pattern": "retry",
  "task": "Fetch and process external data",
  "retry": {
    "maxAttempts": 5,
    "backoffStrategy": "exponential",
    "initialDelaySeconds": 60,
    "maxDelaySeconds": 3600,
    "retryOn": ["timeout", "rate-limit", "network-error"]
  },
  "checkpoint": {
    "file": "tasks/checkpoint.json",
    "resumeFromCheckpoint": true
  }
}
```

## Error Handling

### Error Classification

Dispatch errors fall into categories that determine the response:

| Category | Examples | Response |
|---|---|---|
| **Transient** | API timeout, rate limit, network blip | Retry with backoff |
| **Recoverable** | Missing file, bad input format | Skip item, log error, continue |
| **Fatal** | Permission denied, disk full, config error | Halt, report, notify |
| **Logic** | Wrong output, failed assertion | Log, flag for human review |

### Error Reporting Format

Every Dispatch task writes errors to a structured log:

```json
{
  "timestamp": "2026-03-28T03:14:00Z",
  "dispatchId": "batch-review-2026-03-28",
  "taskId": "review-auth",
  "category": "recoverable",
  "error": "File src/auth/legacy.ts not found",
  "context": {
    "expectedPath": "src/auth/legacy.ts",
    "action": "skipped"
  },
  "recoveryAttempted": true,
  "recovered": true
}
```

### Error Escalation

```
Transient error -> retry (up to max attempts)
    |
    failed all retries
    |
Recoverable error -> skip + log
    |
    too many skips (>20% of batch)
    |
Fatal error -> HALT
    |
    write final report
    |
    notify human
```

## Cost Tracking

### Per-Task Cost Estimation

Before dispatching, estimate cost:

| Task Type | Estimated Cost | Typical Duration |
|---|---|---|
| Single code review | $0.30 -- $0.80 | 5-15 min |
| Batch review (10 files) | $2.00 -- $5.00 | 30-60 min |
| Full security scan | $1.00 -- $3.00 | 15-30 min |
| Overnight build pipeline | $3.00 -- $8.00 | 1-4 hours |
| Data migration (500 records) | $2.00 -- $6.00 | 30-90 min |
| Performance benchmark | $0.50 -- $2.00 | 10-30 min |

### Cost Controls

```json
{
  "costControls": {
    "perTaskLimit": 5.00,
    "dailyLimit": 20.00,
    "weeklyLimit": 50.00,
    "alertAt": 0.8,
    "killAt": 1.0,
    "trackingFile": "output/dispatch-costs.json"
  }
}
```

### Cost Tracking File

Dispatch writes cost data after each task:

```json
{
  "date": "2026-03-28",
  "dispatches": [
    {
      "id": "batch-review-2026-03-28",
      "startedAt": "2026-03-28T01:00:00Z",
      "completedAt": "2026-03-28T02:15:00Z",
      "estimatedCost": 3.50,
      "actualTurns": 67,
      "tasksCompleted": 8,
      "tasksFailed": 1
    }
  ],
  "dailyTotal": 3.50,
  "weeklyTotal": 12.80,
  "budgetRemaining": 37.20
}
```

## Notification on Completion

### Terminal Notification (macOS)

```bash
terminal-notifier -title "Dispatch Complete" \
  -subtitle "$DISPATCH_ID" \
  -message "$TASKS_COMPLETED tasks done, $TASKS_FAILED failed" \
  -sound default
```

### Telegram Bot

```bash
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d parse_mode="Markdown" \
  -d text="*Dispatch Complete*
ID: \`${DISPATCH_ID}\`
Tasks: ${TASKS_COMPLETED}/${TASKS_TOTAL}
Cost: ~\$${ESTIMATED_COST}
Duration: ${DURATION}
Report: ${REPORT_PATH}"
```

### Slack Webhook

```bash
curl -s -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"Dispatch *${DISPATCH_ID}* complete: ${TASKS_COMPLETED}/${TASKS_TOTAL} tasks, ~\$${ESTIMATED_COST}\",
    \"blocks\": [{
      \"type\": \"section\",
      \"text\": {
        \"type\": \"mrkdwn\",
        \"text\": \"*Report:* ${REPORT_PATH}\"
      }
    }]
  }"
```

### Email (via SendGrid)

```bash
curl -s --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer $SENDGRID_API_KEY" \
  --header 'Content-Type: application/json' \
  --data "{
    \"personalizations\": [{\"to\": [{\"email\": \"$NOTIFY_EMAIL\"}]}],
    \"from\": {\"email\": \"dispatch@yourdomain.com\"},
    \"subject\": \"Dispatch Complete: ${DISPATCH_ID}\",
    \"content\": [{\"type\": \"text/plain\", \"value\": \"${TASKS_COMPLETED}/${TASKS_TOTAL} tasks completed. Report: ${REPORT_PATH}\"}]
  }"
```

## Dispatch CLI Reference

```bash
# Submit a task
claude dispatch submit --task "Process batch" --project /path/to/project \
  --max-turns 100 --cost-limit 5.00

# Submit from config file
claude dispatch submit --config tasks/dispatch-config.json

# List active dispatches
claude dispatch list

# Check status of a dispatch
claude dispatch status <dispatch-id>

# Cancel a running dispatch
claude dispatch cancel <dispatch-id>

# View dispatch logs
claude dispatch logs <dispatch-id> --tail 50

# View cost summary
claude dispatch costs --period week
```

## Pre-Dispatch Checklist

- [ ] Task description is clear and self-contained
- [ ] All referenced files exist and are accessible
- [ ] `maxTurns` set to prevent infinite loops
- [ ] `costLimit` set to prevent budget overruns
- [ ] Checkpoint file initialized (for resumable tasks)
- [ ] Error log path exists and is writable
- [ ] Output directory exists
- [ ] Notification configured (know when it finishes)
- [ ] Test with 2-3 items before full batch
- [ ] `.claude/settings.json` grants needed permissions
- [ ] No secrets in task description (use env vars)

## Anti-Patterns

- **No checkpoint** -- session crashes lose all progress
- **No cost limit** -- runaway tasks drain budget silently
- **Vague task description** -- "do stuff" wastes turns on clarification
- **Shared state** -- two dispatches editing the same file causes corruption
- **No notification** -- you forget to check and results sit for days
- **Skipping test run** -- one bad config burns an entire overnight window
- **Infinite retry** -- always set maxAttempts; some errors are permanent
- **Giant monolithic task** -- break into stages or batch items for crash safety
