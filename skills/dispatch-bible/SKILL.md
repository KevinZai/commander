---
name: dispatch-bible
description: |
  Dispatch is Claude's background task execution system. Bible-optimized patterns for
  background task execution, overnight builds, batch processing, scheduled reviews,
  Dispatch + Task Commander integration, error handling, retry logic, cost tracking,
  and completion notifications.
triggers:
  - /dispatch
  - /background-tasks
  - dispatch setup
  - background task
  - dispatch bible
  - run in background
  - scheduled execution
disable-model-invocation: true
---

# Dispatch Bible

Dispatch is Claude's system for executing tasks in the background -- detached from the interactive session. Instead of blocking the conversation while a long build runs, Dispatch queues the work, executes it asynchronously, and notifies you when it finishes. This skill covers Bible-optimized patterns for making Dispatch reliable, cost-efficient, and integrated with the rest of your workflow.

## What Dispatch Is

Dispatch runs Claude Code in headless mode (`--headless`) as a background process. The session operates without interactive input, follows a task description, and writes results to disk. Key properties:

- **Non-blocking** -- your interactive session stays free
- **Crash-recoverable** -- checkpoint files survive process death
- **Cost-bounded** -- `--max-turns` prevents infinite loops
- **Composable** -- chain multiple Dispatch tasks into pipelines

### When to Use Dispatch

| Scenario | Use Dispatch? | Why |
|---|---|---|
| Build takes >5 minutes | Yes | Don't block the interactive session |
| Batch processing 100+ items | Yes | Independent items, checkpointable |
| Scheduled code review | Yes | Runs unattended on a timer |
| Quick 30-second fix | No | Interactive is faster |
| Exploratory debugging | No | Needs human judgment at each step |
| Dependent multi-step work | Maybe | Only if each step is well-defined |

### When NOT to Use Dispatch

- Tasks requiring human judgment mid-execution
- Problems where you don't know the root cause yet
- Work that modifies shared state (risk of conflicts with interactive session)
- Anything requiring interactive prompts or confirmation

## Architecture

### Execution Model

```
Interactive Session                  Dispatch Worker
      |                                    |
      |-- queue task ------------------>   |
      |                                    |-- read task description
      |   (session continues)              |-- load CLAUDE.md context
      |                                    |-- execute with --max-turns
      |                                    |-- write checkpoint after each step
      |                                    |-- write results to output/
      |   <-- notification (complete) --   |
      |                                    |
      |-- read results                     |
```

### File Layout

```
project/
  tasks/
    dispatch-queue.json       # Pending tasks
    checkpoint.json           # Current execution state
    dispatch-history.json     # Completed task log
  output/
    dispatch/                 # Task outputs
      {task-id}/              # Per-task output directory
        result.json           # Structured result
        log.txt               # Execution log
        artifacts/            # Generated files
  .claude/
    settings.json             # Permissions for headless mode
```

## Bible-Optimized Dispatch Extensions

### 1. Task Commander Integration

Dispatch tasks reference `tasks/todo.md` for structured execution:

```bash
claude --headless --max-turns 50 \
  "Read tasks/todo.md. Execute all items marked 'dispatch'. For each:
   1. Mark as in-progress
   2. Execute the task
   3. Write result to output/dispatch/{task-id}/
   4. Mark as done in todo.md
   5. Update tasks/checkpoint.json
   If a task fails, mark it as blocked with the error and continue to the next."
```

The Task Commander pattern ensures:
- Progress is visible in `tasks/todo.md`
- Other sessions can see what Dispatch is working on
- Blocked items get human attention on next interactive session

### 2. Mode-Aware Execution

Dispatch respects the current Bible mode:

| Mode | Dispatch Behavior |
|---|---|
| normal | Standard execution, all safety checks |
| yolo | Skip confirmation gates, auto-approve |
| night | Extended budgets, retry on rate limits, notify on complete |
| careful | Extra verification at each checkpoint |
| research | Browser access enabled, longer timeouts |

Set mode in the task description:

```bash
claude --headless --max-turns 100 \
  "Mode: night. Follow overnight-runner patterns.
   Read tasks/batch-queue.json and process all items.
   Budget: up to $5.00. Retry on rate limits (30min backoff, 5 attempts max)."
```

### 3. Skill Chaining

