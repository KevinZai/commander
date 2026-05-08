---
name: ccc-doc-sync
description: "[C:meta] — Sync count references and version strings across docs from contract.json + package.json. Run --check in CI to catch drift."
allowed-tools:
  - Read
  - Edit
  - Bash
  - Glob
  - Grep
version: 1.0.0
argument-hint: "[--check | --apply]"
---

# /ccc-doc-sync — Doc Count Synchronizer

Keeps every count reference (`plugin_skills`, `specialist_agents`, `hook_handlers`) and version string in sync across the entire project. One source of truth — never manually edit numbers in docs again.

## What it does

Reads two canonical sources:
- `commander/contract.json` — `plugin_skills`, `specialist_agents`, `hook_handlers`
- `package.json` — `version`

Then applies surgical regex replacements across 20+ doc files, updating every occurrence of stale counts. Idempotent — running twice produces the same output.

## How it works

1. Load values from `contract.json` + `package.json`
2. Read `patterns.json` — declarative per-file replacement rules
3. For each file: apply all patterns, compare before/after
4. `--check`: report drift, exit 1 if any file is stale (CI gate)
5. `--apply`: write changes, exit 0

The pattern engine uses `${plugin_skills}`, `${specialist_agents}`, `${hook_handlers}`, `${version}` template vars. Adding support for a new file is a JSON edit in `patterns.json` — no code change.

## Files covered

| Category | Files |
|---|---|
| Root docs | `README.md`, `BIBLE.md`, `CHEATSHEET.md`, `SKILLS-INDEX.md`, `CLAUDE.md` |
| Plugin manifest | `commander/cowork-plugin/.claude-plugin/plugin.json`, `CONNECTORS.md` |
| Mintlify docs | `introduction.mdx`, `install.mdx`, `agents.mdx`, `skills.mdx`, `free-vs-pro.mdx`, `install-recovery.mdx` |
| Landing page | `docs/index.html` |
| Site components | `site/components/hero.tsx`, `site/components/skills-showcase.tsx` |
| Video scenes | `scene-hero.jsx`, `scene-agents.jsx`, `scene-compare.jsx`, `scene-hooks.jsx`, `scene-install.jsx` |

## Usage

```bash
# Dry-run — show what would change, exit 1 if drift detected
node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check

# Apply changes
node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --apply

# Via npm scripts
npm run docs:sync:check   # CI gate (--check)
npm run docs:sync         # Apply all changes
```

## When to run

- After bumping `contract.json` plugin_skills count (new skill added)
- After bumping `contract.json` specialist_agents count (new agent added)
- After bumping `contract.json` hook_handlers count (new handler added)
- After running `npm version` (updates package.json version)
- `docs:sync:check` runs automatically in `prepublishOnly`

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All files in sync (--check) or all updates applied (--apply) |
| 1 | Drift detected (--check mode only) |
| 2 | Regex or file error |

## Adding a new file

Edit `patterns.json` only — no JS changes needed:

```json
{
  "file": "path/to/new-file.md",
  "replacements": [
    {
      "regex": "(Some prefix\\s*)\\d+( skills)",
      "flags": "g",
      "template": "$1${plugin_skills}$2"
    }
  ]
}
```

## Architecture

```
sync.js          runner — args, output, exit codes
patterns.json    declarative replacements per file (the contract)
SKILL.md         this file
```

The `.js` file contains no hardcoded counts. All patterns live in `patterns.json`.
