---
name: ccc-codex
description: "Manage the OpenAI Codex CLI: doctor, models, plugins, MCP servers, custom agents, cloud tasks, remote control, reviews, updates, import and config, backing up config first. Use when the user asks to check, set up or manage Codex."
allowed-tools:
  - Read
  - Bash
  - Edit
  - Write
  - AskUserQuestion
argument-hint: "[doctor | models | plugins | mcp | agents | cloud | remote | review | update | import | config]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# $ccc-codex — manage the Codex CLI

**CC Commander** · $ccc-codex · check, configure and extend the local Codex CLI without leaving the session

## When to use / when not to

- Use to diagnose Codex, pick its default model, install Commander's Codex plugin, add MCP servers or custom agents, run Codex reviews or cloud tasks, or change Codex config and feature flags.
- Do not use to delegate a whole implementation task to Codex; use `$ccc-orchestrate`.
- Do not use for Claude Code settings; use `$ccc-settings`.

Reference tables live beside this file: [references/models.md](references/models.md) (model lineup and effort levels), [references/commands.md](references/commands.md) (every subcommand and flag used here), [references/config.md](references/config.md) (config keys, feature flags, profiles, marketplace format).

## What happens

### Step 0 — preflight (every subcommand)

```bash
command -v codex && codex --version
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
CODEX_CONFIG="$CODEX_HOME_DIR/config.toml"
echo "$CODEX_CONFIG"; [ -f "$CODEX_CONFIG" ] && echo "config present" || echo "no config yet"
```

If `codex` is missing, stop and say: "Codex CLI not found. Install it with `npm install -g @openai/codex`, then rerun `$ccc-codex doctor`." Honor `CODEX_HOME` everywhere below; never assume `~/.codex` when it is set.

### Step 1 — route

If `$ARGUMENTS` names a subcommand, go to that section. On a bare invocation, ask with AskUserQuestion (header "Codex"); on Codex itself, ask the same options as a numbered plain-text question:

