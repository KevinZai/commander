# CC-179 Nightwatch slice 1: PermissionRequest hook contract audit

Read-only audit. No relay, no network sends, no code changes. Date: 2026-10-20.
Sources: `commander/cowork-plugin/hooks/permission-gate.js`, `hooks/hooks.json`, `hooks/mission-control-feed.js`,
`skills/ccc-nightwatch/references/relay-design.md`, `docs/reference/platform-facts-2026-10.md` (hook output table, Codex §3.3),
`commander/tests/permission-gate.test.js`. Behavior claims below were probed by piping payloads into the hook with a temp `HOME`.

## Contract the relay must target

| Item | Platform fact | Source |
|---|---|---|
| Decision output | `hookSpecificOutput: {hookEventName: "PermissionRequest", decision: {behavior, updatedInput?}}` | platform-facts hook output table; Codex §3.3 |
| No decision | Any output without `decision` (e.g. `{continue:true}`) leaves the native prompt in place | observed in permission-gate.js; not an allow |
| Exit codes | Always exit 0; stdout on exit 1 is discarded (permission-gate.js header) | hook source |
| Timeout | Command hooks default 600s; gate sets 5s | hooks.json:313-320 |
| Matching failure | Since CC 2.1.287 PreToolUse/PermissionRequest hooks block when matching fails | platform-facts |
| Codex | `PermissionRequest` identical event; `decision {behavior}` supported; no `args`/`onFailure`/`if` | hook-event-map.json, Codex §3.3 |

## Findings

1. **Gate is registered for Claude but documented as Codex-only.** `hooks.json` registers `permission-gate.js` on `PermissionRequest` in the Claude plugin; the file header and `hooks/README.md:46` say "Codex Desktop only". Pick one truth before Nightwatch builds on it. Severity: medium (doc/contract drift).
2. **`context.skill` / `context.phase` are not in the documented payload.** The autofix gate (`isAutofixWrite`) depends on `input.context`; platform-facts lists only `session_id, transcript_path, cwd, hook_event_name, model, permission_mode, turn_id` plus event fields. Probe: a Write with `permission_suggestions` and no `context` returns `{continue:true}`; the deny only fires when the test supplies `context.skill`. Likely dead outside the tests. Severity: medium. Confidence: moderate (payload shape for Claude not verified against a live session).
3. **Approvals are not decisions.** The gate "approves" with `{continue:true}`, which carries no `decision`, so the native prompt still appears. Yet it logs `decision:"approved"` to `permission-gate.jsonl` for every non-read-only call. The log overstates approvals; the Nightwatch audit trail (relay-design.md "Limitations") would inherit that. Severity: medium.
4. **Dangerous-command list gaps.** Probe: `git push -f origin main` and `git push origin +main` pass (only `--force` is matched); `rm -r -f` and `rm -fr` are caught. Severity: low-medium, relevant because relay-design.md puts force-push to main in the 🔴 class.
5. **Timeout mismatch for a relay.** Gate timeout is 5s; a phone round trip is 2-5s plus human time. Nightwatch needs its own hook entry with a longer timeout and an explicit deny-on-timeout answer. Don't reuse the 5s entry. Severity: design requirement.
6. **Fail-open on malformed payload** (`continue:true`) contradicts relay-design.md ("a broken classifier fails closed"). Acceptable for the current gate; the relay must define its own failure mode explicitly. Note the Claude matching-failure block (2.1.287) is separate from in-script parse errors.
7. **Stray telemetry call.** `track('hook_fired', ...)` runs only in the malformed-payload catch branch (indented inside it), so hook-fired counts are wrong. Severity: low.
8. **Multi-hook ordering.** `mission-control-feed.js` (async) sits beside the gate on the same event; async hooks cannot alter decisions. Fine, but the relay must be sync. Precedence between multiple sync deciders is unverified here.
9. **`nightwatch-relay.js` does not exist.** `ls hooks/` has no relay; SKILL.md step 1 already probes for it. Consistent, no action.

## Recommended next slices (not done here)

1. Fix drift (1) and log semantics (3); add `git push -f`/`+ref` patterns (4); remove or rewire `context`-based autofix (2). Small PR.
2. Capture a real Claude `PermissionRequest` payload in a sandbox session to settle (2).
3. Relay design decision: transport (Telegram vs Discord), timeout, fail mode, scrubbing. Needs Kevin's approval; no sends until then.
