# AGENTS.md — CC Commander

Instructions for Codex (and any agent that reads `AGENTS.md`) working in this repository. Claude Code reads `CLAUDE.md`; both describe the same project and rules.

## What this repository is

CC Commander is a PM and orchestration layer for Claude Code and Codex. The primary product is the Claude plugin in `commander/cowork-plugin/` (skills, agents, hooks, rules, menus, workflows, mods). The Codex plugin in `commander/cowork-plugin-codex/` is generated from it. The CLI toolkit lives in `commander/` and `bin/`.

- Version: `package.json`. Release history: `CHANGELOG.md`. Current skill, agent, and hook sets: read the source directories and `commander/contract.json`; never copy counts into prose.
- Platform facts (model ids, hook events, frontmatter keys, Codex CLI surface): `docs/reference/platform-facts-2026-10.md`. Do not introduce a fact that is not there.
- Prompt standard for every skill, agent, rule, menu, and template: `docs/PROMPT-STANDARD.md`. Run its §5 checklist on any prompt file you change.

## Layout

| Path | Contents |
|---|---|
| `commander/cowork-plugin/skills/<name>/SKILL.md` | Plugin skills (`/ccc-*`) |
| `commander/cowork-plugin/agents/*.md` | Plugin subagents |
| `commander/cowork-plugin/hooks/` | `hooks.json` and handler scripts |
| `commander/cowork-plugin/rules/` | Commander Method (`fable-method.md`), workflow rules, common rules, personas |
| `commander/cowork-plugin/workflows/` | Plugin workflows (`/commander:<name>`) |
| `commander/cowork-plugin/mods/` | Claude Code mods |
| `commander/adapters/codex/` | Codex translation layer used by the build |
| `commander/cowork-plugin-codex/` | Generated Codex plugin; never hand-edit |
| `scripts/` | Build, audit, and check scripts |
| `commander/tests/`, `tests/` | `node --test` suites |

## Codex facts

- **Models by role:** `gpt-6-astra` deep work and verification; `gpt-6.1-sol` default executor; `gpt-6-sol` bounded implementation; `gpt-6-luna` mechanical or bulk steps. Fallback chains (`gpt-6-astra` → `gpt-6.1-sol` → `gpt-6-sol`, then previous-generation models) live in `commander/adapters/codex/models.js`; read them there rather than hardcoding.
- **Headless runs:** `codex exec --json -m <model> --sandbox workspace-write "<goal>"`; add `--output-last-message <file>` to capture the final report. `codex exec resume --last` continues a run.
- **Review:** `codex review --uncommitted` for the working tree, `codex review --base <branch>` for a branch.
- **Health:** `codex doctor --json`; plugins `codex plugin list --json`; MCP `codex mcp list`; cloud tasks `codex cloud exec|status|list|apply|diff`.
- **Hooks:** twelve events: `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`, `SessionStart`, `SubagentStart`, `SessionEnd`, `Interrupt`. Handlers are `command` or `mcp_tool`; there is no `args`, `onFailure`, `if`, or `once`. Non-managed hooks must be trusted via `/hooks`.
- **Subagents:** TOML files in `.codex/agents/` (project) or `~/.codex/agents/` (personal) with `name`, `description`, `developer_instructions`, and optional `model`, `model_reasoning_effort`, `sandbox_mode`. The build emits Commander's agents in this form.
- **Migration:** `/import` brings in a Claude Code setup, projects, and recent chats.
- `codex mcp-server` was removed; use `codex app-server`.

## Working rules

- Read the files you will change and the applicable instructions first; follow existing patterns and make the smallest coherent diff.
- Write in an isolated git worktree for delegated or parallel work. Confirm `git rev-parse --show-toplevel` equals the worktree path before editing; stage only the paths you own.
- Edit canonical sources. The Codex plugin comes from `npm run build:codex`; review the generated diff instead of patching it.
- Plugin frontmatter uses model aliases (`fable`, `opus`, `sonnet`, `haiku`), never dated ids.
- No personal paths, hostnames, credentials, or private services in shipped files. Only `claude-code` and `codex` are first-class sources; every other integration is opt-in.
- Never use `--no-verify`, never force-push `main`, never delete without explicit authorization. Publishing, pushing, deploying, and tracker writes need authorization in the current request.
- Fail clearly at boundaries; do not swallow errors or report success a check did not prove.

## Required checks

Run the focused checks for what you changed, then report the actual result:

```bash
node scripts/audit-frontmatter.js --check     # skill and agent frontmatter
npm run check:contract                        # product contract
npm run check:registry                        # registry drift
npm run check:version                         # version parity
npm run check:codex-models                    # Codex model registry
npm run build:codex                           # after any plugin-source change; review the diff
node --test commander/tests/<area>.test.js    # the suite for the area you touched
node --test tests/hooks.test.js               # after hook changes
```

`npm test` and `npm run test:ci` are the broad suites. Do not run the installer, updater, or release script as a check.

## Completion

Define the deliverable and acceptance criteria for substantial work, carry it through implementation and checks, and report what changed, what ran, what passed or failed, and what remains unverified. Planning-only and review-only requests end with the plan or review.

CI process ([CP-GIT-007/008](https://github.com/kzicherman/clawd/blob/main/shared/coordinator/control-plane/rules.yaml)): full local suite + lint green before push; one push per ticket; drafts skip CI; never rerun red CI; batch 4–6 tickets per session.
