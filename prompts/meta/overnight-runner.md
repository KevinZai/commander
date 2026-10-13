---
name: overnight-runner
category: meta
skills: [overnight-runner, ccc-night-mode, delegation-templates, strategic-compact]
mode: plan
estimated_tokens: 600
---

# Overnight Runner Setup

## When to Use
Use when a large, well-defined task can run unattended for hours. The run is only as safe as its setup: a clear goal, checkpoints and guardrails that let the agent work without supervision.

## Template

````
Set up an autonomous task that can run for {{duration}} without my input. It must be safe to run unsupervised.

**Task:**
{{what_needs_to_be_done}}

**Expected duration:**
{{4-8 hours}}

**Success criteria:**
{{how_to_know_the_task_completed_successfully}}

**Failure modes to guard against:**
{{what_could_go_wrong — infinite loops, wrong files, runaway costs}}

Step 1: Pre-flight checks. Confirm each item before starting and stop to ask me if any fails:
- [ ] The task is well defined with clear boundaries, not open-ended exploration.
- [ ] All required files and dependencies are available.
- [ ] No human decision is needed during execution.
- [ ] No destructive operations: no deletes, force pushes or production deploys.
- [ ] The cost estimate fits the budget for the chosen model tier.
- [ ] `git status` shows a clean tree, and the run will work on its own branch or worktree.

Step 2: Write the task file `tasks/overnight-{{date}}.md` that will guide the run:

```markdown
# Overnight Task: {{title}}

## Objective
{{1-2 sentence clear goal}}

## Scope
- In scope: {{explicit list}}
- Out of scope: {{explicit exclusions}}

## Steps
1. {{step_1}}
2. {{step_2}}
...

## Checkpoints
After each step, commit with message: "overnight: step N complete — {{description}}"

## Guardrails
- Do not modify: {{protected_files}}
- Do not install new dependencies without a written justification in the commit message.
- Do not make breaking API changes.
- Stop and leave a TODO comment if you encounter: {{ambiguous_situations}}

## Verification
When complete, run and record the result of:
- {{test_command}}
- {{type_check_command}}
- {{any_other_verification}}
```

Read the file back to confirm it was written.

Step 3: Configure the run:
- Save current context with the `strategic-compact` skill before the long run.
- Propose the {{sonnet|haiku}} tier for the batch work and use it only if I approve; otherwise keep my selected model.
- Commit once per completed step so any step can be reverted.
- Use the task file as the run's entry point.

Step 4: Launch. Pick one and tell me which:
- `/ccc-night-mode` for a spec-first build with build and review cycles.
- A Routine (`/schedule`) that starts a cloud session at a set time with the task file as its prompt.
- A local session with `/loop` driving the steps, if the machine stays on.
Watch the first step for about 5 minutes to catch immediate failures, then leave it running.

Step 5: Morning review. When I return, report on:
- `git log --oneline` for the overnight commits.
- The test suite result, run fresh.
- `git diff main...HEAD` for the full change.
- Any TODO comments the run left.
- Each success criterion: met or not, with evidence.
````

## Tips
- The `overnight-runner` skill covers usage-limit retries, batch checkpointing and multi-session resume.
- The `delegation-templates` skill provides structured briefs for autonomous task dispatch.
- Start with a 4-hour task before attempting an 8-hour run.
- Keep a clean git state and a dedicated branch so a bad run is easy to revert.

## Example

```
Set up an autonomous task that can run for 6 hours without my input.

**Task:**
Migrate all 47 API endpoints from Express.js to Hono.js. Each endpoint has existing tests that must continue to pass.

**Expected duration:** 6 hours
**Success criteria:** All 47 endpoints migrated, all 128 tests passing, zero TypeScript errors
**Failure modes:** Breaking existing tests, missing edge cases in request parsing, accidentally modifying the DB schema
```
