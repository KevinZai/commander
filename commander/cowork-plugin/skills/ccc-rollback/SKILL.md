---
name: ccc-rollback
description: "CC Commander rollback workflow. Selects a rollback target, creates atomic git revert commits, pushes the revert, redeploys through ccc-deploy, verifies health, and emits incident comms. [Commander]"
model: sonnet
effort: high
allowed-tools:
  - Read
  - Bash
  - WebFetch
  - AskUserQuestion
argument-hint: "[target: last-good | tag | n-back]"
---

# /ccc-rollback — Revert + Redeploy

**CC Commander** · /ccc-rollback · Pick target → revert commits → deploy → verify

Use this when production is bad and the safest path is an atomic revert commit followed by a fresh deploy. This workflow preserves history and always redeploys through `/ccc-deploy`.

## Response Shape

Always return these sections:

1. Brand header:

```markdown
**CC Commander** · /ccc-rollback · Revert + redeploy
```

2. Current state strip:

Use Bash reads, silent on missing refs:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git status --short
git tag --sort=-creatordate | head -10
git log --oneline --decorate -12
```

Render:

```markdown
Branch: `<branch>` · HEAD: `<short-sha>` · dirty files: `<N>` · latest tag: `<tag-or-none>`
```

If dirty files are present, warn before any rollback command. Do not proceed until the user confirms.

3. Rollback target picker — `AskUserQuestion`

```yaml
question: "What should I roll back to?"
header: "CC Commander Rollback"
multiSelect: false
autocomplete: true
options:
  - label: "Last good commit"
    value: "last-good"
    description: "You provide or confirm the last known good commit sha."
    preview: "Creates revert commits for everything after that commit, then deploys."
  - label: "Specific tag"
    value: "tag"
    description: "Pick a release tag such as v4.0.0-beta.10."
    preview: "Reverts commits after the tag, pushes, then runs /ccc-deploy."
  - label: "N versions back"
    value: "n-back"
    description: "Choose how many release tags back to restore."
    preview: "Finds the older tag, warns about distance, reverts, then deploys."
```

## Target Resolution

### Last Good Commit

Ask for the commit sha if it was not supplied in the prompt. Validate it:

```bash
git cat-file -e <target-sha>^{commit}
git merge-base --is-ancestor <target-sha> HEAD
git rev-list --count <target-sha>..HEAD
```

If `HEAD` is more than 5 commits ahead of the target, warn:

```markdown
Warning: HEAD is <N> commits ahead of <target>. This may need a surgical rollback instead of reverting everything after the target.
```

Ask the user to confirm before continuing.

### Specific Tag

Show recent tags from:

```bash
git tag --sort=-creatordate | head -20
```

Ask for or autocomplete the tag. Validate it:

```bash
git rev-parse <tag>^{commit}
git merge-base --is-ancestor <tag> HEAD
git rev-list --count <tag>..HEAD
```

Apply the same more-than-5-commits warning before continuing.

### N Versions Back

Ask for `N`, list tags in descending creation order, and resolve the target tag:

```bash
git tag --sort=-creatordate | head -50
```

Example: if `N=1`, target the previous tag before the current release tag. If `N=2`, target two release tags back.

Validate the resolved tag and apply the same more-than-5-commits warning.

## Revert Procedure

Never rewrite public history. Create explicit revert commits.

For a single bad commit:

```bash
git revert <bad-sha>
```

For a range after the selected target:

```bash
git revert --no-commit <target>..HEAD
git commit -m "fix(rollback): revert to <target-label>"
```

If conflicts occur:

1. Stop immediately.
2. Show conflicted files from `git status --short`.
3. Explain that manual conflict resolution is required before continuing.
4. Do not attempt a deploy until the revert commit exists and tests or smoke checks pass.

After the revert commit:

```bash
git log --oneline -3
git status --short
```

If the working tree is not clean after committing, stop and report the remaining files.

## Push + Redeploy

Before pushing, summarize:

```markdown
Rollback target: <target-label>
Commits reverted: <N>
New revert commit: <sha>
Deploy command: /ccc-deploy
```

Ask for confirmation, then push:

```bash
git push origin <branch>
```

Immediately invoke `/ccc-deploy` with the platform context if it is known from the current repo. If the platform is unknown, run `/ccc-deploy` normally so it can detect and ask.

## Verification

Use `/ccc-deploy` health verification as the source of truth. If a production URL is known, fetch it with `WebFetch` after deploy and report:

- URL checked
- HTTP status or platform status
- deploy id, run id, release id, or commit sha
- PASS, WARN, or FAIL

## Post-Rollback Comms

After health verification, emit:

```markdown
Rollback complete: <project>
- Restored target: <target-label>
- Revert commit: <sha>
- Deployment: <platform-and-url>
- Health check: <PASS-or-FAIL>
- Follow-up: investigate original bad deploy and add a regression test.
```

If Discord or Slack is configured through `/ccc-connect`, ask before posting the comms. Include incident context only if the user provided it.

## Failure Mode

If rollback fails:

1. Surface the exact command and relevant error lines.
2. State whether failure happened during target resolution, revert, push, deploy, or health verification.
3. Preserve any partial revert state and tell the user the next safe command to inspect it, usually `git status --short`.
4. If a revert commit was pushed but deploy failed, suggest running `/ccc-deploy` again or escalating to the platform rollback command.

## Anti-Patterns

- Do not rewrite history.
- Do not deploy with unresolved conflicts.
- Do not push without confirmation.
- Do not skip `/ccc-deploy`; rollback is only complete after redeploy and health verification.
- Do not post comms without user confirmation.
