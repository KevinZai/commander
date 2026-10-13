---
description: "Scan the codebase and write token-lean architecture codemaps (architecture, backend, frontend, data, dependencies) with a freshness header and a diff report. Use after major features or refactors, or when an agent needs a compact map of the repo."
---

# /ccc-update-codemaps — compact maps of the codebase

**CC Commander** · /ccc-update-codemaps · writes short, path-first architecture docs an agent can load cheaply, and reports what changed since the last scan.

## Arguments

`$ARGUMENTS` optionally names one codemap (`architecture`, `backend`, `frontend`, `data`, `dependencies`) to regenerate. Empty regenerates all that apply.

## What happens

1. **Scan the structure.**
   1. Identify the project type: monorepo (`pnpm-workspace.yaml`, `turbo.json`, `packages/`), single app, library or service.
   2. List source directories: `git ls-files | cut -d/ -f1-2 | sort | uniq -c | sort -rn | head -30`.
   3. Find entry points (`main.ts`, `index.ts`, `app.py`, `main.go`, `src/main.rs`, the `main`/`bin`/`exports` fields of `package.json`).

2. **Choose the output directory.** Use `docs/CODEMAPS/` if it exists, else `.reports/codemaps/` if it exists, else ask with AskUserQuestion (plain-text question where it is unavailable): 🟢 `docs/CODEMAPS/` (committed with the repo) · `.reports/codemaps/` (local reports) · Stop.

3. **Write the codemaps** that apply to this project (skip `frontend.md` for a backend-only repo, and so on):

   | File | Contents |
   |---|---|
   | `architecture.md` | System diagram (ASCII), service boundaries, data flow |
   | `backend.md` | API routes, middleware chain, service → repository mapping |
   | `frontend.md` | Page tree, component hierarchy, state management flow |
   | `data.md` | Tables, relationships, migration history |
   | `dependencies.md` | External services, third-party integrations, shared libraries |

   Format: path-first and token-lean, under about 1,000 tokens per file. Use file paths and signatures, not code blocks:

   ```markdown
   # Backend Architecture

   ## Routes
   POST /api/users → UserController.create → UserService.create → UserRepo.insert
   GET  /api/users/:id → UserController.get → UserService.findById → UserRepo.findById

   ## Key Files
   src/services/user.ts (business logic, 120 lines)
   src/repos/user.ts (database access, 80 lines)

   ## Dependencies
   - PostgreSQL (primary data store)
   - Redis (session cache, rate limiting)
   ```

4. **Check the diff before overwriting.** For each codemap that already exists, compare old and new (`git diff --no-index --stat <old> <new>` against a temporary copy). If more than 30% of lines change, show the diff and ask: 🟢 Overwrite with the new map · Keep the old map · Show the full diff first. At 30% or less, update in place.

5. **Add a freshness header** to every codemap, filled from this run:

   ```markdown
   <!-- Generated: YYYY-MM-DD | Files scanned: N | Token estimate: ~N -->
   ```

6. **Write the analysis report** to `.reports/codemap-diff.txt`:
   - files added, removed and modified since the last scan (`git log --since=<previous Generated date> --name-status --oneline`);
   - new dependencies detected;
   - architecture changes (new routes, services, tables);
   - docs not modified in 90 days or more (`git log -1 --format=%cs -- <doc>` per doc).

## Done when

`ls -la <output dir>` shows each codemap with this run's header, `.reports/codemap-diff.txt` exists, and `git status --short` lists exactly the files written. Report those three outputs.

## Guardrails

- High-level structure only; never paste implementation code or secrets (no values from `.env*`, keys or connection strings).
- Never overwrite a codemap changed by more than 30% without the user's choice.
- Write only inside the chosen output directory and `.reports/`.

## See also

`/ccc-update-docs` · `/ccc-doc-sync` · `/ccc-xray`