Dispatch tasks can reference Bible skills for structured execution:

```bash
claude --headless --max-turns 30 \
  "Execute in order:
   1. Run verification-loop skill on src/
   2. Run coding-standards skill on changed files
   3. Run security check (pentest-checklist skill) on auth modules
   4. Write combined report to output/dispatch/quality-gate/result.md"
```

## Background Task Patterns

### Overnight Builds

```bash
#!/bin/bash
# overnight-build.sh -- run via cron at 1:00 AM

PROJECT="/path/to/project"
LOG="$PROJECT/output/dispatch/builds/$(date +%Y-%m-%d).log"
CHECKPOINT="$PROJECT/tasks/checkpoint.json"

# Initialize checkpoint
cat > "$CHECKPOINT" << 'CHECKPOINT_EOF'
{
  "task": "overnight-build",
  "status": "starting",
  "startedAt": "TIMESTAMP",
  "steps": ["lint", "typecheck", "test", "build", "e2e"],
  "completedSteps": [],
  "errors": []
}
CHECKPOINT_EOF
sed -i '' "s/TIMESTAMP/$(date -u +%Y-%m-%dT%H:%M:%SZ)/" "$CHECKPOINT"

claude --headless --max-turns 80 \
  "Follow the overnight build pipeline. Read tasks/checkpoint.json for state.
   For each step in the pipeline:
   1. Run the step (lint, typecheck, test, build, e2e)
   2. Update checkpoint.json with result
   3. If step fails, log error and continue to next step
   4. Write step output to output/dispatch/builds/steps/{step-name}.log
   On completion, write summary to output/dispatch/builds/$(date +%Y-%m-%d).md
   Set checkpoint status to 'complete' or 'partial' (if any step failed)." \
  2>&1 | tee "$LOG"

# Notify on completion
if command -v terminal-notifier &>/dev/null; then
  STATUS=$(jq -r .status "$CHECKPOINT")
  terminal-notifier -title "Overnight Build" -message "Status: $STATUS"
fi
```

### Batch Processing

Process a list of independent items with crash recovery:

```bash
claude --headless --max-turns 200 \
  "Process items from tasks/batch-queue.json.

   For each item where status is 'pending':
   1. Set item status to 'processing'
   2. Execute the item's task (described in item.description)
   3. Write output to output/dispatch/batch/{item.id}.json
   4. Set item status to 'done' with result summary
   5. If error: set status to 'error', log to item.error field, continue

   After all items: write batch summary to output/dispatch/batch/summary.md
   Include: total, completed, errors, duration estimate.

   IMPORTANT: Save tasks/batch-queue.json after EVERY item (crash recovery)."
```

Queue file format:

```json
{
  "batchId": "dep-update-2026-03-28",
  "items": [
    {
      "id": "item-001",
      "status": "pending",
      "description": "Update @types/node to latest",
      "priority": "medium",
      "error": null,
      "result": null,
      "startedAt": null,
      "completedAt": null
    }
  ],
  "metadata": {
    "createdAt": "2026-03-28T00:00:00Z",
    "totalItems": 50,
    "completedItems": 0,
    "errorItems": 0
  }
}
```

### Scheduled Reviews

Weekly code quality review running every Friday:

```bash
# cron: 0 16 * * 5
claude --headless --max-turns 40 \
  "Run weekly code review.
   1. git log --since='1 week ago' --oneline to list recent commits
   2. For each significant commit (skip merge commits, version bumps):
      a. git show {hash} to read the diff
      b. Check against coding-standards skill rules
      c. Flag security issues per pentest-checklist skill
      d. Note missing tests
   3. Write review to output/dispatch/reviews/week-$(date +%Y-%m-%d).md
   4. Format: ## Summary, ## Issues Found (Critical/High/Medium), ## Recommendations"
```

## Dispatch + Task Commander Integration

### Bidirectional Flow

```
Task Commander (tasks/todo.md)
      |
      |-- items marked 'dispatch' --> Dispatch Queue
      |                                     |
      |                                     |-- executes item
      |                                     |
      |<-- updates item status -------------|
      |                                     |
      |-- blocked items --> human review    |
```

### Tagging Convention

In `tasks/todo.md`, tag items for Dispatch:

