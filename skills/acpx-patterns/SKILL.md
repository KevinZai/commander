---
name: acpx-patterns
description: Pre-built acpx usage patterns for background, parallel, and crash-resilient sessions
version: 1.0.0
category: devops
---

# ACPX Patterns

Pre-built patterns for using `acpx` (Agent Control Protocol eXtended) to run Claude Code sessions in advanced modes.

## Background Monitor

Long-running monitoring session that watches for changes and reports:

```bash
acpx run --background --name "monitor" \
  --prompt "Watch for file changes in src/ and run tests on each change. Report failures." \
  --max-turns 100 \
  --allowed-tools Bash,Read,Glob,Grep
```

## Parallel Development

Run multiple independent tasks simultaneously:

```bash
# Task 1: Frontend work
acpx run --background --name "frontend" \
  --prompt "Implement the dashboard component per spec in tasks/spec-dashboard.md" \
  --allowed-tools Bash,Read,Write,Edit,Glob,Grep

# Task 2: Backend work
acpx run --background --name "backend" \
  --prompt "Implement the API endpoints per spec in tasks/spec-api.md" \
  --allowed-tools Bash,Read,Write,Edit,Glob,Grep

# Task 3: Tests
acpx run --background --name "tests" \
  --prompt "Write integration tests for the existing API routes" \
  --allowed-tools Bash,Read,Write,Edit,Glob,Grep

# Check status
acpx status --all
```

## Crash-Resilient Overnight

Overnight execution with automatic retry and checkpoint:

```bash
acpx run --background --name "overnight-build" \
  --prompt "Execute the full implementation plan in tasks/plan-*.md. Checkpoint after each phase. If a step fails, log the error and continue to the next phase." \
  --max-turns 200 \
  --timeout 28800 \
  --retry-on-crash 3 \
  --checkpoint-interval 10 \
  --allowed-tools Bash,Read,Write,Edit,Glob,Grep
```

## Structured Output

Run a task and capture structured JSON output:

```bash
acpx run --name "audit" \
  --prompt "Analyze this codebase and return a JSON report with: {health_score, issues[], recommendations[]}" \
  --output-format json \
  --allowed-tools Bash,Read,Glob,Grep
```

## Queue Management

Manage a queue of tasks to run sequentially:

```bash
# Add tasks to queue
acpx queue add --name "task-1" --prompt "Fix the auth bug in src/auth.ts"
acpx queue add --name "task-2" --prompt "Add rate limiting to API routes"
acpx queue add --name "task-3" --prompt "Update README with new API docs"

# Run queue (sequential, auto-advances)
acpx queue run --sequential --checkpoint-between

# Check queue status
acpx queue status
```

## Best Practices

1. **Always name sessions** -- makes monitoring and log review easier
2. **Set max-turns** -- prevents runaway sessions from burning tokens
3. **Use allowed-tools** -- restrict to only what the task needs
4. **Checkpoint for long runs** -- enables resume after crashes
5. **Monitor costs** -- set `--cost-ceiling` for budget control
6. **Log output** -- pipe to file for post-session review: `acpx run ... 2>&1 | tee session.log`
