# CC-654 / CC-655: Anthropic patches 2 and 3 verification

Date: 2026-10-18. Fleet task: `t_khugdh81vl`.
Base: `e75f99a456a818ffc7ea57d7bfc1be4f63a3b0a5`.
Branch: `fix/anthropic-patches-2-3`.

## Outcome

**Needs HQ scope decision. Neither runtime patch was applied.** The brief says to skip a patch when its prerequisite verification fails. The current gate uses an event that cannot emit the requested confirmation decision, and the cloud app has no installed MCP SDK or `ToolSchema` to extend. This report is the requested fallback deliverable; it does not claim the requested runtime behavior is implemented.

## CC-654: event-specific hook contract

Current [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks#pretooluse-decision-control) supports `hookSpecificOutput.permissionDecision` with `ask` and `defer` on **PreToolUse**. `ask` requests user confirmation. `defer` pauses a resumable non-interactive call; it is not an interactive confirmation mechanism.

[PermissionRequest](https://code.claude.com/docs/en/hooks#permissionrequest-decision-control) instead accepts `hookSpecificOutput.decision.behavior` with `allow` or `deny`. It does not support `permissionDecision: ask/defer`. `continue: true` leaves normal permission handling in place; it does not grant permission. `continue: false` stops processing rather than requesting confirmation.

Repository evidence:

- [`hooks.json`](../../commander/cowork-plugin/hooks/hooks.json) registers `permission-gate.js` only under `PermissionRequest`.
- [`permission-gate.js`](../../commander/cowork-plugin/hooks/permission-gate.js) already returns the documented `decision: { behavior: 'deny', message }` payload for dangerous commands and autofix writes, with exit status 0. The brief's `{continue, stopReason}` denial premise is stale.
- The existing force-push regex hard-denies `git push --force ...` regardless of branch. Synthetic payload checks confirmed denial for `feature/cc-654`, `main`, and `master`; no git push was executed.
- [`platform-facts-2026-10.md`](../reference/platform-facts-2026-10.md) also distinguishes these contracts and records that Codex PreToolUse lacks `ask`. The Codex plugin is generated from this Claude plugin.

Replacing the field on the existing event would be invalid. A follow-up needs a Claude PreToolUse path, destination-aware protected-branch checks, handling that prevents the existing PermissionRequest gate from overriding confirmation, and a deliberate Codex policy. That event/cross-client migration was not inferred from the failed existing-event verification.

Kevin's manual Cowork Desktop follow-up after an approved implementation: verify a feature-branch force-push prompts with exactly `Force push detected — please confirm`, refusal prevents execution, and main/master destinations remain denied. Use a disposable repository/remote. Cowork Desktop behavior was not tested here.

## CC-655: SDK prerequisite absent

The current [MCP 2026-07-28 schema](https://modelcontextprotocol.io/specification/2026-07-28/schema#toolannotations) defines `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`. These are hints, not permission enforcement; `openWorldHint` defaults to true.

The app's [`package.json`](../../apps/mcp-server-cloud/package.json) and [`package-lock.json`](../../apps/mcp-server-cloud/package-lock.json) contain no `@modelcontextprotocol/sdk` dependency. `createRequire(appPackagePath).resolve(...)` failed with `MODULE_NOT_FOUND` for both `@modelcontextprotocol/sdk` and `@modelcontextprotocol/sdk/types.js`, from both the prepared worktree and the main checkout's dependency tree. No SDK version/support can therefore be verified.

[`src/tools/index.ts`](../../apps/mcp-server-cloud/src/tools/index.ts) declares `TOOL_SCHEMAS: Record<ToolName, object>`, with no `ToolSchema`. [`src/index.ts`](../../apps/mcp-server-cloud/src/index.ts) spreads that catalog into a custom `GET /v1` response. Installing an SDK or redefining the target as that custom catalog would change the prerequisite in the brief, so neither was done.

Requested mapping retained for the follow-up (actual current catalog names):

| Annotation | Tools |
| --- | --- |
| `readOnlyHint: true` | `commander_list_skills`, `commander_search`, `commander_get_skill`, `commander_get_agent`, `commander_list_agents`, `commander_status`, `commander_update` |
| `destructiveHint: false` | `commander_invoke_skill`, `commander_invoke_agent`, `commander_install_skill` |
| Leave open-world | `commander_init`, `commander_tasks_push`, `commander_plan_integrate` |

Client-behavior testing remains blocked on **CC-653 (hosted MCP)**. No live client verification or deployment was attempted.

## Validation

Existing suites were run unchanged; no new behavior tests were added for patches that were not applied.

- `node --test commander/tests/permission-gate.test.js tests/hooks.test.js`: **81 passed, 0 failed**. Gate subprocesses used an isolated test HOME and disabled Commander telemetry.
- `npm run typecheck` in `apps/mcp-server-cloud`: **passed**.
- Unmodified app `npm test`: did not terminate after the HTTP assertions, because importing `src/index.ts` unconditionally starts an HTTP listener (even with the test's port 0). The test process was stopped; this run is not claimed as a completed pass.
- Same six app test files with Node's `--test-force-exit`: **64 passed, 0 failed**, exit 0. Exact command:

  ```sh
  node --import tsx --test --test-force-exit tests/integration.test.ts tests/http.test.ts tests/install-skill.test.ts tests/compatibility-check.test.ts tests/session-diagnose.test.ts tests/compose-plan.test.ts
  ```

- Synthetic gate probes: feature/main/master each returned exit 0 and a PermissionRequest deny decision.
- No package installs or downloads. App dependencies were reused through an untracked `node_modules` symlink to the main checkout. Test logs are local under `.cache/anthropic-patches/`.
- No plugin sources changed, so no generated Codex build was needed. The report is the only staged change. The original checkout had no tracked changes before or after validation; its pre-existing untracked hook was left alone.

## HQ handoff

Recommend revising CC-654 to explicitly cover a Claude PreToolUse confirmation path and Codex compatibility, and applying CC-655 against CC-653's verified SDK implementation. If annotations should instead target today's custom HTTP catalog, specify that target explicitly.

**Question:** Should the next attempt implement that event migration and wait for CC-653's SDK-backed server, or target the current custom HTTP catalog for annotations?

HQ owns pushing this local branch and opening a **draft PR**. Nothing was pushed, merged, deployed, or restarted.
