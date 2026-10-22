---
description: "Open a pull request for the current branch: commit pending work, run tests, push, and create the PR with gh. Use when a branch is ready for review."
---

# /ccc-pr — pull request for the current branch

**CC Commander** · /ccc-pr · commits, tests, pushes and opens a PR with `gh`, then reports the URL.

Arguments: `$ARGUMENTS` (optional: PR title override, target branch).

## What happens

1. Inspect the branch:

   ```bash
   gh auth status
   git branch --show-current
   git status --short
   git remote show origin | sed -n 's/.*HEAD branch: //p'
   ```

   The last line is the default base; a target branch in `$ARGUMENTS` overrides it. If the current branch is the base branch, stop and offer to create a feature branch first.

2. If there are uncommitted changes, show them and ask with AskUserQuestion:

   - 🟢 Commit them — stages the listed files by name and commits with a conventional message.
   - Leave them out — opens the PR from existing commits only.
   - Cancel — nothing is committed or pushed.

   ```bash
   git add <file> <file>
   git commit -m "<type>: <description>"
   ```

3. If the project has tests, run them (take the command from `package.json` scripts or the project's CLAUDE.md) and keep the actual result for the PR body. A failure goes in the body as a failure; ask whether to continue.

4. Push:

   ```bash
   git push -u origin "$(git branch --show-current)"
   ```

5. Build the PR:

   - Title: the `$ARGUMENTS` override, else the last commit subject, else the branch name.
   - Body: summary of changes, files modified (from `git diff --stat <base>...HEAD`), test command and result.
   - Labels: detect from changed paths (frontend, backend, docs, and so on); apply only labels that already exist in the repository (`gh label list`).

   ```bash
   gh pr create --base <base> --title "<title>" --body-file <body-file> --label <label>
   ```

6. Verify and report:

   ```bash
   gh pr view --json url,state,baseRefName,headRefName
   ```

   Output the PR URL from this command.

## Done when

`gh pr view` returns the PR in `OPEN` state and its URL is reported.

## Guardrails

- Invoking `/ccc-pr` authorizes the push and PR for this branch only; ask before committing changes the user has not seen.
- Never push to the base branch, force-push, or skip hooks with `--no-verify`.
- Stage files by name; never `git add -A` on a tree with unrelated changes.

## See also

`/ccc-orchestrate` · `/ccc-parallel`
