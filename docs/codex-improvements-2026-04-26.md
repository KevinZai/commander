# Codex's CC Commander Improvement Suggestions — 2026-04-26

**Author:** Codex 5.5 (GPT-5.5)
**Audit base:** HEAD 720b215, post-beta.11 hardening sprint
**Verdict on shipping v4.0.0 stable:** HOLD

## Executive Summary

CC Commander is close to stable from a plugin-contract perspective, but not from a public-contract perspective. The runtime shape is strong: the plugin manifest advertises 51 skills, 17 agents, 8 lifecycle events with 16 handlers, 2 bundled MCP servers, and 16 opt-in connectors (`commander/cowork-plugin/.claude-plugin/plugin.json:5`), and the schema tests now assert the 51-skill, 17-agent, and 2-MCP invariants (`commander/tests/plugin-schema-validation.test.js:83`, `commander/tests/plugin-schema-validation.test.js:198`, `commander/tests/plugin-schema-validation.test.js:220`, `commander/tests/plugin-schema-validation.test.js:241`). The remaining risk is that the docs, landing pages, skill bodies, and cloud copy still tell several older product stories.

The most under-leveraged win is a generated public product contract. The repo already has the data needed to derive counts, command prefixes, bundled MCPs, free-vs-paid positioning, and platform status, but current checks only cover narrow internal surfaces: `audit-counts --check` verifies `CLAUDE.md` version/vendor mentions, not README, Mintlify, docs HTML, skill bodies, or hosted MCP copy (`scripts/audit-counts.js:90`). That gap is why stale claims like 15 skills, Pro tier, `/ccc:*`, 9 MCPs, and v3.0.0 still survive in user-facing docs (`mintlify-docs/quickstart.mdx:3`, `docs/index.html:107`, `commander/cowork-plugin/README.md:107`, `mintlify-docs/plugin/mcp-integrations.mdx:3`).

The one thing to fix tomorrow morning: freeze stable until the first-run/public docs path says one consistent story. If a new user reads the README, Mintlify quickstart, plugin install page, hosted MCP pages, and `/ccc-start`, they should see the same numbers, same free model, same command prefix, and same platform availability. That is a boring docs/test task, but it protects trust more than another feature wave.

## Strengths to preserve

1. **Brain/hands separation is the right architecture.** The product has a clear main-session orchestration layer and 17 scoped personas with model, effort, and tool frontmatter (`commander/cowork-plugin/.claude-plugin/plugin.json:5`, `commander/cowork-plugin/agents/architect.md:1`, `commander/cowork-plugin/agents/reviewer.md:1`).

2. **The 2 bundled MCP decision should stay.** beta.11 deliberately moved credentialed MCPs out of install day, leaving only `context7` and `sequential-thinking` in `.mcp.json` (`CHANGELOG.md:69`, `commander/cowork-plugin/.mcp.json:2`). Re-expanding bundled MCPs would reintroduce the exact failure mode beta.11 removed.

3. **The click-first cascade is the right UX primitive.** `/ccc` explicitly bans numbered menus and caps each native picker at 4 options (`commander/cowork-plugin/skills/ccc/SKILL.md:65`, `commander/cowork-plugin/skills/ccc/SKILL.md:109`), and `/ccc-more` continues the same paged pattern (`commander/cowork-plugin/skills/ccc-more/SKILL.md:41`). Keep that constraint.

4. **The test suite now covers the plugin core well.** The schema validation suite checks manifest validity, hook command paths, skill count, agent count, and MCP count (`commander/tests/plugin-schema-validation.test.js:55`, `commander/tests/plugin-schema-validation.test.js:143`, `commander/tests/plugin-schema-validation.test.js:198`, `commander/tests/plugin-schema-validation.test.js:220`, `commander/tests/plugin-schema-validation.test.js:241`). Do not replace that with looser snapshot tests.

5. **Fail-open local hooks are the right default.** The hooks docs promise graceful failure (`mintlify-docs/plugin/hooks.mdx:8`), and hooks like `suggest-ticker` and `context-warning` suppress output instead of blocking the user when signal is missing (`commander/cowork-plugin/hooks/suggest-ticker.js:141`, `commander/cowork-plugin/hooks/context-warning.js:59`).

## The 10 improvements (ranked)

### 1. Generate a public product contract and fail CI on drift — Severity 🔴

