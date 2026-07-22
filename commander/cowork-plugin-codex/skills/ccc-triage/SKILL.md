---
name: ccc-triage
description: "GitHub issue/PR triage for plugin maintainers — list, label, and summarize issues + PRs via gh CLI. Can delegate deep triage to an agent or Codex."
allowed-tools:
  - Read
  - Bash
  - Agent
  - Workflow
  - AskUserQuestion
---

# $ccc-triage — GitHub Issue & PR Triage

Maintainer-grade triage for the plugin's GitHub repo. Uses the **`gh` CLI** to list, label, and summarize open issues and pull requests — and can hand off deep, per-item triage to a Sonnet agent or Codex when the backlog is large.

**CC Commander** · Maintainer Tools · [Docs](https://commanderplugin.com)

> Triage follows the workflow-first doctrine (`commander/cowork-plugin/rules/workflow-first.md`): the lead session decides labels and priorities; bulk reading and per-item analysis are delegated.

---

## What this does

Four click-first actions, each backed by `gh`:

1. **Triage issues** — list open issues, surface stale/unlabeled/needs-info, propose a label + priority per item.
2. **Triage PRs** — list open PRs, flag draft/conflicting/CI-failing/stale, propose merge-or-close direction.
3. **Auto-label** — apply a consistent label taxonomy (bug/feat/docs/question/good-first-issue) across untriaged items.
4. **Summarize backlog** — one-screen digest: counts by label, oldest items, no-response items, ready-to-merge PRs.

---

## Prerequisites

- `gh` authenticated: run `gh auth status`. If not logged in, the user runs `gh auth login` (browser, interactive).
- A repo context: this skill targets the current repo (`gh` infers `owner/repo` from the cwd's git remote). Confirm with `gh repo view --json nameWithOwner -q .nameWithOwner` before acting.

---

## Picker

Call `AskUserQuestion` so the user picks the triage action:

```
question: "What do you want to triage?"
header: "Triage"
multiSelect: false
options:
  - label: "🐛 Triage issues"
    description: "List open issues, flag stale/unlabeled/needs-info, propose a label + priority each."
    preview: "gh issue list --state open --json number,title,labels,createdAt,comments"
  - label: "🔀 Triage PRs"
    description: "List open PRs, flag draft/conflicting/CI-failing/stale, propose merge-or-close."
    preview: "gh pr list --state open --json number,title,isDraft,mergeable,statusCheckRollup"
  - label: "🏷️ Auto-label"
    description: "Apply a consistent label taxonomy across untriaged items. Confirms before each write."
    preview: "gh issue edit <n> --add-label <label> (one confirm per item)."
  - label: "📊 Summarize backlog"
    description: "One-screen digest: counts by label, oldest items, no-response items, ready PRs."
    preview: "Read-only roll-up. No writes."
```

Prepend ⭐ to the best match:
- "pr" / "pull request" / "merge" keywords → ⭐ Triage PRs
- "label" / "categorize" / "tag" keywords → ⭐ Auto-label
- "summary" / "digest" / "overview" / "how many" keywords → ⭐ Summarize backlog
- otherwise → ⭐ Triage issues

---

## After user picks

**Confirm the repo first**, then run the matching read query. Examples:

```bash
# Triage issues
gh issue list --state open --limit 50 \
  --json number,title,labels,createdAt,updatedAt,comments,author

# Triage PRs
gh pr list --state open --limit 50 \
  --json number,title,isDraft,mergeable,reviewDecision,statusCheckRollup,updatedAt

# Summarize backlog (counts)
gh issue list --state open --json labels -q '[.[].labels[].name] | group_by(.) | map({label: .[0], n: length})'
```

Present findings as a table: `# · title · age · signals · 🟢 proposed action`. For **auto-label**, propose the full set, then apply one item at a time with an explicit confirm before each write (`gh issue edit <n> --add-label <label>`).

### Delegate deep triage when the backlog is large

If there are **15+ open items** or the user wants per-item analysis (reproduction assessment, dup detection, root-cause hints), delegate instead of reading every thread into the lead context:

- **Agent:** dispatch a Sonnet `Agent` (or a `Workflow` fanout) that reads each issue/PR thread, classifies it, and returns ONLY a structured table — never raw thread dumps.
- **Codex:** for a tough technical PR, pass the diff to Codex for an independent second-opinion review (see the `codex` skill). Codex reads, you decide.

Report back which items need a maintainer decision vs which were auto-classified.

---

## Label taxonomy (default)

| Label | Use for |
|-------|---------|
| `bug` | Reproducible defect |
| `feat` | New capability request |
| `docs` | Documentation gap |
| `question` | Needs-info / support, not a defect |
| `good-first-issue` | Small, well-scoped, newcomer-friendly |
| `wontfix` | Out of scope — propose, never auto-apply |

Create a missing label with `gh label create <name>` only after confirming with the user.

---

## Anti-patterns — DO NOT

- ❌ Close, merge, or apply `wontfix` automatically — every destructive or judgment-laden write needs explicit user confirmation
- ❌ Read every issue/PR thread into the lead context — delegate per-item analysis to an agent/Workflow and return only conclusions
- ❌ Act on a repo without first confirming `nameWithOwner` — you may be in the wrong worktree
- ❌ Assume `gh` is authenticated — check `gh auth status` and stop if it fails
- ❌ Invent label names per-item — use the taxonomy table; propose new labels, don't silently create them
- ❌ Bulk-edit issues in one command without per-item confirmation — one mistaken label sweep is hard to undo

---

**Bottom line:** triage = read with `gh`, decide in the lead, delegate the deep reads, confirm every write.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
