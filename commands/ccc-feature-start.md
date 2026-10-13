---
name: ccc-feature-start
description: "Kick off a feature: research context, create an isolated branch, confirm a green baseline, write a task breakdown, and the first failing test. Use when starting new feature work in a git repository."
usage: /ccc-feature-start [feature name or description]
version: 1.3.0
---

# /ccc-feature-start — structured feature kickoff

**CC Commander** · /ccc-feature-start · a feature branch, a passing baseline, `tasks/todo.md`, and a first failing test.

Feature: `$ARGUMENTS`. If empty, ask for a one-line feature name in plain text. Derive `<slug>` as lowercase kebab-case of the name.

## What happens

### 1. Research and context

1. Search the codebase for related code with `rg -n "<key terms>"`; list matching files.
2. If `gh` is available and authenticated, run `gh pr list --search "<key terms>" --state all --limit 10` and `gh issue list --search "<key terms>" --limit 10`.
3. If `tasks/lessons.md` exists, read it and note lessons that apply.
4. Identify the files, modules and APIs this feature touches and where it belongs in the architecture.

### 2. Branch and setup

1. Run `git status --porcelain`. If the tree is dirty, show the changes and stop until the user decides how to handle them; never stash or discard them yourself.
2. Find the base branch: `git symbolic-ref --short refs/remotes/origin/HEAD` (falls back to `main`). Run `git fetch origin <base>`.
3. Ask with AskUserQuestion (plain-text question where unavailable):
   - 🟢 New worktree — `git worktree add ../<repo>-<slug> -b feature/<slug> origin/<base>`; the current checkout stays untouched.
   - Branch in this checkout — `git checkout -b feature/<slug> origin/<base>`.
4. Verify: `git rev-parse --abbrev-ref HEAD` prints `feature/<slug>` (run inside the worktree when one was created).
5. Run the baseline tests with the project's command: the `test` script in `package.json` (`npm test`), `pytest`, `go test ./...`, or `cargo test`. Record PASS or FAIL. On FAIL, report the failing tests and ask whether to continue; a red baseline makes later results ambiguous.

### 3. Task breakdown

Write `tasks/todo.md` (append a new section if the file exists):

```markdown
# Feature: <feature name>

## Tasks
- [ ] Write spec (requirements, acceptance criteria, edge cases)
- [ ] Design API/interface (if applicable)
- [ ] Write failing tests (TDD red phase)
- [ ] Implement core logic (TDD green phase)
- [ ] Refactor and clean up
- [ ] Integration tests
- [ ] Documentation updates
- [ ] Code review preparation
- [ ] Final verification
```

### 4. TDD kickoff

1. Write the acceptance criteria (what "done" looks like) and the edge and error cases (what "broken" looks like) into `tasks/todo.md`.
2. Write the first failing test for the most important acceptance criterion.
3. Run the test command and confirm the new test fails for the intended reason, not a syntax or import error.
4. Ask with AskUserQuestion (plain-text question where unavailable):
   - 🟢 Create a WIP commit — `git add <the test file> tasks/todo.md && git commit -m "feat: start <feature name> — failing tests"`; local only, nothing is pushed.
   - Leave changes uncommitted.

### 5. Architecture notes

Record in `tasks/todo.md`:

- **Pattern chosen** — and why
- **Files to modify** — list
- **Files to create** — list
- **Dependencies** — new packages needed, if any
- **Risks** — what could go wrong

## Output

```
FEATURE START: <feature name>
Branch: feature/<slug>
Worktree: <path or "current checkout">
Baseline tests: [PASS/FAIL]
Tasks created: <n>
First test: [written and failing / pending]
Ready for TDD: [YES/NO]
```

## Done when

`git rev-parse --abbrev-ref HEAD` shows the feature branch, `tasks/todo.md` exists, and the first test's failing run has been observed (or the summary says why it is pending).

## Guardrails

- Never stash, reset or discard existing changes.
- Never push, open a PR, or commit without the user's pick in step 4.
- Stage only the files this command created or edited.

## See also

`/ccc-tdd` · `/ccc-checkpoint` · `/ccc-pr` · `/ccc-eval`
