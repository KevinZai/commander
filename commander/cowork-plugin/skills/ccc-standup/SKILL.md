---
name: ccc-standup
description: "Write a yesterday / today / blockers standup from your commits, PRs, tracker issues and Commander session notes, or from rough notes you type. Use when the user asks for a standup, daily update, morning check-in, what did I do yesterday, or a team update."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[yesterday | today | blockers | --power]"
model: sonnet
effort: low
---

# /ccc-standup — Standup from real activity

**CC Commander** · /ccc-standup · a three-section standup in about 30 seconds

> Placeholders like ~~source control refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md). Every connector is opt-in; the skill works with none.

## When to use / when not to

- Use each morning, before a team sync, or to recap the last working day.
- For a session handoff rather than a team update, use `/ccc-save-session`.
- For a sprint or release summary, use `/ccc-changelog`.
- In Codex, ask each picker below as a plain-text question with the same options.

## What happens

### 1. Pick the mode

- Default is **quick mode**: three short sections.
- `--power` or `detailed` in `$ARGUMENTS`: **power mode** adds blocker severity, owner and suggested resolution, plus metrics (PRs merged, issues closed, lines changed).
- `yesterday`, `today` or `blockers`: render only that section.

### 2. Pull activity

Run in one Bash call; missing tools or directories are not errors. Use `--since="3 days ago"` on a Monday.

```bash
git log --since="yesterday" --oneline --author="$(git config user.email)" 2>/dev/null
git log --since="yesterday" --shortstat --author="$(git config user.email)" 2>/dev/null | tail -5
ls -t ~/.claude/commander/sessions/ 2>/dev/null | head -3
ls -t ~/.claude/commander/knowledge/*.json 2>/dev/null | head -3
```

Read the newest session summaries and knowledge entries with Read when they are from the last working day.

If **~~source control** is GitHub and `gh auth status` succeeds:

```bash
gh pr list --author "@me" --state all --limit 10 --json number,title,state,mergedAt,updatedAt
gh pr list --search "reviewed-by:@me" --state all --limit 10 --json number,title,updatedAt
gh pr list --author "@me" --state open --limit 10 --json number,title,statusCheckRollup
```

Keep only items updated since the window start; the last command gives CI status for active PRs.

If **~~project tracker** is connected: issues you moved to In Progress or Done since the window start, upcoming sprint items for Today, and overdue issues as blockers.

If **~~chat** is connected: threads awaiting your reply, and team decisions made there, as context only.

### 3. Fall back to notes

No activity found, or nothing connected: ask in plain chat, "What did you work on? Rough notes are fine — I'll structure them." Then ask "Any blockers?" and fold the answer in. AskUserQuestion has no free-text field, so both are plain questions.

### 4. Render

```markdown
## Standup — <date>

### Yesterday
- ENG-42: Added OAuth support (merged PR #87)
- Reviewed PR #91 (webhook retries)

### Today
- ENG-45: Fix webhook retry logic

### Blockers
- Payments API rate limit — needs ENG-48 resolved first
```

Power mode adds, per blocker, `severity · owner · suggested resolution`, and a final `### Metrics` line from the step 2 output. Every item traces to a source in step 2 or the user's notes; never invent work.

### 5. Share — `AskUserQuestion`

Ask only when ~~chat is connected:

```yaml
question: "Where should this standup go?"
header: "Standup"
multiSelect: false
options:
  - label: "🟢 Keep it here"
    description: "Nothing leaves the session; copy it yourself."
  - label: "Post to the team channel"
    description: "Sends this exact text to the channel you name, via the chat connector."
```

Post only on that explicit choice, then report the channel and the message link or id the connector returned.

## Done when

- The standup is rendered, each item backed by a step 2 source or the user's notes, and any post shows the connector's returned message id or link.

## Guardrails

- Posting to chat or updating a tracker needs the user's choice in this conversation (step 5); never post by default.
- Never include other people's private messages verbatim; summarize decisions only.
- Never invent commits, PRs or issues to fill a section; an empty section says "Nothing logged."
- Read-only on git: no commits, pushes or branch changes.

## See also

- `/ccc-linear` — the issues behind Today
- `/ccc-tasks` — markdown task list as a standup source
- `/ccc-save-session` — session handoff instead of a team update
- `/ccc-changelog` — release-level summary

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
