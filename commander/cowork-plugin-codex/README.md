# Cowork Plugin — Codex Adapter Mirror

**Purpose:** Codex CLI–compatible version of `commander/cowork-plugin/`. Lets users install CC Commander via Codex's plugin system instead of Claude Code's.

**Generated, never hand-edited** — `scripts/build-codex.js` (`npm run build:codex`) regenerates this tree from `commander/cowork-plugin/` plus `commander/adapters/codex/`. Make every change in the Claude plugin source and rebuild; edits made here are overwritten. This README is the one file the build preserves.

---

## 📦 What's mirrored

| Folder | Source of truth | Mirror |
|--------|----------------|--------|
| Skills | `commander/cowork-plugin/skills/*/SKILL.md` | `commander/cowork-plugin-codex/skills/*/SKILL.md` |
| Agents | `commander/cowork-plugin/agents/*.md` (Markdown frontmatter) | `commander/cowork-plugin-codex/agents/*.toml` (TOML frontmatter — Codex format) |
| Hooks | `commander/cowork-plugin/hooks/*.js` | `commander/cowork-plugin-codex/hooks/*.js` (identical JS) |
| Plugin manifest | `commander/cowork-plugin/.claude-plugin/plugin.json` | `commander/cowork-plugin-codex/.codex-plugin/plugin.json` |
| Hub menu refs | `commander/cowork-plugin/skills/ccc/references/main-menu.json` | `commander/cowork-plugin-codex/skills/ccc/references/main-menu.json` |
| Banner | `commander/cowork-plugin/lib/banner.txt` | `commander/cowork-plugin-codex/lib/banner.txt` |
| Rules / personas | `commander/cowork-plugin/rules/personas/*.md` | `commander/cowork-plugin-codex/rules/personas/*.md` |

## 🔁 Change workflow

1. Edit the source: `commander/cowork-plugin/` (skills, agents, hooks, lib) or the Codex overlays in `commander/adapters/codex/`.
2. Rebuild the mirror:

   ```bash
   npm run build:codex
   ```

   The build converts each Markdown agent to Codex TOML, translates hook registrations to the Codex events it supports, and copies skills and hook scripts. It wipes and rewrites this tree on every run (only this README survives).
3. Review the generated diff under `commander/cowork-plugin-codex/` and commit it with the source change.

Never copy files into this tree by hand or edit generated files here: the next build discards the change.

## ✅ Verification

After any mirror change, run:

```bash
# Both trees compile
node --check commander/cowork-plugin/hooks/*.js
node --check commander/cowork-plugin-codex/hooks/*.js

# Skill counts match
test "$(ls commander/cowork-plugin/skills | wc -l)" \
   = "$(ls commander/cowork-plugin-codex/skills | wc -l)" \
   && echo "✓ skill counts match"

# Agent counts match (different extensions)
test "$(ls commander/cowork-plugin/agents/*.md | wc -l)" \
   = "$(ls commander/cowork-plugin-codex/agents/*.toml | wc -l)" \
   && echo "✓ agent counts match"

# Audit
node commander/scripts/audit-naming.js --check
```

## 🚨 Common pitfalls

| Pitfall | How to avoid |
|---------|--------------|
| Forgot to mirror — drift introduced | Always run `git status` before commit; if only one tree changed, mirror the other |
| TOML quoting bugs in agent files | Use single quotes for descriptions containing apostrophes; escape with `'''` for triple-quoted strings |
| Hook references different relative paths | Both trees use `../lib/telemetry.mjs` — same path, works in both contexts |
| Codex manifest version drift | When bumping plugin version, update BOTH `.claude-plugin/plugin.json` AND `.codex-plugin/plugin.json` |
| New skill added to source but not mirror | `audit-naming.js` will FAIL the build — catches it before merge |

## 📚 Related docs

- `NAMING.md` (root) — canonical naming conventions for both trees
- `commander/scripts/audit-naming.js` — enforces consistency
- `scripts/check-product-contract.js` — enforces counts (skills, agents, hooks)
- `BIBLE.md` — user-facing documentation

---

*Last updated: 2026-05-15 · Maintainer: Kevin Zicherman · @kzic*
