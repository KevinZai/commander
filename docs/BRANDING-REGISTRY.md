# Branding Registry

Complete catalog of every branding touchpoint in Claude Code Kit / Kit Commander.
Use this to quickly pivot branding if product name, author, or URLs change.

**Total touchpoints:** 227 references across 65 files
**Last audited:** 2026-03-29 (v1.5.0)

---

## Tier 1: Legal/Identity (change requires new release)

| File | Content | Category |
|------|---------|----------|
| `LICENSE` | Copyright (c) 2026 Kevin Zicherman | Legal |
| `package.json` | author: Kevin Zicherman, homepage: kevinz.ai, repo: k3v80 | NPM |
| `commander/branding.js` | All product strings — single source of truth | Code |

## Tier 2: Product (change in next release)

| File | Content | Category |
|------|---------|----------|
| `README.md` | "by Kevin Z", story section, author section, kevinz.ai links | Hero |
| `BIBLE.md` | "by Kevin Z" header, About the Author section, footer | Guide |
| `CHEATSHEET.md` | "by Kevin Z" header | Reference |
| `SKILLS-INDEX.md` | "by Kevin Z" header | Reference |
| `CHANGELOG.md` | Kevin Z attribution in release notes | History |
| `CLAUDE.md` | k3v80/claude-code-kit references | Project config |
| `install.sh` | github.com/k3v80 clone URL | Installer |
| `install-remote.sh` | raw.githubusercontent.com/k3v80 URL | Installer |
| `lib/terminal-art.sh` | github.com/k3v80 in footer | Terminal UI |

## Tier 3: Marketing (change anytime, no build impact)

| File | Content | Category |
|------|---------|----------|
| `docs/index.html` | "Built by Kevin Z" footer, @kzic link | Landing page |
| `docs/assets/og-image.svg` | "by Kevin Z", kevinz.ai | Social preview |
| `docs/x-threads.md` | @kzic, kevinz.ai references | Social content |
| `docs/x-articles.md` | @kzic, kevinz.ai references | Social content |
| `marketing/x-article.md` | k3v80 references | Marketing |
| `docs/awesome-submission.md` | k3v80/claude-code-kit | PR draft |
| `docs/BRANDING-PLAN.md` | Full brand strategy | Strategy |
| `docs/FEATURE-OVERVIEW.md` | k3v80 GitHub | Feature docs |
| `docs/INFOGRAPHIC.md` | k3v80 GitHub | Visual marketing |
| `docs/MONETIZATION.md` | kevinz.ai references | Revenue model |
| `prompts/marketing/ad-copy.md` | Landing page URL | Marketing |
| `guides/quickstart-beginner.md` | k3v80/claude-code-kit | User guide |

## Tier 4: Internal (no customer impact)

| File | Content | Category |
|------|---------|----------|
| `kevin/` directory | Personal overlay (not installed by default) | Internal |
| `docs/BRANDING-PLAN.md` | Brand architecture strategy | Internal |
| `docs/competitive-scan-v1.3.md` | Competitive analysis | Internal |
| `docs/RESEARCH.md` | Research notes | Internal |
| `.claude-plugin/plugin.json` | repository: k3v80 | Plugin manifest |

## Tier 5: Code (auto-generated or hook banners)

17 hook files in `hooks/` contain "Kevin Z's Claude Code Kit" in their header comment.
These are internal identifiers, not user-facing. Change via find-and-replace if needed.

`lib/kit-stats.js` contains the same header comment.

---

## Quick Pivot Commands

```bash
# Preview all branding references
grep -rn "kevinz\.ai\|Kevin Z\|k3v80\|@kzic" --include="*.md" --include="*.json" --include="*.js" --include="*.html" --include="*.sh" | grep -v node_modules

# Count touchpoints
grep -rl "kevinz\.ai\|Kevin Z\|k3v80\|@kzic" --include="*.md" --include="*.json" --include="*.js" --include="*.html" --include="*.sh" | grep -v node_modules | wc -l

# Replace author name (dry run)
grep -rl "Kevin Z" --include="*.md" | grep -v node_modules | xargs grep -l "Kevin Z"
```

## Env Var Namespaces

| Prefix | Owner | Examples |
|--------|-------|---------|
| `KC_*` | Kit Commander (v1.5+) | `KC_NO_COLOR`, `KC_THEME` |
| `CC_*` | Claude Code Kit (v1.0+) | `CC_NO_COLOR`, `CC_OPENCLAW_ENABLED` |
| `KZ_*` | Legacy (deprecated) | `KZ_NO_COLOR` — still supported via backward compat |
