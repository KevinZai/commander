# CC-654 / CC-655: Anthropic patches 2 and 3

Date: 2026-10-18. Fleet task: `t_fs4drnt8gf`, following `t_khugdh81vl`.
Starting HEAD: `a4b4750b03d10271d6d57c3cdca78938e57f9cd2`.
Branch: `fix/anthropic-patches-2-3`. Draft PR: [KevinZai/commander#128](https://github.com/KevinZai/commander/pull/128).

## Outcome

**CC-655: DONE on the current custom HTTP catalog. CC-654: DEFERRED.** Kevin selected option (b): annotate today's catalog without an SDK. All 18 entries (enumerated by `TOOL_NAMES`) now have a short title and all four explicit boolean hints. `GET /v1` and JSON-RPC `tools/list` on `POST /v1/call` use the same builder and emit nested `annotations` alongside unchanged `name`, `description`, and `inputSchema` fields.

## CC-655: catalog annotations

The local `ToolAnnotations` type matches the [MCP 2026-07-28 annotation fields](https://modelcontextprotocol.io/specification/2026-07-28/schema#toolannotations). `Record<ToolName, ToolSchema>` requires annotations for every tool, and `Required<ToolAnnotations>` requires the title and all four hints. These are descriptive hints, not permission enforcement. Spec defaults are read-only false, destructive true, idempotent false, and open-world true; every value is explicit here.

The table describes current handler effects. Shared authentication, rate-limit counters, last-seen updates, logs, telemetry, and registry boot/refresh are transport/server bookkeeping, not each tool's domain action. Read-only tools have idempotent true because repeated handler calls do not mutate domain state; their returned values can still vary. A bounded database/memory store is closed-world even though it uses network transport. Generated instructions and URLs do not constitute their execution.

| Tool (`commander_` prefix) | Title | readOnlyHint | destructiveHint | idempotentHint | openWorldHint | Implementation evidence |
| --- | --- | --- | --- | --- | --- | --- |
| list_skills | List skills | true | false | true | false | Reads the in-memory skill registry. |
| get_skill | Get skill | true | false | true | false | Reads local skill content; returned URLs are not fetched. |
| search | Search skills | true | false | true | false | Ranks the loaded registry locally. |
| suggest_for | Suggest skills | true | false | true | false | Delegates to local search; no model call. |
| invoke_skill | Get skill invocation guide | true | false | true | false | Returns instructions; does not execute a skill. |
| list_agents | List agents | true | false | true | false | Reads the in-memory agent registry. |
| get_agent | Get agent | true | false | true | false | Reads local agent content; returned URLs are not fetched. |
| invoke_agent | Get agent invocation guide | true | false | true | false | Returns a persona guide; does not execute an agent. |
| status | Commander status | true | false | true | false | Reads usage/cap from the bounded Commander database. |
| update | Check for updates | true | false | true | true | Fetches the public GitHub manifest; no installation. |
| init | Generate project setup | true | false | true | false | Returns templates/commands; no file writes or URL fetches. |
| notes_pin | Pin note | false | false | false | false | Inserts a new feedback note each time in the bounded memory store. |
| tasks_push | Task setup instructions | true | false | true | false | Current setup-only stub; no Linear call or local task write. |
| plan_integrate | Parse plan tasks | true | false | true | false | Parses text; does not save tasks or call Linear. |
| install_skill | Generate skill install command | true | false | true | false | Generates a command; never runs shell, clone, or copy. |
| compatibility_check | Check skill compatibility | true | false | true | false | Reads local sources/capability maps; no MCP calls. |
| session_diagnose | Diagnose session | true | false | true | false | Diagnostics read repository files/settings; no remediation execution. |
| compose_plan | Compose implementation plan | true | false | true | false | Builds markdown from arguments and static rules. |

Evidence: each handler under [`src/tools/`](../../apps/mcp-server-cloud/src/tools/index.ts) was read, including `skill-source.ts`, registry content loaders, usage SQL, and the diagnostics module. Notable corrections from the earlier proposed mapping: invocation/install tools only return guides/commands; init/tasks_push/plan_integrate do not contact external systems today. Only update fetches an external manifest during invocation. Notes are additive but repeated calls create new rows.

`tools/list` stays behind existing authentication and rate limiting, including quota/feedback gates and usage accounting. Its minimal envelope is `{jsonrpc:"2.0", id, result:{tools:[...]}}`; string and numeric IDs are retained. It does not add a full MCP session/initialization implementation or claim complete protocol conformance. The existing custom call and `tools/call` response envelopes remain unchanged.

**Client auto-approve behavior remains unverified until CC-653 (hosted MCP).** HTTP tests use in-memory Supabase/Redis doubles; no production backend, live client, deployment, or SDK behavior was tested.

## CC-654: deferred force-push confirmation

**DEFERRED.** Move the force-push gate to **PreToolUse** for `ask`; revisit after **CC-653**, the SDK-backed hosted MCP server, lands. Existing hooks are unchanged. The following evidence is retained from task `t_khugdh81vl`; this task reran the gate suites but did not repeat live documentation/client probes.

The prior verification checked [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks#pretooluse-decision-control) for `hookSpecificOutput.permissionDecision` with `ask` and `defer` on **PreToolUse**. `ask` requests user confirmation. `defer` pauses a resumable non-interactive call; it is not an interactive confirmation mechanism.

[PermissionRequest](https://code.claude.com/docs/en/hooks#permissionrequest-decision-control) instead accepts `hookSpecificOutput.decision.behavior` with `allow` or `deny`. It does not support `permissionDecision: ask/defer`. `continue: true` leaves normal permission handling in place; it does not grant permission. `continue: false` stops processing rather than requesting confirmation.

Repository evidence:

- [`hooks.json`](../../commander/cowork-plugin/hooks/hooks.json) registers `permission-gate.js` only under `PermissionRequest`.
- [`permission-gate.js`](../../commander/cowork-plugin/hooks/permission-gate.js) already returns the documented `decision: { behavior: 'deny', message }` payload for dangerous commands and autofix writes, with exit status 0. The brief's `{continue, stopReason}` denial premise is stale.
- The existing force-push regex hard-denies `git push --force ...` regardless of branch. Synthetic payload checks confirmed denial for `feature/cc-654`, `main`, and `master`; no git push was executed.
- [`platform-facts-2026-10.md`](../reference/platform-facts-2026-10.md) also distinguishes these contracts and records that Codex PreToolUse lacks `ask`. The Codex plugin is generated from this Claude plugin.

Replacing the field on the existing event would be invalid. A follow-up needs a Claude PreToolUse path, destination-aware protected-branch checks, handling that prevents the existing PermissionRequest gate from overriding confirmation, and a deliberate Codex policy. That event/cross-client migration was not inferred from the failed existing-event verification.

Kevin's manual Cowork Desktop follow-up after an approved implementation: verify a feature-branch force-push prompts with exactly `Force push detected — please confirm`, refusal prevents execution, and main/master destinations remain denied. Use a disposable repository/remote. Cowork Desktop behavior was not tested here.


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

## HQ handoff

The local commit is ready for HQ to push and update draft PR #128. The proposed replacement body is [`pr-128-body.md`](pr-128-body.md). No push, merge, deployment, PR edit, or tracker write was performed. No hook files changed. The existing dependency symlink remains untracked. The original checkout was not accessed for edits or commands; only its existing dependency symlink was reused as authorized.
