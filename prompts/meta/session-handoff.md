---
name: session-handoff
category: meta
skills: [save-session, resume-session, strategic-compact]
mode: code
estimated_tokens: 400
---

# Session Handoff

## When to Use
When you need to transfer context from one Claude Code session to another — typically because you're running low on context window, switching tasks, or handing off to a different model. This template captures everything the next session needs to continue seamlessly.

## Template

```
Prepare a session handoff document so a fresh Claude Code session can continue this work without losing context.

**What we've been working on:**
{{brief_description_of_the_task}}

**Step 1: Capture current state**
Create a handoff document at `tasks/handoff-{{date}}.md` with:

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

## Files modified
- `{{file_1}}` — {{what_changed}}
- `{{file_2}}` — {{what_changed}}

## Known issues
- {{issue_1}}
- {{issue_2}}

## To resume
1. Read this handoff doc
2. Read the following files to get up to speed: {{key_files}}
3. Continue from: {{exact_next_step}}
4. Run `{{verification_command}}` to confirm current state is healthy

## Context that won't be obvious
{{anything_a_fresh_session_would_miss — naming conventions decided, rejected approaches, tricky edge cases discovered}}
```

**Step 2: Verify state**
Before handing off:
- Run `git status` — ensure all changes are committed or stashed
- Run tests — ensure nothing is broken at the handoff point
- Verify the handoff doc accurately reflects the current state

**Step 3: Save session**
Use the `save-session` skill to persist session state to `~/.claude/sessions/`
```

## Tips
- Use the `save-session` and `resume-session` skills for automated session persistence
- The `strategic-compact` skill condenses context before compaction events
- Always commit or stash changes before handoff — a dirty working tree makes resume harder

## Example

```
Prepare a session handoff document so a fresh Claude Code session can continue this work.

**What we've been working on:**
Building a webhook delivery system. Completed the schema and API endpoints. In progress: retry logic with exponential backoff. Remaining: delivery logs UI, rate limiting.
```
