---
name: overnight-runner
category: meta
skills: [overnight-runner, delegation-templates, strategic-compact]
mode: plan
estimated_tokens: 600
---

# Overnight Runner Setup

## When to Use
When you have a large, well-defined task that can run autonomously while you sleep. The key is structured setup: clear goals, checkpoints, and guardrails so the agent can work unsupervised for hours.

## Template

```
Set up an overnight autonomous task that can run for {{duration}} without human input. The task must be safe to run unsupervised.

**Task:**
{{what_needs_to_be_done}}

**Expected duration:**
{{4-8 hours}}

**Success criteria:**
{{how_to_know_the_task_completed_successfully}}

**Failure modes to guard against:**
{{what_could_go_wrong — infinite loops, wrong files, runaway costs}}

**Step 1: Pre-flight checks**
Before starting the autonomous run:
- [ ] Task is well-defined with clear boundaries (not open-ended exploration)
- [ ] All required files and dependencies are available
- [ ] No human decisions needed during execution
- [ ] No destructive operations (delete, force push, production deploys)
- [ ] Cost estimate is within budget (check model pricing)
- [ ] Git state is clean (`git status` shows no uncommitted changes)

**Step 2: Context preparation**
Prepare the context that will guide the autonomous session:

Write a `tasks/overnight-{{date}}.md` file with:
```markdown
# Overnight Task: {{title}}

## Objective
{{1-2 sentence clear goal}}

## Scope
- IN scope: {{explicit list}}
- OUT of scope: {{explicit exclusions}}

## Steps
1. {{step_1}}
2. {{step_2}}
...

## Checkpoints
After each step, commit with message: "overnight: step N complete — {{description}}"

## Guardrails
- Do NOT modify: {{protected_files}}
- Do NOT install new dependencies without justification
- Do NOT make breaking API changes
- Stop and leave a TODO comment if you encounter: {{ambiguous_situations}}

## Verification
When complete, run:
- {{test_command}}
- {{type_check_command}}
- {{any_other_verification}}
```

**Step 3: Configure the session**
- Use `strategic-compact` skill to save current context before the long run
- Set the model to {{sonnet|haiku}} for cost efficiency on batch work
- Enable auto-commit checkpoints (one commit per completed step)
- Set up the task file as the entry point for the session

**Step 4: Launch**
- Start the Claude Code session with the overnight task file as context
- Verify the first step begins executing correctly
- Monitor for 5 minutes to catch any immediate issues
- Leave it running

**Step 5: Morning review**
When you return:
- Check `git log --oneline` for overnight commits
- Run the test suite to verify nothing is broken
- Review the diff: `git diff main...HEAD`
- Check for TODO comments left by the agent
- Verify success criteria are met
```

## Tips
- Use the `overnight-runner` skill for automated overnight session management
- The `delegation-templates` skill provides structured formats for autonomous task dispatch
- Start with small overnight tasks (4 hours) before attempting 8-hour runs
- Always have a clean git state so you can easily revert if the overnight run goes sideways

## Example

```
Set up an overnight autonomous task that can run for 6 hours without human input.

**Task:**
Migrate all 47 API endpoints from Express.js to Hono.js. Each endpoint has existing tests that must continue to pass.

**Expected duration:** 6 hours
**Success criteria:** All 47 endpoints migrated, all 128 tests passing, zero TypeScript errors
**Failure modes:** Breaking existing tests, missing edge cases in request parsing, accidentally modifying DB schema
```
