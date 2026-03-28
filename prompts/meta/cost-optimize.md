---
name: cost-optimize
category: meta
skills: [model-route, context-budget, strategic-compact]
mode: plan
estimated_tokens: 500
---

# Cost Optimization

## When to Use
When a Claude Code session is getting expensive (approaching budget limits), when planning a long-running task, or when you want to establish cost-efficient habits for daily use.

## Template

```
Optimize the cost of this Claude Code workflow. Reduce token usage and model costs without sacrificing output quality.

**Current situation:**
{{describe — e.g., "session costs are hitting $2+", "overnight run exceeded budget", "daily usage is $X"}}

**Budget target:**
{{desired_cost_per_session_or_per_day}}

**Step 1: Audit current usage**
Identify where tokens are being spent:

| Activity | Token impact | Frequency | Cost weight |
|---|---|---|---|
| Reading large files | HIGH | Often | **Major** |
| Writing full files (vs Edit) | HIGH | Sometimes | **Major** |
| Broad glob/grep searches | MEDIUM | Often | **Moderate** |
| Verbose tool output | MEDIUM | Always | **Moderate** |
| Re-reading unchanged files | MEDIUM | Sometimes | **Moderate** |
| Extended thinking on simple tasks | LOW | Sometimes | **Minor** |

**Step 2: Model routing**
Match tasks to the most cost-efficient model:

| Task type | Recommended model | Cost tier |
|---|---|---|
| Simple edits, formatting | Haiku | $ |
| Standard development | Sonnet | $$ |
| Architecture decisions | Opus | $$$ |
| Parallel subagent work | Haiku | $ |
| Code review (non-critical) | Sonnet | $$ |
| Security audit | Opus or Sonnet | $$-$$$ |

**Step 3: Token reduction techniques**
Apply these patterns:
- **Use Edit over Write** — sends only the diff, not the full file
- **Read specific line ranges** — `Read(file, offset, limit)` instead of entire files
- **Targeted grep** — narrow glob patterns (`src/api/*.ts` not `**/*.ts`)
- **Avoid re-reading** — don't read a file you just wrote
- **Compact before overflow** — use `strategic-compact` skill before context window fills
- **One subagent per task** — don't reuse bloated contexts

**Step 4: Session architecture**
Structure long tasks for cost efficiency:
1. **Plan session** (Opus, 10 min) — architecture decisions, write the plan
2. **Execute session** (Sonnet/Haiku, hours) — follow the plan mechanically
3. **Review session** (Sonnet, 15 min) — verify quality, catch issues

This avoids paying Opus rates for mechanical work.

**Step 5: Monitoring**
- Track cost per session using the status line cost display
- Set alerts at 80% of budget (`KZ_COST_ALERT_THRESHOLD`)
- Review weekly cost trends
- Identify and eliminate wasteful patterns

**Output:**
List the top 5 cost savings with estimated impact:
| Change | Estimated savings | Effort |
|---|---|---|
| ... | ... | ... |
```

## Tips
- Use the `model-route` skill for automated model selection based on task complexity
- The `context-budget` skill monitors and manages context window usage
- The `strategic-compact` skill preserves key context while reducing window usage

## Example

```
Optimize the cost of this Claude Code workflow.

**Current situation:** Daily sessions cost $8-12, overnight runs hit $15+. Most work is standard CRUD development that doesn't need Opus.
**Budget target:** Under $5/day for standard work, under $10 for overnight runs.
```
