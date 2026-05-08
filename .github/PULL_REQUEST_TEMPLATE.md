<!-- PR title format: <type>(<scope>): <description>  e.g. feat(plugin): add ccc-foo skill -->

## Summary

<!-- 1-3 bullets. What changed and why. Skip the "what" if the diff makes it obvious. -->

-
-

## Type of change

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — internal change, no behavior change
- [ ] docs — documentation only
- [ ] chore — tooling, deps, CI
- [ ] perf — performance improvement
- [ ] test — test-only change

## Counts impact

If this PR adds/removes a skill, agent, hook handler, or vendor:

- [ ] `commander/contract.json` updated
- [ ] `npm run docs:sync` run (or counts updated manually in README, BIBLE, CHEATSHEET, SKILLS-INDEX, mintlify-docs/, site/, scene-*.jsx)
- [ ] `node --test commander/tests/contract.test.js` passes

If unchanged: ✅ no count impact.

## Test plan

<!-- How does the reviewer verify this? Concrete steps. -->

- [ ]
- [ ]

```bash
# commands the reviewer should run
npm test
```

## Screenshots / output

<!-- If UI/UX or terminal output changed, drop a screenshot or paste. Otherwise: N/A -->

## Pricing-model check

CC Commander has an MIT-licensed Starter (plugin core, all skills/agents/hooks free) and a paid Pro tier (hosted services + premium curation). PRs must respect both:

- [ ] No paywall on existing Starter features (skills/agents/hooks shipped today stay free in Starter)
- [ ] License-key gating, if any, is for **NEW Pro features only** — not existing plugin core
- [ ] No telemetry-driven nags
- [ ] No new dependency that gates basic plugin behavior behind a paid third-party service

## Related

<!-- Closes #123, related to #456, etc. -->