```markdown
## In Progress
- [x] Setup auth module
- [ ] [dispatch] Run full regression suite (overnight)
- [ ] [dispatch:night] Batch process 500 customer records
- [ ] [dispatch:scheduled:0 9 * * 1] Weekly dependency audit

## Blocked
- [ ] [dispatch:blocked] Migration step 3 -- needs schema approval
```

Tags:
- `[dispatch]` -- run in next available Dispatch window
- `[dispatch:night]` -- run in night mode (extended budget)
- `[dispatch:scheduled:CRON]` -- run on cron schedule
- `[dispatch:blocked]` -- was dispatched, hit a blocker

### Automatic Handoff

When Dispatch encounters a blocker:

1. Mark the task as `[dispatch:blocked]` in `tasks/todo.md`
2. Write detailed blocker description to `output/dispatch/{task-id}/blocker.md`
3. Set `tasks/checkpoint.json` status to `blocked`
4. Continue to next dispatchable item (if any)

The next interactive session reads `tasks/todo.md`, sees blocked items, and handles them.

## Error Handling and Retry Patterns

### Retry Strategy

```bash
#!/bin/bash
# dispatch-with-retry.sh

MAX_RETRIES=5
RETRY_DELAY=1800  # 30 minutes (rate limit recovery)
CHECKPOINT="tasks/checkpoint.json"

for attempt in $(seq 1 $MAX_RETRIES); do
  echo "[$(date)] Dispatch attempt $attempt of $MAX_RETRIES"

  claude --headless --max-turns 100 \
    "Resume from tasks/checkpoint.json. Continue where you left off.
     If you hit a rate limit, save checkpoint and exit gracefully.
     If you hit an error, log it and try the next item." \
    2>&1 | tee -a output/dispatch/retry.log

  EXIT_CODE=$?
  STATUS=$(jq -r .status "$CHECKPOINT" 2>/dev/null || echo "unknown")

  if [ "$STATUS" = "complete" ]; then
    echo "Dispatch completed successfully."
    exit 0
  fi

  if [ "$STATUS" = "blocked" ]; then
    echo "Dispatch blocked -- needs human intervention."
    exit 1
  fi

  if [ "$attempt" -lt "$MAX_RETRIES" ]; then
    echo "Waiting ${RETRY_DELAY}s before retry..."
    sleep $RETRY_DELAY
  fi
done

echo "Max retries reached. Check output/dispatch/retry.log"
exit 2
```

### Error Categories

| Category | Action | Retry? |
|---|---|---|
| Rate limit | Save checkpoint, wait, retry | Yes (backoff) |
| Context overflow | Save checkpoint, start fresh session | Yes (new session) |
| Tool error | Log error, skip item, continue | No (skip) |
| Permission denied | Log error, mark blocked | No (human fix) |
| Network timeout | Retry with exponential backoff | Yes (3 attempts) |
| Assertion failure | Log full context, mark blocked | No (needs investigation) |

### Graceful Degradation

Dispatch tasks should degrade gracefully:

```markdown
Task: "Run quality pipeline on all 20 modules.

Priority order: auth, payments, api, (remaining alphabetically).

If you can only complete some modules before hitting limits:
1. Save checkpoint with completed modules
2. Write partial report with what you have
3. Exit cleanly so retry picks up remaining modules

A partial result is better than no result."
```

## Cost Tracking for Background Tasks

### Budget Envelope

Every Dispatch task has a cost budget:

```json
{
  "task": "batch-enrichment",
  "budget": {
    "maxDollars": 5.00,
    "alertAtPercent": 80,
    "killAtPercent": 100
  },
  "tracking": {
    "estimatedCostPerItem": 0.02,
    "totalItems": 200,
    "estimatedTotal": 4.00
  }
}
```

### Cost Estimation

Rough cost per operation (for budget planning):

| Operation | Estimated Cost | Notes |
|---|---|---|
| Read file | ~$0.001 | Depends on file size |
| Write file | ~$0.002 | Includes confirmation |
| Bash command | ~$0.003 | Depends on output size |
| Complex analysis | ~$0.01-0.05 | Depends on reasoning depth |
| Full test suite | ~$0.10-0.50 | Depends on test count |

### Cost Tracking Script

