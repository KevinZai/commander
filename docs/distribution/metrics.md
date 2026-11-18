# Adoption metrics

Decision (Kevin): the 90-day north-star metric is **weekly active users (WAU)**, with **activation (first finished result)** as the leading signal. WAU is the headline number in every review. Installs and revenue are secondary: they are inputs and consequences, reported below the headline.

Current state: telemetry is opt-in and shows near zero (`docs/stats.json`, refreshed daily by `.github/workflows/refresh-stats.yml`, reported 14 hook fires and 0 sessions at the last refresh). Every number below is therefore a floor from opted-in users only. Do not publish any of them as usage claims until the method and the sample size are stated next to the number.

## The metrics

| Rank | Metric | Definition | Source | Status |
|---|---|---|---|---|
| 1 (north star) | Weekly active users | Distinct anonymous ids with at least one `plugin_session_started` or `cli_session_started` event in the last 7 days | Opt-in telemetry (PostHog; the query style is in `scripts/refresh-stats.mjs`, which today counts 30-day distinct sessions, not users) | Needs a new query: distinct anonymous id over 7 days. The anonymous id is `~/.commander/anon-id`. |
| 2 (leading signal) | Activation | An anonymous id's first finished result: a flagship workflow (`/ccc-start`, `/ccc-xray`, `/ccc-plan`, `/ccc-build`, `/ccc-review`, `/ccc-ship`) that reaches its end state, within 7 days of first seen | Opt-in telemetry | Gap: there is no "result delivered" event today. Existing events are `skill_invoked`, `cli_skill_invoked`, `agent_dispatched`, `hook_fired`, `mcp_tool_called` and session starts. Proposal: emit one event when a flagship skill writes its artifact (start plan file, scorecard, plan file, verified scaffold, review report, ship scorecard), and define activation as the first such event per id. Until then use a proxy: first flagship `skill_invoked` followed by a Stop event in the same session. Label it "proxy". |
| 3 | Activation rate | Activated ids divided by new ids in the same week | Derived | Same gap |
| 4 | Retention (week 4) | Share of an install cohort that is a WAU four weeks later | Derived | Needs 4 weeks of data |
| 5 (secondary) | Weekly installs | New installs of the plugin per week | See below; no single source | Partial |
| 6 (secondary) | Distribution reach | GitHub stars and forks, release downloads, directory listing views | GitHub, directory portal | Available |
| 7 (secondary) | Revenue-path actions | Consulting enquiries, affiliate clicks, sponsors, community joins | See `revenue.md` | Defined, not yet instrumented |

### Installs: where the number comes from

There is no authoritative install count for a plugin installed from a GitHub marketplace. Use three imperfect sources and report them separately, never summed:

1. **Telemetry**: first-seen anonymous ids per week. Counts only opted-in users, so it understates; it is the only source that links an install to activity.
2. **GitHub**: repository traffic (clones, unique visitors) and stars on `KevinZai/commander`; the mirror repo `KevinZai/cc-commander-plugin` once it exists. Clones include CI and update checks.
3. **Directory**: after listing, the plugin's **Usage** tab in the developer portal shows installs, versions, runs and error rates (documented in Anthropic's "Track published plugin usage" page). This becomes the best install source once live.

Update-check traffic (the session-start GET of the public `plugin.json`) is not a metric: it is anonymous and cannot be separated from automation.

## Instrumentation todo (small, before launch)

- Add the 7-day distinct-id query for WAU next to the existing 30-day counts in `scripts/refresh-stats.mjs`, and add `weekly_active_users` and `activated_users` fields to `docs/stats.json`.
- Add the flagship "result delivered" event, or agree the proxy. Telemetry stays opt-in and anonymous; update `PRIVACY.html` and the README "Data & network" table if the event list changes.
- Consider a one-time, opt-in prompt at the end of `/ccc-start` that explains telemetry in a sentence. Without more opted-in users, WAU will not be measurable. This is a product decision for Kevin.

## Weekly review

Fifteen minutes, every Monday, one page. Same order every week:

1. **WAU** this week, last week, 4-week trend, and the number of opted-in ids behind it. If the sample is under 30, say "not statistically meaningful" and read it as direction only.
2. **Activation**: activated ids and rate for the new-id cohort; the first-day drop-off point (which flagship, if any, they ran).
3. **Installs** by source (telemetry, GitHub, directory), side by side.
4. **Reach**: stars, forks, release downloads, directory views, and which launch post or channel moved them (use the UTM-tagged links from `launch-plan.md`).
5. **Revenue path**: enquiries, affiliate clicks, sponsors, community joins (`revenue.md`).
6. **Decision**: one change for next week, aimed at WAU or activation. Content and launch work is judged by what it did to those two.

Record the page in `docs/reports/` or the Linear project; do not commit raw telemetry.

## Targets

No numeric target is set here. With telemetry near zero there is no baseline, and a made-up target would be a claim we cannot back. Set the 90-day WAU target after the first two weekly reviews, from the measured baseline, and record it in this file with the date.
