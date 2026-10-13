# Codex config reference for /ccc-codex

File: `$CODEX_HOME/config.toml` (default `~/.codex/config.toml`). Project overrides: `<repo>/.codex/config.toml`. Source: `docs/reference/platform-facts-2026-10.md` §3.4–3.6.

## Keys this skill reads or edits

| Key | Values | Notes |
|---|---|---|
| `model` | a model id | top level |
| `model_reasoning_effort` | `low` … `ultra` | top level |
| `review_model` | a model id | used by `codex review` |
| `model_provider` | provider name | leave as configured |
| `approval_policy` | `on-request`, `never`, granular | do not loosen as a side effect |
| `sandbox_mode` | `read-only`, `workspace-write`, `danger-full-access` | never default to `danger-full-access` |
| `[mcp_servers.<id>]` | stdio (`command`, `args`, `env`) or HTTP (`url`, auth) | prefer `codex mcp add` over hand edits |
| `[agents]` | `enabled`, `max_concurrent_threads_per_session`, `default_subagent_model`, `default_subagent_reasoning_effort`, `interrupt_message` | |
| `[plugins."<name>@<marketplace>"]` | `enabled = true` | per project in `.codex/config.toml` |
| `[marketplaces.<name>]` | `source_type`, `source` | written by `codex plugin marketplace add` |
| `[features]` | `<flag> = true/false` | prefer `codex features enable/disable` |
| `hooks`, `notify`, `project_doc_max_bytes`, `shell_environment_policy`, `tui.*`, `model_catalog_json` | | read-only for this skill |

Editing rules: top-level keys go above the first `[table]` header. Keep one key per line. Back up before every edit (see the SKILL.md backup step) and verify with `codex doctor --json --summary`.

## Feature flags

On by default: `apps`, `unified_exec`, `shell_snapshot`, `multi_agent`, `goals`, `remote_plugin`, `personality`, `shell_tool`, `enable_request_compression`, `skill_mcp_dependency_install`, `fast_mode`, worktrees.

Opt-in: `memories`, `code_mode.enabled`, `rollout_budget.enabled`, `cli_daybreak`, `instant_interrupt`, `network_proxy`, `prevent_idle_sleep`.

`codex features list` is authoritative for the installed version.

## Profiles

A profile is `$CODEX_HOME/<name>.config.toml`, layered on top of the base config when selected with `codex --profile <name>` or `codex exec -p <name>`. Example:

```toml
# $CODEX_HOME/review.config.toml
model = "gpt-6-astra"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
```

## Custom agents

TOML files in `$CODEX_HOME/agents/` (personal) or `<repo>/.codex/agents/` (project). Required: `name`, `description`, `developer_instructions`. Optional: `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config`. Built-in agents: `default`, `worker`, `explorer`. Commander's mirror ships one file per specialist agent in `agents/*.toml`.

## Marketplace entry format

Commander's repository marketplace is `.agents/plugins/marketplace.json`:

```json
{
  "name": "commander-hub",
  "interface": { "displayName": "CC Commander" },
  "plugins": [
    {
      "name": "commander",
      "source": { "source": "local", "path": "./commander/cowork-plugin-codex" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

`policy.installation`: `AVAILABLE`, `INSTALLED_BY_DEFAULT`, `NOT_AVAILABLE`. Installed plugins are cached under `$CODEX_HOME/plugins/cache/<marketplace>/<plugin>/<version>/`. Plugin hooks stay untrusted until reviewed with `/hooks` inside Codex.
