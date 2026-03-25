---
name: evals-before-specs
description: "Define success criteria before writing specs. Progression: evals → spec → plan → implement → verify. Use when: starting features, writing specs, planning work, 'how should I build this?', feature kickoff."
metadata:
  version: 1.0.0
  source: "griffinhilly/claude-code-synthesis (adapted)"
---

# Evals Before Specs

Define how you'll evaluate success BEFORE writing the spec. This constrains the solution space and produces better specs.

## The Progression

```
evals → spec → plan → implement → verify against evals
```

NOT: plan → implement → "does this look right?"

## How to Apply

### 1. Write Evals First
Before any implementation planning, answer:
- What does "done" look like? (concrete, testable)
- What does "broken" look like? (failure modes)
- How will we measure quality? (metrics, thresholds)
- What edge cases must work? (enumerate them)

### 2. Eval Types

**Behavioral evals** — Does it do the right thing?
```
Given [input], expect [output]
Given [edge case], expect [graceful handling]
Given [invalid input], expect [clear error]
```

**Performance evals** — Is it fast enough?
```
[Operation] completes in <[threshold]ms for [N] items
Memory stays under [limit] during [workload]
```

**Integration evals** — Does it play nice?
```
Existing [feature X] still works after change
API contract [endpoint] returns same shape
No regression in [test suite]
```

**User evals** — Would a human approve?
```
[Workflow] takes fewer than [N] clicks
[Error state] shows actionable message
[First-time user] can complete [task] without docs
```

### 3. Then Write the Spec
With evals in hand, the spec writes itself:
- Each eval implies a requirement
- Requirements that don't map to evals get questioned
- Scope is naturally bounded by what you'll test

### 4. Verify Against Evals
After implementation, run every eval:
- [ ] All behavioral evals pass
- [ ] Performance within thresholds
- [ ] Integration tests green
- [ ] Manual spot-check of user evals

## Example

**Bad:** "Build a search feature"
**Good:**
```
Evals:
1. Typing "react hooks" returns relevant results in <200ms
2. Empty query shows recent/popular items
3. No results shows helpful message, not blank page
4. 10,000 items indexed without UI lag
5. Search works with typos (fuzzy matching)
6. Existing navigation still works (no regression)

Spec: [flows naturally from these constraints]
```

## When to Skip
- Trivial changes (typo fix, style tweak)
- Exploratory work where the goal IS to discover what success looks like
- But even then: "What will I know when this exploration is done?" is an eval
