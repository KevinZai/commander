---
name: spec-interview
category: planning
skills: [spec-interviewer, evals-before-specs, ccc-plan]
mode: plan
estimated_tokens: 500
---

# Spec Interview

## When to Use
Use before building any feature that will take more than a day. The template runs 5-7 targeted questions that prevent building the wrong thing, then turns the answers into a spec. Run it before writing code or a plan.

## Template

```
I want to build the feature below. Before writing any code, interview me with 5-7 targeted questions, then write a spec from my answers.

**Feature idea:**
{{brief_description_of_what_you_want_to_build}}

**Context:**
{{existing_system_it_integrates_with, if any}}

**User:**
{{who_is_the_end_user}}

Ask questions from these categories, 5-7 in total, skipping any that do not apply. Ask one or two at a time. When an answer is a choice among known options, use AskUserQuestion with 2-4 options and your recommendation first; otherwise ask in plain text.

1. Scope boundaries: what is explicitly out of scope for the first version?
2. Success criteria: what does done look like, and how is success measured?
3. Failure modes: what does broken look like, and what must never happen?
4. Edge cases: which unusual inputs or states must be handled?
5. Dependencies: which existing systems does this touch, and what could block it?
6. User flow: what triggers the feature, and what is the happy path step by step?
7. Data model: what data is created, read, updated and deleted?

After all questions are answered, write a spec with:
- Summary: 2-3 sentences.
- Requirements: a numbered list tagged MUST, SHOULD or COULD.
- Non-goals: explicit exclusions.
- Acceptance criteria: testable statements.
- Technical approach: one paragraph of high-level architecture.
- Estimated effort: S, M, L or XL with a one-line justification.

If a `tasks/` directory exists, save the spec to `tasks/spec-{{date}}.md` and read it back to confirm it was written; otherwise return it in the reply.
```

## Tips
- Run the `evals-before-specs` skill first to define success and failure criteria before the interview.
- The `spec-interviewer` skill runs this flow as an interactive session; `/ccc-plan` continues from the spec to a reviewed plan file.
- Answer concretely; vague answers produce vague specs.

## Example

```
I want to build the feature below. Before writing any code, interview me with 5-7 targeted questions, then write a spec from my answers.

**Feature idea:**
A webhook system that lets users register URLs to receive real-time notifications when events happen on the platform (new signup, payment received, subscription cancelled).

**Context:**
Existing Express.js API with PostgreSQL. Users currently poll the API to check for changes.

**User:**
Developers who build integrations on the platform.
```
