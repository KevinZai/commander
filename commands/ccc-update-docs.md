---
description: "Regenerate the generated parts of project docs (scripts reference, environment variables, contributing guide, runbook) from source-of-truth files and flag stale docs, leaving hand-written prose intact. Use when docs drift from the code or after changing scripts, env vars or deploy steps."
---

# /ccc-update-docs — docs generated from the code

**CC Commander** · /ccc-update-docs · updates only marked, generated sections from source-of-truth files and reports what changed and what is stale.

## Arguments

`$ARGUMENTS` optionally limits the run to `scripts`, `env`, `contributing`, `runbook` or `stale`. Empty runs every step whose source exists.

## Sources of truth

| Source | Generates |
|---|---|
| `package.json` scripts, `Makefile`, `Cargo.toml`, `pyproject.toml` | Commands reference |
| `.env.example`, `.env.template`, `.env.sample` | Environment variable reference |
| `openapi.yaml` / route files | API endpoint reference |
| Source code exports | Public API reference |
| `Dockerfile`, `docker-compose.yml` | Infrastructure setup |

Every generated block sits between markers so later runs replace only that block:

```markdown
<!-- AUTO-GENERATED:scripts -->
...
<!-- /AUTO-GENERATED:scripts -->
```

## What happens

1. **Commands reference.** Read the scripts from the sources above (for Node: `node -e 'console.log(JSON.stringify(require("./package.json").scripts,null,2))'`). Describe each from its command line and any comment, and write a table into the `scripts` block:

   ```markdown
   | Command | Description |
   |---|---|
   | `npm run dev` | Start the development server with hot reload |
   | `npm run build` | Production build with type checking |
   | `npm test` | Run the test suite with coverage |
   ```

2. **Environment reference.** Read the example env file only (never `.env` or `.env.local`). For each variable record required or optional, purpose, format and an example value taken from the example file, never a real value:

   ```markdown
   | Variable | Required | Description | Example |
   |---|---|---|---|
   | `DATABASE_URL` | Yes | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
   | `LOG_LEVEL` | No | Logging verbosity (default: info) | `debug`, `info`, `warn`, `error` |
   ```

3. **Contributing guide.** Update the generated blocks of `docs/CONTRIBUTING.md`: environment setup (prerequisites, install steps), available scripts, how to run and write tests, code style enforcement (linter, formatter, pre-commit hooks) and the PR checklist.

4. **Runbook.** Update the generated blocks of `docs/RUNBOOK.md`: deployment steps, health check endpoints and monitoring, common issues and fixes, rollback procedure, alerting and escalation paths. Take each from the repo (CI workflows, deploy scripts, health routes); leave a `TODO` rather than invent a step.

5. **Staleness check.** For each doc, compare its last commit date with the last commit to the code it describes:

   ```bash
   git log -1 --format=%cs -- docs/DEPLOY.md
   git log -1 --format=%cs -- <related source paths>
   ```

   Flag docs untouched for 90 days or more whose related source changed since, for manual review.

## Decision points

Ask with AskUserQuestion (plain-text question where it is unavailable) when a target doc does not exist: 🟢 Skip it and list it in the summary · Create it with generated sections only. Do not create new doc files without this choice or an explicit request.

## Done when

Run `git diff --stat` and report it with the summary:

```
Documentation Update
──────────────────────────────
Updated:  docs/CONTRIBUTING.md (scripts table)
Updated:  docs/ENV.md (3 new variables)
Flagged:  docs/DEPLOY.md (142 days stale)
Skipped:  docs/API.md (no changes detected)
──────────────────────────────
```

The diff must touch only content inside `AUTO-GENERATED` markers; if it shows other lines changed, revert those lines and report it.

## Guardrails

- Generate from code; never hand-edit inside generated blocks, and never touch prose outside them.
- Never read or copy values from real env files or secrets into docs.
- Do not create doc files unprompted.

## See also

`/ccc-update-codemaps` · `/ccc-doc-sync` · `/ccc-docs`