- 🟢 **Health check** — `codex doctor`, then the fix for whatever fails
- **Models and config** — default model, effort, feature flags, profiles, update, import
- **Extensions** — plugins (including Commander's mirror), MCP servers, custom agents
- **Run work** — review, cloud tasks, remote control

Then ask a second picker with the subcommands in the chosen group.

### Config backup (before any change to config.toml)

Every command that writes config (`features enable|disable`, `mcp add|remove`, `plugin add|remove`, `plugin marketplace add|remove`, a model or profile edit) runs only after the user confirms, and only after this backup:

```bash
CODEX_CONFIG="${CODEX_HOME:-$HOME/.codex}/config.toml"
BACKUP="$CODEX_CONFIG.backup-$(date +%Y%m%d-%H%M%S)"
[ -f "$CODEX_CONFIG" ] && cp -p "$CODEX_CONFIG" "$BACKUP" && echo "backup: $BACKUP"
```

After the change, verify with `codex doctor --json --summary` (the `config.load` check must be `ok`). On failure, restore with `cp -p "$BACKUP" "$CODEX_CONFIG"` and report the error verbatim.

### doctor

```bash
codex doctor --json --summary
```

Read `overallStatus` (`ok`, `warning`, `error`) and each entry of `checks` (`id`, `category`, `status`, `summary`, `remediation`). Report a short table of every check that is not `ok` with its `remediation`. The report is redacted by Codex; do not print anything from `auth.json`. Common fixes:

| Failing check | Next step |
|---|---|
| `auth.credentials` | The user runs `codex login` in their own terminal (browser OAuth); this skill never handles tokens |
| `config.load` | Show the parse error; offer to restore the newest `config.toml.backup-*` |
| `mcp.*` | Go to the mcp section |
| version or update notice | Go to the update section |

For the full human report, run `codex doctor --all --no-color`.

### models

1. Show the lineup and roles from [references/models.md](references/models.md): `gpt-6-astra` (deep, review, verify), `gpt-6.1-sol` (catalog default, default executor), `gpt-6-sol` (bounded implementation), `gpt-6-luna` (mechanical, high volume).
2. Show what is configured:
   ```bash
   grep -nE '^\s*(model|model_reasoning_effort|review_model|model_provider)\s*=' "${CODEX_HOME:-$HOME/.codex}/config.toml" || echo "no model keys set (Codex uses its catalog default)"
   ```
   Only lines before the first `[table]` header are top-level; report keys found under a table (for example `[profiles.x]`) separately.
3. Offer a change with AskUserQuestion (header "Codex model"): 🟢 **Keep current** — no change / **gpt-6.1-sol** — balanced default / **gpt-6-astra** — deepest, costlier / **gpt-6-luna** — fastest. Ask effort separately only if the user wants it (`low`, `medium`, `high`, `xhigh`, `max`, `ultra`; `gpt-6-luna` stops at `max`).
4. On a change: back up, then Edit `config.toml`. Replace an existing top-level `model = "..."` line, or insert `model = "<id>"` above the first `[table]` header (or at the end of an empty file). Same for `model_reasoning_effort`. Never touch keys inside tables.
5. Verify: `codex doctor --json --summary` shows `config.load` ok, and the `grep` from step 2 prints the new value. A live probe (`codex exec --skip-git-repo-check -m <id> "reply with exactly: OK"`) costs a model call; run it only if the user asks.

### plugins

```bash
codex plugin list
codex plugin marketplace list
```

Install Commander's own Codex mirror. Ask with AskUserQuestion (header "Install from"):

- 🟢 **This checkout** — when the working directory is a Commander checkout (`.agents/plugins/marketplace.json` exists)
- **GitHub** — `codex plugin marketplace add KevinZai/commander`
- **Cancel**

Then, after the config backup:

```bash
codex plugin marketplace add "<repo-root or owner/repo>"
codex plugin add commander@commander-hub --json
codex plugin list --json
```

Done when `codex plugin list --json` shows `commander` under `installed` with `"enabled": true`. Tell the user that Codex treats plugin hooks as untrusted until they review them with `/hooks` inside Codex. Refresh a Git marketplace with `codex plugin marketplace upgrade`; remove with `codex plugin remove commander@commander-hub` (ask first).

### mcp

```bash
codex mcp list
codex mcp get <name>
```

- Add (ask first, back up first): stdio `codex mcp add <name> [--env KEY=VALUE] -- <command> <args...>`; HTTP `codex mcp add <name> --url <https-url> [--bearer-token-env-var <ENV_VAR>]`. Never put a token value on the command line; point to an environment variable instead.
- OAuth login opens a browser: the user runs `codex mcp login <name>` in their own terminal. Logout: `codex mcp logout <name>`.
- Remove (ask first, back up first): `codex mcp remove <name>`.
- Verify: `codex mcp list` shows the change and `codex doctor --json --summary` has no failing `mcp` check.

### agents

`codex agents` opens an interactive browser of agent sessions on the local app-server daemon; tell the user to run it in their own terminal.

Install Commander's specialist agents as Codex custom agents (TOML, required `name`, `description`, `developer_instructions`):

1. Find the generated TOML files, first match wins:
   ```bash
   ls commander/cowork-plugin-codex/agents/*.toml 2>/dev/null \
     || ls "${CODEX_HOME:-$HOME/.codex}"/plugins/cache/*/commander/*/agents/*.toml 2>/dev/null
   ```
   If neither exists, install the plugin first (plugins section).
2. Show each file's `name`, `model` and `sandbox_mode` (`grep -E '^(name|model|sandbox_mode) =' <file>`). Ask with AskUserQuestion (header "Agents", multiSelect): 🟢 **Read-only reviewers** — every file with `sandbox_mode = "read-only"` / **All agents** / **Pick by name** — the user lists names.
3. Install personal agents without overwriting:
   ```bash
   mkdir -p "${CODEX_HOME:-$HOME/.codex}/agents"
   cp -n <selected files> "${CODEX_HOME:-$HOME/.codex}/agents/"
   ```
   If a target file already exists, show both versions' `model` lines and ask before replacing it. For project-scoped agents use `<repo>/.codex/agents/` instead.
4. Verify: `ls "${CODEX_HOME:-$HOME/.codex}/agents/"` lists them, and `python3 -c 'import sys,tomllib; [tomllib.load(open(f,"rb")) for f in sys.argv[1:]]' <installed files>` exits 0 where Python 3.11+ is available.

### cloud

Codex Cloud is experimental and needs a configured environment.

```bash
codex cloud list --json --limit 10
codex cloud status <TASK_ID>
codex cloud diff <TASK_ID>
```

- Submit (ask first; it runs on the remote branch): `codex cloud exec --env <ENV_ID> [--branch <branch>] [--attempts <n>] "<task>"`. The branch must exist on the remote; pushing it needs the user's authorization.
- Apply changes the working tree. Ask first, and prefer a clean tree or a worktree: `git status --porcelain` must be empty, then `codex cloud apply <TASK_ID> [--attempt <n>]`. Verify with `git status --short` and `git diff --stat`.

### remote

Remote control runs the app-server daemon so another device can drive Codex. Each command needs confirmation.

```bash
codex remote-control start --json
codex remote-control pair --json
codex remote-control stop
```

The pairing code is short-lived and grants control of this machine: show it to the user once, never write it to a file or log. Verify a stop with `codex doctor --json --summary` (the `app_server.status` check reports `not running`).

### review

Read-only; it changes nothing. Pick the target with AskUserQuestion (header "Review"): 🟢 **Uncommitted changes** / **Against a base branch** / **One commit**.

```bash
codex review -c 'sandbox_mode="read-only"' -c 'review_model="gpt-6-astra"' --uncommitted
codex review -c 'sandbox_mode="read-only"' -c 'review_model="gpt-6-astra"' --base <branch>
codex review -c 'sandbox_mode="read-only"' -c 'review_model="gpt-6-astra"' --commit <sha>
```

Optional custom instructions go last as a quoted prompt. For JSONL events or a saved summary use `codex exec review --base <branch> -m gpt-6-astra --json --output-last-message <file>`. Use a Bash timeout of 300000 ms. Present the output verbatim, then add any disagreement as a separate note.

### update

```bash
codex --version
codex update
codex --version
```

Ask before `codex update`. Done when the second `--version` prints the new version. If the update fails because Codex was installed by a package manager, show the error and the matching command for that installer (for npm: `npm install -g @openai/codex@latest`); run it only after the user confirms.

### import

Codex can import an existing Claude Code setup (instructions, settings, projects and up to 50 chats) through its `/import` slash command, which runs only inside the interactive Codex TUI:

1. The user runs `codex` in their own terminal, types `/import`, and picks Claude Code.
2. Afterwards, run `$ccc-codex doctor` here to confirm the imported config loads.
3. Import does not install Commander's Codex plugin; use the plugins section for that.

### config

```bash
codex features list
```

- Enable or disable a feature (ask first, back up first): `codex features enable <feature>` / `codex features disable <feature>`. Verify with `codex features list`.
- Profiles are extra config files layered on the base config: `$CODEX_HOME/<name>.config.toml`, selected with `codex --profile <name>` (or `-p <name>` on `codex exec`). List them with `ls "${CODEX_HOME:-$HOME/.codex}"/*.config.toml`. Create one with Write only after the user confirms its content; it never replaces the base config.
- One-off overrides need no file change: `codex -c key=value ...`.
- Key and feature-flag reference: [references/config.md](references/config.md).

## Decision points

All pickers above use 2 to 4 options with the recommended one first. Every state change (config write, plugin or MCP add/remove, agent install, cloud submit or apply, remote start, update) gets its own confirmation at the moment it is about to run.

## Done when

The skill reports what it ran and the verification output for the chosen subcommand: `codex doctor --json --summary` result after any config change, `codex plugin list --json` after a plugin install, `codex mcp list` after an MCP change, the installed agent files, `git status --short` after a cloud apply, or the new `codex --version` after an update.

## Guardrails

- Never read, print or copy `auth.json`, tokens, or MCP secrets; logins happen in the user's own terminal.
- Never write config without the backup above and an explicit yes.
- Never pass `--dangerously-bypass-approvals-and-sandbox` or `--dangerously-bypass-hook-trust`, and never set `sandbox_mode = "danger-full-access"` as a default.
- Pushing branches for cloud tasks, applying cloud diffs, and starting remote control each need authorization in this conversation.
- Never delete config backups.

## See also

- `$ccc-orchestrate` — hand a goal file to a Codex executor and verify the result
- `$ccc-doctor` — Commander's own health check
- `$ccc-review` — Claude-side code review to compare with a Codex review
- `$ccc-settings` — Claude Code settings

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
