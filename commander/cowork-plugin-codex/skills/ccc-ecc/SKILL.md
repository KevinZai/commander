---
name: ccc-ecc
description: "Selective ECC loader: pick one Everything Claude Code skill, agent, or hook and link/copy it into ~/.claude without installing the full ECC harness."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

# /ccc-ecc — Selective ECC Loader

Load one specific **Everything Claude Code (ECC)** component into `~/.claude/` without copying the whole ECC harness.

ECC source lives at `vendor/everything-claude-code/`. This is a click-first picker: choose a skill, agent, or hook; then symlink or copy only that component.

## Safety model

- Prefer **symlink** so updates follow the pinned ECC vendor checkout.
- Offer **copy** for an editable local snapshot.
- Back up before replacing anything under `~/.claude/`.
- Never install ECC settings, commands, or the full harness.

## Steps

### 1. Locate ECC

```bash
git rev-parse --show-toplevel
test -d vendor/everything-claude-code && echo ok || echo missing
```

If missing, stop with:

> ECC vendor checkout not found at `vendor/everything-claude-code/`. Run `/ccc-upgrade` or initialize submodules first.

### 2. Ask what to do

```
question: "What ECC component do you want to load?"
header: "ECC"
multiSelect: false
options:
  - label: "Load a skill"
  - label: "Load an agent"
  - label: "Load a hook"
  - label: "List available ECC components"
```

### 3. Inventory candidates

```bash
ECC="vendor/everything-claude-code"
find "$ECC" \( -path '*/node_modules/*' -o -path '*/.git/*' -o -path '*/dist/*' -o -path '*/build/*' \) -prune -o \
  \( -path '*/skills/*/SKILL.md' -o -path '*/agents/*.md' -o -path '*/hooks/*.js' -o -path '*/hooks/*.sh' \) -print
```

Classify `skills/<name>/SKILL.md` as skills, `agents/*.md` as agents, and `hooks/*.{js,sh}` as hooks. If the user chose "List available", render grouped markdown tables and stop.

### 4. Ask which component

```
question: "Pick one ECC <skill|agent|hook> to load."
header: "Pick"
options:
  - label: "<component-name>"
    description: "<relative path under vendor/everything-claude-code>"
```

If there are too many options for a picker, show a numbered table and ask for the exact name or relative path.

### 5. Ask symlink or copy

```
question: "Install this ECC component as a symlink or a copy?"
header: "Mode"
options:
  - label: "Symlink (recommended)"
  - label: "Copy"
  - label: "Cancel"
```

### 6. Map destination

- Skill `skills/<name>/SKILL.md` → `~/.claude/skills/<name>/SKILL.md`
- Agent `<name>.md` → `~/.claude/agents/<name>.md`
- Hook `<name>.js|sh` → `~/.claude/hooks/<name>.js|sh`

```bash
mkdir -p "$DEST_DIR"
```

If the destination exists, ask: "Keep existing" or "Replace with backup". On backup, move the existing target to `.backup-YYYYMMDD-HHMMSS` before installing.

### 7. Install + verify

```bash
# Symlink mode
ln -s "$ABS_SOURCE" "$DEST"

# Copy mode
cp -R "$ABS_SOURCE" "$DEST"

# Verify
test -e "$DEST" && ls -l "$DEST"
```

Report the source, destination, mode, and whether a backup was made.

## Anti-patterns — DO NOT

- Do not copy the full ECC harness, command tree, or settings into `~/.claude/`.
- Do not overwrite existing local skills, agents, or hooks without a backup and confirmation.
- Do not edit files under `vendor/everything-claude-code/`.
- Do not install unknown binary files or dependency folders.
- Do not add ECC hooks to settings automatically; install the file and tell the user where it landed.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
