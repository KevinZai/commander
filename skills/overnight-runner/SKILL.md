---
name: overnight-runner
description: "Run autonomous batch jobs overnight or during long unattended periods. Patterns for usage limit retries, batch checkpointing, multi-session resume, and human gate points. Use when: 'run this overnight', 'batch process', 'autonomous run', 'unattended execution', 'scheduled batch'."
metadata:
  version: 1.0.0
  source: "griffinhilly/claude-code-synthesis (adapted)"
---

# Overnight Runner

Patterns for running autonomous Claude Code sessions during long unattended periods (overnight, weekends). Key challenges: usage limits, session crashes, partial progress, and knowing what happened.

## Architecture

### Batch Mode (Preferred)
Process a list of independent items. Each item is a checkpoint — crash-safe by design.

```bash
# Run with max turns to prevent infinite loops
claude --headless --max-turns 50 \
  "Process items from tasks/batch-queue.json. For each item:
   1. Load from queue
   2. Process (details in CLAUDE.md)
   3. Write result to output/
   4. Mark item as done in queue
   5. Move to next item
   If you hit an error, log it to output/errors.log and skip to next item.
   Stop when queue is empty."
```

### Resume Mode
Long-running task that may exceed a single session. Uses checkpoint files.

```bash
# The task writes progress to a checkpoint file
claude --headless --max-turns 100 \
  "Continue the migration task. Read tasks/checkpoint.json for where you left off.
   After each major step, update the checkpoint file.
   If you're about to hit context limits, save state and stop gracefully."
```

## Checkpoint Pattern

```json
// tasks/checkpoint.json
{
  "task": "data-enrichment",
  "totalItems": 500,
  "completedItems": 237,
  "lastProcessed": "item-237",
  "lastUpdated": "2026-03-25T03:14:00Z",
  "status": "in-progress",
  "errors": ["item-45: API timeout", "item-112: malformed data"]
}
```

## Human Gate Points

Some steps need human judgment. Make the workflow explicitly interruptible:

```json
// tasks/batch-queue.json
{
  "steps": [
    {"id": "fetch", "status": "done", "skip": false},
    {"id": "categorize", "status": "done", "skip": false},
    {"id": "human-review", "status": "waiting", "gate": true, "note": "Review categorization quality before proceeding"},
    {"id": "enrich", "status": "pending", "skip": false},
    {"id": "export", "status": "pending", "skip": false}
  ]
}
```

Agent checks gate status → if `"gate": true` and `"status": "waiting"`, stop and report.

## Usage Limit Recovery

```bash
# Wrapper script that retries on usage limits
#!/bin/bash
MAX_RETRIES=5
RETRY_DELAY=1800  # 30 minutes

for i in $(seq 1 $MAX_RETRIES); do
  echo "[$(date)] Attempt $i of $MAX_RETRIES"
  claude --headless --max-turns 100 \
    "Resume from tasks/checkpoint.json" 2>&1 | tee -a logs/overnight.log

  # Check if completed
  if grep -q '"status": "complete"' tasks/checkpoint.json; then
    echo "✅ Task completed!"
    exit 0
  fi

  echo "⏳ Waiting ${RETRY_DELAY}s before retry..."
  sleep $RETRY_DELAY
done

echo "❌ Max retries reached. Check logs/overnight.log"
```

## Notification on Completion

### macOS (terminal-notifier)
```bash
# At end of wrapper script:
terminal-notifier -title "Overnight Run" -message "Batch complete: $(jq .completedItems tasks/checkpoint.json) items"
```

### Telegram (via curl)
```bash
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d text="🌙 Overnight run complete. $(jq .completedItems tasks/checkpoint.json)/$(jq .totalItems tasks/checkpoint.json) items processed."
```

## Pre-Flight Checklist

- [ ] Checkpoint file initialized
- [ ] `--max-turns` set (prevent infinite loops)
- [ ] Error handling writes to log (don't lose errors to context compaction)
- [ ] Output directory exists and is writable
- [ ] Test with 2-3 items before full batch
- [ ] Notification configured for completion/failure
- [ ] `.claude/settings.json` has permissions for all needed tools

## Anti-Patterns
- Don't rely on conversation history surviving — write everything to files
- Don't process items that depend on each other — batch mode is for independent items
- Don't skip the test run — one bad prompt burns an entire night
- Don't use `--dangerously-skip-permissions` unless you've audited every possible tool call
