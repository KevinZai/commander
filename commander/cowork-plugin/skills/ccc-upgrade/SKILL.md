---
name: ccc-upgrade
description: "Audit and update vendor submodules. Lists every submodule under vendor/, fetches latest, reports per-submodule current/latest commits and changed file counts, prompts the user to pick which to update via a chip picker, runs git submodule update --remote --rebase on selections, verifies tests pass, and commits one chore(vendor) commit per submodule. Use when the user types /ccc-upgrade, asks to update vendors, refresh submodules, pull vendor changes, sync the ecosystem, or check for vendor drift. [Commander]"
model: sonnet
effort: medium
allowed-tools:
  - Read
  - Bash
  - Edit
  - WebSearch
argument-hint: "[--all | --check]"
---

# /ccc-upgrade — Vendor Submodule Updater

> ⚠️ **Run only from the CC Commander repo root.** Verify `pwd` ends in `/cc-commander` (or your fork's name) and `ls .claude-plugin/marketplace.json` succeeds. Running this skill in the wrong cwd would touch unrelated submodules.

Interactive workflow that audits the 19+ vendor submodules under `vendor/`, surfaces what changed upstream, lets the user pick which to update via AskUserQuestion, then runs the update + test + commit cycle one submodule at a time.

Similar in spirit to `/ccc-doctor` (read-only diagnostic) — this one writes (commits per submodule) but only after explicit user approval.

## When to fire

User types `/ccc-upgrade`, or says any of:
- "update vendors"
- "refresh submodules"
- "pull latest vendor changes"
- "sync the ecosystem"
- "are any vendors out of date"
- "check vendor drift"

Args:
- `--check` — read-only audit (no fetch, no update, no commit)
- `--all` — skip the picker and update every submodule with available updates

## Steps (always in this order)

### 1. Locate the repo root + sanity check

Resolve repo root via `git rev-parse --show-toplevel`. If that fails, output: "Not in a git repo — /ccc-upgrade only works inside the cc-commander checkout." and exit.

Before proceeding, verify you are at the cc-commander repo root:
```bash
# Guard: must be at the cc-commander repo root
if [ ! -f ".claude-plugin/marketplace.json" ]; then
  echo "❌ Not at cc-commander repo root. Refusing to update vendor submodules."
  exit 1
fi
```
If the guard fails, output the error message and exit.

Verify `vendor/` exists:
```bash
test -d vendor || echo "no-vendor-dir"
```
If missing, output: "No vendor/ directory at repo root — nothing to upgrade." and exit.

### 2. List submodules

```bash
git submodule status
```

Parse each line: format is ` <sha> <path> (<ref>)` or `-<sha> <path>` (uninitialized) or `+<sha> <path>` (local-modified).

Skip uninitialized (`-` prefix) entries — flag them in the report so user can `git submodule update --init <path>` separately.

### 3. Per-submodule scan

For each initialised submodule, gather:

```bash
cd vendor/<name>
CURRENT_SHA=$(git rev-parse --short HEAD)
git fetch --quiet origin 2>/dev/null || git fetch --quiet
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo main)
LATEST_SHA=$(git rev-parse --short "origin/$DEFAULT_BRANCH" 2>/dev/null || echo unknown)
CHANGED_FILES=$(git diff --name-only "$CURRENT_SHA..$LATEST_SHA" 2>/dev/null | wc -l | tr -d ' ')
COMMITS_BEHIND=$(git rev-list --count "$CURRENT_SHA..$LATEST_SHA" 2>/dev/null || echo 0)
cd -
```

Use `Bash` in a single call per submodule. Handle missing remotes gracefully — output `unknown` rather than failing.

If a submodule has `LATEST_SHA == CURRENT_SHA`, mark it ✅ up-to-date and skip from the picker.

Optional star count: if available offline, use cached info; do not block on `WebSearch` for stars — it's nice-to-have, not required. Skip the star column when unknown.

### 4. Render the audit table

```
## Vendor submodule audit — <UTC timestamp>

| # | Submodule | Current | Latest | Δ commits | Δ files | Status |
|---|-----------|---------|--------|-----------|---------|--------|
| 1 | acpx | abc1234 | def5678 | 12 | 27 | 🔄 update available |
| 2 | repomix | aaa1111 | aaa1111 | 0 | 0 | ✅ up to date |
| ... | ... | ... | ... | ... | ... | ... |

**Summary:** N submodules · M with updates · K up-to-date
```

Always show every submodule, even up-to-date ones (transparency).

### 5. Stop here on `--check`

If invoked with `--check`, print the table and exit. No fetch (already done — that's fine, fetch is read-only), no prompt, no update.

### 6. Ask which to update (skip on `--all`)

If at least one submodule has updates, fire AskUserQuestion with a multi-select chip list:

```
Question: "Pick the submodules to update. Selected ones will be rebased to latest and committed individually."
Options:
  - acpx (12 commits, 27 files)
  - everything-claude-code (3 commits, 8 files)
  - ... (one chip per submodule with available updates)
  - 🌐 All available
  - ❌ Cancel
```

If user picks "All available", treat as every update-eligible submodule. If "Cancel", exit with no changes.

On `--all`, skip the picker — auto-select every update-eligible submodule.

### 7. Update each selected submodule

For each chosen submodule, in sequence (NOT parallel — one commit at a time):

```bash
OLD_SHA=$(git -C vendor/<name> rev-parse --short HEAD)
git submodule update --remote --rebase vendor/<name>
NEW_SHA=$(git -C vendor/<name> rev-parse --short HEAD)
```

If the rebase fails (conflicts, detached state, etc.), abort that submodule, log the failure, and continue to the next. Never `--force`.

### 8. Verify tests still pass

After each successful submodule update — BEFORE committing — run a fast smoke test:

```bash
node scripts/audit-frontmatter.js --check
node scripts/audit-counts.js --check
```

If either fails, roll back that one submodule:
```bash
git checkout -- vendor/<name>
```
and report the failure. Do NOT continue with other submodules until the user resolves.

If both pass, proceed to commit step.

(Avoid running the full `npm test` per submodule — too slow. The audits cover the registry/count drift surface that vendor updates can affect. Full `npm test` happens at PR review time, not per-submodule.)

### 9. Commit one chore(vendor) per submodule

```bash
git add vendor/<name>
git commit -m "chore(vendor): update <name> <OLD_SHA>..<NEW_SHA>"
```

Commit message format MUST be exact: `chore(vendor): update <submodule-name> <old-sha>..<new-sha>` — lowercase, two dots between SHAs, no trailing period.

### 10. Final summary

```
## Vendor upgrade complete

✅ Updated: N submodules
  - acpx: abc1234 → def5678 (12 commits)
  - repomix: aaa1111 → bbb2222 (5 commits)

⚠️ Skipped: M submodules
  - foo: rebase conflict — manual resolution required

❌ Test failures rolled back: K submodules

Next steps:
- Review the new commits with `git log --oneline -<N>`
- Push when ready: `git push`
- Open a PR if the changes are non-trivial (any submodule with >50 changed files)
```

## Anti-patterns — DO NOT

- Never `git push` automatically — let the user push.
- Never `--force` a rebase. If it fails, skip and report.
- Never bundle multiple submodules into one commit — one submodule per commit (atomic, revertable, bisectable).
- Never run the full `npm test` per submodule — use the targeted audits in step 8.
- Never silently skip a failed submodule — always log it in the final summary.
- Never write WebSearch results into the report unless they were already obtained quickly — star counts are optional polish, not blocking.
- Never modify `.gitmodules` — the workflow is just a wrapper around `git submodule update --remote`.

## Tips

1. The scan in step 3 can be parallelised across submodules (independent `git fetch` calls). Updates in step 7 must be sequential (commit ordering matters).
2. If the user has uncommitted vendor changes (the `+` prefix in `git submodule status`), warn them up front: "Vendor X has uncommitted local changes. Stash or commit before continuing." Then exit unless they pass `--all` (in which case still skip that submodule, never trample local work).
3. The weekly cron at `.github/workflows/vendor-update.yml` runs the same audit unattended. Skill is the human-in-the-loop variant.
4. Star counts (when fetched) come from `vendor/<name>/.git/config` URL → GitHub API. Do not block on this. Cache results in `~/.claude/commander/vendor-stars.json` if you implement it later.
