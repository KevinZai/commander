---
name: ccc-office-hours
description: "Stress-test a product idea before writing code through product, technical and user lenses, ending in BUILD IT, SIMPLIFY FIRST, RESEARCH MORE or KILL IT. Use when deciding whether a feature or product is worth building."
usage: /ccc-office-hours [idea or feature description]
version: 1.3.0
---

# /ccc-office-hours — validate before you build

**CC Commander** · /ccc-office-hours · one honest verdict on an idea, and a planning brief when it is worth building.

Idea: `$ARGUMENTS`

Run a skeptical validation session. The aim is to kill weak ideas fast and sharpen strong ones. Be direct, give reasons, and do not cheerlead.

## Step 1: Understand the idea

Use the idea from `$ARGUMENTS` or the conversation. If it is missing or vague, ask the user for two or three sentences covering:

- What are you building?
- Who is it for?
- Why now?

Do not continue until the idea is clear.

## Step 2: Product lens

1. **Who is this for?** Name a specific persona; "developers" is too broad.
2. **What problem does it solve?** Real pain or nice-to-have? How do users solve it today?
3. **What is the MVP?** The simplest version that delivers value, and what can be cut.
4. **Build or buy?** Which existing solutions exist, and why not use or extend them?
5. **Cost of inaction?** What happens if this is never built? Sometimes the answer is nothing.

## Step 3: Technical lens

1. **Complexity:** low, medium or high, and why.
2. **Dependencies:** new libraries, services or APIs it introduces.
3. **Blast radius:** what breaks if it goes wrong, and which existing functionality is at risk.
4. **Reversibility:** one-way door or two-way door; how hard is it to undo?
5. **Maintenance burden:** who maintains it in six months, and what ongoing cost or toil it adds.

Where the idea touches an existing codebase, check these answers against the code (Grep, Read) instead of guessing, and cite the files.

## Step 4: User lens

1. **Discovery:** how does the user find it; obvious or buried?
2. **Happy path:** the ideal flow in one paragraph.
3. **Error path:** what goes wrong and how the user recovers.
4. **Cognitive load:** does it make the product simpler or more complex?
5. **One-sentence test:** can the feature be explained in one sentence? If not, it is too complicated.

## Step 5: Verdict

Deliver exactly one:

- **BUILD IT** — clear value, manageable complexity, a real problem, no better alternative.
- **SIMPLIFY FIRST** — a good idea that is overscoped; describe the reduced MVP to build instead.
- **RESEARCH MORE** — promising, with too many unknowns; list the specific questions to answer before committing.
- **KILL IT** — not worth building; say why plainly. Common reasons: no real problem, a better alternative exists, maintenance cost exceeds value, a nice-to-have presented as a need.

Output:

```
OFFICE HOURS: <BUILD IT | SIMPLIFY FIRST | RESEARCH MORE | KILL IT>

Idea: <idea>
Persona: <who this is for>
Problem: <one sentence>
Complexity: <Low | Medium | High>
Reversibility: <One-way door | Two-way door>

<2-3 sentence summary of the reasoning>
```

## Step 6: Planning handoff (BUILD IT or SIMPLIFY FIRST only)

Output a planning brief:

```
PLANNING BRIEF (pass to /ccc-plan):

<One paragraph: what to build, for whom, the MVP scope,
key technical considerations, and the primary risk to watch.>
```

Then ask with AskUserQuestion (Codex: a plain-text question):

- 🟢 Plan it — run `/ccc-plan` with the brief
- Refine the idea — revisit the lens with the weakest answers
- Stop here — keep the verdict and brief in the conversation

For RESEARCH MORE, offer `/ccc-research` on the open questions instead. For KILL IT, stop after the verdict.

## Guardrails

- This session writes no code and changes no files.
- Give one verdict, not a hedge between two.

## See also

`/ccc-plan` · `/ccc-research` · `/ccc-brainstorm`

Adapted from gstack by Garry Tan (github.com/garrytan/gstack).
