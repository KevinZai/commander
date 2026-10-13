---
description: "Detect and set the package manager (npm, pnpm, yarn or bun) that commands and hooks use, for this project or globally. Use when installs run with the wrong package manager or a project switches managers."
disable-model-invocation: true
---

# /ccc-setup-pm — pick the package manager

**CC Commander** · /ccc-setup-pm · one saved package-manager preference, project or global, confirmed by detection.

The setup script ships with the Everything Claude Code toolkit (`scripts/setup-package-manager.js`), an opt-in install that is absent by default.

## Detection order

The first match wins:

1. Environment variable `CLAUDE_PACKAGE_MANAGER`
2. Project config `.claude/package-manager.json`
3. The `packageManager` field in `package.json` (for example `"pnpm@8.6.0"`)
4. Lock file: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` or `bun.lockb`
5. Global config `~/.claude/package-manager.json`
6. Fallback: the first installed of pnpm, bun, yarn, npm

Both config files hold `{"packageManager": "<name>"}`.

## What happens

1. Locate the script:

   ```bash
   for d in "${CLAUDE_PLUGIN_ROOT:-}" "$HOME/.claude" "$HOME"/.claude/plugins/cache/everything-claude-code/*/*; do
     [ -n "$d" ] && [ -f "$d/scripts/setup-package-manager.js" ] && { echo "$d"; break; }
   done
   ```

   Use the printed directory as `ECC_ROOT` in later calls (shell state does not persist). If nothing prints, say the script is not installed, show the config-file format above so the user can write it by hand, and stop.

2. Show the current result and what is installed:

   ```bash
   node "<ECC_ROOT>/scripts/setup-package-manager.js" --detect
   node "<ECC_ROOT>/scripts/setup-package-manager.js" --list
   ```

3. If `$ARGUMENTS` already names a manager and a scope (`--project bun`, `--global pnpm`), go to step 5. Otherwise ask with AskUserQuestion (Codex: a plain-text question) which manager to use, offering the installed ones from `--list`, the detected one first and marked 🟢.

4. Ask for the scope:

   - 🟢 This project — writes `.claude/package-manager.json`
   - Global — writes `~/.claude/package-manager.json` for every project without its own setting
   - Environment only — print the export line and write nothing

5. Apply it:

   ```bash
   node "<ECC_ROOT>/scripts/setup-package-manager.js" --project <name>
   node "<ECC_ROOT>/scripts/setup-package-manager.js" --global <name>
   ```

   For environment only, print `export CLAUDE_PACKAGE_MANAGER=<name>` (macOS/Linux) or `$env:CLAUDE_PACKAGE_MANAGER = "<name>"` (PowerShell) for the user to add to their shell profile.

6. Verify by running `--detect` again and reporting the manager and the source it came from. If a higher-priority source (the environment variable, or a `packageManager` field) still overrides the new setting, say which one.

## Done when

`--detect` reports the chosen manager, or the report names the higher-priority source that overrides it.

## Guardrails

- Never install a package manager; suggest the install command instead.
- Never edit `package.json` or delete a lock file as part of this command.

## See also

`/ccc-init` · `/ccc-build-fix`
