# Plugin Skills Audit — June 2026

**Scope:** All `commander/cowork-plugin/skills/*/SKILL.md` audited against Anthropic's official Claude Skills authoring guidance.
**Date:** 2026-06-30 · **Skills scanned:** 67 SKILL.md files (the CLAUDE.md "64" count is stale — see Finding G).
**Method:** Frontmatter parse + body grep for `AskUserQuestion` and `## Anti-patterns`, description-length measurement, `name`-vs-dirname comparison, `allowed-tools` presence, tool-name consistency. Reference template: `commander/cowork-plugin/skills/ccc-ultracode/SKILL.md`.

This is a doc-only audit. No SKILL.md files were modified.

---

## Anthropic guidance, as applied here

| Principle | What "good" looks like | Source norm |
|-----------|------------------------|-------------|
| **Naming** | `name` is lowercase-hyphenated and matches its directory name exactly | Skill loader resolves by dir; mismatch = invisible skill |
| **Description quality** | Third-person, ≤ ~200 chars, leads with what it does + when to trigger; no internal prefixes | Description is the only text the model sees pre-load |
| **allowed-tools hygiene** | Declare the minimum tool set the skill actually uses; no kitchen-sink grants; consistent tool names | Least-privilege; over-grant widens blast radius |
| **Click-first UX** | Any 2+ choice uses `AskUserQuestion`, never "reply A/B/C" | CC Commander HARD RULE + Cowork chip UX |
| **Single responsibility** | One skill answers one question / does one job | Easier triggering, less overlap |
| **Anti-patterns section** | An `## Anti-patterns — DO NOT` block guards misuse | Template convention (ccc-ultracode) |

---

## Compliance summary

| Dimension | Pass | Gap | Verdict |
|-----------|------|-----|---------|
| `name` == dirname | 67/67 | 0 | ✅ Clean |
| Description ≤ 200 chars | 67/67 | 0 | ✅ Clean (max = ccc-tuneup @ 197) |
| No `[C:...]` / internal prefix in description | 67/67 | 0 | ✅ Clean |
| `allowed-tools` present | 61/67 | 6 | 🟡 6 missing |
| Tool-name consistency (`Agent` vs `Task`) | 66/67 | 1 | 🟡 ccc-triage uses `Task` |
| Click-first (`AskUserQuestion` where choices exist) | ~46/67 | see Finding D | 🟡 several routers/forks lack AUQ |
| `## Anti-patterns — DO NOT` section | 25/67 | 42 | 🔴 majority missing |
| Single-responsibility | mostly | a few overlaps | 🟡 see Finding F |

**Headline:** Frontmatter hygiene is strong (naming, description length, no prefixes — all clean). The two real gaps are (1) **42 skills missing the Anti-patterns guard section** and (2) **6 skills missing `allowed-tools`**. Both are low-risk, mechanical fixes.

---

## Findings

### 🟢 A. Naming — fully compliant
All 67 skills have `name` equal to their directory name, lowercase-hyphenated. No action.

### 🟢 B. Description length & format — fully compliant
Every description is ≤ 200 chars (longest: `ccc-tuneup` at 197). All use single-line quoted scalars (no folded/block YAML that could silently exceed length). None begin with a `[C:...]` or other internal prefix. Descriptions that end in "…" are intentionally trimmed to fit, not truncated by the loader.

> Note: many descriptions open lowercase ("complete data ecosystem…", "click-first picker…", "audit current branch…"). Not a hard violation, but Anthropic style favors a capitalized, third-person opener. Treat as a polish item, not a gap.

### 🟡 C. `allowed-tools` missing on 6 skills
These 6 have no `allowed-tools` block, so they inherit the full default tool set (over-grant, violates least-privilege):

- `ccc-loop`
- `ccc-memory`
- `ccc-recall`
- `ccc-resume-session`
- `ccc-save-session`
- `ccc-tasks`

All six are read/write-session-state skills — they need a small set (typically `Read`, `Write`, `Bash`, `Glob`). Add an explicit minimal `allowed-tools` to each.

### 🟡 D. Click-first (`AskUserQuestion`) gaps
21 skills contain zero `AskUserQuestion` references. Most are legitimately non-interactive (single-shot reports, CI hooks, file syncers) and need **no** AUQ. But a few are routers/multi-path skills that present choices in prose and should be converted to AUQ:

- **`ccc-data`, `ccc-devops`, `ccc-makeover`, `ccc-marketing`, `ccc-mobile`, `ccc-research`, `ccc-saas`, `ccc-security`, `ccc-seo`, `ccc-testing`** — these `context: fork` "N-skills-in-one" routers only declare `allowed-tools: [Read]` and have no AUQ. If they ask the user to pick a sub-skill, that pick must be an `AskUserQuestion`, not a markdown list. **Verify each: if it presents 2+ options, add AUQ.**
- Genuinely non-interactive (no change needed): `ccc-changelog`, `ccc-ci`, `ccc-doc-sync`, `ccc-doctor`, `ccc-fleet-viz`, `ccc-hermes`, `ccc-loop`, `ccc-memory`, `ccc-recall`, `ccc-resume-session`, `ccc-save-session`, `ccc-tasks`.

### 🔴 E. Missing `## Anti-patterns — DO NOT` section (42 skills)
Only 25/67 skills carry the Anti-patterns guard from the template. The following **42 are missing it** and should get one (even a 3–5 bullet block):

