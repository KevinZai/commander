# Contributing to CC Commander

Thanks for your interest. CC Commander runs **three paid plans** (Starter, Pro, Lifetime) with Starter **free during early access** while we ship. Plugin code is MIT-licensed and contribution is open regardless of tier — issues, PRs, and ideas all welcome.

## Quick start

```bash
git clone https://github.com/KevinZai/commander.git cc-commander
cd cc-commander
npm install
npm test                     # 127 tests across 14 suites
node commander/engine.js     # launch the CLI
```

## Project shape

```
.
├── commander/cowork-plugin/   ← the Desktop plugin (primary product)
│   ├── skills/                ← 61 plugin skills
│   ├── agents/                ← 22 specialist agent personas
│   └── hooks/                 ← 9 lifecycle hooks (24 handlers)
├── apps/mcp-server-cloud/     ← hosted MCP backend (v4.1)
├── site/                      ← cc-commander.com (Next.js)
├── mintlify-docs/             ← docs.cc-commander.com
└── commander/                 ← CLI engine + adventures + tests
```

## What makes a good PR

1. **One concern per PR.** Bug fix OR feature OR refactor — not all three.
2. **Tests stay green.** Run `npm test` before pushing. Add tests for new behavior.
3. **Follow existing patterns.** Read 3 similar files before adding a new one.
4. **Conventional Commits.** `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`. Optional scope: `feat(plugin): ...`.
5. **Counts stay in sync.** If you add a skill / agent / hook handler, run `npm run docs:sync` (or the manual update path in `commander/contract.json` + the docs that reference counts).

## Adding a new skill

1. Create `commander/cowork-plugin/skills/<your-skill>/SKILL.md` with valid YAML frontmatter (see existing skills for the schema)
2. Bump `commander/contract.json` `plugin_skills` count
3. Run `npm test` — `contract.test.js` will verify the count matches
4. Add a row to `SKILLS-INDEX.md`
5. PR

## Adding a new specialist agent

1. Create `commander/cowork-plugin/agents/<your-agent>.md` with frontmatter matching existing agents
2. Choose a persona file from `rules/personas/` (or write a new one)
3. Bump `commander/contract.json` `specialist_agents` count
4. PR

## Adding a hook handler

1. Create `commander/cowork-plugin/hooks/<handler>.js`
2. Wire it in `commander/cowork-plugin/hooks.json` under the right lifecycle event
3. Add a smoke test in `tests/hooks.test.js`
4. Bump `commander/contract.json` `hook_handlers` count
5. PR

## Running tests

```bash
npm test                                        # full suite (127 tests)
node --test commander/tests/<file>.test.js      # single suite
node --test commander/tests/contract.test.js    # count parity check
node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check  # doc drift check
```

## Style

- TypeScript strict, ESM only, functional preferred
- Files <800 lines — extract utilities when modules grow
- No comments unless the *why* is non-obvious
- Errors fail fast at boundaries, not silently swallowed

## What we don't merge

- PRs that paywall existing Starter features (skills/agents/hooks shipped today stay free in Starter forever)
- PRs that add license-key gating to plugin **core** (Pro features can gate; the plugin is MIT and stays open)
- PRs that add telemetry — there is no telemetry, period
- PRs without tests for new behavior
- Drive-by formatting churn unrelated to the change
- Vendored dependencies as full source copies (use git submodules under `vendor/`)
- Skills that overlap heavily with existing ones — extend, don't duplicate

## Getting unstuck

- **Questions:** [GitHub Discussions](https://github.com/KevinZai/commander/discussions)
- **Bugs:** [GitHub Issues](https://github.com/KevinZai/commander/issues) — use the bug report template
- **Security:** see [SECURITY.md](./SECURITY.md) — please don't open public issues for vulnerabilities

## Code of conduct

By participating you agree to the [Contributor Covenant](./CODE_OF_CONDUCT.md). Brief summary: be kind, be specific, attack ideas not people.

## License

By submitting a PR you agree your contribution is licensed under the [MIT License](./LICENSE) — same as the rest of the project.
