---
name: spec-interviewer
description: |
  Structured spec interview for new features and projects. Asks 5-7 targeted questions
  using AskUserQuestion, then generates a formatted spec document. Use for ANY feature
  that will take more than 1 day of work. Always run in a SEPARATE session from execution.
  Based on Thariq Shihipar's (Claude Code lead) highest-leverage workflow.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Bash
---

# Spec Interviewer

## When to Use
- Any new feature, project, or significant refactor
- Before writing ANY code on a complex task
- When requirements are ambiguous or multi-stakeholder

## Process

### Phase 1: Context Discovery
Ask the user these questions (adapt based on answers):

1. **What are we building?** — One sentence. What does it do?
2. **Who is it for?** — End user, internal tool, API consumer, another agent?
3. **Why now?** — What triggered this? Revenue, tech debt, user request, competitive?
4. **What exists today?** — Current state. What works, what doesn't?
5. **What's the scope boundary?** — What is explicitly NOT in scope?

### Phase 2: Technical Requirements
Based on Phase 1 answers, ask 2-3 of these:

6. **Tech stack constraints?** — Must use X framework? Must integrate with Y?
7. **Data model?** — What entities, relationships, storage needs?
8. **External dependencies?** — APIs, services, auth providers, payments?
9. **Performance requirements?** — Latency, throughput, data volume?
10. **Security requirements?** — Auth, RBAC, data sensitivity, compliance?

### Phase 3: Success Criteria
11. **How do we know it works?** — 3-5 concrete acceptance criteria
12. **What does "done" look like?** — Ship to prod? PR merged? Demo to Kevin?

## Output Format

Write to `tasks/spec-YYYYMMDD-{slug}.md`:

```markdown
# Spec: {Feature Name}
**Date:** YYYY-MM-DD
**Author:** Claude Code (spec-interviewer)
**Status:** Draft → Approved → In Progress → Done

## Summary
One paragraph describing what we're building and why.

## Requirements
### Must Have (P0)
- [ ] Requirement 1
- [ ] Requirement 2

### Should Have (P1)
- [ ] Requirement 3

### Nice to Have (P2)
- [ ] Requirement 4

## Technical Design
- Stack: ...
- Data model: ...
- Key integrations: ...

## Acceptance Criteria
1. [ ] Criterion 1 — testable, specific
2. [ ] Criterion 2
3. [ ] Criterion 3

## Out of Scope
- Explicitly excluded items

## Open Questions
- Any unresolved items from the interview
```

## Critical Rule
**Execute the spec in a NEW session.** The interview session pollutes context with
back-and-forth. The execution session starts clean with only the spec file loaded,
which means perfect prompt cache hits on the system prompt + CLAUDE.md prefix.

## Gotchas
- Don't ask all 12 questions — adapt based on complexity. Simple feature = 5 questions.
- If the user says "just build it" — push back once. Specs save more time than they cost.
- For OpenClaw agent features: always ask about model routing and cost tier.
- For UI features: always ask about responsive behavior and design system compliance.
