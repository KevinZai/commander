---
name: ccc-modernize
description: "Bring an old PR up to date by merging its base into it, and judge honestly whether the idea still belongs: MODERNIZE, REWORK or CLOSE. Use when asked to update, rebase or \"modernize\" a stale pull request."
allowed-tools:
  - Read
  - Bash(git fetch *)
  - Bash(git log *)
  - Bash(git diff *)
  - Bash(git status *)
  - Bash(git range-diff *)
  - Bash(gh pr view *)
  - Bash(gh pr list *)
  - AskUserQuestion
argument-hint: "[pr-number | url] [--linear-history]"
disable-model-invocation: true
---

# /ccc-modernize — Update the PR, judge the idea

**CC Commander** · /ccc-modernize · a stale PR merged up to date and an honest MODERNIZE, REWORK or CLOSE call.

> Adapted from [t3dotgg/tstack](https://github.com/t3dotgg/tstack) `skills/modernize/SKILL.md` at `92e38e2cf677a84a142e8df296861c588542135c`. MIT, Copyright (c) 2026 Theo Browne; see `LICENSE.txt`. Changes for CC Commander are marked "CCC safety:".

Modernize the idea, not just the branch. A clean update does not prove that the PR still belongs in the product.

## When to use / when not to

- Use for an aging PR that has fallen behind its base, or when asked whether it is still worth landing.
- Not for merging, closing or changing the base branch: those need explicit permission.

## What happens

1. **Fetch and record.** Run `git fetch origin` and `git status --short`. Pull the latest of the PR branch, the base branch and any related branch. Treat existing worktree changes as user-owned; use a disposable worktree if the active one is dirty. Resolve the PR with `gh pr view <n> --json url,state,baseRefName,headRepository,headRefName,headRefOid,author,statusCheckRollup,reviewDecision,title,body`. Read linked issues, commits, review threads and the complete diff. State the smallest coherent goal the PR was trying to accomplish. Record the merge base so the original PR and later base changes can be compared separately. Use the PR's actual base, not an assumed `main`.
2. **Check what changed around it.** Inspect `git log <merge-base>..origin/<base>` and the diffs added to the base since divergence. Search merged and open PRs (`gh pr list --state all --search "<keywords>"`) for replacements or competitors. Look beyond overlapping lines (conceptual-conflict checklist):
   - Has the same user-facing problem already been solved?
   - Did APIs, types, schemas, dependencies or architectural boundaries change?
   - Do both sides now claim ownership of the same behavior or invariant?
   - Was the code being changed deleted, moved or intentionally simplified?
   - Would landing the PR restore an old behavior or create two ways to do the same thing?
   - Is the original benefit still large enough to justify the maintenance cost?

   Do not call a PR current merely because Git reports no conflicts.
3. **Choose a disposition before pushing.**
   - **MODERNIZE**: the goal is still useful and the implementation is still the right shape. Update the branch, resolve conflicts, test.
   - **REWORK**: the goal is useful but a mechanical update would preserve the wrong implementation. Explain the smallest credible rewrite and stop before pushing unless the user also asked for it.
   - **CLOSE**: superseded, obsolete, directionally wrong, or no longer worth its cost. Cite concrete evidence and stop. Do not spend time updating an obsolete branch, and do not close it without explicit permission.

   Be willing to recommend CLOSE. Age alone is not evidence, and sunk effort is not a reason to keep a PR alive.
4. **MODERNIZE, default path.** CCC safety: upstream rebases the pushed branch and pushes it with a lease; this version never rewrites a pushed branch. In a worktree on the PR branch at the recorded head run `git fetch origin && git merge --no-edit origin/<base>`. Resolve each conflict by intent: the PR's current goal plus the base's newer invariants. If a conflict reveals a product or architecture disagreement, stop and reconsider the disposition instead of guessing. Inspect the final diff against the base: no intentional behavior disappeared, no already-landed behavior reintroduced.
5. **Gate, then push.** CCC safety: run the repository's FULL local test suite and lint on the exact head commit; read CI as a signal, never as the gate. A hook failure is fixed, never skipped. Only when it is green, push with a plain `git push`. Distinguish real failures from pre-existing or infrastructure ones and report them.
6. **Linear history requested.** CCC safety: do not rebase the pushed branch. Create a NEW branch `<branch>-modernized` at the recorded head, rebase it onto the freshly fetched `origin/<base>`, resolve conflicts as in step 4, and compare the series with `git range-diff <old-merge-base>..<branch> origin/<base>..<branch>-modernized`. Run the full local suite and lint as in step 5, push the new branch normally, and offer a replacement draft PR that credits the original PR (link and author). Closing the old PR needs the user's explicit permission.
7. **Verify and report.** Run `git status --short` and `git log --oneline origin/<base>..HEAD`, then write the report below. Do not merge the PR. Do not post a PR comment unless the user asked; draft any comment for the user instead.

## Decision points

- Disposition is MODERNIZE and the user has not said how to update: AskUserQuestion with 🟢 merge the base into the PR branch (keeps pushed history), rebase onto a new `-modernized` branch (linear history), or stop at the recommendation.
- Replacement PR after a rebase: AskUserQuestion with 🟢 open a draft replacement crediting the original, or leave the pushed branch without a PR. Closing the old PR is a separate explicit ask. Codex fallback: request_user_input or a plain-text question.

## Done when

- Disposition stated, with evidence.
- If MODERNIZE: full local suite and lint green on the pushed head, branch pushed normally, result confirmed with `git status --short`.

## Report

Lead with MODERNIZE, REWORK or CLOSE and the reason. Then:

- meaningful changes on the base branch;
- conceptual conflicts, or confirmation none were found;
- the update and push result, if performed;
- checks run and their results;
- the remaining decision or work, with a link to the PR.

Separate observed facts from judgment. Say what could not be verified instead of manufacturing confidence.

## Guardrails

- Never force-push in any form, and never rebase a pushed branch.
- Never skip or disable hooks or secret scanning to get a push through.
- Updating authorizes only the branch update. It does not authorize merging, closing, changing the base, or expanding scope.
- Push only after the full local gate is green on that head; a replacement PR opens as draft until the user says ready.

## See also

- `/ccc-review` — branch review
- `/ccc-qa` — pre-ship test pass
- `/commander:ccc-deep-review` — adversarially verified branch review (workflow)

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
