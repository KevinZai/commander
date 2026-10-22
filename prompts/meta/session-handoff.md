---
name: session-handoff
category: meta
skills: [ccc-handoff, ccc-save-session, ccc-resume-session, strategic-compact]
mode: code
estimated_tokens: 400
---

# Session Handoff

## When to Use
Use to move work from one session to a fresh one: the context window is running low, you are switching tasks, or a different model will continue. The template captures everything the next session needs to continue without rediscovery.

## Template

````
Prepare a handoff document so a fresh session can continue this work without losing context.

**What we've been working on:**
{{brief_description_of_the_task}}

Step 1: Capture current state. Write `tasks/handoff-{{date}}.md` with:

```markdown
# Session Handoff: {{task_name}}
**Date:** {{today}}
**Previous session duration:** {{approximate}}

## Task
{{1-2 sentence description of what we're building/fixing}}

## What's been completed
- [x] {{completed_item_1}}
- [x] {{completed_item_2}}
- [x] {{completed_item_3}}

## What's in progress
- [ ] {{current_item}} — stopped at: {{exact_point_where_you_stopped}}

## What's remaining
- [ ] {{remaining_item_1}}
- [ ] {{remaining_item_2}}

## Key decisions made
- {{decision_1}}: {{why}}
- {{decision_2}}: {{why}}

## What did not work
- {{rejected_approach}}: {{why it failed — so the next session does not retry it}}

## Files modified
- `{{file_1}}` — {{what_changed}}
- `{{file_2}}` — {{what_changed}}

## Known issues
- {{issue_1}}
- {{issue_2}}

## To resume
1. Read this handoff doc.
2. Read these files to get up to speed: {{key_files}}
3. Continue from: {{exact_next_step}}
4. Run `{{verification_command}}` to confirm the current state is healthy.

## Context that won't be obvious
{{anything_a_fresh_session_would_miss — naming conventions decided, rejected approaches, tricky edge cases discovered}}
```

Step 2: Verify state before handing off, and record each result in the doc:
- Run `git status`. Commit or stash outstanding changes only with my approval; otherwise list them as uncommitted in the doc.
- Run `{{verification_command}}` and record whether it passed at the handoff point.
- Read the handoff doc back and confirm it matches the current state.

Step 3: Save the session with `/ccc-save-session` (or `/ccc-handoff`, which also tells me to continue in a new chat). Both write to `~/.claude/sessions/`, and `/ccc-resume-session` loads either file in the next session.
````

## Tips
- `/ccc-handoff` is the habit form: hand off at every topic switch or finished chunk, not only at the end.
- The `strategic-compact` skill condenses context before compaction when a handoff is not yet due.
- A clean or fully documented working tree makes the resume reliable.

## Example

```
Prepare a handoff document so a fresh session can continue this work without losing context.

**What we've been working on:**
Building a webhook delivery system. Completed the schema and API endpoints. In progress: retry logic with exponential backoff. Remaining: delivery logs UI, rate limiting.
```