```bash
#!/bin/bash
# Track cost across Dispatch sessions

COST_LOG="output/dispatch/cost-log.json"

# After each Dispatch session, append cost
jq --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   --arg task "$TASK_NAME" \
   --argjson turns "$TURN_COUNT" \
   '. += [{"date": $date, "task": $task, "turns": $turns, "estimatedCost": ($turns * 0.015)}]' \
   "$COST_LOG" > "$COST_LOG.tmp" && mv "$COST_LOG.tmp" "$COST_LOG"
```

## Notification When Tasks Complete

### macOS (terminal-notifier)

```bash
STATUS=$(jq -r .status tasks/checkpoint.json)
TASK=$(jq -r .task tasks/checkpoint.json)

terminal-notifier \
  -title "Dispatch: $TASK" \
  -message "Status: $STATUS" \
  -sound "default"
```

### Telegram Bot

```bash
BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
CHAT_ID="${TELEGRAM_CHAT_ID}"
STATUS=$(jq -r .status tasks/checkpoint.json)
TASK=$(jq -r .task tasks/checkpoint.json)
COMPLETED=$(jq -r .completedItems tasks/checkpoint.json)
TOTAL=$(jq -r .totalItems tasks/checkpoint.json)

curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d parse_mode="Markdown" \
  -d text="*Dispatch Complete*
Task: ${TASK}
Status: ${STATUS}
Progress: ${COMPLETED}/${TOTAL}
Time: $(date)"
```

### Slack Webhook

```bash
WEBHOOK_URL="${SLACK_WEBHOOK_URL}"
STATUS=$(jq -r .status tasks/checkpoint.json)

curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"Dispatch task completed\",
    \"blocks\": [{
      \"type\": \"section\",
      \"text\": {
        \"type\": \"mrkdwn\",
        \"text\": \"*Dispatch Complete*\nStatus: ${STATUS}\nSee output/dispatch/ for details.\"
      }
    }]
  }"
```

### File-Based Notification (Simplest)

Write a flag file that your interactive session checks:

```bash
# Dispatch writes on completion
echo '{"status":"complete","task":"overnight-build","completedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
  > tasks/dispatch-complete.json

# Interactive session checks on startup (in session-startup skill)
if [ -f tasks/dispatch-complete.json ]; then
  echo "[dispatch] Background task completed. Check output/dispatch/ for results."
  cat tasks/dispatch-complete.json
fi
```

## Pre-Flight Checklist

Before launching a Dispatch task:

- [ ] `tasks/checkpoint.json` initialized (or ready for fresh start)
- [ ] `--max-turns` set (prevent infinite loops)
- [ ] `.claude/settings.json` grants all needed permissions for headless mode
- [ ] Output directory exists and is writable
- [ ] Error handling writes to log files (not just stdout)
- [ ] Test with 2-3 items before full batch
- [ ] Notification configured (at least file-based)
- [ ] Cost budget defined
- [ ] No shared state conflicts with interactive sessions
- [ ] CLAUDE.md has instructions the Dispatch task needs

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|---|---|---|
| No checkpoint file | Crash = lost progress | Write checkpoint after every item |
| No `--max-turns` | Infinite loop risk | Always set a limit (50-200) |
| Relying on conversation history | Headless has no prior context | Write everything to files |
| Processing dependent items | Order matters, crashes corrupt state | Batch only independent items |
| No test run | Bad prompt wastes entire batch | Test with 2-3 items first |
| Hardcoded paths | Breaks on different machines | Use relative paths from project root |
| No cost limit | Runaway sessions | Set budget in task description |
| Skipping permissions config | Headless fails on first tool use | Configure `.claude/settings.json` |
| Editing same files as interactive session | Merge conflicts | Use separate output directories |

## Integration with Other Bible Skills

| Bible Skill | Dispatch Integration |
|---|---|
| overnight-runner | Dispatch IS the runner -- use overnight-runner patterns for retry/checkpoint |
| task-commander | Tag items with `[dispatch]` for automatic pickup |
| verification-loop | Run as post-Dispatch verification step |
| confidence-check | Skip in Dispatch (no interactive confirmation) |
| session-startup | Load context at Dispatch session start |
| pre-compact | Save state if Dispatch session hits context limits |
| cost-alert | Track turns in Dispatch, alert at thresholds |
| mode-switcher | Set mode in task description for appropriate behavior |