**Problem:** Public surfaces disagree on core facts. The root package still says 50 plugin skills (`package.json:4`), the cowork plugin README says 50 skills and Pro-tier hooks (`commander/cowork-plugin/README.md:3`, `commander/cowork-plugin/README.md:107`), Mintlify quickstart says v3.0.0, 15 skills, and a $19/mo Pro upgrade (`mintlify-docs/quickstart.mdx:3`, `mintlify-docs/quickstart.mdx:29`, `mintlify-docs/quickstart.mdx:31`), Mintlify MCP docs say 9 preconfigured MCPs (`mintlify-docs/plugin/mcp-integrations.mdx:3`), and the static landing page still says 15 skills, 5 agents, and 6 hooks (`docs/index.html:107`, `docs/index.html:121`, `docs/index.html:125`, `docs/index.html:129`). Meanwhile the manifest and tests assert 51 skills, 17 agents, and 2 bundled MCPs (`commander/cowork-plugin/.claude-plugin/plugin.json:5`, `commander/tests/plugin-schema-validation.test.js:198`, `commander/tests/plugin-schema-validation.test.js:220`, `commander/tests/plugin-schema-validation.test.js:241`).

**Impact:** New users cannot tell which product they are installing. This is especially damaging for stable because trust is the product: CC Commander claims to be the PM layer that removes ambiguity, but the first public surfaces introduce it.

**Proposed fix:** Add a generated `commander/product-contract.json` or equivalent module with canonical values: version, skill count, agent count, hook event/handler count, bundled MCPs, opt-in connector count, command prefix policy, pricing policy, and platform status. Build README snippets, plugin README tables, Mintlify stats, and static landing-page stats from that source. Add `npm run check:public-contract` to scan all public docs plus plugin skill bodies for stale forbidden patterns.

**Effort estimate:** M

**Validation:** A CI job fails if any non-historical public file contains stale claims such as `15 plugin skills`, `50 plugin skills`, `v3.0.0`, `Pro unlocks`, `9 pre-configured MCP`, or `/ccc:` outside an allowlist. The job should include README, `docs/index.html`, `docs/plugin.md`, `mintlify-docs/**`, `commander/cowork-plugin/README.md`, and `commander/cowork-plugin/skills/**`.

**Why this rank:** This is the highest-leverage stable blocker because it prevents the same drift class from reappearing after every feature wave.

### 2. Stop marking hosted MCP and cross-IDE support as shipping until it is live — Severity 🔴

**Problem:** The README says Cursor, Windsurf, Cline, Continue, and Codex are "Shipping (hosted MCP)" and tells users to point clients at `mcp.cc-commander.com` (`README.md:63`, `README.md:67`). The Mintlify browse-modes page says the hosted MCP server is scaffolded but not deployed (`mintlify-docs/features/browse-modes.mdx:10`). The cloud README still describes bearer license keys and beta signup (`apps/mcp-server-cloud/README.md:14`, `apps/mcp-server-cloud/README.md:16`), while the FAQ says the plugin has no paid tier and a future hosted MCP will be free with an anti-abuse cap (`mintlify-docs/faq.mdx:85`).

**Impact:** Cross-client users will follow a URL that is not a ready product path, then infer the whole "every AI coding agent" claim is marketing. It also muddies the business model: free-forever plugin, license-key MCP, beta surveys, and no paid tier all coexist in different files.

**Proposed fix:** Split platform status into three explicit labels: "Shipping: Claude Code Desktop/CLI", "Preview: hosted MCP", and "Planned: Codex native". Gate README and Mintlify claims on that status. Add a public `/health` smoke test for `mcp.cc-commander.com` before any docs call hosted MCP "shipping." Derive cloud `SERVER_VERSION` from package metadata instead of a manually synced constant because it is currently stale at beta.10 while the cloud package is beta.11 (`apps/mcp-server-cloud/src/lib/version.ts:1`, `apps/mcp-server-cloud/package.json:3`).

**Effort estimate:** M

**Validation:** A scripted smoke test reaches the public MCP endpoint, calls status, and verifies version parity before docs can use "shipping." README platform rows should match the generated platform-status contract.

**Why this rank:** It affects the core positioning promise and the install path for every non-Claude client.

### 3. Make every click-first picker actually fit the native picker contract — Severity 🟠

