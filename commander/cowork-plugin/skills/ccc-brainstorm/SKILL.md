---
name: ccc-brainstorm
description: "Design-first ideation gate. Forces 3 alternatives before any code is written. Triggers AskUserQuestion to pick the path."
allowed-tools:
  - Agent
  - AskUserQuestion
  - Bash
  - Read
argument-hint: "[feature idea or design question in quotes]"
---

# /ccc-brainstorm — Design-First Ideation Gate

Before writing code or specs, generate 3 distinct alternatives. Forces designer-mode thinking and surfaces tradeoffs early. No code is written during this skill — only decisions are made.

## Triggers

- `/ccc-brainstorm` or `/brainstorm`
- "how should I build X"
- "which approach should I take"
- "I'm torn between X and Y"
- "help me decide on [auth / DB / design system / API shape]"
- "explore options for"
- "what are my choices for"

## When NOT to Use

- Fixing a bug with an obvious solution (use `/ccc-review` or just fix it)
- Well-known patterns where the answer is already standard (e.g., "how do I add a .env file")
- Tasks with a single correct answer (use `/ccc-plan` directly)
- Mid-implementation pivots where switching costs exceed the decision value

## Process

### Step 1 — Capture the question

If no argument provided, call `AskUserQuestion`:

```yaml
question: "What are we brainstorming?"
options:
  - label: "🆕 New feature design"
    description: "You have a feature idea and want to explore approaches before writing any code."
  - label: "🔀 Choosing between approaches"
    description: "You have 2–3 candidates and need to compare them rigorously."
  - label: "🎨 UI/UX decision"
    description: "Layout, component library, interaction model, visual system."
  - label: "🏗️ Architecture choice"
    description: "DB schema, service boundary, auth strategy, data model."
  - label: "✏️ Free-form — I'll describe it"
    description: "Type your question in the next prompt."
```

Accept the free-form description as the brainstorm topic.

### Step 2 — Spawn 3 parallel micro-agents

Fire 3 `Agent` calls simultaneously. Each agent receives this base context:

```
Topic: {user_topic}
Codebase context: {relevant files or stack, if provided}
```

**Agent A — Simplest Possible**
Prompt:
> "You are evaluating the SIMPLEST possible solution for: {topic}. What is the most direct, boring, fewest-moving-parts approach? No abstractions, no future-proofing. Return: name (5 words max), summary (2–3 sentences), pros (3 bullets), cons (3 bullets), risks (1–2 bullets), reversibility (easy / medium / hard), best_for (one line)."

**Agent B — Scalable / Future-Proof**
Prompt:
> "You are evaluating the MOST SCALABLE solution for: {topic}. What would you build if you expected 10× load or scope in 12 months? Return: name (5 words max), summary (2–3 sentences), pros (3 bullets), cons (3 bullets), risks (1–2 bullets), reversibility (easy / medium / hard), best_for (one line)."

**Agent C — User-Delight First**
Prompt:
> "You are evaluating the most USER-DELIGHT-FIRST solution for: {topic}. What would a product designer obsessed with developer or end-user experience build, temporarily ignoring infrastructure cost? Return: name (5 words max), summary (2–3 sentences), pros (3 bullets), cons (3 bullets), risks (1–2 bullets), reversibility (easy / medium / hard), best_for (one line)."

All 3 must run before proceeding. Do not short-circuit to one agent.

### Step 3 — Render tradeoff matrix

After all 3 agents return, render this table in chat:

```
| Criterion        | Path A (Simple) | Path B (Scalable) | Path C (Delight) |
|------------------|-----------------|-------------------|-----------------|
| Implementation   | [est. hours]    | [est. hours]      | [est. hours]    |
| Reversibility    | Easy/Med/Hard   | Easy/Med/Hard     | Easy/Med/Hard   |
| Top pro          | ...             | ...               | ...             |
| Top con          | ...             | ...               | ...             |
| Top risk         | ...             | ...               | ...             |
| Best for         | ...             | ...               | ...             |
```

Populate with the agent outputs. This table is reference material — the decision chip is what actually captures the choice.

### Step 4 — Synthesize and present choice

Call `AskUserQuestion`:

```yaml
question: "Three paths explored — which direction resonates?"
options:
  - label: "⚡ Path A — [Simple name]"
    description: "[Agent A 2-sentence summary]"
  - label: "🚀 Path B — [Scalable name]"
    description: "[Agent B 2-sentence summary]"
  - label: "✨ Path C — [Delight-first name]"
    description: "[Agent C 2-sentence summary]"
  - label: "🔀 Hybrid — combine elements"
    description: "Describe which parts to mix in the next message."
  - label: "🔁 Run again with different constraints"
    description: "Adjust the lens (cost / speed / risk) and re-brainstorm."
```

### Step 5 — Lock the direction

Once the user picks, output exactly:

```
## Decision
**Chosen path:** [name]
**Key tradeoff accepted:** [one sentence — what you're giving up and why it's worth it]
**Next step:** [/ccc-plan to write a spec] or [/ccc-build to scaffold]
```

Never write code or create files during this skill.

## Examples

### Example 1 — Choosing an auth strategy

```
/ccc-brainstorm "auth strategy for a B2B SaaS — do I use Clerk, Auth.js, or roll my own JWT?"
```

Agent A returns: "Roll your own JWT — dead simple, no vendor lock-in, 4 hours to ship."
Agent B returns: "Clerk — hosted, scales to SSO/SAML with one SDK call, 30 min to ship."
Agent C returns: "Clerk + magic links — passwordless UX, branded email, zero friction login."

Matrix surfaces: Clerk is highly reversible (eject any time), Auth.js needs infra, custom JWT is medium-risk.

Decision chip: user picks Path B (Clerk). Output locks: "Chosen: Clerk. Tradeoff: $25/mo vs. zero maintenance overhead. Next: /ccc-plan."

### Example 2 — Picking a database

```
/ccc-brainstorm "should this app use Postgres, SQLite, or Turso for a low-traffic personal tool?"
```

Agent A: SQLite — single file, zero ops, works locally and on Fly.io with LiteFS.
Agent B: Postgres on Supabase — standard, row-level security, growth path.
Agent C: Turso — edge-replicated SQLite, great DX, fast reads globally.

Matrix shows SQLite reversibility is easy (file copy = backup), Postgres medium, Turso medium.

### Example 3 — Design system pick

```
/ccc-brainstorm "shadcn/ui vs Radix primitives vs Tailwind UI for a dashboard project"
```

Agent A: shadcn/ui — copy-paste components, no runtime dependency, full ownership.
Agent B: Radix primitives — headless, accessible, maximum customization control.
Agent C: Tailwind UI — polished designs, pro license, fastest to ship a good-looking product.

## Attribution

> Adapted from superpowers/brainstorming — MIT licensed.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
