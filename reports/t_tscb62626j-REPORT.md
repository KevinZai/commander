Status: done — 2 docs slices committed on grokhq/cmd-design-20261020 (one draft PR), 1 read-only audit; tier: Sonnet 5.5 inline, no sub-agents (cheap, small scope)

## CC-796 Multi-model docs
- Result: draft `mintlify-docs/features/multi-model.mdx`, no config changes.
- Evidence: Linear says GPT-5 works via ANTHROPIC_BASE_URL (Portkey/OpenRouter). Claude Code's gateway docs (code.claude.com/docs/en/llm-gateway, fetched 2026-10-20) say Anthropic "doesn't support routing Claude Code to non-Claude models through any gateway", so the doc does not make that claim. GPT-6 is documented via Codex mirror and /ccc-orchestrate (commander/adapters/codex/models.js; skills/ccc-orchestrate/SKILL.md Executors). Grep of skills, adapters, mintlify-docs and README found no Gemini/Ollama/local routing, so it is stated as unsupported. Issue's "use any model" framing is not accurate.
- Next step: Kevin decides positioning wording and whether to add the page to mintlify-docs/docs.json nav (features group ~line 77).

## CC-797 Team collaboration: read-only audit
- Result: nothing exists. Issue's target paths apps/mcp-server-cloud/src/routes/teams/* and commander/team-sync/ are absent (routes/ holds only events.ts).
- Evidence: commander/sync.js:21-32 are no-op stubs (pushToCloud -> {synced:false}, pullFromCloud -> null, getTeamData -> null); grep finds no callers outside the file and no test for sync.js. Cloud schema has no team/org/seat tables, and the tier check allows only 'free','pro' (apps/mcp-server-cloud/src/db/schema.sql:22; auth.ts:9,68). events.ts:51,65 treat org/user identifiers as redacted fields, so an activity feed would need a new, consented data path. install-skill.ts:31 installs per-user to ~/.claude/skills/<name>, with no team-scoped location. Tests exist in apps/mcp-server-cloud/tests for install-skill/events but none for teams.
- Test gaps: sync.js stubs; tier validation beyond free/pro; team-scoped skill install; telemetry redaction of any team identifiers.
- Smallest next step: decision on whether a shared skill library is a plugin marketplace/git-repo mechanism (no server) or a cloud feature; then add tests pinning the sync.js stub contract. Needs Kevin (pricing/seat model); no code written.

## CC-798 Skills marketplace
- Result: draft `mintlify-docs/features/skills-discovery.mdx` documenting /ccc-browse as canonical (cockpit consent flow, cascades, table), plus explicit "no install counts, no ratings, no hub" section. No telemetry, no metrics.
- Evidence: commander/cowork-plugin/skills/ccc-browse/SKILL.md (steps 1-6); scripts/build-cockpit.mjs exists. Finding: mintlify-docs/features/browse-modes.mdx still advertises `/ccc-hub` and a "v4.1 Commander Hub"; no ccc-hub skill exists (skills dir has none), so that page is stale. Not edited (out of slice).
- Next step: fix the stale Hub paragraph in browse-modes.mdx; install counts/ratings need a telemetry/privacy decision first.

## Verification
docs:sync:check PASS, audit-counts --check PASS. PR is draft, not merged. Linear not edited.
