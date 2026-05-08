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

## Free-forever check

- [ ] No paywall or license-key gate added
- [ ] No telemetry-driven nag added
- [ ] No new dependency that gates behavior behind a paid service

## Related

<!-- Closes #123, related to #456, etc. -->
