# Contributing to CC Commander

Thanks for your interest. Plugin code is MIT-licensed; issues, PRs and ideas are all welcome.

## Quick start

```bash
git clone https://github.com/KevinZai/commander.git cc-commander
cd cc-commander
npm install
npm test                     # full local suite
node commander/engine.js     # launch the CLI
```

## Project shape

```
.
├── commander/cowork-plugin/   ← the Desktop plugin (primary product)
│   ├── skills/                ← 93 plugin skills
│   ├── agents/                ← 22 specialist agent personas
│   └── hooks/                 ← 30 lifecycle hooks (51 handlers)
├── apps/mcp-server-cloud/     ← hosted MCP backend (v4.1)
├── site/                      ← commanderplugin.com (Next.js)
├── mintlify-docs/             ← docs.commanderplugin.com
└── commander/                 ← CLI engine + adventures + tests
```

## What makes a good PR

1. **One concern per PR.** Bug fix OR feature OR refactor — not all three.
2. **Tests stay green.** Run `npm test` before pushing. Add tests for new behavior.
3. **Follow existing patterns.** Read 3 similar files before adding a new one.
4. **Conventional Commits.** `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`. Optional scope: `feat(plugin): ...`.
5. **Counts stay in sync.** If you add a skill / agent / hook handler, run `npm run docs:sync` (or the manual update path in `commander/contract.json` + the docs that reference counts).

## Adding a new skill

1. Create `commander/cowork-plugin/skills/<your-skill>/SKILL.md` following [docs/PROMPT-STANDARD.md](docs/PROMPT-STANDARD.md): no `model:`/`effort:` pin, and `disable-model-invocation: true` unless the skill joins the model-visible set (the 12 core skills plus the skills their menus open)
2. Bump `commander/contract.json` `plugin_skills` count
3. Re-render the skill table: `node scripts/render-skill-table.js --write SKILLS-INDEX.md`
4. Run `npm test`, `npm run check:parity` (counts from disk) and `npm run check:listing` (listing budget, no dispatch to an on-demand skill)
5. Regenerate the Codex mirror: `npm run build:codex`
6. PR

## Adding a new specialist agent

1. Create `commander/cowork-plugin/agents/<your-agent>.md` with frontmatter matching existing agents
2. Choose a persona file from `rules/personas/` (or write a new one)
3. Bump `commander/contract.json` `specialist_agents` count
4. PR

## Adding a hook handler

1. Create `commander/cowork-plugin/hooks/<handler>.js`
2. Wire it in `commander/cowork-plugin/hooks/hooks.json` under the right lifecycle event
3. Add a smoke test in `tests/hooks.test.js`
4. Bump `commander/contract.json` `hook_handlers` count
5. PR

## Running tests

```bash
npm test                                        # full suite
node --test commander/tests/<file>.test.js      # single suite
node --test commander/tests/contract.test.js    # count parity check
node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check  # doc drift check
npm run check:parity                            # every count/version claim vs disk
```

## Style

- TypeScript strict, ESM only, functional preferred
- Files <800 lines — extract utilities when modules grow
- No comments unless the *why* is non-obvious
- Errors fail fast at boundaries, not silently swallowed

## What we don't merge

- PRs that paywall existing skills, agents or hooks
- PRs that add license-key gating to plugin **core** (Pro features can gate; the plugin is MIT and stays open)
- PRs that add **new** telemetry event types without updating the [privacy policy](https://commanderplugin.com/privacy) and the README "Data & network" section (telemetry stays opt-in)
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
