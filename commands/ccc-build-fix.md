---
description: "Fix build and type errors one at a time with the smallest safe change, re-running the build after each fix. Use when a build, compile or type check is failing."
---

# /ccc-build-fix — fix the build, one error at a time

**CC Commander** · /ccc-build-fix · detects the build system, fixes errors in dependency order with minimal diffs, and proves the build is green.

## What happens

1. **Detect the build command.** Use the first matching indicator; for Node projects pick the package manager from the lockfile (`pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, otherwise `npm`).

   | Indicator | Build command |
   |---|---|
   | `package.json` with a `build` script | `npm run build` (or `pnpm build` / `yarn build`) |
   | `tsconfig.json` only | `npx tsc --noEmit` |
   | `Cargo.toml` | `cargo build 2>&1` |
   | `pom.xml` | `mvn compile` |
   | `build.gradle` | `./gradlew compileJava` |
   | `go.mod` | `go build ./...` |
   | `pyproject.toml` | `mypy .` (or `python -m compileall -q .` without mypy) |

   If nothing matches, ask the user for the build command.

2. **Run it and group the errors.** Capture stdout and stderr, group errors by file, order them so imports and type definitions come before logic errors, and count the total.
3. **Fix loop, one error at a time.**
   1. Read the file around the error (about 10 lines of context).
   2. Find the root cause: missing import, wrong type, syntax error, bad config.
   3. Make the smallest edit that resolves it.
   4. Re-run the build command and confirm the error is gone and no new error appeared.
   5. Move to the next error.
4. **Stop and ask** (AskUserQuestion, plain-text question where unavailable) when:
   - a fix produces more errors than it removes;
   - the same error survives 3 attempts;
   - the fix needs an architectural change rather than a build fix;
   - the error comes from a missing dependency that needs `npm install`, `cargo add` or similar.

   Offer: 🟢 Stop here and summarize · Try the larger change I describe · Install the missing dependency (names the exact command).

## Recovery strategies

| Situation | Action |
|---|---|
| Missing module or import | Check whether the package is installed; propose the install command. |
| Type mismatch | Read both type definitions; fix the narrower type. |
| Circular dependency | Trace the import cycle; propose extracting the shared piece. |
| Version conflict | Read the constraints in `package.json` / `Cargo.toml` and the lockfile. |
| Build tool misconfiguration | Read the config file and compare it with the tool's defaults. |

## Done when

Run the build command one final time and report its exit code and last lines of output, plus:

- errors fixed, with file paths;
- errors remaining, if any, with the reason each was left;
- new errors introduced (expected: zero);
- next steps for anything unresolved.

`git diff --stat` shows the full set of edits.

## Guardrails

- Minimal diffs only: no refactors, renames or formatting changes beyond what an error requires.
- Never silence an error with `any`, `@ts-ignore`, `# type: ignore` or disabled checks unless the user picks that option.
- Never install, upgrade or remove dependencies without the user's choice in this conversation.

## See also

`/ccc-verify` · `/ccc-audit` · `/ccc-debug-session` · `/ccc-tdd`