**Problem:** `/ccc` says a single `AskUserQuestion` supports a maximum of 4 options (`commander/cowork-plugin/skills/ccc/SKILL.md:109`), but `/ccc-connect` defines a first-level category picker with 12 options in one picker (`commander/cowork-plugin/skills/ccc-connect/SKILL.md:35`, `commander/cowork-plugin/skills/ccc-connect/SKILL.md:78`). Separately, public demo copy expects `/ccc` to show 6 intent chips (`docs/plugin.md:16`, `docs/screenshots/STATUS.md:38`), while the actual `/ccc` skill shows 4 root options: Build, Review, Ship, and More (`commander/cowork-plugin/skills/ccc/SKILL.md:73`, `commander/cowork-plugin/skills/ccc/SKILL.md:83`).

**Impact:** The click-first promise breaks exactly where users expand beyond the top-level happy path. A connector wizard that cannot render natively falls back to prose, and docs that promise 6 chips make the real 4-chip hub look incomplete.

**Proposed fix:** Define a small menu schema that enforces `maxOptions: 4` per page. Convert `/ccc-connect` into paged categories: Product/Code, Infra/Data, Comms/Automation, More. Decide whether `/ccc` is a 4-chip hub or 6-chip hub, then align README, screenshot recipes, Mintlify, and tests to that one choice.

**Effort estimate:** S

**Validation:** Add a test that parses every `AskUserQuestion` block or menu JSON and fails if any page has more than 4 options. Add snapshot tests for root `/ccc`, `/ccc-more`, and `/ccc-connect` option labels.

**Why this rank:** This is user-facing product behavior, not just copy drift.

### 4. Purge active `/ccc:` namespace leakage or make it an explicit alias strategy — Severity 🟠

**Problem:** The repo itself documents that dash-prefix `/ccc-*` replaced colon-prefix `/ccc:*`, and says `grep -rn "/ccc:"` should return zero outside the changelog (`commander/cowork-plugin/skills/ccc-memory/SKILL.md:68`, `commander/cowork-plugin/skills/ccc-memory/SKILL.md:69`). Active surfaces still emit the old form: `intent-classifier.js` suggests `/ccc:build`, `/ccc:standup`, and related commands (`commander/cowork-plugin/hooks/intent-classifier.js:5`), the static landing page advertises `/ccc:*` (`docs/index.html:107`, `docs/index.html:149`), the browse-modes page tells users to type `/ccc:` (`mintlify-docs/features/browse-modes.mdx:43`), and the cowork plugin README examples use `/ccc:build`, `/ccc:research`, and `/ccc:fleet` (`commander/cowork-plugin/README.md:125`).

**Impact:** Users will copy stale commands and hit autocomplete confusion. It also weakens the "plain `/ccc-*`, no namespace prefix" simplification that beta.11 is trying to sell (`mintlify-docs/plugin/skills.mdx:6`).

**Proposed fix:** Choose one of two boring paths: either remove active `/ccc:` copy everywhere except historical changelog entries, or intentionally support `/ccc:` aliases and document them as deprecated. Do not leave the old syntax as accidental residue.

**Effort estimate:** S

**Validation:** Add an allowlisted grep test. It should fail on `/ccc:` in active docs, skill bodies, hooks, menus, and landing pages, while allowing changelog history and explicitly named migration notes.

**Why this rank:** This is the smallest fix that removes a surprisingly large amount of product confusion.

### 5. Productize the Codex adapter before using Codex in the headline — Severity 🟠

**Problem:** The Codex compatibility report says v4.2 needs a build script, smoke test, marketplace catalog, incompatible-hook handling, docs, and submission (`docs/codex-compatibility-2026-04-24.md:77`, `docs/codex-compatibility-2026-04-24.md:83`). The adapter README says the same Phase 2 work is not yet implemented (`commander/adapters/codex/README.md:74`). `translate.js` is a pure module with no I/O wiring (`commander/adapters/codex/translate.js:152`), and `package.json` has no `build:codex` script (`package.json:66`). The translator also uses a hand-rolled frontmatter parser that does not actually preserve YAML arrays like agent `tools:` (`commander/adapters/codex/translate.js:52`, `commander/adapters/codex/translate.js:69`; example array in `commander/cowork-plugin/agents/architect.md:9`).

