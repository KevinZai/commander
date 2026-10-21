# CC-654 slice 1: PermissionRequest schema audit (read-only)

Date: 2026-10-21. Scope: record the supported hook contract and the current gate output. No hook edits, no force-push test.

## Findings

| Question | Answer | Evidence |
|---|---|---|
| Does PermissionRequest accept `permissionDecision: "defer"`? | **No.** PermissionRequest takes `hookSpecificOutput.decision: {behavior, updatedInput?}` (allow/deny). `permissionDecision` allow/deny/ask/defer belongs to **PreToolUse**. | `docs/reference/platform-facts-2026-10.md` lines 86-87 |
| Is the old `{continue, stopReason}` shape a block? | **No.** It never blocked; deny is delivered as `decision.behavior: "deny"` on exit 0. | `commander/cowork-plugin/hooks/permission-gate.js:27-32,40-47` |
| Does `permission-gate.js` already use the documented schema? | **Yes** for denials (`denyDecision`). Approvals emit `{continue:true}`, which is a harmless no-op pass-through. | `permission-gate.js:40-47,113-195` |
| Current force-push behaviour | `git push --force` is in `DANGEROUS_PATTERNS` and is denied unconditionally (including feature branches). | `permission-gate.js:62` |
| Is the hook wired to Desktop? | Registered under `PermissionRequest` in `hooks.json`; the gate header describes it as Codex Desktop native approval UI. | `commander/cowork-plugin/hooks/hooks.json:313-320` |

## Conclusion

Patch 2 step 3 ("apply `defer` in `permission-gate.js`") **does not verify** and must not be applied: `defer` on PermissionRequest is not a supported contract, so the hook would silently fail. Retaining the hard deny for force-push is the shipped, correct decision.

## Proposed follow-up (separate reviewed proposal, not done here)

A confirm-on-feature-branch-force-push flow needs a new **PreToolUse** Bash hook returning `permissionDecision: "ask"` (or `defer`), matching `git push --force`/`--force-with-lease` with no `main`/`master` ref. Validate with safe fixture payloads piped to the hook, never a real force-push. Gate on CC-653 per the 2026-10-18 note. Also note the current pattern `git\s+push\s+--force` only matches `--force` directly after `push`; `git push origin br --force`, `-f` and `--force-with-lease` slip past it (observed from the regex, not run).
