# Plugin Orchestration Reference

## Known Packages

### gstack (Garry Tan) — 54.6K stars
**Strength**: Decision gates + real-world QA
- `/office-hours` — Requirements interview (clarify phase)
- `/plan-ceo-review` — Product viability gate (decide phase)
- `/plan-eng-review` — Architecture scalability gate (decide phase)
- `/qa` — Real browser QA with Playwright (test phase)
- `/review` — Code review (review phase)
- `/ship` — Ship checklist (ship phase)

### Compound Engineering (Every Inc) — 11.5K stars
**Strength**: Knowledge compounding + deep multi-agent review
- `/ce:brainstorm` — Explore requirements (clarify phase)
- `/ce:plan` — Research-driven planning, scans git history (plan phase)
- `/ce:work` — Execute with task tracking (execute phase)
- `/ce:review` — 6+ independent reviewer ensemble (review phase)
- `/ce:compound` — Extract lessons to docs/solutions/ (learn phase)

### Superpowers (Jesse Vincent) — 121K stars
**Strength**: Structured development workflow
- `/plan` — Structured implementation plan (plan phase)
- `/tdd` — Test-driven development (execute phase)
- `/code-review` — Code quality review (review phase)
- `/verify` — Verification loop (test phase)

### Everything Claude Code (ECC) — 100K stars
**Strength**: Lifecycle hooks + developer profiles
- 19 lifecycle hooks across 5 events
- Developer profiles for different work modes
- Agent definitions for specialized tasks

## Phase Priority

When multiple packages provide the same phase, CC Commander uses this priority:
1. Compound Engineering (deepest integration)
2. gstack (strongest for decisions + QA)
3. Superpowers (broadest workflow coverage)
4. CC Commander fallback (always available)
