---
name: task-commander
category: meta
skills: [task-commander, agency-orchestrator, delegation-templates, confidence-check, ccc-fleet]
mode: plan
estimated_tokens: 800
---

# Task Commander Session

## When to Use
Use for a task that benefits from multi-agent orchestration, typically P3 or larger: several files, domains or kinds of expertise. Task Commander handles agent dispatch, cost tracking, verification gates and failure recovery.

## Template

```
Coordinate this task as Task Commander: plan it, dispatch agents, verify their output and report.

Current project: {{project_name}}
Task scope: {{scope}} (P0-P10)
Available agents: {{agents}}
Cost ceiling: {{cost_ceiling}}

## Mission
{{mission_description}}

## Workflow
Based on scope P{{scope_number}}, use the {{workflow_name}} workflow.

## Rules
1. Give each agent a self-contained prompt; do not rely on context it has not been given.
2. Verify each agent's output before passing it to the next agent. The verifier is never the agent that did the work.
3. If an agent fails twice, reassign the task to a different agent type.
4. Report status after each phase.
5. Stop and escalate to me if cost reaches the ceiling.
6. Run COMP PROVE verification before marking the task complete.
7. Keep my selected model for this session; set tiers per agent only as the plan states.

## Available workflows

Pick the workflow that matches the task. The DAG files live in `skills/task-commander/workflows/`.

| Workflow | File | Use when |
|---|---|---|
| feature-build | feature-build.yml | Building new features |
| bug-investigation | bug-investigation.yml | Finding and fixing bugs |
| code-review-deep | code-review-deep.yml | Thorough multi-perspective review |
| research-deep | research-deep.yml | Deep research on a topic |
| overnight-batch | overnight-batch.yml | Autonomous long-running tasks |
| migration | migration.yml | Technology or codebase migrations |

## Execution protocol

### Phase 1: Assess
- Confirm the scope (P0-P10) matches the task's complexity.
- Select the workflow DAG.
- Map agents to tasks by strength and cost: `fable` or `gpt-6-astra` for architecture and verification, `opus` or `gpt-6.1-sol` for implementation, `sonnet` or `gpt-6-sol` for bounded edits and focused review, `haiku` or `gpt-6-luna` for mechanical and bulk work.
- Estimate cost and duration.
- Present the plan for approval. Proceed without approval only for P0-P2.

### Phase 2: Dispatch
For each task in the DAG, respecting dependencies:
- Build a self-contained prompt: objective, input artifacts, output format, constraints, and the check that proves it done.
- Dispatch with the Agent tool (`model`, `effort`, and `isolation: worktree` for any agent that writes files), the Workflow tool for a full DAG, `codex exec --json` for Codex agents, or the Agency Orchestrator tools if that opt-in integration is installed.
- Run independent tasks in parallel; keep dependent tasks sequential.
- Log every dispatch (agent, task, model, start time) to the task-commander log.

### Phase 3: Monitor
- Track each agent's progress, cost and elapsed time.
- Run verification gates at the checkpoints the workflow defines.
- On failure: retry up to twice, then open the circuit breaker and reassign or escalate.
- When cost passes 80% of the ceiling, pause and ask me before continuing.

### Phase 4: Verify (COMP PROVE)
Before marking complete, verify each item with evidence:
- C — Completeness: every DAG task is done.
- O — Output: the expected artifacts exist.
- M — Metrics: cost and time are within bounds.
- P — Passing: every verification gate is green.
- P — Proof: each claim has evidence (command output, path:line, URL).
- R — Regression: the test suite still passes, run fresh.
- O — Objectives: the original goals are met.
- V — Validated: a human-reviewable summary exists.
- E — Edge cases: tested.

### Phase 5: Report
Produce a completion report with:
- Task summary and outcomes.
- Cost breakdown by agent.
- Artifacts produced.
- Verification results, each with the command run and its result.
- Next steps or remaining work.
```

## Tips
- For P0-P2 tasks, skip Task Commander and do the work directly.
- Run the `confidence-check` skill before dispatching P6+ workflows.
- Use the `delegation-templates` skill for structured agent prompts.
- The `agency-orchestrator` skill describes the opt-in Agency Orchestrator integration; the built-in path is `/ccc-fleet` or the Workflow tool.
- Set `KZ_COST_CEILING` (dollars per workflow) to override the default ceiling.
- `/ccc-night-mode` runs a long autonomous build with build and review cycles.

## Example: Feature Build

```
Coordinate this task as Task Commander: plan it, dispatch agents, verify their output and report.

Current project: acme-saas
Task scope: P5 (medium — multi-file feature with tests)
Available agents: Claude opus, Claude sonnet, Claude haiku, Codex gpt-6.1-sol
Cost ceiling: $2.00

## Mission
Build a webhook delivery system with endpoint registration, retry logic with
exponential backoff, and event logging to PostgreSQL.

## Workflow
Based on scope P5, use the feature-build workflow.

## Rules
1. Give each agent a self-contained prompt; do not rely on context it has not been given.
2. Verify each agent's output before passing it to the next agent. The verifier is never the agent that did the work.
3. If an agent fails twice, reassign the task to a different agent type.
4. Report status after each phase.
5. Stop and escalate to me if cost reaches $2.00.
6. Run COMP PROVE verification before marking the task complete.
7. Keep my selected model for this session; set tiers per agent only as the plan states.
```

## Example: Bug Investigation

```
Coordinate this task as Task Commander: plan it, dispatch agents, verify their output and report.

Current project: acme-api
Task scope: P4 (medium — unclear root cause, needs isolation)
Available agents: Claude sonnet, Claude haiku, Codex gpt-6-sol
Cost ceiling: $1.00

## Mission
Users report intermittent 503 errors on the /api/checkout endpoint during
peak hours. Error logs show connection pool exhaustion, but the pool is
configured for 50 connections and we average 20 concurrent requests.

## Workflow
Based on scope P4, use the bug-investigation workflow.
```

## Example: Overnight Batch

```
Coordinate this task as Task Commander: plan it, dispatch agents, verify their output and report.

Current project: acme-monorepo
Task scope: P9 (large — 200+ files, needs overnight execution)
Available agents: Codex gpt-6-luna (x3), Claude haiku, Claude fable (verifier)
Cost ceiling: $8.00

## Mission
Migrate all 200 React class components to functional components with hooks.
Each component has existing tests that must continue to pass. Work overnight
with a checkpoint commit every 10 components.

## Workflow
Based on scope P9, use the overnight-batch workflow.
```
