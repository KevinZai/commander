## Summary

Resolve #128 by shipping annotations for all 18 tools in the existing HTTP
catalog, preserving the earlier implementation and its corrected Supabase hints.
`GET /v1` and JSON-RPC `tools/list` share one catalog builder. Auth, rate limits,
feedback gating, accounting, and existing call envelopes remain intact.

The ordinary MCP test command now exits normally: importing the app no longer
opens a listening socket. Direct startup is covered by a loopback HTTP test.
MCP typecheck, tests, and build now run on pull requests.

## Hook versus annotation decision

Choose annotations for this release. They describe handler effects and do not
grant permission. Retain the existing force-push denial. Interactive confirmation
belongs in a separate PreToolUse policy change: PermissionRequest cannot emit
`ask`, and protected destinations plus the generated Codex policy need dedicated
validation. A future hook change does not require an MCP SDK migration.
See [decision 128](../decisions/128-mcp-annotations.md).

## Version and scope

Bump 8.0.0 to 8.1.0 for additive discovery functionality, synchronize manifests
and lockfiles, rebuild the Codex mirror, and update the changelog. No skill,
agent, or hook count changes; no new dependency or Starter feature gating.
Full MCP session support and interactive client auto-approval remain unverified.

## Validation

- Full suite: `npm test -- --test-concurrency=1` — **2,673 passed, 0 failed, 1 skipped** (2,674 total). Serial execution isolates the existing version-bump test's temporary manifest mutation.
- Release suite: `npm run test:ci` — **894 passed, 0 failed**, plus **27/27** CLI self-tests. Counts are the three Node runner summaries (830 + 56 + 8).
- MCP cloud: `npm test` — **77 passed, 0 failed**, with ordinary exit; typecheck and production build pass.
- Focused permission gate + hook tests: **81 passed, 0 failed**. Existing denials are unchanged.
- Smoke suite: **6 passed, 0 failed**.
- Frontmatter, product contract, registry, version parity (13 manifest fields), compatibility (17 checks), generated Codex build, and whitespace checks pass. Runtime version comes from the cloud package manifest and is independently checked by HTTP health coverage.
- ESLint: **0 errors, 186 existing warnings**, within the CI ceiling of 250.
- Codex model probe: all four current models pass; retiring `gpt-5.5` remains an existing warn-only failure on ChatGPT auth.
- Independent review found and resolved a stale cloud runtime version; follow-up review found no remaining behavioral defect.
- No live MCP client or production deployment verification is claimed by these local checks.
