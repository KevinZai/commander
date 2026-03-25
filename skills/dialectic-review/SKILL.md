---
name: dialectic-review
description: "Multi-agent opposing review for important decisions. Spawns FOR agent + AGAINST agent + Referee for synthesized analysis. Use when: architecture decisions, vendor evaluations, approach tradeoffs, 'should we X?', 'I'm not sure about', reversibility concerns, major refactors."
metadata:
  version: 1.0.0
  source: "griffinhilly/claude-code-synthesis (adapted)"
---

# Dialectic Review

For important decisions, don't ask one agent "what should I do?" Instead, spawn opposing agents — one argues FOR, one argues AGAINST — with a referee to synthesize. This produces dramatically better analysis than pros-and-cons from a single agent.

## When to Trigger

Proactively suggest dialectic review when:
- Choosing between approaches → **tradeoff analysis**
- Decision expensive to reverse → **premortem** ("imagine it failed — why?")
- Code or plan needs stress-testing → **adversarial review**
- Need creative ideas → **ideation with challengers**
- User says "I'm not sure" or expresses uncertainty

## The Pattern

### Step 1: Frame the Decision
State the decision clearly with context. Both agents get identical framing.

### Step 2: Spawn FOR Agent
```
You are arguing FOR this decision: [decision]

Context: [full context]

Make the strongest possible case. Include:
- Direct benefits with evidence
- Second-order effects that favor this choice
- Why the risks are manageable
- Concrete implementation path

Do NOT hedge or present counterarguments. That's the other agent's job.
Your output will be evaluated by a referee.
```

### Step 3: Spawn AGAINST Agent
```
You are arguing AGAINST this decision: [decision]

Context: [full context]

Make the strongest possible case against. Include:
- Direct risks with evidence
- Hidden costs and second-order downsides
- Better alternatives that were overlooked
- Specific failure modes and their likelihood

Do NOT hedge or concede points. That's the referee's job.
Your output will be evaluated by a referee.
```

### Step 4: Referee Synthesizes
```
You are the referee. Two agents have argued opposing positions.

Decision: [decision]
FOR argument: [paste FOR output]
AGAINST argument: [paste AGAINST output]

Synthesize:
1. Which arguments are strongest on each side? (cite specific claims)
2. Which claims are factual vs speculative?
3. What's the actual risk level? (low/medium/high with reasoning)
4. What conditions would make each side right?
5. Your recommendation with confidence level (high/medium/low)

Format:
Strongest FOR: [top 2-3 arguments]
Strongest AGAINST: [top 2-3 arguments]
Unresolved: [arguments neither side settled]
Recommendation: [decision + confidence + conditions]
```

## Modes

### Tradeoff Analysis (default)
FOR vs AGAINST a specific decision. Use for architecture, vendor, approach choices.

### Premortem
"Imagine this decision was made 6 months ago and it failed. Why?"
- Agent 1: List all failure modes
- Agent 2: List all success modes
- Referee: Risk-adjusted assessment

### Adversarial Review
One agent wrote it, another tries to break it.
- Agent 1: Present the work
- Agent 2: Find every flaw, edge case, failure mode
- Referee: Prioritize issues by severity

### Ideation
- Agent 1: Generate 5 bold ideas
- Agent 2: Challenge each — why it won't work
- Referee: Rank by feasibility × impact, noting which challenges are real vs theoretical

## Anti-Patterns
- Don't use for trivial decisions (naming, formatting)
- Don't use when one answer is obviously correct
- Don't let the referee split the difference — force a recommendation
- Both agents must get identical context — asymmetric info biases the outcome
