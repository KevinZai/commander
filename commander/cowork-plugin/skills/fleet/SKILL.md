---
name: fleet
description: "Launch parallel agents for multi-step or parallelizable tasks. Use when: 'fleet', 'parallel agents', 'launch workers', 'multi-agent', 'swarm', 'run in parallel', 'multiple agents', 'fan out'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "<task description or --power for dashboard>"
---

# /ccc:fleet

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Launch N parallel agents to execute a task faster or tackle independent workstreams simultaneously. Quick Mode: describe the task and launch. Power Mode: full fleet dashboard with cost tracking and circuit breakers.

## Quick Mode (default)

Ask one question:

"Describe the task. I'll figure out how many agents to launch and what each one should do."

Then:
1. Decompose the task into N independent subtasks
2. Show the decomposition for confirmation
3. Launch agents in parallel via the Agent tool
4. Collect results and synthesize a final report

**Auto-decomposition rules:**
- Tasks with independent file targets → one agent per file/module
- Research tasks → one agent per source/domain
- Review tasks → one agent per dimension (security, perf, correctness, maintainability)
- Build tasks → serialize (use `/ccc:build` instead unless clearly parallel)

**Max agents (Quick Mode):** 5 — prevents runaway cost on ambiguous tasks.

## Power Mode

Activate by passing `--power` or `detailed`.

Full fleet management:

### Fleet Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ FLEET COMMANDER                            [Date/Time]          │
├──────────┬─────────────────────────────┬────────┬─────────────┤
│ Agent    │ Task                        │ Status │ Cost        │
├──────────┼─────────────────────────────┼────────┼─────────────┤
│ Worker 1 │ Security review: auth.ts    │ Done   │ $0.04       │
│ Worker 2 │ Security review: api.ts     │ Active │ $0.02...    │
│ Worker 3 │ Perf review: db.ts          │ Active │ $0.01...    │
│ Worker 4 │ Correctness: utils.ts       │ Queue  │ —           │
└──────────┴─────────────────────────────┴────────┴─────────────┘
│ Total: 3 active / 1 queued              Cost so far: $0.07     │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration (Power Mode)
- **Max workers:** 3 (default) / 5 / 10 / custom
- **Cost ceiling:** $1.00 (default) — circuit-break if exceeded
- **Worker model:** haiku (fast/cheap) / sonnet (balanced) / opus (deep)
- **Isolation:** each worker gets a clean context with only its task
- **Synthesis:** final agent collects all outputs and produces summary

### Circuit Breakers
- Stop all workers if total cost exceeds ceiling
- Stop all workers if any worker errors 3+ times
- Stop all workers if a worker returns a CRITICAL security finding (escalate immediately)

## Fleet Commander Integration

Fleet Commander runs at port **4680** (PM2 service). When available:
```bash
# Check Fleet Commander status
curl http://localhost:4680/status

# View active agents
curl http://localhost:4680/agents

# Cancel a fleet run
curl -X DELETE http://localhost:4680/runs/<id>
```

If Fleet Commander is not running, agents are launched directly via the Agent tool with coordination handled in the current context.

## Isolation Pattern

Each worker agent receives:
```
Context: [Task description]
Scope: [Specific files or subtask]
Output format: [Structured JSON or markdown]
Do NOT read files outside your scope.
Report results in the specified format only.
```

This prevents context bleed between workers and keeps outputs clean for synthesis.

## If Connectors Available

If **~~project tracker** is connected:
- Track each worker's subtask as a child issue
- Update status as workers complete
- Link synthesized output to the parent issue

## Tips

1. **Decompose before you launch** — always confirm the decomposition first; a bad split wastes tokens.
2. **Haiku for workers** — use cheaper models for parallel workers; Sonnet/Opus for synthesis.
3. **Set a cost ceiling** — Power Mode defaults to $1.00; adjust based on task importance.
4. **Independent tasks only** — if subtask B depends on subtask A's output, run them serially, not in a fleet.
