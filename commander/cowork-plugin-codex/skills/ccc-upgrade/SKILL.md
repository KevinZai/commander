---
name: ccc-upgrade
description: "Maintainer-only vendor submodule updater: audits every submodule under vendor/ against upstream, shows commits and files behind, then updates the picked ones one at a time with audit checks and one commit each. Use when asked to update vendors, refresh submodules or check vendor drift."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[--check | --all]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-upgrade — Vendor submodule updater

**CC Commander** · $ccc-upgrade · audit vendor/ → pick → update, check, commit one at a time

## When to use / when not to

- Use inside the Commander repository to audit and update the submodules under `vendor/`. Trigger phrases: "update vendors", "refresh submodules", "pull latest vendor changes", "sync the ecosystem", "are any vendors out of date", "check vendor drift".
- Not for updating the installed Commander plugin: that is `$ccc-update`, an end-user tool with a similar name.
- Not a read-only diagnostic like `$ccc-doctor`: this skill writes local commits, one per submodule, after the user picks.
- Arguments: `--check` audits only (fetch, table, stop); `--all` skips the picker and updates every submodule with an update available.
- The scheduled workflow `.github/workflows/vendor-update.yml` runs the same audit unattended; this skill is the human-in-the-loop variant.
- In Codex, ask each picker as a plain-text question with the same options.

## What happens

### 1. Confirm the repository root

```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Not in a git repo — $ccc-upgrade only works inside the Commander checkout."; exit 1; }
cd "$ROOT"
[ -f ".claude-plugin/marketplace.json" ] || { echo "❌ Not at the Commander repo root. Refusing to update vendor submodules."; exit 1; }
[ -d vendor ] || { echo "No vendor/ directory at repo root — nothing to upgrade."; exit 1; }
git status --short -- vendor
echo "ROOT=$ROOT"
```

Stop and report the printed message if any guard fails. Running in the wrong directory would touch unrelated submodules. Carry `ROOT` into later Bash calls (`cd '<ROOT>'` as their first line); shell state does not persist between calls.

### 2. List submodules

```bash
git submodule status
```

Each line is ` <sha> <path> (<ref>)`; a `-` prefix means uninitialized and a `+` prefix means the checked-out commit differs from the recorded one (local changes).

- `-` entries: skip them and list them in the report with `git submodule update --init <path>` as the user's next step.
- `+` entries: warn first ("vendor/X has uncommitted local changes; commit or stash before continuing") and exclude them from updates, even with `--all`. Never overwrite local work.

### 3. Scan each initialized submodule

Scans are independent, so run them in parallel Bash calls or one loop. Per submodule:

```bash
S=vendor/<name>
CURRENT_SHA=$(git -C "$S" rev-parse --short HEAD)
git -C "$S" fetch --quiet origin 2>/dev/null || git -C "$S" fetch --quiet 2>/dev/null
DEFAULT_BRANCH=$(git -C "$S" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'); [ -z "$DEFAULT_BRANCH" ] && DEFAULT_BRANCH=main
LATEST_SHA=$(git -C "$S" rev-parse --short "origin/$DEFAULT_BRANCH" 2>/dev/null || echo unknown)
CHANGED_FILES=$(git -C "$S" diff --name-only "$CURRENT_SHA..$LATEST_SHA" 2>/dev/null | wc -l | tr -d ' ')
COMMITS_BEHIND=$(git -C "$S" rev-list --count "$CURRENT_SHA..$LATEST_SHA" 2>/dev/null || echo 0)
echo "$S $CURRENT_SHA $LATEST_SHA $COMMITS_BEHIND $CHANGED_FILES"
```

A missing remote prints `unknown`; report it, do not fail the run. `LATEST_SHA == CURRENT_SHA` means up to date.

Star counts are optional polish: add the column only when they are already available locally (for example a cached lookup); this skill does not fetch them, so omit the column otherwise.

### 4. Render the audit table

Show every submodule, including up-to-date ones:

```
## Vendor submodule audit — <UTC timestamp>

| # | Submodule | Current | Latest | Δ commits | Δ files | Status |
|---|-----------|---------|--------|-----------|---------|--------|
| 1 | <name> | <sha> | <sha> | <n> | <n> | 🔄 update available |
| 2 | <name> | <sha> | <sha> | 0 | 0 | ✅ up to date |

**Summary:** <N> submodules · <M> with updates · <K> up to date · <U> uninitialized · <L> with local changes
```

