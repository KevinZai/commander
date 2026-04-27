---
name: ccc-tasks
description: "Lightweight markdown task tracking via tasks/todo.md. Simple format — checkboxes, priorities, status. No database, no service, no sync. Every session start reads the list, every session end updates it. Use when you want minimal-friction task tracking that survives sessions without pulling in a full PM tool. Pairs with /ccc-linear for external tracker integration. [Commander]"
model: sonnet
effort: medium
---

# /ccc-tasks — Markdown Task Tracking

The simplest thing that could possibly work. One file. Markdown checkboxes. That's it.

## When to use

- Personal projects that don't need Linear/Jira
- Side-session tracking while a larger Linear ticket is in flight
- Brainstorm capture before picking 1-2 to execute
- A visible, pushable-to-git audit trail of what happened

## Not for

- Team coordination with 2+ humans → use /ccc-linear
- Long-term project milestones → use Linear project
- Sub-tasks of a complex feature → use the feature's spec doc + todo tool

## File format

`tasks/todo.md` in project root:

```markdown
# Todo

## Active

- [ ] P0 · Ship beta.11 (push + dogfood)
- [ ] P1 · Wire release.yml npm publish
- [x] P0 · Fix --mcp.json silent MCP failures ✅ 2026-04-23

## Blocked

- [ ] P1 · Product Hunt launch — waiting on K13 screencast

## Someday

- [ ] VSCode companion extension
- [ ] Commander Hub user-submitted skills
```

Priorities: **P0** (this week), **P1** (this month), **P2** (quarter), **P3** (someday).

Status: `[ ]` todo · `[x]` done (with date) · `[~]` in progress · `[!]` blocked.

## Process

1. **Session start:** read `tasks/todo.md` → suggest the top 1-2 P0 items to tackle
2. **Pick one:** move to "Active" if not already, mark `[~]`, announce scope
3. **Mid-work:** leave notes in-line under the task (indented)
4. **Session end:** mark `[x]` with date (or flip to `[!]` with blocker note), update file
5. **Weekly:** prune Done section; archive older than 30d to `tasks/archive/YYYY-MM.md`

## Integration

- Append to file — never overwrite (avoid mid-session state loss)
- Commit each change — the diff IS the audit trail
- Link from CLAUDE.md: `See tasks/todo.md for active work`

## Depends on

- Write access to `tasks/todo.md` (create if missing)
- Git for history (optional but recommended)

---

Adapted from `knowledge-work-plugins/productivity/task-management` under Apache-2.0 license. Reframed around CC Commander priority conventions (P0-P3).
