# CC-187 claims check

Checked against repo at d0bcaf56 on 2026-10-22. "Source" is a repo path; nothing external was fetched.

| Claim (ticket) | Finding | Source | Action |
|---|---|---|---|
| context-mode 98%, SQLite + FTS5 | Mechanism confirmed. 98% is one grep benchmark (docs say 315KB to 3KB in one place, 5.4KB in another, i.e. 98.3 to 99%). | `skills/context-mode/SKILL.md`, `mintlify-docs/features/token-optimization.mdx` | Soften to "in one measured grep"; reconcile 3KB vs 5.4KB |
| RTK 99.5% | Quoted in docs only; no measurement in repo. | `CHEATSHEET.md:1140`, mintlify doc | Unverified; use own `rtk gain` data or "up to" |
| Tiered loading, 30 essential vs 454 | Stale. Essential has 38 skills (~37 in its description); full is 467 (`ecosystem_skills`). 454/455 appear in older docs. | `skills/_tiers.json`, `commander/contract.json:9`, `BIBLE.md` | Corrected to 38 vs 467 |
| ~10k tokens saved | Estimate in BIBLE, not measured. | `BIBLE.md` Tiered Skill Loading | Label as estimate |
| ClaudeSwap, 2 MAX accounts | Only a status-line integration exists here; the tool itself is not in the repo. Account-rotation vs usage terms is unchecked. | `commander/status-line.js:269`, `CHANGELOG.md:1553` | Human decision before publish |
| Prompt caching 90% discount, 1hr TTL | Consistent with Anthropic's public pricing as I know it, but not re-fetched. Env var `ENABLE_PROMPT_CACHING_1H` appears only in an archived hook. | mintlify doc, `commander/cowork-plugin/hooks/_archive/session-start.js:7` | Re-check pricing page at publish |
| "5 layers, zero conflict" | Repo says "complementary, not competing"; no conflict testing found. Repo docs also list Headroom as a layer where the ticket uses tiered skills. | `skills/context-mode/SKILL.md`, mintlify doc | Drop "zero conflict" |
| BIBLE.md "Token Optimization" section | Exists but is a different list (ENABLE_TOOL_SEARCH, caching, model routing, "save 30-60%"). It does not contain the five layers; those are in the mintlify doc and the SKILL.md. | `BIBLE.md:3113` | Note for future slices |

## Open decisions for a human
1. Keep ClaudeSwap as Layer 4? A: keep, after a terms check. B: swap in Headroom (as the repo docs do). **Recommend B** until the terms question is settled.
2. Publish numbers as measured only? **Recommend yes**: run `rtk gain` and `ctx_stats` once and cite them.
