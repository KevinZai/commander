---
name: cost-optimize
category: meta
skills: [ccc-usage, context-budget, strategic-compact]
mode: plan
estimated_tokens: 500
---

# Cost Optimization

## When to Use
Use when a session is getting expensive or nearing a budget limit, when planning a long-running task, or when setting cost-efficient habits for daily work.

## Template

```
Reduce the token usage and model cost of this workflow without lowering output quality. Keep my selected model unless I approve a change.

**Current situation:**
{{describe — e.g., "sessions cost more than expected", "the overnight run exceeded budget", "daily usage is $X"}}

**Budget target:**
{{desired_cost_per_session_or_per_day}}

Step 1: Audit current usage. Find where tokens go, using `/ccc-usage` or the status line cost display for real numbers. Rank each activity by token impact and frequency:

| Activity | Token impact | Frequency | Cost weight |
|---|---|---|---|
| Reading large files whole | High | Often | Major |
| Writing full files instead of Edit | High | Sometimes | Major |
| Broad glob/grep searches | Medium | Often | Moderate |
| Verbose tool output | Medium | Always | Moderate |
| Re-reading unchanged files | Medium | Sometimes | Moderate |
| High effort on simple tasks | Low to medium | Sometimes | Minor |

Step 2: Route work by tier. Propose a tier per task type and ask before changing the session model:

| Task type | Claude tier | Codex tier | Cost |
|---|---|---|---|
| Classification, extraction, mechanical edits | `haiku` | `gpt-6-luna` | $ |
| Bounded edits, docs, focused review | `sonnet` | `gpt-6-sol` | $$ |
| Implementation, orchestration, standard review | `opus` | `gpt-6.1-sol` | $$$ |
| Architecture, migrations, security, verifying load-bearing claims | `fable` | `gpt-6-astra` | $$$$ |

Set the tier per subagent with the Agent tool `model` and `effort` parameters rather than switching the whole session. Lower `/effort` for routine turns; reserve `xhigh` and `/effort ultracode` for work that needs them.

Step 3: Apply token reduction techniques:
- Use Edit over Write; it sends only the change, not the full file.
- Read specific line ranges (`offset`, `limit`) instead of whole files.
- Narrow globs (`src/api/*.ts`, not `**/*.ts`) and targeted grep.
- Do not re-read a file you just wrote.
- Save state with the `strategic-compact` skill before the context window fills.
- Give each subtask a fresh subagent instead of reusing a bloated context.

Step 4: Structure long tasks in phases:
1. Plan with `fable` or `opus`: architecture decisions, written plan.
2. Execute with `sonnet` or `haiku` subagents (or `codex exec` on a Codex tier): follow the plan.
3. Review with `sonnet`, or a `fable` verifier for load-bearing claims: check quality and catch issues.

This avoids paying the top tier for mechanical work.

Step 5: Monitor:
- Track cost per session from `/ccc-usage` or the status line.
- Set `KZ_COST_CEILING` (dollars per workflow) if Commander workflows should stop at a ceiling.
- Review cost trends weekly and remove wasteful patterns.

**Output:**
List the top 5 cost savings with estimated impact:
| Change | Estimated savings | Effort |
|---|---|---|
| ... | ... | ... |
```

## Tips
- `/ccc-model-route` recommends a tier and effort for the current task from its complexity, risk and budget.
- The `context-budget` skill (`/ccc-context-budget`) shows how full the context window is and what fills it.
- The `strategic-compact` skill preserves key context while reducing window usage.

## Example

```
Reduce the token usage and model cost of this workflow without lowering output quality. Keep my selected model unless I approve a change.

**Current situation:** Daily sessions cost $8-12 and overnight runs reach $15. Most work is standard CRUD development that does not need the top tier.
**Budget target:** Under $5/day for standard work, under $10 for overnight runs.
```