**Impact:** Codex is strategically attractive, but premature headline use makes the adapter look more complete than it is. The specific risk is silent permission/model drift when Markdown/YAML agents become TOML agents.

**Proposed fix:** Add `npm run build:codex` that emits a generated `commander/codex-plugin/` artifact, a fixture smoke test that validates 51 skills and 17 agents load from that artifact, and an explicit event-loss manifest for `Notification`, `PreCompact`, and `SubagentStop` because the compatibility report already identifies those gaps (`docs/codex-compatibility-2026-04-24.md:60`, `docs/codex-compatibility-2026-04-24.md:62`).

**Effort estimate:** L

**Validation:** `npm run build:codex && npm run test:codex-adapter` passes; generated TOML agents preserve description, model mapping, effort, sandbox mode, and developer instructions; docs do not call Codex native support "shipping" until the generated artifact has been smoke-tested.

**Why this rank:** Codex is the best second-platform win, but only if the port is boring, generated, and testable.

### 6. Collapse hook chains where latency compounds every session and turn — Severity 🟡

**Problem:** `hooks.json` launches 3 separate Node processes on `SessionStart`, 4 on `UserPromptSubmit`, and 3 on `PreToolUse` (`commander/cowork-plugin/hooks/hooks.json:3`, `commander/cowork-plugin/hooks/hooks.json:24`, `commander/cowork-plugin/hooks/hooks.json:50`). The orchestrator README says each Node cold start costs roughly 50-200ms and that SessionStart currently pays redundant 300-600ms before handler logic (`commander/cowork-plugin/hooks/orchestrator/README.md:7`, `commander/cowork-plugin/hooks/orchestrator/README.md:9`). It also lists future savings for UserPromptSubmit and PreToolUse (`commander/cowork-plugin/hooks/orchestrator/README.md:82`).

**Impact:** The latency tax is paid at the exact moments users notice: session open, prompt submit, and before tool execution. As more hooks get added, the ceiling gets worse unless orchestration becomes the default.

**Proposed fix:** Flip SessionStart to the existing orchestrator after a focused smoke test, then build the same pattern for UserPromptSubmit. Keep individual hook files standalone for rollback, but make grouped execution the normal path.

**Effort estimate:** M

**Validation:** Add timing tests with `CCC_ORCH_TIMING=1`, assert SessionStart stays under a budget on a cold process, and compare grouped vs ungrouped elapsed time in CI. UserPromptSubmit should stay quiet unless it has a useful status.

**Why this rank:** Performance work here is measurable, low-risk, and pays off on every session.

### 7. Make connector setup safe and verified instead of a token-paste wizard — Severity 🟡

**Problem:** `/ccc-connect` asks users to paste OAuth callback tokens or API keys into the chat and then says it will save them to `~/.claude/commander/connections/<name>.json` (`commander/cowork-plugin/skills/ccc-connect/SKILL.md:181`, `commander/cowork-plugin/skills/ccc-connect/SKILL.md:195`). The example secret file includes a `tier` field even though the product is free forever (`commander/cowork-plugin/skills/ccc-connect/SKILL.md:203`, `commander/cowork-plugin/skills/ccc-connect/SKILL.md:211`). Several connector command templates are still "TBD" or "verify before Pro launch" (`commander/cowork-plugin/skills/ccc-connect/SKILL.md:229`, `commander/cowork-plugin/skills/ccc-connect/SKILL.md:243`), and CONNECTORS.md has the same unfinished rows (`commander/cowork-plugin/CONNECTORS.md:45`, `commander/cowork-plugin/CONNECTORS.md:55`).

**Impact:** Users can accidentally put long-lived secrets into model context. The wizard also risks suggesting commands that the skill itself says not to use when marked TBD (`commander/cowork-plugin/skills/ccc-connect/SKILL.md:282`, `commander/cowork-plugin/skills/ccc-connect/SKILL.md:283`).

**Proposed fix:** Remove unavailable connectors from the live picker until their exact install path is verified. For API keys, prefer environment-variable setup, Claude's native secret handling if available, or a local `op read`/1Password path for advanced users. If chat-based paste remains, show a risk warning and never store raw tokens in a project or git-tracked path.

**Effort estimate:** M

**Validation:** Connector tests should prove each displayed connector has a non-TBD command, restart reminder, verification step, and no stale tier/pro copy. A security test should grep connector docs and skill bodies for raw-token echo patterns.

