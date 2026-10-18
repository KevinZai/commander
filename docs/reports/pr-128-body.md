## Summary

CC-655 adds MCP tool annotations to the current custom HTTP catalog without adding an SDK or dependencies. All 18 tools have a short title plus explicit `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`. Compiler-enforced schemas require annotations for every tool.

`GET /v1` and JSON-RPC `tools/list` on the existing `POST /v1/call` path now share a catalog builder and return nested annotations. Existing names, descriptions, input schemas, call envelopes, authentication, and rate-limit placement are preserved. Discovery through POST retains existing quota/feedback gates and usage accounting.

Hints reflect implemented behavior: all tools are read-only except additive, non-idempotent `notes_pin`; only `update` is open-world because it fetches GitHub. Invocation/install/init tools return guides or commands, `tasks_push` is a setup stub, and plan tools only process text. These hints exclude shared transport accounting and do not imply that a returned command is safe to execute without review. The complete tool-to-hints table and rationale are in [the report](docs/reports/anthropic-patches-2-3.md).

## Deferred and unverified

- **CC-654 is DEFERRED.** The force-push gate must move to **PreToolUse** for `ask`; revisit after the CC-653 SDK-backed server lands. Existing hook implementation is unchanged.
- **Client auto-approve behavior remains unverified until CC-653 (hosted MCP).** This is the requested minimal HTTP catalog addition, not a full SDK/session/protocol migration.
- No live backend or client verification, deployment, or package installation was performed.

## Validation

- `npm run typecheck` in `apps/mcp-server-cloud`: **PASS**, exit 0 (TypeScript compiler; no test count).
- Full app suite, every file in the unchanged npm test script: **70 passed, 0 failed**, exit 0:

  ```sh
  node --import tsx --test --test-force-exit tests/integration.test.ts tests/http.test.ts tests/install-skill.test.ts tests/compatibility-check.test.ts tests/session-diagnose.test.ts tests/compose-plan.test.ts
  ```

- From the repository root: `node --test commander/tests/permission-gate.test.js tests/hooks.test.js`: **81 passed, 0 failed**, exit 0. The launcher set `CCC_TELEMETRY=0`, isolated child `HOME`/`TMPDIR` under the app tests directory, and used a `NODE_OPTIONS` data-URL preload to change only test-worker working directories to that scratch directory. This kept hook logs and the existing `tasks/todo.md` fixture within the authorized tree; source tests were unchanged.
- Test-first evidence: `node --import tsx --test --test-force-exit tests/http.test.ts` initially completed with **36 passed, 2 failed** after correcting a test-double setup issue. The two intended failures were missing nested annotations and `tools/list` returning 400. All six new tests pass in the full run above (38 HTTP tests total).
- Plain `npm test` retains the listener hang documented in the previous task: importing `src/index.ts` starts a listener even at port 0. It was not rerun or fixed; the successful full-suite run uses `--test-force-exit` as requested.
- Source comparison with starting HEAD confirmed all 18 existing descriptions and input schemas unchanged. `git diff --check` passed. Independent static review found no defects in annotation semantics, route placement, or regression coverage.
- Node used: `v24.22.0`. No installs, SDK, new dependencies, package-script changes, or lockfile changes. Dependencies were reused through the existing untracked `node_modules` symlink.

HQ applies this draft body to PR #128; the fleet task only creates a local commit and does not push, merge, deploy, or edit the PR.
