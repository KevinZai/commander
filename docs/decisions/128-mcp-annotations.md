# #128: ship MCP annotations; retain the force-push gate

Date: 2026-10-18. Release: 8.1.0.

## Decision

Ship the annotation approach for the existing HTTP catalog. Do not change the
force-push permission policy as part of this release. The two mechanisms solve
different problems: annotations describe MCP handler effects to clients; a
PreToolUse hook controls execution of local tools.

All 18 catalog entries explicitly declare a title and the four MCP hints.
`GET /v1` and authenticated JSON-RPC `tools/list` on `POST /v1/call` share one
catalog builder. Existing tool names, input schemas, and call envelopes remain
unchanged. Discovery through POST retains burst and monthly limits, the feedback
gate, and usage accounting.

The [MCP annotation contract](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations)
defines hints, not authorization guarantees. Generated commands are not executed
by these handlers. `notes_pin` is additive and non-idempotent; `status`, `update`,
and `notes_pin` are conservatively marked open-world for their remote calls.
The complete handler mapping is in the [original report](../reports/anthropic-patches-2-3.md).

## Why no PreToolUse migration here

[Claude's hook contract](https://code.claude.com/docs/en/hooks#pretooluse-decision-control)
supports `permissionDecision: "ask"` at PreToolUse. PermissionRequest uses
`decision.behavior` with allow or deny. Changing the existing hook's output to
`ask` under PermissionRequest would be invalid. A PreToolUse implementation also
needs protected-destination resolution, coordination with the current denial,
and explicit behavior for the generated Codex plugin. An annotation cannot
replace any of those safeguards.

The existing `permission-gate.js` denial is retained. CC-654's interactive
force-push confirmation is excluded from this release; it must be evaluated as a
separate cross-client policy change. It has no technical dependency on an MCP
SDK migration. This supersedes the earlier report's instruction to wait for
CC-653 before considering the hook. No claim of interactive client approval or
complete MCP session/protocol support is made.

## Release verification

Importing the HTTP app no longer starts a server; direct execution still serves
HTTP. This fixes the hanging test command without `--test-force-exit`. Startup
regressions exercise import termination and actual loopback HTTP health. The
catalog regressions cover schema hints, authentication, quotas, burst limits,
feedback gating, accounting, invalid requests, and legacy call envelopes.
MCP typecheck, tests, and build now run in PR CI before merge.
