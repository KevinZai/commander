---
name: ccc-ecc
description: "Selective ECC loader: pick one Everything Claude Code skill, agent or hook from the vendored checkout and symlink or copy only that component into ~/.claude, with a backup, never the full harness. Use when the user wants a single ECC component without installing ECC."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[skill | agent | hook | list]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# /ccc-ecc — one ECC component, nothing else

**CC Commander** · /ccc-ecc · installs a single Everything Claude Code (ECC) skill, agent or hook into `~/.claude/` from the pinned vendor checkout.

## When to use / when not to

- Use when the user wants one ECC skill, agent or hook (for example a reviewer agent or a single hook script) without ECC's installer, settings, commands or rules.
- Do not use to install or update the whole ECC harness, to change `settings.json`, or to edit ECC itself. For refreshing vendor checkouts use `/ccc-upgrade`.

ECC is vendored as a git submodule at `vendor/everything-claude-code/` (upstream `affaan-m/everything-claude-code`). Its components live in `skills/<name>/SKILL.md`, `agents/<name>.md` and `scripts/hooks/<name>.js` (hook wiring is declared in its `hooks/hooks.json`).

## What happens

1. **Locate ECC.** From a CC Commander checkout:

   ```bash
   ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
   for c in "$ROOT/vendor/everything-claude-code" "${CLAUDE_PLUGIN_ROOT}/../../vendor/everything-claude-code"; do
     [ -d "$c/skills" ] && { ECC="$(cd "$c" && pwd)"; break; }
   done
   echo "${ECC:-missing}"
   ```

   If it prints `missing`, stop: "ECC vendor checkout not found at `vendor/everything-claude-code/`. Run `git submodule update --init vendor/everything-claude-code` in a CC Commander checkout, or `/ccc-upgrade`." Plugin installs from a marketplace do not carry `vendor/`, so this skill needs a repo checkout.

2. **Ask the component type** with the type picker (an argument of `skill`, `agent`, `hook` or `list` skips it).

3. **Inventory candidates.**

   ```bash
   find "$ECC" \( -path '*/node_modules' -o -path '*/.git' -o -path '*/dist' -o -path '*/build' \) -prune -o \
     \( -path "$ECC/skills/*/SKILL.md" -o -path "$ECC/agents/*.md" -o -path "$ECC/scripts/hooks/*.js" -o -path "$ECC/scripts/hooks/*.sh" \) -print
   ```

   Classify `skills/<name>/SKILL.md` as skills, `agents/*.md` as agents, `scripts/hooks/*.{js,sh}` as hooks. Read counts from this output; never quote a remembered count. For "List available ECC components", render grouped markdown tables (name, relative path) and stop.

4. **Pick one component with a cascade, never a typed-name table.** A picker holds at most four options.
   - **Level 1, category.** When more than four candidates match: if they group by directory prefix, offer up to three buckets plus "More categories…"; otherwise split alphabetically into about four buckets of `ceil(N/4)` computed from the real names. Never hardcode letter ranges such as "A–F"; they skew on real names. Each option's description is "<N> components".
   - **Level 2, component.** Four or fewer left: offer them directly (label = component name, description = path relative to the ECC root). Still more than four: repeat Level 1 on that subset.
   - **Typed filter, last resort only.** If two cascades still leave a bucket with more than 16 candidates, ask for a substring, then present the matches as a picker (cascading again if needed). Never ask for an exact name or path as the first move.

5. **Ask symlink or copy** with the mode picker.
   - Hooks that load sibling modules must be symlinked: check with `grep -lE "require\(['\"]\.\./|from ['\"]\.\./" "$SRC"`. A match means a copy would break the hook; offer Symlink and Cancel only, and say why.

6. **Map the destination.**

   | Component | Source | Destination |
   |---|---|---|
   | Skill | `$ECC/skills/<name>/` (whole directory, so its references and scripts come along) | `~/.claude/skills/<name>/` |
   | Agent | `$ECC/agents/<name>.md` | `~/.claude/agents/<name>.md` |
   | Hook | `$ECC/scripts/hooks/<name>.js` or `.sh` | `~/.claude/hooks/<name>.js` or `.sh` |

   ```bash
   mkdir -p "$(dirname "$DEST")"
   test -e "$DEST" -o -L "$DEST" && echo exists || echo free
   ```

   If it exists, ask the conflict picker. On "Replace with backup": `mv "$DEST" "$DEST.backup-$(date +%Y%m%d-%H%M%S)"`.

7. **Install.**

   ```bash
   # Symlink mode (SRC is absolute, so the link survives a cwd change)
   ln -s "$SRC" "$DEST"
   # Copy mode
   cp -R "$SRC" "$DEST"
   ```

8. **Verify and report.**

   ```bash
   ls -ld "$DEST"; [ -L "$DEST" ] && readlink "$DEST"
   [ -d "$DEST" ] && test -f "$DEST/SKILL.md" && echo "skill ok"
   ```

   Report source, destination, mode, the backup path if one was made, and the next step: a skill or agent loads in the next session; a hook is only a file until the user registers it in their own `settings.json` hooks block (point them at ECC's `hooks/hooks.json` entry for that script as the reference shape).

## Decision points

- **Type** (header "ECC"): 🟢 **Load a skill** (most ECC value is here) · **Load an agent** · **Load a hook** (file only; wiring stays manual) · **List available ECC components** (read-only).
- **Mode** (header "Mode"): 🟢 **Symlink** (follows the pinned vendor checkout on every submodule update) · **Copy** (editable snapshot that no longer updates) · **Cancel**.
- **Conflict** (header "Exists"): 🟢 **Keep existing** (nothing changes) · **Replace with backup** (moves the current file aside first).

In Codex or any surface without `AskUserQuestion`, ask the same choices as one plain-text question.

## Done when

- `ls -ld "$DEST"` shows the component, and for symlinks `readlink` points inside `vendor/everything-claude-code/`.
- A skill destination contains `SKILL.md`.
- The report names source, destination, mode and any backup.

## Guardrails

- Installing into `~/.claude/` changes the user's configuration; do it only for the component the user picked in this conversation.
- Never copy the full ECC harness, its command tree, rules, `settings.json` or installer output into `~/.claude/`.
- Never overwrite an existing skill, agent or hook without the conflict picker and a backup.
- Never edit files under `vendor/everything-claude-code/`.
- Never install binaries, `node_modules` or dependency folders, and never run ECC's `install.sh`.
- Never register an ECC hook in settings automatically.

## See also

- `/ccc-upgrade` — refresh vendor checkouts, including ECC.
- `/ccc-suggest` — find a skill or plugin for the task at hand.
- `/ccc-settings` — inspect and edit Claude Code settings, including hooks.

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
