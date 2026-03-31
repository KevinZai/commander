---
name: spec-interview
description: "Structured 5-7 question interview to create detailed project specifications before writing any code."
version: 1.0.0
category: research
parent: ccc-research
tags: [ccc-research, planning, specifications]
disable-model-invocation: true
---

# Spec Interview

## What This Does

Runs a structured interview process to extract requirements from the user before any code is written. Asks 5-7 targeted questions, then synthesizes the answers into a formal specification document. Prevents the most expensive mistake in software: building the wrong thing.

## Instructions

1. **Start with context.** Before asking questions, review any existing context:
   - Current codebase or project files
   - Any prior specs, PRDs, or related documents
   - The user's initial description of what they want

2. **Ask 5-7 targeted questions.** Adapt based on context, but always cover:
   - **What:** "What specific problem does this solve? Who is the user?"
   - **Done:** "What does 'done' look like? How will we know it works?"
   - **Broken:** "What does 'broken' look like? What failure modes concern you?"
   - **Scope:** "What is explicitly OUT of scope for this iteration?"
   - **Constraints:** "What technical constraints exist? (stack, performance, compatibility)"
   - **Edge cases:** "What edge cases or unusual inputs should we handle?"
   - **Dependencies:** "What does this depend on? What depends on this?"

3. **Ask ONE question at a time.** Wait for the answer before asking the next. Adapt follow-up questions based on previous answers. Skip questions that were already answered in the initial description.

4. **Synthesize into a spec.** After all questions are answered, produce a structured spec document with:
   - Problem statement
   - Success criteria (measurable)
   - Failure modes
   - Scope boundaries
   - Technical approach
   - Edge cases and error handling
   - Dependencies and risks
   - Estimated effort

5. **Confirm with the user.** Present the spec and ask: "Does this accurately capture what you want? Anything to add, remove, or change?"

6. **Save the spec.** Write to `tasks/spec-YYYYMMDD.md` or the location the user specifies.

## Output Format

```markdown
# Spec: {Feature/Project Name}
**Date:** {YYYY-MM-DD}
**Author:** {user} + Claude
**Status:** Draft

## Problem Statement
{What problem this solves, for whom, and why it matters}

## Success Criteria
- [ ] {Measurable criterion 1}
- [ ] {Measurable criterion 2}
- [ ] {Measurable criterion 3}

## Failure Modes
- {What broken looks like — specific failure scenarios}

## Scope
**In scope:**
- {Feature/behavior 1}
- {Feature/behavior 2}

**Out of scope:**
- {Explicitly excluded item 1}
- {Explicitly excluded item 2}

## Technical Approach
{High-level approach — stack, patterns, architecture decisions}

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| {Edge case 1} | {How to handle} |
| {Edge case 2} | {How to handle} |

## Dependencies
- {Dependency 1 — risk level}
- {Dependency 2 — risk level}

## Effort Estimate
{T-shirt size: S/M/L/XL with brief justification}
```

## Tips

- One question at a time — never dump all 7 questions at once
- If the user gives a vague answer, follow up with a specific clarifying question
- The "what does broken look like?" question often reveals requirements that "what does done look like?" misses
- Always include an explicit "out of scope" section — it prevents scope creep
- The spec is a living document — note that it can be updated as understanding evolves
- For projects over 1 week of work, recommend splitting into phases with separate specs
