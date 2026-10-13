---
name: architecture-decision
category: planning
skills: [dialectic-review, ccc-debate, ccc-plan]
mode: plan
estimated_tokens: 700
---

# Architecture Decision Record (ADR)

## When to Use
Use when a technical decision is expensive to reverse: a database, auth provider, framework, deployment strategy or API architecture. The template produces a formal ADR with a weighted comparison of the options. For a quick trade-off question that does not need a record, ask directly instead.

## Template

```
Help me make the architecture decision below and produce a formal ADR. Ground every claim in the codebase or a cited source, and label anything you assume.

**Decision to make:**
{{what_needs_to_be_decided}}

**Context:**
{{current_system_state, constraints, team_size, timeline}}

**Options under consideration:**
1. {{option_a}}
2. {{option_b}}
3. {{option_c — optional}}

Step 1: Read the parts of the codebase the decision touches (Glob, Grep, Read) and list the constraints they impose.

Step 2: Analyze each option against these criteria:
1. Fit: how well it solves the stated problem.
2. Complexity: implementation and operational burden.
3. Cost: licensing, infrastructure, engineering time.
4. Scalability: whether it works at 10x current scale.
5. Lock-in: how hard it is to switch away later.
6. Team familiarity: whether the team already knows it.
7. Ecosystem: community, documentation, integrations.
8. Risk: what could go wrong and how bad the worst case is.

Step 3: Fill in the decision matrix. Score each criterion 1-5 (1 = poor, 5 = excellent) and give a one-line reason per score.

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
| Weighted total | | X | X | X |

Step 4: State the recommended option and the single fact that would change the recommendation.

Step 5: Write the ADR in this format:

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

Save it as the next number in `docs/adr/` (or `tasks/adr/` if that is where existing ADRs live), then list the directory to confirm the file was written.
```

## Tips
- For a high-reversal-cost decision, run the `dialectic-review` skill (FOR, AGAINST and referee agents) or `/ccc-debate` before choosing; their verdict feeds Step 4.
- For a deeper design pass, delegate to the `architect` subagent with the Agent tool; it routes to the `fable` tier. Otherwise the session's selected model is kept.
- Number ADRs sequentially and revisit them when the context that justified them changes.

## Example

```
Help me make the architecture decision below and produce a formal ADR.

**Decision to make:**
Which database to use for a new analytics feature that handles 100M+ events per day with real-time aggregation.

**Context:**
PostgreSQL for everything today. Three backend engineers. Must be live in six weeks.

**Options under consideration:**
1. ClickHouse (dedicated analytics database)
2. PostgreSQL with the TimescaleDB extension
3. Tinybird (managed ClickHouse service)
```
