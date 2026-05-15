# Cowork Plugin — Codex Adapter Mirror

**Purpose:** Codex CLI–compatible version of `commander/cowork-plugin/`. Lets users install CC Commander via Codex's plugin system instead of Claude Code's.

**Maintained as a parallel mirror** — every change to `commander/cowork-plugin/skills/` or `commander/cowork-plugin/agents/` must be replicated here. The two trees stay in lockstep by convention + the doc-sync gate in CI.

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

## 🔁 Sync workflow

### When you add or modify a SKILL

```bash
# 1. Make the change in the source tree
vim commander/cowork-plugin/skills/ccc-newskill/SKILL.md

# 2. Mirror to codex tree
cp -r commander/cowork-plugin/skills/ccc-newskill \
      commander/cowork-plugin-codex/skills/ccc-newskill

# 3. Run audits to catch drift
node commander/scripts/audit-naming.js --check
node scripts/check-product-contract.js
```

### When you add or modify an AGENT

Agent files differ in format between the two trees:

| Format | Claude Code (source) | Codex (mirror) |
|--------|---------------------|----------------|
| Extension | `.md` | `.toml` |
| Frontmatter | YAML (`---` delimited) | TOML (`[key]` sections) |
| Body | Markdown | Same Markdown body — appended after TOML config |

Mirror map (already in place for 22 personas):
```
commander/cowork-plugin/agents/architect.md
   ↕
commander/cowork-plugin-codex/agents/architect.toml
```

When updating an agent's persona, edit BOTH files and keep the markdown body in sync.

### When you modify a HOOK

Hook files are identical JS in both trees — just `cp`:

```bash
cp commander/cowork-plugin/hooks/<hook>.js \
   commander/cowork-plugin-codex/hooks/<hook>.js
```

Shared lib path (`../lib/telemetry.mjs`) resolves identically in both contexts. No changes needed.

## 🤖 Future automation

A sync script at `scripts/sync-codex-mirror.mjs` could automate this in one command. Not built yet — manual mirror is the current pattern because:

1. Agent format diff (Markdown → TOML) requires conversion logic that's been changing
2. Codex-specific frontmatter fields (sandbox_mode, model_reasoning_effort) need preservation
3. Manual review at sync time catches accidental cross-platform regressions

**If/when the script lands:** invoke `node scripts/sync-codex-mirror.mjs` after every change. Spec is in `tasks/spec-codex-sync.md` (not yet authored — open ticket CC-859).

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
