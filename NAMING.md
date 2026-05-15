# Naming Conventions — CC Commander

**Last updated:** 2026-05-15
**Authority:** This document. When in doubt, follow these rules.

CC Commander uses a single canonical naming system across every surface — skills, slash commands, agents, hooks, and brand prose. This document codifies the rules so contributors don't have to guess.

---

## 🟢 The 5 rules

### Rule 1 — Skill slugs are lowercase kebab-case, prefixed `ccc-`

```
✅ ccc-build              ✅ ccc-night-mode         ✅ ccc-linear-board
❌ CCC-Build              ❌ ccc_build              ❌ build (no prefix)
❌ ccc:build (colon)      ❌ ccc/build (slash)      ❌ cccBuild (camelCase)
```

The directory name, the file name, and the `name:` field in SKILL.md frontmatter MUST all match.

```
commander/cowork-plugin/skills/ccc-build/SKILL.md
                                 ▲
                                 │
                                 └── name: ccc-build (frontmatter)
```

### Rule 2 — Slash commands are `/ccc-<slug>` with dash, never colon

```
✅ /ccc-build             ✅ /ccc-night-mode        ✅ /ccc-init
❌ /ccc:build             ❌ /ccc/build             ❌ /build (no prefix)
```

The colon form (`/ccc:foo`) was used pre-v4.1 and is deprecated. Every reference in user-facing docs, README, BIBLE, CHEATSHEET, mintlify-docs MUST use the dash form. Historical files (CHANGELOG, docs/_archive/, PLAN.md) preserve the old form for accuracy — leave them.

Exception: `commander/cowork-plugin/skills/ccc-cheatsheet/SKILL.md` line ~148 intentionally documents the legacy `/ccc:X` syntax in a deprecation callout. That single mention stays.

### Rule 3 — Brand suffix in marketing prose is `(Commander)` with capital C

```
✅ Night Mode (Commander)            ✅ Fleet Commander
❌ Night Mode (commander)            ❌ Night Mode (CCC)
❌ Night Mode (CC Commander)         ❌ Night Mode [Commander]
```

Use `(Commander)` to disambiguate plugin features from generic prose. Capital C matches the brand displayName ("Commander" in `plugin.json:3`).

### Rule 4 — Technical identifiers stay lowercase

These are package / repo / install identifiers, NOT marketing copy:

| Surface | Value | Why lowercase |
|---------|-------|---------------|
| Plugin name | `commander` | Matches `plugin.json:name` |
| Plugin displayName | `Commander` | Marketing-facing — capital |
| Marketplace ID | `commander-hub` | Matches `.claude-plugin/marketplace.json:name` |
| npm package | `cc-commander` | Historical, can't change |
| GitHub repo | `KevinZai/commander` | Lowercase per Git convention |
| Hosted MCP | `mcp.commanderplugin.com` | DNS — lowercase by RFC |
| MCP server key | `cc-commander` | Distinct from plugin name (historical) |

```
✅ /plugin install commander
✅ npm install cc-commander
✅ mcp.commanderplugin.com
❌ /plugin install Commander
❌ npm install CC-Commander
```

### Rule 5 — Product references in prose are "CC Commander" (capital CC)

```
✅ CC Commander v4.1.0-beta.2
✅ CC Commander is the first guided AI PM…
❌ cc commander                              (lowercase)
❌ CC-Commander                              (hyphen)
❌ Commander                                 (drop the "CC")
```

Use "CC Commander" when referring to the product in narrative prose. Use just "Commander" only when the context is unambiguous (e.g., the plugin chip in the marketplace UI).

---

## 🚫 Things that ARE NOT slash commands

Don't prefix these with `ccc-`:

- **Sub-skills inside CCC domains** — `skills/<domain>/<skill>/` (e.g., `skills/ccc-seo/technical-seo/`) — these are dispatched THROUGH the domain router, not invoked directly. Sub-skill directory names stay short.
- **Plugin internal libraries** — `commander/cowork-plugin/lib/*.js` — module names, not slash commands.
- **Hooks** — `commander/cowork-plugin/hooks/*.js` — hooks fire automatically, not user-invoked.
- **Tests** — `commander/tests/*.test.js` — test file names don't need a brand prefix.

---

## 🤖 Auto-enforcement

Two scripts gate naming compliance:

| Script | What it checks |
|--------|---------------|
| `commander/scripts/audit-naming.js` | Plugin skills + agents + commands · description length ≤200 · no stale `[C:domain]` prefix · no `/ccc:` colon form (with documented exceptions) |
| `scripts/check-product-contract.js` | Canonical counts (60 skills, 22 agents, 9 hooks, etc.) · pricing model · cross-platform compat |

Both run on CI (`.github/workflows/ci.yml`). A PR that breaks naming compliance fails the build.

Run locally before pushing:

```bash
node commander/scripts/audit-naming.js --check
node scripts/check-product-contract.js
```

---

## 📐 Adding a new skill

1. Pick a name in lowercase kebab-case: `ccc-<verb-or-domain>`
2. Create directory: `commander/cowork-plugin/skills/ccc-<name>/`
3. Create `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: ccc-<name>
   description: "..."   # ≤200 chars, NO [C:*] prefix
   model: sonnet        # or opus / haiku
   ---
   ```
4. Mirror to codex adapter: `commander/cowork-plugin-codex/skills/ccc-<name>/SKILL.md`
5. Run `node commander/scripts/audit-naming.js --check`
6. Run `node bin/doc-sync.js`
7. Commit + PR

---

## 📐 Adding a new slash command

If it's a CCC command, name the file `commands/ccc-<name>.md`. The filename IS the slash command.

```bash
# Creates the /ccc-newverb command
touch commands/ccc-newverb.md
```

Frontmatter:
```yaml
---
description: "..."   # ≤200 chars
---
```

---

## 🎟️ Renaming an existing skill

Renaming `/ccc-old` → `/ccc-new` requires three coordinated changes:

1. **File rename** — `git mv commander/cowork-plugin/skills/ccc-old commander/cowork-plugin/skills/ccc-new`
2. **Frontmatter** — Update `name: ccc-new` in SKILL.md
3. **Mirror** — Same two changes in `commander/cowork-plugin-codex/skills/`
4. **Docs sweep** — `grep -rl "/ccc-old\b" --include="*.md"` and bulk-replace user-facing references
5. **CHANGELOG** — Note the rename + deprecation alias if there's significant prior usage

---

## 🧭 History

- **v4.0** — Used `[C:domain] — ` description prefixes for catalog hygiene. Removed in v4.1.0-beta.2 after they leaked into the chip picker.
- **Pre-v4.1** — Slash commands used colon namespace: `/ccc:build`. Stripped to dash form in v4.1.
- **v4.1.0-beta.2** — All slash commands normalized to `/ccc-*` (this document codifies the result). 70 commands renamed, 10 duplicates removed. Two-wave audit (Haiku scan + Codex verification) caught the long tail.

---

*Maintainer: Kevin Zicherman · @kzic · Updated 2026-05-15*
