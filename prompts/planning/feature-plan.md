---
name: feature-plan
category: planning
skills: [ccc-plan, writing-plans, executing-plans]
mode: plan
estimated_tokens: 800
---

# Feature Implementation Plan

## When to Use
Use after a spec is approved and before coding begins. The template breaks a feature into phases that can each be completed, verified and committed on their own. If there is no spec yet, run `planning/spec-interview.md` first.

## Template

```
Create an implementation plan for the feature below. Break it into phases that can each be completed and verified independently. Do not edit source files while planning.

**Feature:**
{{feature_name_and_summary}}

**Spec:**
{{link_to_spec_or_paste_key_requirements}}

**Current codebase:**
{{brief_description_of_existing_architecture — or "explore with Glob and Read"}}

**Constraints:**
- {{timeline}}
- {{team_size_or_solo}}
- {{any_technical_constraints}}

Step 1: Explore the codebase.
- Map the project structure with Glob.
- Read the entry point, router, config and the closest existing feature.
- List the exact files that will change and the new files to create.

Step 2: Analyze dependencies.
- Which existing modules does the feature depend on?
- What must be built first (schemas, types, utilities)?
- Which external packages are needed? Check the manifest (for example `package.json`) for version conflicts.

Step 3: Break the work into 3-5 phases, each leaving the code in a working state.
For each phase give:
- Goal: what the phase delivers.
- Files: which files it creates or modifies.
- Steps: numbered, specific, atomic.
- Verification: the exact command or check that proves the phase works (test command, manual check, screenshot).
- Effort: estimated hours.
- Depends on: phases that must finish first.

Step 4: Identify risks.
- The riskiest part of the plan and why.
- What could block progress.
- Where the estimate is most likely wrong.
- The rollback for each phase if it fails.

Step 5: Write the plan to `tasks/plan-{{feature_slug}}.md` in this shape, then read the file back to confirm it was written:
- [ ] Phase 1: {{title}} — {{estimated_hours}}h
  - [ ] Step 1.1
  - [ ] Step 1.2
- [ ] Phase 2: {{title}} — {{estimated_hours}}h (depends on Phase 1)
  - [ ] Step 2.1
```

## Tips
- `/ccc-plan` runs a short spec interview and a background planner agent that writes the plan file for you.
- `executing-plans` tracks progress through a saved plan; `/ccc-plan-exec` runs repeated steps in isolated worktrees with an independent verifier.
- Commit after each phase so you can stop at any phase boundary with working code.

## Example

```
Create an implementation plan for the feature below.

**Feature:**
Webhook system: users register URLs and the system sends POST requests when events fire (signup, payment, cancellation). Includes retry logic, delivery logs and a management UI.

**Spec:**
tasks/spec-webhooks.md (acceptance criteria: delivery within 30 seconds, 3 retries with exponential backoff, delivery log visible in the dashboard)

**Current codebase:**
Next.js app router, Prisma and PostgreSQL, deployed on Vercel

**Constraints:**
- Two-week timeline
- Solo developer
- No more than $50/month added infrastructure cost
```
