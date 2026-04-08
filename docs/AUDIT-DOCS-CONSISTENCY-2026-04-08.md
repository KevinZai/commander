16899bb fix: doc consistency audit — stale versions/counts corrected (25 minutes ago) <Kevin>
docs/AUDIT-DOCS-CONSISTENCY-2026-04-08.md | 137 ++++++++++++++++++++++++++++++
 1 file changed, 137 insertions(+)

docs/AUDIT-DOCS-CONSISTENCY-2026-04-08.md
  @@ -0,0 +1,137 @@
  +# Documentation Consistency Audit — 2026-04-08
  +
  +## Scope
  +Scanned all requested files for version/count consistency, badge values, naming consistency, binary naming, and link integrity.
  +
  +## Canonical Targets Applied
  +- Version: 2.3.0
  +- Skills CLI: 453
  +- Skills disk: 458
  +- Skills marketing: 450+
  +- Commands: 83 (or 80+ marketing)
  +- Hooks (JS): 25
  +- Vendors: 19
  +- Themes: 10
  +- Prompts: 37 (or 36+ marketing)
  +- Domains: 11
  +- Tests: 187
  +- Audit score: 91/100
  +
  +## Findings (All Fixed)
  +- BIBLE.md:24 — `NEW in v1.5` → `NEW in v2.3.0`
  +- BIBLE.md:25 — `v2.1` → `v2.3.0`
  +- BIBLE.md:36 — `15 kit-native hooks` → `25 kit-native hooks`
  +- BIBLE.md:1082 — `451` (full skills) → `458`
  +- BIBLE.md:1087 — `All 451 skills` → `All 458 skills`
  +- BIBLE.md:1239 — `Infrastructure Commands (v2.1.0)` → `Infrastructure Commands (v2.3.0)`
  +- BIBLE.md:1778 — `15 kit-native hooks` → `25 kit-native hooks`
  +- BIBLE.md:1811 — `Kit standalone | 15` → `Kit standalone | 25`
  +- BIBLE.md:1812 — `Kit + ECC | 34 (15 kit + 19 ECC)` → `Kit + ECC | 25`
  +- BIBLE.md:2088 — `19 lifecycle hooks (37 total...)` → `Lifecycle hooks` (removed stale totals)
  +- BIBLE.md:2106 — `NEW in v1.5` → `NEW in v2.3.0`
  +- BIBLE.md:2127 — `node bin/kc.js` → `ccc`
  +- BIBLE.md:2133 — `node bin/kc.js --stats` → `ccc --stats`
  +- BIBLE.md:2136 — `node bin/kc.js --test` → `ccc --test`
  +- BIBLE.md:2139 — `node bin/kc.js --repair` → `ccc --repair`
  +- BIBLE.md:2154 — `357+ skills` → `450+ skills`
  +- BIBLE.md:2179 — `🎯357` → `🎯453`
  +- BIBLE.md:2193 — `Total skills installed` with `🎯357` → `Total CLI-visible skills installed` with `🎯453`
  +- BIBLE.md:2254 — `kc-session-name` → `ccc-session-name`
  +- BIBLE.md:2266 — `kc-*.json` → `ccc-*.json`
  +- BIBLE.md:2323 — `v2.1` → `v2.3.0`
  +- BIBLE.md:2379 — `357+ skills` → `450+ skills`
  +- BIBLE.md:2451 — `v2.1.0 Research Pass` → `v2.3.0 Research Pass`
  +
  +- CHEATSHEET.md:28 — `NEW in v1.1` → `NEW in v2.3.0`
  +- CHEATSHEET.md:48 — `NEW in v1.1` → `NEW in v2.3.0`
  +- CHEATSHEET.md:337 — `total above 37` → `25 kit-native hooks` statement
  +- CHEATSHEET.md:536 — `All 451 skills` → `All 458 skills`
  +- CHEATSHEET.md:543 — `full | 451` → `full | 458`
  +- CHEATSHEET.md:959 — `kc` global alias → `ccc` global binary
  +
  +- CLAUDE.md:5 — `28 hooks` → `25 hooks`
  +- CLAUDE.md:28 — `166 tests across 4 suites` → `187 tests across 14 suites`
  +- CLAUDE.md:56 — `76 slash commands` → `83 slash commands`
  +- CLAUDE.md:59 — `18 ... (37 total...) hooks` → `25 ... hooks`
  +- CLAUDE.md:97 — `🎯357` → `🎯453`
  +- CLAUDE.md:186 — `4 switchable skins` → `10 switchable themes`
  +- CLAUDE.md:193 — `full (all 451)` → `full (all 458)`
  +
  +- CLAUDE.md.template:12 — `16 vendor packages` → `19 vendor packages`
  +- CLAUDE.md.template:158 — `aggregates 16 vendor packages` → `aggregates 19 vendor packages`
  +- CLAUDE.md.template:172 — `CCC2.1.0 ... 🎯357` → `CCC2.3.0 ... 🎯453`
  +- CLAUDE.md.template:186 — `357 skills` → `453 skills`
  +- CLAUDE.md.template:247 — `30 vs 454 skills` → `30 vs 453 skills`
  +
  +- README.md:164 — `v2.3` → `v2.3.0`
  +- README.md:235 — `v2.3` → `v2.3.0`
  +- README.md:244 — `CCC2.2 ... 🎯37` → `CCC2.3.0 ... 🎯453`
  +- README.md:351 — `Hooks | 28` → `Hooks | 25`
  +- README.md:353 — `Vendor Packages | 16` → `Vendor Packages | 19`
  +- README.md:469 — `30 essential vs 451 full` → `30 essential vs 458 full`
  +- README.md:650 — `v2.3` → `v2.3.0`
  +- README.md:707 — `17 open-source packages` → `19 open-source packages`
  +- README.md:742 — `CC Commander v2.3.1` → `CC Commander v2.3.0`
  +
  +- SKILLS-INDEX.md:114 — `NEW in v1.2` → `NEW in v2.3.0`
  +- SKILLS-INDEX.md:122 — `NEW in v1.2` → `NEW in v2.3.0`
  +- SKILLS-INDEX.md:133 — `NEW in v1.2` → `NEW in v2.3.0`
  +- SKILLS-INDEX.md:139 — `NEW in v1.2` → `NEW in v2.3.0`
  +- SKILLS-INDEX.md:148 — `NEW in v1.2` → `NEW in v2.3.0`
  +- SKILLS-INDEX.md:531 — historical multi-version legend (`v0.4/v1.1/v1.3/v2.1`) → unified `v2.3.0` note
  +
  +- commands/ccc.md:369 — `CCC2.1.0 ... 🎯357` → `CCC2.3.0 ... 🎯453`
  +
  +- docs/BIBLE-AGENT.md:20 — `166 tests across 4 suites` → `187 tests across 14 suites`
  +- docs/BIBLE-AGENT.md:21 — status JSON `skills:362, vendors:16` → `skills:453, vendors:19`
  +- docs/BIBLE-AGENT.md:120 — `166 tests across 4 suites` → `187 tests across 14 suites`
  +- docs/BIBLE-AGENT.md:164 — `session_id: kc-build-auth` → `session_id: ccc-build-auth`
  +- docs/BIBLE-AGENT.md:263 — `Skills | 451` → `Skills | 453`
  +- docs/BIBLE-AGENT.md:265 — `Hooks | 28` → `Hooks | 25`
  +- docs/BIBLE-AGENT.md:267 — `Vendors | 17` → `Vendors | 19`
  +- docs/BIBLE-AGENT.md:269 — `Tests | 166` → `Tests | 187`
  +- docs/BIBLE-AGENT.md:358 — footer `🎯362` → `🎯453`
  +- docs/BIBLE-AGENT.md:416 — stale 166/4-suite block → updated to 187/14-suite summary
  +
  +- docs/ECOSYSTEM.md:88 — `1,367 skills` → `1.3K+ skills` (removed stale exact value)
  +
  +- docs/EVALUATION.md:11 — `All tests | 166` → `All tests | 187`
  +- docs/EVALUATION.md:34 — `all 166+ tests pass` → `all 187 tests pass`
  +
  ... (truncated)
  +137 -0
[full diff: rtk git diff --no-compact]
