# CLAUDE.md — CC Commander

## Product and source of truth

CC Commander is a PM and orchestration layer over Claude's agent capabilities. The primary product is the Desktop plugin at `commander/cowork-plugin/`; the CLI toolkit and the Codex mirror are additional supported surfaces. Core skills, agents, hooks, mods, workflows and connectors remain free. Revenue comes from disclosed affiliates, consulting, an optional community, and sponsorship; preserve the public product's portability and opt-in integrations.

Version: read `package.json`. Release history: `CHANGELOG.md`. Product and install guidance: `README.md`. For current skills, agents, hooks, workflows, evals, and connectors, inspect the source directories, the plugin manifest, `commander/contract.json`, and `CONNECTORS.md`; do not copy volatile counts into instructions. The CLI toolkit's ecosystem catalog under `skills/` holds 467 skills; that figure lives in `commander/contract.json` as `ecosystem_skills` and is checked by `bin/doc-sync.js`.

Release-check marker: **8.1.0**; **20 vendor** packages. `scripts/audit-counts.js --check` requires these two literals; keep them synchronized through release validation. Other counts stay in their canonical sources.

Platform facts (model ids, hook events, frontmatter keys, Codex CLI surface) are verified in [docs/reference/platform-facts-2026-10.md](docs/reference/platform-facts-2026-10.md). Every prompt surface follows [docs/PROMPT-STANDARD.md](docs/PROMPT-STANDARD.md). Historical prose is kept in [docs/reference/claude-context-2026-09-05.md](docs/reference/claude-context-2026-09-05.md) for reference only.

## Session behavior

Start from the user's request. Read relevant source and applicable instructions before editing; a small edit does not require a repository-wide scan. Reuse existing authorization and ask only about material unresolved decisions or required authorization. Do not add greetings, status footers, tracker pulses, or menu prompts as an incidental response to ordinary work.

Use the active session model and configured effort; do not silently change settings. Routing by role: `fable` (Claude Fable 5.1) for architecture, migrations, threat models and verification of load-bearing claims; `opus` (Claude Opus 5.5) for implementation, review and orchestration; `sonnet` (Claude Sonnet 5.5) for bounded edits, docs and focused reviews; `haiku` (Claude Haiku 5.5) for classification, routing and extraction. Codex executors: `gpt-6-astra` for deep work and verification, `gpt-6.1-sol` as the default executor, `gpt-6-sol` for bounded implementation, `gpt-6-luna` for mechanical steps. Verify installed CLI and account support before any model override; aliases track the newest model in each line, so prefer them in plugin frontmatter.

Interactive sessions start in auto permission mode unless a settings file says otherwise; plan mode is entered on request or when a material design decision requires it. `/effort ultracode` is its own toggle and does not change the effort level. The `.claude/settings.json` SessionStart hook runs the update checker and emits task-scoped startup guidance; its text preserves the chosen model and keeps footer output conditional on a status or menu request. Markdown does not change permission controls or runtime enforcement.

Keep `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` enabled where `/ccc-fleet` needs it; do not alter runtime settings as an incidental documentation fix. Tool availability is session-specific: use the exposed Workflow or Agent equivalent, or execute sequentially when delegation is unavailable.

Run `node commander/status-line.js` only for requested session status or a `/ccc` menu flow that needs it.

## Execution and delegation

Carry the authorized task through implementation, validation, and a concrete handoff. Delegate bounded independent work when parallelism or specialist review materially helps: the Agent tool with an explicit `effort`, `isolation: worktree` only when agents mutate files in parallel, the Workflow tool for fan-outs that need adversarial verification, and the plugin's own workflows (`/commander:ccc-audit`, `/commander:ccc-deep-review`, `/commander:ccc-fleet-run`, `/commander:ccc-migrate`, `/commander:ccc-prompt-audit`, `/commander:ccc-release-audit`). Give each worker ownership, constraints, acceptance criteria, and the required evidence; touching multiple files alone is not a delegation trigger. Keep small or tightly dependent work in the current thread. Opus 5.5 delegates eagerly; cap spawn counts and verify load-bearing claims with a fresh context.

