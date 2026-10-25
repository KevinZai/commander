---
name: ccc-brainstorm
description: "Design-first ideation gate: three parallel agents propose a simple, a scalable and a user-delight approach, rendered as a tradeoff matrix, then you pick a direction. No code is written. Use when the user asks how to build X, which approach to take, is torn between options, or types /ccc-brainstorm."
allowed-tools:
  - Agent
  - AskUserQuestion
  - Bash
  - Read
argument-hint: "[\"feature idea or design question in quotes\"]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# /ccc-brainstorm — three options before code

**CC Commander** · /ccc-brainstorm · three distinct approaches, a tradeoff matrix, and one locked decision before any spec or code.

Adapted from superpowers/brainstorming (MIT licensed).

## When to use / when not to

- Use for "how should I build X", "which approach should I take", "I'm torn between X and Y", "help me decide on auth / DB / design system / API shape", "explore options for", "what are my choices for".
- Skip for a bug with an obvious fix (`/ccc-review`, or just fix it), a standard pattern with a known answer, a task with one correct answer (`/ccc-plan` directly), or a mid-implementation pivot where switching costs more than the decision is worth.

## What happens

### 1. Capture the question

If an argument was given, it is the topic. Otherwise ask with the topic picker under Decision points; when the user picks a category, ask for the specifics in one plain sentence.

### 2. Gather light context (optional)

When the topic is about the current codebase, read what grounds the options and nothing more:

```bash
git rev-parse --show-toplevel 2>/dev/null && ls
cat package.json 2>/dev/null | head -40
```

Read `CLAUDE.md` or the directly relevant source with `Read`. Summarize the stack in two or three lines for the agents.

### 3. Spawn three agents in parallel

Send three `Agent` calls in one message (`subagent_type: "general-purpose"`, `model: "sonnet"`, `effort: "medium"`). Each gets:

```
Topic: {topic}
Codebase context: {stack summary, or "none"}
Return: name (5 words max), summary (2-3 sentences), pros (3 bullets), cons (3 bullets),
risks (1-2 bullets), reversibility (easy | medium | hard), est_hours (number), best_for (one line).
```

Plus the lens:

- **Agent A — simplest possible:** "Propose the most direct, boring, fewest-moving-parts solution. No abstractions, no future-proofing."
- **Agent B — scalable:** "Propose what you would build expecting 10x load or scope within 12 months."
- **Agent C — user delight first:** "Propose what a product designer focused on the developer or end-user experience would build, setting infrastructure cost aside for now."

Wait for all three. If one fails or returns an unusable shape, re-run that one agent once; do not proceed with fewer than three.

### 4. Render the tradeoff matrix

```
| Criterion      | Path A (Simple) | Path B (Scalable) | Path C (Delight) |
|----------------|-----------------|-------------------|------------------|
| Implementation | <est_hours> h   | <est_hours> h     | <est_hours> h    |
| Reversibility  | easy/medium/hard| ...               | ...              |
| Top pro        | ...             | ...               | ...              |
| Top con        | ...             | ...               | ...              |
| Top risk       | ...             | ...               | ...              |
| Best for       | ...             | ...               | ...              |
```

The matrix is reference material; the decision picker captures the choice.

### 5. Ask for the direction

Ask with the direction picker under Decision points.

### 6. Lock the decision

Output exactly:

```
## Decision
**Chosen path:** <name>
**Key tradeoff accepted:** <one sentence: what is given up and why it is worth it>
**Next step:** /ccc-plan to write a spec, or /ccc-build to scaffold
```

Worked examples: [references/examples.md](references/examples.md).

## Decision points

Topic picker (step 1, only when no argument). Put the category the conversation suggests first, marked 🟢; default to new feature design:

```
question: "What are we brainstorming?"
header: "Brainstorm"
multiSelect: false
options:
  - label: "💡 New feature design"
    description: "Explore approaches to a feature idea before writing any code."
  - label: "🏗️ Architecture choice"
    description: "Schema, service boundary, auth strategy, data model."
  - label: "🎨 UI/UX decision"
    description: "Layout, component library, interaction model, visual system."
  - label: "📊 Choosing between known approaches"
    description: "You already have 2-3 candidates and want a rigorous comparison."
```

The picker's built-in "Other" covers a free-form topic.

Direction picker (step 5). Put the path that best fits the user's stated constraints first, marked 🟢, with a one-line reason:

```
question: "Three paths explored. Which direction?"
header: "Direction"
multiSelect: false
options:
  - label: "Path A — <simple name>"
    description: "<Agent A summary, one line>"
  - label: "Path B — <scalable name>"
    description: "<Agent B summary, one line>"
  - label: "Path C — <delight name>"
    description: "<Agent C summary, one line>"
  - label: "🔄 Hybrid or re-run"
    description: "Mix elements, or re-brainstorm under a different lens (cost, speed, risk)."
```

On "Hybrid or re-run", ask in one plain sentence which parts to combine or which constraint to change, then go to step 6 (hybrid) or step 3 (re-run).

## Done when

- Three agent results were returned and the matrix rendered with all three columns filled.
- The Decision block was printed with a chosen path and an accepted tradeoff.
- `git status --porcelain` shows no change made by this skill.

## Guardrails

- Never write code, create files or edit the repository; this skill only decides.
- Never short-circuit to one or two agents; three distinct lenses are the point.
- Never present the matrix as the decision; the user's pick is.
- The agents run on `sonnet`; the user's selected session model is preserved.
- On Codex: ask the pickers as plain-text questions, and run the three lenses as three `codex exec` calls or sequentially in-thread.

## See also

- `/ccc-plan` — turn the chosen path into a plan with evals
- `/ccc-debate` — stress-test a chosen design with adversarial lenses
- `/ccc-research` — gather outside evidence before choosing
- `/ccc-build` — scaffold once the direction is locked

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
