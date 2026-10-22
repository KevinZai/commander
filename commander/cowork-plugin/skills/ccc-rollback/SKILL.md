---
name: ccc-rollback
description: "Roll production back by picking a known-good commit or tag, creating atomic git revert commits, pushing them, redeploying through the /ccc-deploy runners, and verifying health. Use when a deploy is bad, production is broken, or the user asks to revert or roll back a release."
allowed-tools:
  - Read
  - Bash
  - WebFetch
  - AskUserQuestion
argument-hint: "[target: last-good | tag | n-back]"
model: sonnet
effort: high
disable-model-invocation: true
---

# /ccc-rollback — Revert and redeploy

**CC Commander** · /ccc-rollback · pick target → revert commits → push → redeploy → verify

## When to use / when not to

- Use when production is bad and the safest fix is a revert commit followed by a fresh deploy. History is preserved; nothing is rewritten.
- For an instant platform-level rollback with no git change (`vercel rollback`, `fly releases rollback`, `wrangler rollback`), use `/ccc-ship rollback` instead.
- In Codex, ask each picker below as a plain-text question with the same options.

## What happens

### 1. Read the current state

Run in one Bash call; a missing ref is not an error:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git status --short
git tag --sort=-creatordate | head -10
git log --oneline --decorate -12
```

Render one line:

```markdown
Branch: `<branch>` · HEAD: `<short-sha>` · dirty files: `<N>` · latest tag: `<tag-or-none>`
```

If dirty files are present, ask with AskUserQuestion before any rollback command: "🟢 Stop — I'll commit or stash first" or "Continue with a dirty tree" (the revert may mix with uncommitted work). Do not proceed without an answer.

### 2. Rollback target picker — `AskUserQuestion`

Skip this picker when `$ARGUMENTS` names the target type.

```yaml
question: "What should I roll back to?"
header: "Rollback"
multiSelect: false
autocomplete: true
options:
  - label: "🟢 Last good commit"
    description: "You provide or confirm the last known good commit sha."
    preview: "Creates revert commits for everything after that commit, then deploys."
  - label: "Specific tag"
    description: "Pick a release tag from the list shown in step 1."
    preview: "Reverts commits after the tag, pushes, then redeploys through /ccc-deploy."
  - label: "N versions back"
    description: "Choose how many release tags back to restore."
    preview: "Finds the older tag, warns about distance, reverts, then deploys."
```

### 3. Resolve and validate the target

**Last good commit.** Ask for the sha if it was not supplied. Validate:

```bash
git cat-file -e <target-sha>^{commit}
git merge-base --is-ancestor <target-sha> HEAD
git rev-list --count <target-sha>..HEAD
```

**Specific tag.** Show `git tag --sort=-creatordate | head -20`, take the tag, then validate:

```bash
git rev-parse <tag>^{commit}
git merge-base --is-ancestor <tag> HEAD
git rev-list --count <tag>..HEAD
```

**N versions back.** Ask for `N`, list `git tag --sort=-creatordate | head -50`, and resolve: `N=1` is the tag before the current release tag, `N=2` is two release tags back. Validate the resolved tag as above.

If any validation command fails, stop and report which one. If `HEAD` is more than 5 commits ahead of the target, warn:

```markdown
Warning: HEAD is <N> commits ahead of <target>. This may need a surgical rollback instead of reverting everything after the target.
```

Then ask with AskUserQuestion: "🟢 Revert only the bad commit" (asks for its sha; uses the single-commit form below), "Revert everything after the target", or "Cancel".

### 4. Revert

Create explicit revert commits; never rewrite public history.

Single bad commit:

```bash
git revert <bad-sha>
```

Everything after the target:

```bash
git revert --no-commit <target>..HEAD
git commit -m "fix(rollback): revert to <target-label>"
```

On conflicts:

1. Stop immediately.
2. Show conflicted files from `git status --short`.
3. Say that manual conflict resolution is required, and that `git revert --abort` returns to the pre-rollback state.
4. Do not deploy until the revert commit exists and the project's test or smoke command passes.

After the commit:

```bash
git log --oneline -3
git status --short
```

If the tree is not clean, stop and list the remaining files. If the project has a test command (`npm test`, `pytest`, or the script in `package.json`), run it now and report the result before pushing.

### 5. Push — confirm first

Summarize:

```markdown
Rollback target: <target-label>
Commits reverted: <N>
New revert commit: <sha>
Tests: <result or "not run — no test command">
Deploy: /ccc-deploy runner for <platform-or-"detect">
```

Ask with AskUserQuestion: "🟢 Push and redeploy" or "Stop here — keep the revert local". On push:

```bash
git push origin <branch>
git ls-remote origin <branch>
```

The remote sha from `git ls-remote` must equal `git rev-parse HEAD`.

### 6. Redeploy through /ccc-deploy

`/ccc-deploy` is user-invoked only, so do not call it through the Skill tool. Run its procedure directly: read `${CLAUDE_SKILL_DIR}/../ccc-deploy/SKILL.md` steps 1, 4 and 5, and the matching section of [../ccc-deploy/references/platform-runners.md](../ccc-deploy/references/platform-runners.md). Use the platform from the repo when step 1 of that skill detects exactly one target; otherwise ask its platform picker. The "Push and redeploy" answer in step 5 is the deploy authorization.

If the platform deploys on push (a GitHub workflow, a Git-connected Vercel or Cloudflare project), watch that run instead of starting a second deploy.

### 7. Verify health

Use the `/ccc-deploy` health check as the source of truth. Fetch the production URL with WebFetch and report:

- URL checked
- HTTP status or platform status
- deploy id, run id, release id, or commit sha
- PASS, WARN, or FAIL

### 8. Draft post-rollback comms

```markdown
Rollback complete: <project>
- Restored target: <target-label>
- Revert commit: <sha>
- Deployment: <platform-and-url>
- Health check: <PASS-or-FAIL>
- Follow-up: investigate the original bad deploy and add a regression test.
```

If Slack or Discord is configured through `/ccc-connect`, ask before posting: "🟢 Keep it here" or "Post to <configured channel>". Include incident context only if the user provided it.

## Failure mode

1. Show the exact command and the relevant error lines.
2. Name the stage: target resolution, revert, push, deploy, or health verification.
3. Preserve partial revert state and give the next safe inspection command, usually `git status --short`.
4. If the revert was pushed but the deploy failed, offer to rerun the step 6 runner or use the platform rollback in [../ccc-deploy/references/platform-runners.md](../ccc-deploy/references/platform-runners.md#platform-rollback-no-git-change).

## Done when

- `git ls-remote origin <branch>` matches the local revert commit, and
- step 7 reported PASS from a real fetch of the production URL,
- or the failure report names the failing stage and the next safe command.

## Guardrails

- Pushing, deploying and posting comms each need the user's authorization in this conversation; ask at steps 5 and 8, not at the start.
- Never rewrite history: no `git reset --hard` on a shared branch, no force push.
- Never deploy with unresolved conflicts or a dirty tree after the revert.
- Never skip the redeploy and health check; a rollback is complete only after both.
- Never print secrets or `.env` values.

## See also

- `/ccc-deploy` — the deploy runners and health check this skill reuses
- `/ccc-ship` — platform-level rollback and release tagging
- `/ccc-deploy-check` — readiness gate before redeploying
- `/ccc-systematic-debugging` — find the root cause of the bad deploy

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