`/ccc-orchestrate` writes a goal file for a Codex or Sonnet executor, then verifies its acceptance criteria. `/ccc-plan-exec` stays within Claude; `/ccc-handoff` and `/ccc-save-session` preserve state before context becomes unreliable; `/ccc-codex` manages the Codex CLI itself. Write a durable handoff for a long task before compaction, preserving decisions, completed work, failures, and next steps.

Use the required isolated worktree for writes, stage only owned files, and preserve unrelated changes. A dirty main checkout is a baseline to protect, not a reason to reset other work. Publishing, deployment, tracker updates, messages, credential changes, and destructive actions require authorization for the actual action.

## Product architecture

- Desktop workflows are skills in `commander/cowork-plugin/skills/`, exposed as `/ccc-*`. Do not casually convert them to plugin commands or introduce namespaced UX.
- Active menus use AskUserQuestion-native pickers. Menu definitions are in `commander/cowork-plugin/menus/`; artifact templates in `lib/` serve the published decks, which follow the Artifact tool contract (title, tokens, dark mode, `db` capability where a page holds records).
- `commander/cowork-plugin/agents/`, `hooks/`, `rules/`, `mods/`, `workflows/`, `evals/`, and `.mcp.json` hold plugin capabilities and contracts. Hook commands stay in quoted shell form (`node "${CLAUDE_PLUGIN_ROOT}/hooks/x.js"`) so one `hooks.json` mirrors to Codex; WorktreeCreate and WorktreeRemove hooks are never registered because they replace git worktree handling. The HUD mod under `mods/commander-hud/` is observe-only. Connectors beyond the credential-free bundle are opt-in; tool references do not establish account access.
- `commander/cowork-plugin-codex/` is generated by `scripts/build-codex.js` from the Claude plugin and `commander/adapters/codex/`. Edit canonical source and validate the exact generated result; never hand-patch the generated distribution. The Codex model registry is `commander/adapters/codex/models.js`.
- CLI: `commander/engine.js`, `tui.js`, `dispatcher.js`, `knowledge.js`, and `plugins.js`. CLI state is under `~/.claude/commander/`.
- `skills/ccc-*/` are domain routers; load a matching router instead of the whole skill catalog. `commands/`, `prompts/`, `templates/`, and `compatibility/` supply the other toolkit surfaces.
- Keep personal overlays separate from the public installer. Only `claude-code` and `codex` are first-class telemetry sources; public workflows must not depend on personal paths, credentials, hostnames, or private services.
- `claude-mem` remains external opt-in, not a bundled vendor: its AGPL license must not be silently folded into the MIT distribution.

## Development and checks

Use existing project patterns. Shell UI sources `lib/terminal-art.sh`; JavaScript hooks use `lib/terminal-art.js`. Preserve `CC_NO_COLOR`, `CC_NO_ANIMATION`, and CI behavior. Port, secret, account, and worktree constraints from the active environment still apply.

Read the relevant scripts in `package.json` before running them. Common checks:

```bash
node --test commander/tests/paths.test.js
node --test tests/hooks.test.js
npm run check:contract
npm run check:registry
npm run check:version
node scripts/audit-counts.js --check
node bin/doc-sync.js
npm run docs:sync:check
node scripts/audit-frontmatter.js --check
node scripts/add-fable-contract.js --check
claude plugin validate ./commander/cowork-plugin --strict
```

Run focused tests and required checks for the changed behavior. `npm test` and `npm run test:ci` are broader suites when scope warrants them. Plugin-source changes need `npm run build:codex` in the isolated checkout followed by generated-output review. `claude plugin eval ./commander/cowork-plugin --case <name> --runs 3` scores a skill's behavior; `npm run check:codex-models` probes the Codex registry against the real CLI and is not part of CI. Do not run the installer, updater, release script, or deployment as a documentation check.

Define observable success before substantial work. Inspect actual output and relevant errors. Stop once appropriate checks pass unless new evidence or unresolved risk warrants another pass. Report what changed, what was verified, and practical limits; do not claim a runtime fix from Markdown changes alone.
