---
name: feature-plan
category: planning
skills: [plan, writing-plans, executing-plans]
mode: plan
estimated_tokens: 800
---

# Feature Implementation Plan

## When to Use
After a spec is approved and before coding begins. This template breaks a feature into phased implementation steps with clear milestones and verification at each stage.

## Template

```
Create a detailed implementation plan for the following feature. Break it into phases that can each be completed and verified independently.

**Feature:**
{{feature_name_and_summary}}

**Spec:**
{{link_to_spec_or_paste_key_requirements}}

**Current codebase:**
{{brief_description_of_existing_architecture — or say "use Glob/Read to explore"}}

**Constraints:**
- {{timeline}}
- {{team_size_or_solo}}
- {{any_technical_constraints}}

**Step 1: Codebase exploration**
- Use Glob to understand the project structure
- Read key files: entry point, router, config, existing similar features
- Identify the exact files that will need to change
- List any new files that need to be created

**Step 2: Dependency analysis**
- What existing modules does this feature depend on?
- Does anything need to be built first? (schemas, types, utilities)
- Are there any external packages to install?
- Check package.json — any version conflicts?

**Step 3: Phase breakdown**
Create 3-5 phases, each independently shippable:

For each phase:
- **Goal:** what this phase delivers
- **Files:** which files to create/modify
- **Implementation steps:** numbered, specific, atomic
- **Verification:** how to prove this phase works (test command, manual test, screenshot)
- **Estimated effort:** hours
- **Dependencies:** which phases must complete first

**Step 4: Risk identification**
- What's the riskiest part of this plan?
- What could block progress?
- Where might the estimate be wrong?
- What's the rollback plan if phase N fails?

**Step 5: Output**
Write the plan to `tasks/plan-{{feature_slug}}.md` with:
- [ ] Phase 1: {{title}} — {{estimated_hours}}h
  - [ ] Step 1.1
  - [ ] Step 1.2
- [ ] Phase 2: {{title}} — {{estimated_hours}}h
  - [ ] Step 2.1
  - ...

Mark phases with dependencies clearly.
```

## Tips
- Use the `plan` skill to enter plan mode for structured multi-step reasoning
- The `executing-plans` skill helps track progress through a saved plan
- Each phase should be committable — if you stop after any phase, the code should be in a working state

## Example

```
Create a detailed implementation plan for the following feature.

**Feature:**
Webhook system — users register URLs, our system sends POST requests when events fire (signup, payment, cancellation). Includes retry logic, delivery logs, and a management UI.

**Spec:**
tasks/spec-20260328.md (acceptance criteria: reliable delivery within 30s, 3 retries with exponential backoff, delivery log visible in dashboard)

**Current codebase:**
Next.js 14 app router, Prisma + PostgreSQL, deployed on Vercel

**Constraints:**
- 2-week timeline
- Solo developer
- Must not add more than $50/mo infrastructure cost
```
