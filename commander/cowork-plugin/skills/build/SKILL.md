---
name: build
description: "Build something new — a web app, API, CLI tool, or any project. Use when: 'build something', 'new project', 'create app', 'help me build', 'start a project', 'I want to make'."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "<what you want to build>"
---

# /ccc:build

> Placeholders like ~~project tracker refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Run a guided Spec Flow to clarify what you're building, then delegate execution to the builder agent. Ships with smart defaults — answer 3 questions and you're off.

## Quick Mode (default)

Ask these 3 questions, one at a time:

**Question 1 — Outcome goal:**
"What does success look like when this is done?"
- A: Works end-to-end — I can click through the whole thing
- B: Solid foundation — architecture is right, I'll build features later
- C: Quick prototype — just needs to prove the concept

**Question 2 — Tech preferences:**
"Any tech preferences, or should I pick what's best?"
- A: Pick what's best for the job
- B: Popular/mainstream stack (React, Node, Postgres)
- C: Keep it simple — minimal dependencies

**Question 3 — Thoroughness:**
"How thorough should the implementation be?"
- A: Just the basics — get it working
- B: Include tests — unit + integration coverage
- C: Production-ready — error handling, logging, CI/CD, docs

After 3 answers, generate a one-paragraph spec, confirm with user, then delegate:

```
Handing off to the builder agent with your spec...
```

Use the Agent tool to invoke the `builder` agent with the confirmed spec.

## Power Mode

Activate by passing `--power` or the word `detailed`.

Full spec interview (7 questions):
1. What problem does this solve?
2. Who uses it and how often?
3. Tech stack (or auto-pick)?
4. Key constraints (timeline, performance, integrations)?
5. What does done look like? What does broken look like?
6. Edge cases that must work?
7. Thoroughness level?

Output a full `tasks/spec-YYYYMMDD.md` before delegating.

## If Connectors Available

If **~~project tracker** is connected:
- After confirming the spec, create a tracking issue automatically
- Set status to "In Progress" when the builder agent starts
- Link to the spec document in the issue description

If **~~library docs** (Context7) is connected:
- Pull current API docs for any library — no hallucinated methods
- Works with Next.js, React, Supabase, MongoDB, and thousands more
- Trigger: add 'use context7' to the build prompt

If **~~source control** is connected:
- Create a feature branch before the builder agent starts
- Branch name format: `feature/<slug-from-spec>`
- Commit the spec file as the first commit

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUILD FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Spec Flow (3 questions)                                      │
│  2. Confirm spec with user                                       │
│  3. [Optional] Create issue + branch via connectors             │
│  4. Delegate to builder agent                                    │
│  5. Report back when done                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Tips

1. **Name the thing** — "a Stripe webhook handler" is better than "a payment thing." Precision speeds the spec.
2. **Pick production-ready early** — it's harder to add tests and error handling after the fact.
3. **Prototype first** — use Quick Mode with option C/A/A to get something running in minutes, then iterate.
4. **Connectors multiply value** — with ~~project tracker connected, every build auto-generates a tracked issue.
