---
name: standup
description: "\"Generate a standup update from recent activity. Use when: 'standup', 'daily update', 'what did I do', 'morning check-in', 'yesterday today blockers', 'team update', 'status update'.\" [Commander]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "[yesterday | today | blockers]"
---

# /ccc:standup

> Placeholders like ~~source control refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Generate a standup update by pulling together recent activity across your tools. Standalone mode asks what you did. Connected mode pulls commits, issues, and PRs automatically.

## Quick Mode (default)

**If connectors are available**, pull automatically and skip to output.

**Standalone**, ask one question:
"What did you work on? (rough notes are fine — I'll structure them)"

Then generate the standup in the standard format below.

Optionally ask: "Any blockers?" — and incorporate the answer.

## Power Mode

Activate by passing `--power` or `detailed`.

Full standup with:
- Yesterday: commits, PRs reviewed/merged, issues closed
- Today: planned work tied to open issues
- Blockers: with severity, owner, and suggested resolution
- Metrics: PRs merged, issues closed, lines changed (from ~~source control)

## Auto-Pull Sources

When tools are connected, gather from:

1. **Git history** — `git log --since="yesterday" --oneline --author="$(git config user.email)"`
2. **Session history** — check `~/.claude/commander/sessions/` for yesterday's session summaries
3. **Knowledge base** — check `~/.claude/commander/knowledge/` for recent learnings

## If Connectors Available

If **~~source control** is connected:
- Pull commits from the last 24 hours (current user only)
- List PRs opened, reviewed, or merged
- Show CI/build status for active PRs

If **~~project tracker** is connected:
- Pull issues moved to "In Progress" or "Done" since yesterday
- Show upcoming sprint items for "Today" section
- Flag any overdue issues as blockers

If **~~chat** is connected:
- Scan for threads where your response is needed
- Include any team decisions made in chat as context
- Offer to post the standup directly to the team channel

## Output Format

```markdown
## Standup — [Date]

### Yesterday
- [Completed item — CC-42: Added OAuth support (merged PR #87)]
- [Completed item]

### Today
- [Planned item — CC-45: Fix webhook retry logic]
- [Planned item]

### Blockers
- [Blocker: API rate limiting on the payments provider — needs CC-48 resolved first]
```

## Tips

1. **Run it every morning** — open CC Commander, type `/standup`, done in 30 seconds.
2. **Rough notes work** — "fixed the login bug, reviewed sarah's PR, fought with docker all day" is enough input.
3. **Post to chat** — with ~~chat connected, share to Slack/Discord/Teams without copy-pasting.
4. **Blockers are gold** — surface them explicitly; they're the most valuable part of a standup.
