---
name: ccc-triage
description: "Triage a GitHub repo's open issues and PRs with the gh CLI: flag stale, unlabeled and CI-failing items, propose labels and next actions, apply labels one confirmed item at a time, or summarize the backlog. Use when a maintainer asks to triage issues or PRs, label the backlog, or wants a digest."
allowed-tools:
  - Read
  - Bash
  - Agent
  - Workflow
  - AskUserQuestion
argument-hint: "[issues | prs | label | summary]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-triage — GitHub issue and PR triage

**CC Commander** · $ccc-triage · read with `gh`, decide in the lead session, delegate deep reads, confirm every write

Triage follows the workflow-first doctrine in [../../rules/workflow-first.md](../../rules/workflow-first.md): the lead session decides labels and priorities; bulk reading and per-item analysis are delegated.

## When to use / when not to

- Use on a repo you maintain to sort open issues, decide PR direction, apply a label taxonomy, or get a one-screen digest.
- For reviewing one PR's code in depth, use `$ccc-code-review`.
- For tracker issues in Linear, use `$ccc-linear`.
- In Codex, ask each picker below as a plain-text question with the same options, and replace Agent/Workflow delegation with `codex exec` per batch.

## What happens

### 1. Check prerequisites

```bash
gh auth status
gh repo view --json nameWithOwner -q .nameWithOwner
```

- `gh auth status` fails: tell the user to run `gh auth login` (interactive, browser) and stop.
- Show the `nameWithOwner` and confirm it is the intended repo before any query; a worktree may point at a fork.

### 2. Action picker — `AskUserQuestion`

Skip when `$ARGUMENTS` is `issues`, `prs`, `label` or `summary`. Otherwise put the best match first and mark it 🟢: "pr", "pull request" or "merge" → Triage PRs; "label", "categorize" or "tag" → Auto-label; "summary", "digest", "overview" or "how many" → Summarize backlog; otherwise Triage issues.

```yaml
question: "What do you want to triage?"
header: "Triage"
multiSelect: false
options:
  - label: "🟢 Triage issues"
    description: "Flag stale, unlabeled and needs-info issues; propose a label and priority each. Read-only."
  - label: "Triage PRs"
    description: "Flag draft, conflicting, CI-failing and stale PRs; propose merge or close. Read-only."
  - label: "Auto-label"
    description: "Apply the label taxonomy to untriaged items, one confirmed write at a time."
  - label: "Summarize backlog"
    description: "Counts by label, oldest items, no-response items, ready PRs. Read-only."
```

### 3. Run the read query

```bash
# Triage issues
gh issue list --state open --limit 50 \
  --json number,title,labels,createdAt,updatedAt,comments,author

# Triage PRs
gh pr list --state open --limit 50 \
  --json number,title,isDraft,mergeable,reviewDecision,statusCheckRollup,updatedAt

# Summarize backlog: counts by label
gh issue list --state open --limit 200 --json labels \
  -q '[.[].labels[].name] | group_by(.) | map({label: .[0], n: length})'
```

Signals: stale = no update in 30 days; unlabeled = empty `labels`; needs-info = last comment from a maintainer asking a question; PR blocked = `isDraft`, `mergeable` is `CONFLICTING`, or a failing check in `statusCheckRollup`; ready = approved, mergeable, checks green.

Present a table: `# · title · age · signals · 🟢 proposed action`. The summary adds counts by label, the five oldest items, items with zero comments, and ready-to-merge PRs.

### 4. Delegate deep triage when the backlog is large

With 15 or more open items, or when the user wants per-item analysis (reproduction assessment, duplicate detection, root-cause hints), do not read every thread into the lead context:

- **Agent:** dispatch an `Agent` with `model: "sonnet"` (or a `Workflow` fan-out, one agent per batch of about 10 items) that runs `gh issue view <n> --comments` / `gh pr view <n> --comments`, classifies each item, and returns only a table: `number · type · label · priority · duplicate-of · needs maintainer decision (yes/no) · one-line reason`. Never return raw thread text.
- **Codex second opinion** for a hard technical PR:

  ```bash
  gh pr diff <n> > "<scratchpad>/pr-<n>.diff"
  codex exec --sandbox read-only --skip-git-repo-check -m gpt-6-astra \
    "Review the unified diff in <scratchpad>/pr-<n>.diff. Report findings as path:line, severity, fix."
  ```

  Codex reads, the lead decides. See `$ccc-codex` for setup.

Report which items need a maintainer decision and which were auto-classified. The user's selected session model is preserved; only delegated agents use the tier named here.

### 5. Apply labels (Auto-label only)

1. Propose the full set as a table: `# · title · current labels · proposed label`.
2. For each item, ask with AskUserQuestion: "🟢 Apply `<label>` to #<n>", "Use a different label", "Skip #<n>". Then run:

   ```bash
   gh issue edit <n> --add-label <label>      # issues
   gh pr edit <n> --add-label <label>         # pull requests
   ```

3. A label missing from the repo (`gh label list --limit 100`): ask before `gh label create <name>`; never create one silently.

## Label taxonomy (default)

| Label | Use for |
|-------|---------|
| `bug` | Reproducible defect |
| `feat` | New capability request |
| `docs` | Documentation gap |
| `question` | Needs info or support, not a defect |
| `good-first-issue` | Small, well-scoped, newcomer-friendly |
| `wontfix` | Out of scope — propose, never auto-apply |

Use the repo's existing labels when they cover the same meaning; propose new ones rather than inventing names per item.

## Done when

- Read actions: the table came from a `gh` query run in this turn, and its row count matches the query output.
- Auto-label: for every applied item, `gh issue view <n> --json labels -q '.labels[].name'` (or `gh pr view`) shows the new label; the reply lists applied, skipped and failed items.

## Guardrails

- Every write to GitHub (labels, label creation) needs the per-item confirmation in step 5; this is the authorization, asked at the moment of the write.
- Never close, merge, or apply `wontfix` from this skill; propose them for the maintainer to do.
- Never bulk-edit several items in one command.
- Never act before confirming `nameWithOwner` and `gh auth status`.
- Never read every thread into the lead context; delegate and return conclusions only.

## See also

- `$ccc-code-review` — in-depth review of one PR
- `$ccc-codex` — Codex setup and second-opinion reviews
- `$ccc-linear` — triage in Linear instead of GitHub
- `$ccc-ci` — fix the failing checks found here

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
