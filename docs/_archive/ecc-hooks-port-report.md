# ECC Hooks Port Report

**Date:** 2026-05-08
**Source:** `vendor/everything-claude-code/scripts/hooks/`
**Target:** `commander/cowork-plugin/hooks/`
**Mission:** Audit ECC's 14-hook governance ecosystem (deferred from v4.0.0). Port additive hooks; defer/skip risky ones.

## Audit Summary

- **ECC hook scripts reviewed:** 41 (`scripts/hooks/*.js`) plus 18 home-installed (`~/.claude/hooks/`)
- **Already covered by CCC:** 9 lifecycle hooks × 19 handlers (now 24 after port)
- **Ported:** 5
- **Deferred (🟡 adapt later):** 6
- **Skipped (🔴 conflict / not portable):** 12 of the most relevant; many remaining ECC hooks duplicate existing CCC functionality.

## Categorization

### 🟢 Ported (5)

| Hook | Lifecycle | Purpose | Risk |
|------|-----------|---------|------|
| `config-protection.js` | PreToolUse `Edit\|Write\|MultiEdit` | Block edits to ESLint/Prettier/Biome/Ruff/Stylelint/markdownlint config files | Blocks (exit-2 equivalent via `continue:false`). Static allowlist, idempotent. |
| `console-log-warn.js` | PostToolUse `Edit\|Write\|MultiEdit` | Warn (with line numbers) when JS/TS edits leave `console.log` behind. Skips test/config/scripts. | Pure stderr, never blocks. |
| `doc-file-warning.js` | PreToolUse `Write` | Warn when writing `NOTES.md`/`TODO.md`/`SCRATCH.md`/etc. outside structured dirs (encourages `docs/`, `tasks/`, `.claude/`). | Pure stderr, never blocks. |
| `git-push-reminder.js` | PreToolUse `Bash` | Reminder before `git push`; loud warning on force-push to `main`/`master`. | Pure stderr, never blocks. |
| `pr-link-notify.js` | PostToolUse `Bash` | After `gh pr create`, surface PR URL + review command. | Pure stderr, never blocks. |

All 5 converted CommonJS → ESM to match CCC's existing convention. Each follows the CCC pattern: read JSON from stdin, emit `{"continue": true/false, "stopReason": "..."}` on stdout, write warnings to stderr, fail open on any error. Smoke-tested with sample inputs: blocking + warning + pass-through paths all behave correctly.

### 🟡 Deferred (6 — ports require CCC-specific adaptation)

| ECC Hook | Why deferred |
|----------|---------------|
| `pre-bash-tmux-reminder.js` | Useful but Mac-specific UX. Worth a config flag (`CCC_TMUX_NUDGE`) before porting. |
| `pre-bash-dev-server-block.js` | Hard-blocks `npm run dev` outside tmux. Some users run dev servers in foreground intentionally. Needs opt-in env var. |
| `post-edit-accumulator.js` + `stop-format-typecheck.js` | Two-part pipeline: accumulate edited files, batch-format at Stop. Solid pattern but CCC already has `session-end.js`/`session-save.js`; consolidating requires careful merge. |
| `gateguard-fact-force.js` | Strong "investigate before edit" enforcement, but 15KB and stateful. High signal but high blast radius — needs dialectic review before shipping. |
| `mcp-health-check.js` | 18.7KB, depends on MCP introspection patterns CCC doesn't currently expose. Useful once hosted MCP ships. |
| `suggest-compact.js` | Counter-based compact nudge. Overlaps with CCC's `context-warning.js` and `context-guard.js`; needs reconciliation. |

### 🔴 Skipped (conflict / not portable)

| ECC Hook | Reason |
|----------|--------|
| `governance-capture.js` | Requires `ECC_GOVERNANCE_CAPTURE=1` and ECC's governance event store. Not portable without ECC infra. |
| `observe-runner.js` | Continuous-learning observer; depends on ECC's `learned-skills` directory. CCC has its own `knowledge-capture.js`. |
| `pre-bash-commit-quality.js` | 13KB; overlaps with CCC's secret guard + careful-guard logic. |
| `block-no-verify.js` | ECC user-installed hook (12.5KB). CCC's PreToolUse layer already blocks `--no-verify` via secret/guard plumbing. |
| `pre-bash-dispatcher.js` / `post-bash-dispatcher.js` | Thin shells around ECC's plugin-bootstrap. Not relevant standalone. |
| `session-start.js` (22KB) / `session-start-bootstrap.js` | Replaced by CCC's `orchestrator/session-start-orchestrator.js`. |
| `desktop-notify.js` | Uses macOS-only `osascript`; CCC has cross-platform `fleet-notify.js`. |
| `auto-tmux-dev.js` | Auto-launches tmux sessions; opinionated and platform-specific. |
| `insaits-security-monitor.py` / `insaits-security-wrapper.js` | Python dependency + ECC-specific telemetry. |
| `evaluate-session.js` | Calls ECC dashboard endpoint we don't ship. |
| `quality-gate.js` (4.8KB) | Overlaps with CCC's `knowledge-capture.js` + future `verification` skill. |
| `design-quality-check.js` | UI-edit heuristic; would need design-system context CCC doesn't have. |

## Wiring

`hooks.json` updated:
- PreToolUse: +3 matchers (`Edit|Write|MultiEdit` for config-protection, `Write` for doc-file-warning, `Bash` for git-push-reminder)
- PostToolUse: +2 matchers (`Edit|Write|MultiEdit` for console-log-warn, `Bash` for pr-link-notify)

`commander/contract.json` `hook_handlers` bumped 19 → 24.

## Wins

- Adds linter-config tampering protection — directly matches the "fix code, not config" rule already in CLAUDE.md.
- Catches stray `console.log` immediately after edit, not just at session end.
- Surfaces PR URL automatically — replaces manual hunting in command output.
- Force-push to main now triggers a loud warning (still doesn't block — global rule says "never `git push --force` on main").
- Discourages `NOTES.md`/`SCRATCH.md` clutter in repo roots.

## Issues

- ESM `MODULE_TYPELESS_PACKAGE_JSON` warning when running hooks directly (matches existing CCC hooks; benign).
- No conflicts with existing CCC hooks. No new npm dependencies. No service requirements.
