---
description: "Run the deterministic harness audit and return a prioritized scorecard of the project's Claude Code setup: tools, context, quality gates, memory, evals, security, cost. Use when checking setup health or deciding what to harden next."
---

# /ccc-harness-audit — deterministic setup scorecard

**CC Commander** · /ccc-harness-audit · a reproducible score per category, failing checks with file paths, and the top three fixes.

## Arguments

`$ARGUMENTS`:

- scope (optional): `repo` (default), `hooks`, `skills`, `commands`, `agents`
- `--format text|json` (optional; `text` default, `json` for automation)

## What happens

1. Locate the audit engine, first match wins:
   - `scripts/harness-audit.js` in the current repository (an everything-claude-code checkout audits itself)
   - `vendor/everything-claude-code/scripts/harness-audit.js` in a CC Commander checkout

   If neither exists, ask the user for the path to a checkout that has it. Without the script, stop and say the audit cannot run; never produce a manual score.
2. Run it against the current project:

   ```bash
   node <engine path> <scope> --format <text|json> --root "$PWD"
   ```

   The script auto-detects whether the root is the everything-claude-code repo or a consumer project. On a non-zero exit, show stderr and stop.
3. The script is the source of truth. It scores fixed categories (each normalized 0–10) from explicit file and rule checks, and the same commit always yields the same score:
   1. Tool Coverage
   2. Context Efficiency
   3. Quality Gates
   4. Memory Persistence
   5. Eval Coverage
   6. Security Guardrails
   7. Cost Efficiency

   Scoped audits include only the categories that apply (`applicable_categories`). Report the `rubric_version` the script prints; do not add dimensions or points.
4. Return:
   1. `overall_score` out of `max_score`, as reported
   2. category scores and concrete findings
   3. failed checks with exact file paths from `checks[]`
   4. the top three actions from `top_actions[]`
   5. suggested everything-claude-code skills that address the failing categories

   With `--format json`, return the script JSON unchanged and nothing else. With text, summarize failing checks and top actions.

## Example result

```text
Harness Audit (repo, consumer): <overall>/<max>
- Tool Coverage: 10/10 (10/10 pts)
- Context Efficiency: 9/10 (9/10 pts)
- Quality Gates: 10/10 (10/10 pts)

Top 3 Actions:
1) [Security Guardrails] Add prompt/tool preflight security guards in hooks/hooks.json. (hooks/hooks.json)
2) [Tool Coverage] Sync commands/harness-audit.md and .opencode/commands/harness-audit.md. (.opencode/commands/harness-audit.md)
3) [Eval Coverage] Increase automated test coverage across scripts/hooks/lib. (tests/)
```

## Done when

The script ran in this turn and every number in the reply comes from its output.

## Guardrails

- Read-only: the audit changes no files. Applying a top action is a separate request.
- Never rescore by hand or estimate a missing category.

## See also

`/ccc-audit` · `/ccc-quality-gate` · `/ccc-skill-health` · `/ccc-context-budget`
