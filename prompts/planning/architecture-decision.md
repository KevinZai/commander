---
name: architecture-decision
category: planning
skills: [dialectic-review, plan, architect]
mode: plan
estimated_tokens: 700
---

# Architecture Decision Record (ADR)

## When to Use
When making a technical decision that is expensive to reverse: choosing a database, auth provider, framework, deployment strategy, or API architecture. This template produces a formal ADR with pro/con analysis.

## Template

```
Help me make the following architecture decision. Produce a formal ADR with rigorous analysis — no hand-waving.

**Decision to make:**
{{what_needs_to_be_decided}}

**Context:**
{{current_system_state, constraints, team_size, timeline}}

**Options under consideration:**
1. {{option_a}}
2. {{option_b}}
3. {{option_c — optional}}

**Evaluation framework:**
For each option, analyze:

1. **Fit** — How well does it solve the stated problem?
2. **Complexity** — What's the implementation and operational burden?
3. **Cost** — Licensing, infrastructure, engineering time
4. **Scalability** — Does it work at 10x current scale?
5. **Lock-in** — How hard is it to switch away later?
6. **Team familiarity** — Does the team know this tech?
7. **Ecosystem** — Community, docs, third-party integrations
8. **Risk** — What could go wrong? How bad is the worst case?

**Decision matrix:**
| Criterion | Weight | Option A | Option B | Option C |
|---|---|---|---|---|
| Fit | 25% | score | score | score |
| Complexity | 15% | score | score | score |
| Cost | 15% | score | score | score |
| Scalability | 15% | score | score | score |
| Lock-in | 10% | score | score | score |
| Familiarity | 10% | score | score | score |
| Ecosystem | 5% | score | score | score |
| Risk | 5% | score | score | score |
| **Weighted Total** | | **X** | **X** | **X** |

Score each 1-5 (1=poor, 5=excellent).

**Output ADR format:**
```markdown
# ADR-XXX: {{title}}
**Date:** {{today}}
**Status:** Proposed
**Deciders:** {{who}}

## Context
{{why this decision is needed now}}

## Decision
{{the chosen option and why}}

## Consequences
### Positive
- ...
### Negative
- ...
### Risks and mitigations
- ...
```

For important decisions, use the `dialectic-review` skill to spawn FOR and AGAINST agents for each option before deciding.
```

## Tips
- Use the `dialectic-review` skill for decisions with high reversal cost
- Number your ADRs sequentially and store them in `docs/adr/` or `tasks/adr/`
- Revisit ADRs quarterly — decisions may need updating as context changes

## Example

```
Help me make the following architecture decision. Produce a formal ADR with rigorous analysis.

**Decision to make:**
Which database to use for our new analytics feature that needs to handle 100M+ events/day with real-time aggregation.

**Context:**
Currently PostgreSQL for everything. Team of 3 backend engineers. Need this live in 6 weeks.

**Options:**
1. ClickHouse (dedicated analytics DB)
2. PostgreSQL with TimescaleDB extension
3. Tinybird (managed ClickHouse SaaS)
```
