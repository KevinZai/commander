---
name: ccc-agent-writing
description: Teach agents to write with clarity, persuasion, and testability. Use when drafting specs, PRDs, PR descriptions, or documentation. Triggers: 'write a spec', 'PR description', 'improve this doc', 'make this scannable'. [Commander]
allowed-tools:
  - Read
  - Write
  - Edit
  - AskUserQuestion
---

# CCC Agent Writing

## Overview

Good writing is testable. If an agent (or a beginner developer) can't follow your doc, it's broken. This skill teaches agents to write specs, PRDs, PR descriptions, and documentation that are clear, persuasive, and structured to be acted on.

For long-form content and brand-voice alignment, delegate to the `content-strategist` persona.

## Core Principle

**Write for a reader, not for yourself.** Every piece of writing has one reader and one outcome. Name them both before writing a word.

## The Writing Process

### Step 1: Define Reader + Outcome

Before writing anything:
- Who is the reader? (junior dev, senior reviewer, product stakeholder, future-you)
- What should they DO after reading? (approve, implement, understand, install)
- What's the format? (spec, PRD, PR description, README section, runbook)

### Step 2: Choose a Structure

| Writing Type | Structure |
|---|---|
| Spec / PRD | Problem → Context → Requirements → Acceptance Criteria → Out-of-scope |
| PR Description | Summary → Changes → Test plan → Screenshots (if UI) |
| README section | What → Why → How (in that order) |
| Runbook | Trigger → Steps → Expected result → Rollback |
| Technical doc | Concept → Example → Edge cases → See also |

### Step 3: Lead with the Answer

Bury the lede = broken writing. The first sentence answers: "What is this and why do I care?"

- ❌ "This PR refactors the authentication module to improve code quality and make future changes easier."
- ✅ "Fixes a race condition in `/login` that created duplicate sessions under concurrent requests."

### Step 4: The Scanability Test

Reviewers scan before they read. Your document should make sense at scan speed:

1. Every section header is a complete thought, not a label
2. Code examples for every non-trivial concept
3. Bullet points for lists of 3+
4. Tables for comparisons
5. Bold the load-bearing words in each paragraph

### Step 5: Persuasion (for PRDs and Specs)

When you need stakeholder buy-in, apply AIDA in order:

| Stage | What it does | Example |
|---|---|---|
| **Attention** | Name the pain | "Users abandon onboarding at step 3 — 47% drop-off" |
| **Interest** | Show the opportunity | "One change cuts this to 12% (competitor benchmark)" |
| **Desire** | Connect to goals | "This recovers ~$8K MRR at current conversion rate" |
| **Action** | Clear ask | "Approve spec by Friday to hit Q2 sprint" |

### Step 6: Test Your Writing

Run the writing through these checks:

- [ ] Can the reader act on this without asking a follow-up question?
- [ ] Does the first sentence tell them what this is?
- [ ] Is every term defined on first use?
- [ ] Are edge cases and out-of-scope items explicit?
- [ ] Would a new team member understand this in 6 months?

## PR Description Template

```markdown
## Summary

[1-3 bullets — WHAT changed and WHY]

## Changes

- `path/to/file.ts` — [what changed and why]

## Test plan

- [ ] [Specific step to verify the happy path]
- [ ] [Edge case tested]
- [ ] [Regression check]

## Screenshots (if UI change)

[Before/After screenshots]
```

## Spec Template

```markdown
## Problem

[1 paragraph: what's broken, who it affects, evidence]

## Context

[Background needed to understand the decision. Links to prior decisions.]

## Requirements

- MUST: [non-negotiable]
- SHOULD: [strong preference]
- COULD: [nice to have]

## Acceptance Criteria

- Given [state], when [action], then [outcome]

## Out of Scope

- [Explicit exclusion] — deferred to [issue/version]

## Open Questions

- [ ] [Unresolved question] — owner: @name, by: date
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Jargon without definition | First use in **bold** + inline definition |
| Passive voice | Active: "Claude returns X" not "X is returned by Claude" |
| Buried lede | Move the conclusion to sentence 1 |
| "Simply" / "just" / "obviously" | Delete — they're condescending |
| No acceptance criteria | Every spec needs Given/When/Then |
| PR description = git log | Explain WHY, not just what changed |

## When to Delegate to content-strategist

The `content-strategist` persona handles:
- Marketing copy and landing pages
- Brand voice alignment
- A/B variants for headlines and CTAs
- Long-form editorial content

This skill handles technical writing (specs, PRDs, docs, PR descriptions).

---

_Adapted from [superpowers/writing-skills](https://github.com/nicholasgasior/superpowers) — MIT licensed._