On `--check`, stop here. The fetch already ran and is read-only; nothing else changes.

### 5. Pick what to update

With `--all`, select every update-eligible submodule and skip to Step 6. If no submodule is eligible, report the table and stop. Otherwise ask the scope picker in Decision points. For "Choose submodules": when exactly one submodule is eligible, skip the selection picker and treat that one as chosen; when two or more are eligible, ask the selection picker, three submodules per page ordered by commits behind, plus the leading "All listed on this page" option. Selecting that option chooses every submodule on the page, whatever else is ticked.

### 6. Update each selected submodule, sequentially

One at a time, never in parallel, because each produces its own commit:

```bash
OLD_SHA=$(git -C vendor/<name> rev-parse --short HEAD)
git submodule update --remote --rebase vendor/<name>
NEW_SHA=$(git -C vendor/<name> rev-parse --short HEAD)
echo "<name> $OLD_SHA -> $NEW_SHA"
```

If the update fails (conflict, detached state), reset that submodule to its recorded commit with `git submodule update vendor/<name>`, log the failure, and continue with the next. Never use `--force`.

### 7. Check before committing

After each successful update, before committing:

```bash
node scripts/audit-frontmatter.js --check
node scripts/audit-counts.js --check
```

These cover the registry and count drift that vendor updates can affect; the full `npm test` belongs to PR review, not each submodule.

If either fails, roll that submodule back and confirm it:

```bash
git submodule update vendor/<name>
[ "$(git -C vendor/<name> rev-parse --short HEAD)" = "$OLD_SHA" ] && echo "rolled back <name> to $OLD_SHA"
```

Report the failure and stop processing further submodules until the user resolves it.

### 8. Commit one `chore(vendor)` per submodule

```bash
git add vendor/<name>
git commit -m "chore(vendor): update <name> $OLD_SHA..$NEW_SHA"
git log --oneline -1
```

The message format is exact: `chore(vendor): update <submodule-name> <old-sha>..<new-sha>`, lowercase, two dots between the SHAs, no trailing period. Stage only that submodule path.

### 9. Final summary

```
## Vendor upgrade complete

✅ Updated: <N> submodules
  - <name>: <old> → <new> (<n> commits)

⚠️ Skipped: <M> submodules
  - <name>: <reason, e.g. rebase conflict — manual resolution required>

❌ Check failures rolled back: <K> submodules

Next steps:
- Review: git log --oneline -<N>
- Push when ready: git push
- Open a PR when any submodule changed more than 50 files
```

## Decision points

Scope picker:

```yaml
question: "<M> vendor submodules have updates. Which should I update?"
header: "Vendors"
multiSelect: false
options:
  - label: "🟢 All available"
    description: "Updates every eligible submodule in sequence, with checks and one commit each."
  - label: "Choose submodules"
    description: "Pick from the list, three per page."
  - label: "Cancel"
    description: "No updates; the audit table stays as the result."
```

Selection picker (`multiSelect: true`, asked only when two or more submodules are eligible). Each page has the all option first plus up to three submodules, so 2 to 4 options:

```yaml
question: "Pick the submodules to update (page <p> of <n>)."
header: "Pick"
multiSelect: true
options:
  - label: "🟢 All listed on this page"
    description: "Updates every submodule on this page in sequence, one commit each."
  - label: "<name>"
    description: "<commits> commits, <files> files behind upstream."
  # one option per eligible submodule on this page, at most three
```

## Done when

- `--check`: the audit table printed for every submodule and the working tree is unchanged (`git status --short` shows nothing new).
- Updates: each updated submodule passed both audit checks and has exactly one `chore(vendor)` commit (`git log --oneline -<N>`); each failed one was rolled back to `OLD_SHA` and is listed in the summary.

## Guardrails

- Run only from the Commander repository root (Step 1 guard).
- Never `git push`; the user pushes.
- Never `--force` an update; skip and report instead.
- One submodule per commit: atomic, revertable, bisectable.
- Never edit `.gitmodules`; this skill wraps `git submodule update --remote`.
- Never trample a submodule with local changes, and never skip a failure silently; every skip appears in the summary.

## See also

- `$ccc-update` — update the installed Commander plugin
- `$ccc-doctor` — read-only health report, including vendor-count drift in `full` mode
- `$ccc-changelog` — summarize what the vendor updates changed
- `$ccc-ship` — release flow once the vendor commits are reviewed

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