**Why this rank:** `/ccc-connect` is where free-forever trust, affiliate disclosure, and secret handling all meet. It needs to be boring and exact.

### 8. Add a hermetic real install/update/uninstall lifecycle test — Severity 🟡

**Problem:** The install/uninstall test intentionally avoids a real install round-trip because `install.sh` has external side effects such as global npm installs and `/usr/local/bin/ccc` linking (`tests/install-uninstall-integration.test.js:208`, `tests/install-uninstall-integration.test.js:214`). The current coverage is dry-run, verify, and hand-seeded uninstall (`tests/install-uninstall-integration.test.js:4`, `tests/install-uninstall-integration.test.js:10`). That is useful, but it does not exercise the highest-friction distribution path end to end.

**Impact:** Marketplace/update/uninstall regressions will still be found by humans. The docs already tell users to remove/re-add marketplaces when cache state gets stuck (`mintlify-docs/faq.mdx:101`, `mintlify-docs/faq.mdx:109`), so lifecycle behavior deserves stronger automated confidence.

**Proposed fix:** Add a `--sandbox-home` or `CCC_INSTALL_ROOT` mode that redirects all writes, disables global npm installs, and writes shims inside a temp bin directory. Then test real install, verify, update/reinstall, uninstall, and "preserve user files" in one hermetic round-trip.

**Effort estimate:** M

**Validation:** A single test creates a temp HOME, runs real install in sandbox mode, asserts installed files and plugin source exist, runs verify, runs uninstall, and asserts `CLAUDE.md`, `settings.json`, and backups survive.

**Why this rank:** Stable is partly a distribution promise. A real lifecycle test is the most practical way to keep that promise.

### 9. Expand tests from internal happy paths to negative drift and public UX contracts — Severity 🟡

**Problem:** The script integration test explicitly skips drift simulation because the scripts are hard-coded to repo root (`commander/tests/scripts-integration.test.js:11`, `commander/tests/scripts-integration.test.js:17`). `audit-counts --check` only validates `CLAUDE.md` version/vendor strings (`scripts/audit-counts.js:90`, `scripts/audit-counts.js:115`). Existing plugin schema tests cover internal state well, but they do not validate public docs, menu option counts, command-prefix drift, or hosted-MCP positioning (`commander/tests/plugin-schema-validation.test.js:83`, `commander/tests/plugin-schema-validation.test.js:198`, `commander/tests/plugin-schema-validation.test.js:241`).

**Impact:** The suite can be green while the public product says v3, 15 skills, Pro tier, 9 MCPs, and `/ccc:*`. That is exactly the class of regression stable needs to prevent.

**Proposed fix:** Refactor the check scripts to accept `ROOT` as an env var or CLI flag, then add tmp-fixture negative tests. Add public-doc lint rules for stale counts, stale pricing, stale prefixes, and AUQ option limits. Keep the current schema tests; broaden the perimeter.

**Effort estimate:** M

**Validation:** Tests fail against a temp fixture with one stale count, one stale `/ccc:` command, one `Pro unlocks` claim, and one 5-option picker. Tests pass on the real repo after cleanup.

**Why this rank:** This converts the current hardening sprint from one-time cleanup into a repeatable guardrail.

### 10. Finish proof assets and align demo recipes with the real product — Severity 🟢

**Problem:** Screenshot tracking says only 3 of 7 scaffold slots are filled, with the main `/ccc` hub, plan pane, fleet parallel, and onboarding screenshots still missing (`docs/screenshots/STATUS.md:5`, `docs/screenshots/STATUS.md:11`, `docs/screenshots/STATUS.md:15`). The capture recipe asks for 6 intent chips in `/ccc` (`docs/screenshots/STATUS.md:38`), while the actual `/ccc` picker currently defines 4 root options (`commander/cowork-plugin/skills/ccc/SKILL.md:73`, `commander/cowork-plugin/skills/ccc/SKILL.md:83`). README also uses a beta.7 hero alt while the audit base is beta.11 (`README.md:16`).

**Impact:** Screenshots are the fastest way to explain a Desktop-first plugin. Missing or mismatched proof makes the product feel less real than the code is.

**Proposed fix:** Decide the root menu shape first, update screenshot recipes to match it, capture the 4 missing screenshots, and replace stale hero/landing-page proof. Treat proof assets as part of stable, not a marketing afterthought.

