# CC-363 slice 1: WAU + 4-week retention (read-only audit, draft queries)

Status: draft. Nothing here touches PostHog, sends data, or publishes a link. Fixtures are synthetic; there is no baseline (launch data cannot be pre-populated).

## Event contract audit (source of truth: `apps/mcp-server-cloud/src/routes/events.ts`)

| Item | Finding |
|---|---|
| Ingest whitelist | `hook_fired`, `plugin_session_started`, `cli_command_executed`, `cli_skill_invoked`, `cli_agent_dispatched`, `session_ended`, `skill_invoked`, `agent_dispatched` |
| Identity | `distinct_id` = client anon device UUID (`getOrCreateAnonId()` in `commander/cowork-plugin/lib/telemetry.mjs`). WAU counts devices, not people. |
| Scrub | Keys matching `name`, `path`, `session_id`, `org`, `ip`, ... are dropped unless allowlisted. `skill_id` is allowlisted; `skill_name` is not, so it is dropped server-side. `session_id` is also dropped. |
| `skill_invoked` | Whitelisted. No emitter found in the repo (plugin or CLI). Only the dashboards/stats scripts read it. |
| `cli_skill_invoked` | Emitted by `commander/skill-browser.js:43` with `skill_id`, `outcome`. |
| Install event | **None exists.** No `install`, `plugin_installed` or equivalent in the whitelist or any emitter. |
| `plugin_session_started` | Whitelisted, no emitter in the repo. |
| `session_ended` | Emitted by `commander/engine.js:951`. |

### Gaps that block the AC as written
1. **No install event**, so "users who installed, came back week 1-4" cannot be computed. Draft uses first-seen-week of any whitelisted event per `distinct_id` as the cohort anchor (proxy, labelled as such).
2. **`skill_invoked` has no emitter.** The WAU draft counts `skill_invoked OR cli_skill_invoked`, matching `scripts/refresh-stats.mjs`. If the plugin side never emits, WAU is CLI-only.
3. `scripts/refresh-stats.mjs:42` queries `cli_session_started` and `properties.session_id`; the first is not whitelisted and the second is scrubbed, so that sessions stat is likely always 0. Out of scope; flagged.
4. Public share link (AC) conflicts with this slice's no-public-sharing boundary; deferred to a decision.

## Files
- `queries.hogql`: draft WAU and retention queries (HogQL, not run against PostHog).
- `fixtures/events.json`: synthetic events, clearly fake IDs.
- `check-fixtures.mjs`: offline reference implementation of the same logic over the fixtures. Run `node docs/analytics/cc-363/check-fixtures.mjs`.

## Proposed next slices
- S2: add an `install_completed`/first-run event to the whitelist + emitter (code change, needs approval).
- S3: create the "CCC Weekly Health" dashboard in PostHog (needs approval; no public share without Kevin's OK).
