---
description: "Fork the current work into isolated git worktrees to try several approaches side by side, compare them on measured results, and merge the winner. Use when choosing between implementations, attempting a risky refactor, or testing competing bug theories."
---

# /ccc-fork — explore approaches in parallel

**CC Commander** · /ccc-fork · isolated forks per approach, a measured comparison, and one clean merge.

Each fork is a branch `explore/<id>` checked out in its own worktree at `../<repo>-<id>`, created from the current commit. The main checkout is never modified until you merge.

## Arguments

`$ARGUMENTS`:

- `"<description>"` or empty — create a fork (empty: ask for a short description in plain text)
- `list` — show active forks
- `compare` — measured comparison of active forks
- `merge <id>` — merge a fork into the branch you started from
- `discard <id>` — remove a fork's worktree and branch

## What happens

### Create

1. Run `git status --porcelain`. If the tree is dirty, ask whether to commit first or fork from `HEAD` without the uncommitted changes; forks never carry uncommitted work.
2. Count active forks with `git branch --list 'explore/*'`. At five, stop and ask the user to merge or discard one first.
3. Set `<id>` to `fork-` plus six random hex characters, `<base>` to `git rev-parse --abbrev-ref HEAD`, and `<repo>` to the basename of `git rev-parse --show-toplevel`.
4. Create and label the fork:

   ```bash
   git worktree add "../<repo>-<id>" -b "explore/<id>"
   git config "branch.explore/<id>.description" "<description>"
   git config "branch.explore/<id>.forkbase" "<base>"
   ```

5. Verify with `git -C "../<repo>-<id>" rev-parse --abbrev-ref HEAD` (prints `explore/<id>`), then report the fork id, description, base commit (`git rev-parse --short HEAD`), branch and worktree path.
6. Ask how to work the fork with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Work it here — the assistant edits and runs commands only inside `../<repo>-<id>` until you say to return.
   - Parallel agent — spawn one Agent per approach with `isolation: worktree`; each implements, runs the tests, and reports back. The user's selected model is preserved unless they choose another.
   - Separate session — run `claude --continue --fork-session` in a second terminal to copy this conversation into a new session, then `cd ../<repo>-<id>` there. This forks the conversation only; the worktree isolates the files.

### list

Run `git worktree list` and, for each `explore/*` branch, print the id, description (`git config branch.explore/<id>.description`), commit count (`git rev-list --count <forkbase>..explore/<id>`), and last test result if one was recorded this session.

### compare

1. For each active fork, collect only measured values:
   - lines changed: `git diff --stat <forkbase>...explore/<id>`
   - tests: run the project's test command (`npm test`, `pytest`, `go test ./...`, `cargo test`) inside the fork's worktree and record passed/total
   - any metric the user named for this exploration (bundle size, benchmark, render time), with the exact command used
2. Print a table with one column per fork. Leave a cell as `not measured` rather than estimating it.

   ```
   | Metric        | fork-a1b2c3 (Context) | fork-d4e5f6 (Zustand) |
   |---------------|-----------------------|-----------------------|
   | Lines changed | +142 / -20            | +98 / -15             |
   | Tests passing | 42/42                 | 41/42                 |
   ```

3. Give one recommendation with the deciding measurement.

### merge <id>

1. Run the tests in the fork's worktree. If they fail, report it and ask before continuing.
2. Ask with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Merge commit — `git merge --no-ff explore/<id>` on `<forkbase>`; keeps the fork's history.
   - Squash — `git merge --squash explore/<id>` then a single commit you approve.
   - Cancel.
3. Verify: run the test command in the main checkout and `git log --oneline -5`; report both.
4. Summarize decisions and lessons from the fork in `tasks/lessons.md` if that file exists.
5. Ask whether to discard the merged fork and any other active forks (each uses the discard flow below).

### discard <id>

1. Show what will be lost: `git log --oneline <forkbase>..explore/<id>` and `git -C "../<repo>-<id>" status --porcelain`.
2. Ask with AskUserQuestion (plain-text question where unavailable): 🟢 Keep the fork — nothing changes · Discard — runs `git worktree remove "../<repo>-<id>"` and `git branch -D "explore/<id>"`; unmerged commits are lost.
3. On discard, verify with `git worktree list` and `git branch --list "explore/<id>"` (prints nothing).

## Use cases

- **Architecture exploration** — "Fork three caching approaches (in-memory Map, Redis, SQLite); implement, benchmark, report numbers; I'll merge the winner."
- **Risky refactor** — fork, attempt it, merge if green, discard if not; the main checkout is untouched either way.
- **A/B implementation** — two UI designs in two forks; capture a screenshot from each and compare.
- **Bug theories** — one fork per theory (race condition in auth, stale cache in middleware); merge the one that reproduces and fixes the bug.

## Done when

The subcommand's verification command has run and its output matches: the new branch exists, the comparison table holds only measured values, the merged branch's tests have run, or the discarded branch is gone.

## Guardrails

- Never edit the main checkout while working a fork.
- Never discard a fork, delete a branch, or merge without the user's pick.
- Never push fork branches.
- Give forks descriptive names ("approach A: hooks", not "fork 1") and merge or discard them within the session so they do not drift.

## See also

`/ccc-parallel` · `/ccc-checkpoint` · `/ccc-multi-plan` · `/ccc-verify`