**Effort estimate:** S

**Validation:** All 7 scaffold screenshots exist, match current version/menu shape, and are referenced from README/Mintlify without stale beta.7 or 15-skill copy.

**Why this rank:** It is not a core runtime blocker, but it materially improves install confidence.

## Codex-specific recommendations

1. **Ship Codex native only after artifact generation exists.** The compatibility report itself says not to ship until `npm run build:codex` produces a clean artifact and a smoke test confirms all 51 skills and 17 agents load (`docs/codex-compatibility-2026-04-24.md:143`, `docs/codex-compatibility-2026-04-24.md:146`).

2. **Document event loss in the Codex listing, not just internal docs.** Codex lacks `Notification`, `PreCompact`, and `SubagentStop` equivalents or changes their semantics (`docs/codex-compatibility-2026-04-24.md:60`, `docs/codex-compatibility-2026-04-24.md:62`). The marketplace description should say which hooks are unavailable or remapped.

3. **Treat `AskUserQuestion` parity as UX-similar, not pixel-identical.** The report says Codex has `ask_user_question` with a tabbed picker UI (`docs/codex-compatibility-2026-04-24.md:17`). Verify every paged menu under Codex specifically, especially flows that rely on previews, recommended stars, or "More" pagination.

4. **Do not trust the current hand-rolled translator for agent permissions.** Codex uses coarser sandbox modes than Claude tool allowlists (`docs/codex-compatibility-2026-04-24.md:64`), and `translateAgent` does not preserve YAML array semantics robustly (`commander/adapters/codex/translate.js:52`, `commander/adapters/codex/translate.js:72`). Use a real YAML parse step or a very strict fixture suite.

5. **Separate Codex native from hosted MCP in docs.** Codex native is ~85% mechanical with a scaffolded adapter (`commander/adapters/codex/README.md:10`), while hosted MCP is a network product path with its own deployment and business-model questions (`mintlify-docs/features/browse-modes.mdx:10`). They should not share one "Codex works" badge.

## Anti-recommendations — what NOT to do

1. **Do not add more bundled MCPs for the stable tag.** beta.11 intentionally reduced bundled MCPs from 9 to 2 to remove credential failures (`CHANGELOG.md:69`). Keep that discipline.

2. **Do not add more skills or agents until routing/docs are stable.** The product already has 51 plugin skills and 17 agents (`commander/cowork-plugin/.claude-plugin/plugin.json:5`). The next ceiling is discoverability and correctness, not breadth.

3. **Do not launch Commander Hub before the core free-vs-cloud business model is coherent.** Mintlify says no paid plugin tier and no Stripe (`mintlify-docs/introduction.mdx:89`), while cloud docs still use license keys, tiers, caps, pricing links, and survey gates (`apps/mcp-server-cloud/README.md:14`, `apps/mcp-server-cloud/src/tools/status.ts:19`, `apps/mcp-server-cloud/src/tools/status.ts:35`). A marketplace on top of unresolved pricing language will amplify confusion.

4. **Do not make `BIBLE.md` the live product facts source.** It is valuable methodology, but its own table of contents still says "The 33 Plugin Skills" (`BIBLE.md:17`) and the footer says last updated 2026-03-29 (`BIBLE.md:2759`). Keep it as methodology; generate product facts elsewhere.

5. **Do not collapse Claude, Codex, and MCP into one generic adapter too early.** The Codex adapter README says Codex is the cheapest second-platform win and that Cursor/Windsurf/Cline/Continue are not equally defensible native targets (`commander/adapters/codex/README.md:94`, `commander/adapters/codex/README.md:96`). Ship Codex native cleanly first.

## Open questions for Kevin

1. Is v4.0.0 stable meant to be a public launch, or a stable code tag for existing beta users while docs keep catching up?

2. Does "free forever" apply only to the local Claude plugin, or also to hosted MCP access across Cursor/Windsurf/Cline/Continue/Codex?

3. Should the root `/ccc` picker be 4 options or 6 options? The current skill says 4, while docs and screenshot recipes still expect 6.

4. Which second platform matters more for v4.2: Codex native marketplace listing or hosted MCP for Cursor/Windsurf/Cline/Continue?

5. Should `/ccc:` remain as a deprecated alias for v3 muscle memory, or should the stable release reject it completely and only teach `/ccc-*`?

