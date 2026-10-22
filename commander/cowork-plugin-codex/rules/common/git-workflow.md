# Git Workflow

## Commit messages

```
<type>: <description>

<optional body explaining why>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`. Follow the project's attribution policy for trailers.

## Before any write

- Confirm the repository root, branch, base, and working-tree state (`git status`).
- Write in a dedicated worktree for delegated or parallel work (`rules/fable-method.md` Pillar 5).
- Stage named paths only; never blanket-stage a shared or dirty tree.
- Never bypass hooks (`--no-verify`) and never force-push the main branch.

## Pull requests

1. Read the full history and diff against the verified base: `git diff <base>...HEAD`.
2. Describe the final behavior for a reviewer who has no conversation context.
3. Include the validation that actually ran and its result, plus known limits.
4. Push with `-u` when the branch needs an upstream, and only when pushing is authorized.

For the steps before git (planning, tests, review), see [development-workflow.md](./development-workflow.md).
