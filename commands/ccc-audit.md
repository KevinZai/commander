---
description: "Audit the current project for dependency vulnerabilities, oversized bundles, type errors, dead code, hardcoded secrets, undocumented env vars and a missing CLAUDE.md. Use when you want a health score before a release or review."
---

# /ccc-audit — project health audit

**CC Commander** · /ccc-audit · one read-only pass over dependencies, build output, types, dead code, secrets, env vars and project instructions, ending in a scored report.

## Arguments

`$ARGUMENTS` (optional) narrows the run:

| Argument | Checks run |
|---|---|
| *(none)* | all seven |
| `security` | 1 dependencies, 5 secrets, 6 env vars |
| `deps` | 1 dependencies, 4 dead code |
| `perf` | 2 bundle size |

## What happens

Detect the package manager from the lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, otherwise npm). Run each check, record the actual output, and mark a check `skipped` with the reason when its tool or input is absent.

1. **Dependencies.** Look for high and critical advisories.

   ```bash
   npm audit --json        # or: pnpm audit --json | yarn npm audit --json
   ```

2. **Bundle size.** Use existing build output (`dist/`, `build/`, `.next/`, `out/`); if none exists, run the project's `build` script once. Flag any file over 500 KB.

   ```bash
   find dist build .next/static out -type f \( -name '*.js' -o -name '*.css' \) -size +500k -exec ls -lh {} \; 2>/dev/null
   ```

3. **TypeScript.** Zero errors required. Skip when there is no `tsconfig.json`.

   ```bash
   npx tsc --noEmit
   ```

4. **Dead code.** Find unused exports and unreferenced files with an installed tool (`npx knip` or `npx ts-prune`). Without one, report `skipped: no dead-code tool installed` rather than guessing.
5. **Secrets.** Scan tracked files for hardcoded keys, tokens and passwords. Report `path:line` and the kind of secret; never print the value.

   ```bash
   git grep -nIE '(api[_-]?key|secret|token|passw(or)?d)[^=:]{0,20}[=:][[:space:]]*["'"'"'][^"'"'"']{12,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY' -- ':!*.lock' ':!*lock.json'
   ```

6. **Env vars.** Compare the variables the code reads with the documented ones in `.env.example` (or the README). Report each undocumented or unused variable by name only.

   ```bash
   git grep -hoE 'process\.env\.[A-Z0-9_]+|import\.meta\.env\.[A-Z0-9_]+|os\.environ(\.get)?\(?\[?"[A-Z0-9_]+' | sort -u
   ```

7. **Project instructions.** Flag a gap when the repository root has no `CLAUDE.md`.

## Output

```
🔴 Critical: <findings that block a release: high/critical advisories, secrets, type errors>
🟡 Warning: <oversized bundles, dead code, undocumented env vars, missing CLAUDE.md>
🟢 Clean: <checks that passed>
⏭️ Skipped: <check — reason>
📊 Score: X/10
```

Score: start at 10, subtract 2 per critical finding and 1 per warning category, floor at 0. State the counts behind the score.

## Done when

Every selected check shows either its real command output summarized in the report or a `skipped` reason.

## Guardrails

- Read-only: never run `npm audit fix`, delete files, or edit code during the audit. Offer fixes afterwards.
- Never echo secret values, even partially.
- Run the build at most once, and only when no build output exists.

## See also

`/ccc-quality-gate` · `/ccc-verify` · `/ccc-harness-audit` · `/ccc-build-fix`
