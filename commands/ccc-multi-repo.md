---
description: "Coordinate one change across several repositories in a single session with --add-dir: shared branch names, linked PRs, dependency-ordered merges and per-repo verification. Use for API contract changes, shared library updates and cross-service refactors."
---

# /ccc-multi-repo — one change, several repos

**CC Commander** · /ccc-multi-repo · coordinated edits, branches and checks across every repository in the session.

## Usage

```bash
/ccc-multi-repo                    # guided setup for a cross-repo change
/ccc-multi-repo add <path>         # add a repository to this session
/ccc-multi-repo status             # branch and working state of every repo
/ccc-multi-repo verify             # run each repo's checks and report
```

Arguments: `$ARGUMENTS`. With no subcommand, run the guided setup.

## Adding repositories

Start a session with extra repositories:

```bash
cd ~/projects/api-server
claude --add-dir ~/projects/web-client --add-dir ~/projects/mobile-app
```

Inside a running session, the user adds one with the built-in `/add-dir <path>`. For `/ccc-multi-repo add <path>`:

1. Check the path is a git repository: `git -C <path> rev-parse --show-toplevel`. On failure, report it and stop.
2. Tell the user to run `/add-dir <path>` (the assistant cannot type built-in slash commands), then confirm access by reading a file from it.
3. Run `status` to show the new set.

Added directories support reading, editing and creating files, running shell commands and tests in that directory, installing dependencies, and git operations (each repo keeps its own git). `--add-dir` does not merge git histories, create symlinks, share `node_modules`, or change the other repo's `.claude/settings.json`.

Refer to files by absolute path (`~/projects/web-client/src/types.ts`) or name the repo first ("in web-client, read `src/types.ts`").

## Status

For the primary working directory and every added directory:

```bash
git -C <repo> rev-parse --show-toplevel
git -C <repo> branch --show-current
git -C <repo> status --short
```

Report one row per repo: path, primary or added, branch, clean or the count of changed files.

## Guided setup

1. Ask the user for the change and the repos it touches, or read it from `$ARGUMENTS`.
2. Run `status`. If any repo has uncommitted changes, report them and do not overwrite them.
3. Order the repos by dependency: shared types and schemas first, then services, then clients. Start editing in the most foundational repo.
4. Before creating branches, ask with AskUserQuestion (Codex: a plain-text question):
   - 🟢 Same branch everywhere — create `feat/<name>` in each repo with `git -C <repo> checkout -b feat/<name>`
   - Use existing branches — work on each repo's current branch
   - Cancel — stop without changes
5. Make the change repo by repo, keeping each repo's edits to its part of the contract.
6. Run `verify`.

Example requests this handles:

- API contract change: add `displayName` to the User response and deprecate `name`; update the server's schema, handler, validation and tests, and every client's types, API layer and call sites; each repo must typecheck and pass tests.
- Shared type library update: a breaking change to a shared types package (for example a branded `UserId`, `Temporal` dates); update every consumer and run typecheck and tests in each.
- Cross-service feature: a WebSocket notification endpoint and model on the server, a client hook, bell component and toasts in the web app, and a shared `NotificationEvent` type.

## Verify

For each repo, find its commands in `package.json`, `Makefile`, `pyproject.toml` or its `CLAUDE.md`, then run typecheck, lint, test and build where they exist (for example `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`), each from that repo's directory. Report a table with the actual result of each command per repo, and mark a command `not configured` when the repo has none. Fix failures in the repo that caused them and rerun that repo's checks.

## Branches, commits and PRs

- Use one branch name in every repo, for example `feat/add-notifications`.
- Cross-reference repos in commit messages:

  ```
  feat(api): add notification WebSocket endpoint

  Part of: feat/add-notifications
  Related: web-client@feat/add-notifications, mobile-app@feat/add-notifications
  ```

- Commits, pushes and PRs happen only when the user asks for them in this conversation. When they do, create linked PRs:

  ```bash
  gh pr create --title "feat(api): notification endpoint" \
    --body "Part of notification feature. Related PRs:
    - web-client: <link>
    - mobile-app: <link>"
  ```

  Then run `gh pr view --json url,state` in each repo and report the URLs.
- Merge in dependency order and record that order in the first PR's description: shared types (merge and publish), then the API (merge and deploy), then the web client, then the mobile app.

## Done when

`verify` has run in every repo with actual results reported, and `status` shows the expected branch and only intended changes in each.

## Guardrails

- Never overwrite uncommitted work in any repo.
- No commit, push, PR, publish or deploy without the user's request in this conversation.
- Add only the repos the change needs; each one adds to the session's context. Add a repo read-only (just to read its types) when that is all the change needs.
- Keep each PR set to one logical change.

## See also

`/ccc-multi-workflow` · `/ccc-pr` · `/ccc-verify`
