---
description: "Find and remove dead code one item at a time, running the test suite before and after every deletion and reverting any deletion that breaks it. Use when the user wants unused code, files or dependencies cleaned up safely."
---

# /ccc-refactor-clean — remove dead code under test

**CC Commander** · /ccc-refactor-clean · detects dead code, sorts it by risk, deletes the safe items one at a time with a green test run after each, and reports what was removed.

## Arguments

`$ARGUMENTS`: optional path to limit the scan. Default: the repository root.

## What happens

1. **Check the starting state.**

   ```bash
   git status --porcelain
   ```

   A revert in step 5 restores files from `HEAD`, which would discard uncommitted edits. If the tree is dirty, ask with AskUserQuestion (Codex: plain-text question):
   - 🟢 **Stop so I can commit first** — nothing is changed.
   - **Continue on clean files only** — files with uncommitted changes are excluded from deletion.
2. **Name the test command** and establish a baseline. Use the project's own script first (`npm test`, `pnpm test`, `pytest`, `go test ./...`, `cargo test`, or the `Makefile`/`justfile` target). Run it. If the baseline is not green, report the failures and stop; dead-code removal needs a passing suite to prove anything.
3. **Detect dead code** with the tools that fit the stack and are available (run through `npx` only when the project already uses npm):

   | Tool | Finds | Command |
   |---|---|---|
   | knip | Unused exports, files, dependencies | `npx knip` |
   | depcheck | Unused npm dependencies | `npx depcheck` |
   | ts-prune | Unused TypeScript exports | `npx ts-prune` |
   | vulture | Unused Python code | `vulture <src>` |
   | deadcode | Unused Go code | `deadcode ./...` |
   | cargo-udeps | Unused Rust dependencies | `cargo +nightly udeps` |

   If no tool is available, find exported names and count their references:

   ```bash
   rg --no-filename -o -r '\$1' '^export (?:const|function|class|type|interface) (\w+)' <path> | sort -u
   rg -n --fixed-strings '<name>' --glob '!<defining-file>' <path>
   ```

   A name with zero references outside its defining file is a candidate.
4. **Categorize** every finding:

   | Tier | Examples | Action |
   |---|---|---|
   | SAFE | Unused utilities, test helpers, internal functions | Delete in the loop below |
   | CAUTION | Components, API routes, middleware | Run the CAUTION checks in step 6 first |
   | DANGER | Config files, entry points, type definitions, public package API | Report only; do not delete |

   Show the SAFE list, then ask with AskUserQuestion:
   - 🟢 **Delete the SAFE items one at a time** — each deletion is tested and reverted on failure.
   - **Report only** — no files change.
5. **Safe deletion loop**, for each approved item:
   1. Delete the dead code with a surgical Edit (or remove the file or dependency entry).
   2. Re-run the test command from step 2.
   3. On failure, revert that item immediately with `git restore --source=HEAD --worktree -- <file>` (covers edited and deleted files; include the lock file for a dependency removal), record it as skipped, and continue.
   4. On success, move to the next item.
6. **CAUTION items.** Before proposing deletion, search for:
   - dynamic imports: `rg -n 'import\(|require\(|__import__|importlib'`
   - string references to the name in routes, configs and templates: `rg -n --fixed-strings '<name>'`
   - exports from a public package entry point (`package.json` `exports`/`main`, `__init__.py`, `lib.rs`)
   - external consumers when the package is published

   Items that pass every check go through the step 5 loop after the same picker; the rest stay reported.
7. **Consolidate duplicates** only when the user asks for it after the deletions: near-duplicate functions, redundant type definitions, wrappers that add nothing, and pointless re-exports. Each consolidation goes through the same edit, test, revert loop.
8. **Verify and report.**

   ```bash
   <test command>
   git diff --stat
   ```

   ```text
   Dead code cleanup
   Deleted:  <n> functions · <n> files · <n> dependencies
   Skipped:  <n> items (tests failed): <names>
   Reported: <n> CAUTION · <n> DANGER
   Lines removed: <from git diff --stat>
   Tests: ✅ passing | ❌ <failures>
   ```

## Done when

The final test run passes and the report's numbers match `git diff --stat`.

## Guardrails

- Never delete without a green baseline, and never more than one item between test runs.
- When uncertain, keep the code and report it.
- Do not refactor while cleaning; consolidation is a separate, requested step.
- Do not commit, push or stash; the user reviews the diff.

## See also

`/ccc-quality-gate` · `/ccc-test-coverage` · `/ccc-verify` · `/ccc-build-fix`
