# Plugin/CLI SSoT parity audit (CC-365, slice 1)

Read-only audit at `main` 3ea789d7, version 8.1.0. No behavior changed. Evidence commands are listed at the end.

## 1. Version source

| Finding | Detail |
|---|---|
| Authoritative | `package.json` 8.1.0 |
| Mirrors (all 8.1.0) | plugin.json, codex plugin.json, `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, `commander/contract.json`, `apps/mcp-server-cloud/package.json`, lockfile |
| Guard | `npm run check:version` (`scripts/check-version-parity.js`) passes: 13 manifests at 8.1.0 |
| AC gap | AC says "no other files track version". Mirrors are required by the plugin/marketplace formats, so the realistic target is generated-from-package.json plus the existing check (already in place), not zero files. |
| Independent versions (intentional, not drift) | `extension` 2.1.0, `extensions/cloudcli` 2.1.0, `dashboard` 1.3.0, `mods/commander-hud` 0.1.0, `site`, `vscode-extension`, `extensions/vscode` 0.1.0 |

Verdict: version parity is already enforced. PLAN.md finding 1 (P1) is resolved in practice but PLAN.md still lists it as open and cites `4.0.0-beta.9`.

## 2. Skills

| Set | Count |
|---|---|
| Plugin `commander/cowork-plugin/skills/` | 84 |
| Repo `skills/` | 204 (13 `ccc-*`) |
| `ccc --list-skills --json` (`bin/kc.js`) | 534 |
| Name overlap CLI listing vs plugin | 12 |
| Plugin-only / CLI-only | 72 / 522 |

- The AC "identical sets" is not met and not a sensible goal as written: the plugin has 84 workflow skills, the CLI catalog is an ecosystem of 467+ (`contract.json` `ecosystem_skills`).
- `skill-browser.js` scans three roots: repo `skills/`, `~/.claude/skills`, and `$CWD/.claude/skills`. The `--list-skills` result is therefore machine- and cwd-dependent (534 here vs 204 in the repo), so it cannot be compared to a fixed plugin set without scoping.
- 12 names exist in both trees (`ccc-data`, `ccc-design`, `ccc-devops`, `ccc-makeover`, `ccc-marketing`, `ccc-mobile`, `ccc-research`, `ccc-saas`, `ccc-security`, `ccc-seo`, `ccc-smb-ops`, `ccc-testing`). All 12 differ in content (`diff -rq`), i.e. real drift in the shared routers. PLAN.md P2 proposed symlinks or generation.
- Also `ccc` is not a bin target for this: the flag lives in `bin/kc.js`; confirm the intended entry in slice 2.

## 3. Hooks

| Registry | Events | Handlers |
|---|---|---|
| Plugin `hooks/hooks.json` | 30 | 51 |
| Root `hooks/hooks.json` | 7 | 28 |
| `hooks/hooks-standalone.json` | 4 | 15 |
| Codex mirror `hooks.json` | 11 | 32 |

- Plugin-only events (23): UserPromptSubmit, UserPromptExpansion, PostToolBatch, StopFailure, Notification, PostCompact, SubagentStart/Stop, PermissionRequest, Elicitation(Result), TaskCreated/Completed, ConfigChange, InstructionsLoaded, Setup, PermissionDenied, Pre/PostModelSwitch, TeammateIdle, CwdChanged, DirectoryAdded, FileChanged. No event is root-only.
- By handler name, 39 plugin handlers are absent from the root registry and 21 root handlers are absent from the plugin (e.g. `quality-gate.js`, `post-edit-format.js`, `session-start.js`, `cost-tracker.js`). Same-named scripts exist in both trees (`hooks/*.js` 24, plugin 44), so a shared behavior fix is applied twice.
- Standalone shares only `context-guard.js` with root by name; it is a third, separate set (15 handlers).
- No generator or single manifest exists. A merge is non-trivial because the sets are different products (kit hooks vs Desktop hooks), not copies.

## 4. PLAN.md checklist

PLAN.md "CLI / Plugin Parity" is a findings table (Audited 2026-04-21), not a checkbox list; there are no items to mark complete. Its counts (28 skills, 502+, 25 hooks) and the 4.0.0-beta.9 version are stale.

## Proposed split for later slices

1. PLAN.md refresh: update the parity table to current facts; define the real AC (below). Docs only.
2. Skills: decide the 12 shared routers' canonical copy (plugin or `skills/`), generate the other with a `--check` gate; scope `--list-skills` with a `--source repo|plugin` flag so sets are comparable and deterministic.
3. Hooks: extract shared handler logic into `lib/` used by both trees; leave the registries separate but add a check that same-named handlers share a source.
4. Version: no work beyond keeping `check:version` in CI.

## Reproduce

`npm run check:version`; `node bin/kc.js --list-skills --json`; `ls commander/cowork-plugin/skills skills`; parse `hooks.json` files under `hooks/` and `commander/cowork-plugin*/`; `diff -rq skills/<n> commander/cowork-plugin/skills/<n>`.
