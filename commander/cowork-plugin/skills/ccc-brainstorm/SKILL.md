---
name: ccc-brainstorm
description: Design-first ideation gate. Use when starting a new feature or facing a design choice. Forces 3 alternatives before any code is written. Triggers AskUserQuestion to pick the path.
allowed-tools:
  - Agent
  - AskUserQuestion
  - Bash
  - Read
argument-hint: "[feature idea or design question in quotes]"
---

# /ccc-brainstorm — Design-First Ideation Gate

Before writing code or specs, generate 3 distinct alternatives. Forces designer-mode thinking and surfaces tradeoffs early.

## Triggers

- Starting a new feature ("how should I build X")
- Choosing between technical approaches
- Stuck on a design decision
- User types `/ccc-brainstorm` or `/brainstorm`

## Process

### Step 1 — Capture the question

If no argument provided, call `AskUserQuestion`:
```
question: "What are we brainstorming?"
options:
  - label: "🆕 New feature design"
  - label: "🔀 Choosing between approaches"
  - label: "🎨 UI/UX decision"
  - label: "🏗️ Architecture choice"
```

Accept free-form text for the specific topic.

### Step 2 — Spawn 3 parallel micro-agents

Fire 3 `Agent` calls simultaneously, each tasked with a different constraint lens:

- **Agent A** — "Simplest possible solution. What is the most boring, direct, fewest-moving-parts approach?"
- **Agent B** — "Most scalable / future-proof solution. What would you build if you expected 10× the current load or scope?"
- **Agent C** — "Most user-delight-first solution. What would a designer obsessed with UX build, ignoring technical constraints?"

Each agent returns: `name`, `summary` (2-3 sentences), `pros` (3 bullets), `cons` (3 bullets), `best for` (one line).

### Step 3 — Synthesize and present

After all 3 agents return, render a comparison table in chat (for reference), then call `AskUserQuestion`:

```
question: "Three paths explored — which direction resonates?"
options:
  - label: "⚡ Path A — [Simplest]"
    description: <agent A summary>
  - label: "🚀 Path B — [Scalable]"
    description: <agent B summary>
  - label: "✨ Path C — [Delight-first]"
    description: <agent C summary>
  - label: "🔀 Hybrid — combine elements"
    description: "Describe which parts to mix"
```

### Step 4 — Lock the direction

Once the user picks, output:
1. **Decision:** one-line summary of chosen path
2. **Why:** the key tradeoff that makes this right
3. **Next:** suggest `/ccc-plan` to formalize or `/ccc-build` to scaffold

Never write any code during this skill. This is ideation only.

## Anti-patterns

- Do not write code or create files
- Do not present only one option
- Do not skip the parallel agents — all 3 must run

> Adapted from superpowers/brainstorming — MIT licensed.
