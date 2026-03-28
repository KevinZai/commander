---
name: spec-interview
category: planning
skills: [spec-interviewer, evals-before-specs, plan]
mode: plan
estimated_tokens: 500
---

# Spec Interview

## When to Use
Before building any feature that takes more than a day. This template generates the 5-7 clarifying questions that prevent building the wrong thing. Run this before writing any code or spec.

## Template

```
I want to build the following feature. Before I write any code, interview me with 5-7 targeted questions to create a solid spec.

**Feature idea:**
{{brief_description_of_what_you_want_to_build}}

**Context:**
{{existing_system_it_integrates_with, if any}}

**User:**
{{who_is_the_end_user}}

**Interview framework:**
Ask me questions in these categories (5-7 total, skip categories that don't apply):

1. **Scope boundaries** — What is explicitly OUT of scope for v1?
2. **Success criteria** — What does "done" look like? How do we measure success?
3. **Failure modes** — What does "broken" look like? What must never happen?
4. **Edge cases** — What unusual inputs or states must be handled?
5. **Dependencies** — What existing systems does this touch? What could block us?
6. **User flow** — Walk me through the happy path step by step. What triggers this?
7. **Data model** — What data is created, read, updated, deleted?

After I answer all questions, produce a spec document with:
- **Summary:** 2-3 sentences
- **Requirements:** numbered list (MUST, SHOULD, COULD)
- **Non-goals:** explicit exclusions
- **Acceptance criteria:** testable statements
- **Technical approach:** high-level architecture (1 paragraph)
- **Estimated effort:** T-shirt size (S/M/L/XL) with justification

Save the spec to `tasks/spec-{{date}}.md` if the tasks directory exists.
```

## Tips
- Use the `evals-before-specs` skill to define success/failure criteria before the interview
- The `spec-interviewer` skill automates this entire flow as an interactive session
- Always answer the questions honestly — vague answers produce vague specs

## Example

```
I want to build the following feature. Before I write any code, interview me with 5-7 targeted questions to create a solid spec.

**Feature idea:**
A webhook system that lets users register URLs to receive real-time notifications when events happen in our platform (new signup, payment received, subscription cancelled).

**Context:**
Existing Express.js API with PostgreSQL. Currently users poll our API to check for changes.

**User:**
Developer integrators who build on top of our platform.
```