`ccc-agent-writing`, `ccc-brainstorm`, `ccc-ci`, `ccc-code-review`, `ccc-content`, `ccc-data`, `ccc-debate`, `ccc-deploy-check`, `ccc-devops`, `ccc-doc-sync`, `ccc-domains`, `ccc-harden`, `ccc-hermes`, `ccc-infra`, `ccc-knowledge`, `ccc-linear-board`, `ccc-loop`, `ccc-makeover`, `ccc-marketing`, `ccc-memory`, `ccc-mobile`, `ccc-night-mode`, `ccc-nightwatch`, `ccc-plan-exec`, `ccc-qa`*, `ccc-recall`, `ccc-research`, `ccc-resume-session`, `ccc-saas`, `ccc-save-session`, `ccc-security`, `ccc-seo`, `ccc-session`, `ccc-settings`, `ccc-standup`, `ccc-systematic-debugging`, `ccc-tasks`, `ccc-testing`, `ccc-triage`, `ccc-recall`, plus the fork-routers above.

*Some skills have an "anti-pattern"-flavored block under a different heading; re-grep confirmed `## Anti-patterns` token absent. Prioritize the high-blast-radius ones first: `ccc-night-mode`, `ccc-nightwatch`, `ccc-harden`, `ccc-deploy-check`, `ccc-systematic-debugging`.

### 🟡 F. Single-responsibility / overlap
Mostly clean. A few overlaps to watch (not necessarily bugs — some are intentional aliases):

- `ccc-linear` vs `ccc-linear-board` — overlapping Linear surfaces.
- `ccc-session` vs `ccc-save-session` / `ccc-resume-session` — session mgmt split 3 ways.
- `ccc-deploy` vs `ccc-deploy-check` vs `ccc-ship` (which also deploys/rollbacks) — deploy responsibility spread across 3+ skills.
- `ccc-recall` vs `ccc-knowledge` vs `ccc-memory` — three memory/recall surfaces.

Action: confirm each pair is an intentional thin alias vs accidental duplication; document the split in each description's "Use when" so triggering stays unambiguous.

### 🟡 G. Tool-name inconsistency
- `ccc-triage` declares `Task` in `allowed-tools`; the rest of the plugin uses `Agent` for subagent dispatch. Standardize on whichever the runtime expects (the other 66 use `Agent`).

### ⚠️ H. Count drift (out of scope to fix here — flag for lead)
Disk shows **67** `*/SKILL.md` files; CLAUDE.md / contract say **64**. The 3 not reflected in the prose count are `ccc-debate`, `ccc-plan-exec`, `ccc-triage`. **Not fixed in this audit** — count strings (`contract.json`, `package.json`, etc.) are owned centrally by the lead per task constraints. Surfacing only.

---

## Fix checklist (concrete, ordered by risk)

### P0 — least-privilege & safety
- [ ] Add minimal `allowed-tools` to `ccc-loop`, `ccc-memory`, `ccc-recall`, `ccc-resume-session`, `ccc-save-session`, `ccc-tasks`.
- [ ] Add `## Anti-patterns — DO NOT` to the 5 high-blast-radius skills first: `ccc-night-mode`, `ccc-nightwatch`, `ccc-harden`, `ccc-deploy-check`, `ccc-systematic-debugging`.

### P1 — UX & consistency
- [ ] Convert sub-skill picks in the 10 `context: fork` routers (`ccc-data`, `ccc-devops`, `ccc-makeover`, `ccc-marketing`, `ccc-mobile`, `ccc-research`, `ccc-saas`, `ccc-security`, `ccc-seo`, `ccc-testing`) to `AskUserQuestion` wherever 2+ options are offered.
- [ ] Standardize `ccc-triage` `Task` → `Agent`.
- [ ] Add `## Anti-patterns — DO NOT` to the remaining ~37 skills listed in Finding E.

### P2 — polish & dedupe
- [ ] Capitalize lowercase description openers (third-person style) across affected skills.
- [ ] Sharpen "Use when" wording for the overlapping pairs in Finding F so triggers don't collide.
- [ ] (Lead-owned) Reconcile the 64 vs 67 skill count across count strings.

---

## Per-skill quick matrix (gaps only)

| Skill | allowed-tools | AUQ where needed | Anti-patterns | Other |
|-------|:---:|:---:|:---:|-------|
| ccc-loop | ❌ add | n/a | ❌ add | — |
| ccc-memory | ❌ add | n/a | ❌ add | — |
| ccc-recall | ❌ add | n/a | ❌ add | — |
| ccc-resume-session | ❌ add | n/a | ❌ add | — |
| ccc-save-session | ❌ add | n/a | ❌ add | — |
| ccc-tasks | ❌ add | n/a | ❌ add | — |
| ccc-data | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-devops | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-makeover | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-marketing | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-mobile | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-research | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-saas | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-security | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-seo | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-testing | ✅ | ⚠️ verify | ❌ add | fork router |
| ccc-triage | ✅ | ✅ | ❌ add | `Task`→`Agent` |
| ccc-night-mode | ✅ | ✅ | ❌ add (P0) | autonomous |
| ccc-nightwatch | ✅ | ✅ | ❌ add (P0) | remote approval |
| ccc-harden | ✅ | ✅ | ❌ add (P0) | prod audit |
| ccc-deploy-check | ✅ | ✅ | ❌ add (P0) | deploy gate |
| ccc-systematic-debugging | ✅ | ✅ | ❌ add (P0) | — |
| (other ~32) | ✅ | ✅/n/a | ❌ add | see Finding E |

Skills not listed pass all checked dimensions. Reference any new/edited skill against `commander/cowork-plugin/skills/ccc-ultracode/SKILL.md`.
