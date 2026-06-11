# Spec: CC Commander v6.0 — Fable Upgrade + Optimization

**Date:** 2026-06-10
**Author:** Morpheus (architecture) for Kevin Z.
**Status:** DRAFT — scope locked, ready for fresh-session execution
**Repo:** `KevinZai/commander` (`~/clawd/projects/cc-commander`)
**Predecessor state:** v5.1.2, `main` green, all gates passing
**Release vehicle:** v6.0.0 (major)

---

## 1. Why (motivation)

Claude **Fable 5** (`claude-fable-5`) went GA on **2026-06-09** — Anthropic's most
capable widely released model. CC Commander has **zero** Fable references and ships
a legacy-model footprint (579 "opus" / 586 "sonnet" / 134 "haiku" string hits) plus
a **stale model catalog** (`models.md` omits Fable, mislabels Opus 4.6/4.7) and a
**stale pricing table** (dispatcher `haiku` at $0.25/$1.25 — old Haiku 3.5 numbers).

A plugin whose entire value proposition is "master Claude Code" cannot lag a flagship
model launch by a major version. v6.0 makes CC Commander **Fable-native** and — because
Fable changes the cost math — **simultaneously optimized** so the upgrade is cost-neutral
or better, not a 2× spend regression.

### The central thesis (cost-aware)

| Model | $/MTok in | $/MTok out | vs Opus 4.8 |
|---|---|---|---|
| **Fable 5** `claude-fable-5` | $10 | $50 | **2.0×** |
| Opus 4.8 `claude-opus-4-8` | $5 | $25 | 1.0× (baseline) |
| Sonnet 4.6 `claude-sonnet-4-6` | $3 | $15 | 0.6× |
| Haiku 4.5 `claude-haiku-4-5` | $1 | $5 | 0.2× |

**Fable 5 specs (authoritative, fetched 2026-06-10 from platform.claude.com):**
context **1M tokens** (Opus-4.7 tokenizer, ~30% more tokens per same text), max output
**128k**, **adaptive thinking always-on**, **no** extended-thinking param, GA on API +
Bedrock + Vertex + Foundry. (`claude-mythos-5` exists but is Project-Glasswing
invite-only — catalog it, never default to it.)

> **Decision (Kevin, 2026-06-10): Fable is NOT a blanket default — it is selective "deep mode."**
> Opus 4.8 stays the everyday default PM. Fable is *escalated into* for reasoning-dense work.
> Rationale: a blanket Fable default taxes every trivial session at 2×; Opus 4.8 is already an
> excellent orchestrator. Pay for Fable on the *thinking*, not the *typing*.
>
> **Harness constraint that shapes the mechanism:** the **main-thread** model is fixed at
> session start — Claude cannot silently hot-swap its own running session model. **Subagent**
> model IS selectable per dispatch. Therefore:
> - **Main thread → prompt-to-switch:** an intelligent nudge (via `ccc-suggest`) fires when the
>   session turns into deep-reasoning work → user clicks → `/model claude-fable-5`. Cannot be silent.
> - **Subagents → auto-route, silent:** the dispatcher's complexity score picks Haiku→Sonnet→Opus→Fable
>   per leaf task with no prompt. This is where "switch on the fly intelligently" actually lives.

---

## 2. Evals (definition of done / broken) — set BEFORE building

**Done when:**
- [ ] Default stays Opus 4.8; footer renders the *active* model correctly (Opus 4.8, or "Fable5" after `/model`). The stale `Opus4.7` default is fixed.
- [ ] Prompt-to-switch nudge fires on deep-reasoning detection (offers `/model claude-fable-5`); does NOT nag on routine sessions.
- [ ] Subagent auto-routing picks Fable only above the reasoning-complexity threshold; routine dispatches land on Sonnet/Haiku.
- [ ] All 3 gates green: `check-product-contract --check` = 0, `audit-counts --check` = PASS, `check-version-parity` = all surfaces 6.0.0.
- [ ] `models.md` catalog lists Fable 5 + Mythos 5 with correct specs; Opus 4.6/4.7 labels fixed; resolver table answers "fable"/"most capable" → `claude-fable-5`.
- [ ] Dispatcher pricing table matches live pricing (fable added, haiku $1/$5 fixed); `modelKey` detection recognizes "fable".
- [ ] Smart routing: a complexity score < threshold dispatches Sonnet/Haiku, not Fable — proven by a unit test asserting the mapping.
- [ ] All persona/test/vscode-extension model strings consistent (no orphan `claude-opus-4-8` where a Fable tier was assigned).
- [ ] `node --test` full suite passes (incl. updated agent-personas/cost-parser/ccc-doctor tests).
- [ ] Marketing site (`commanderplugin-com`, separate repo) reflects v6.0 + Fable.

**Broken / regression signals (must NOT happen):**
- ❌ A version bump corrupts host (`Claude Code v2.1.x`) or vendor pins (the `--patch` trap — see §7).
- ❌ Fable assigned to mechanical roles (language reviewers, format hooks) without an eval proving it earns the 2× cost.
- ❌ Re-tiering DOWN (Sonnet→Haiku) silently lands without a quality eval (QA gate, §5/W3).
- ❌ Estimated cost-per-typical-session rises >10% vs v5.1.2 baseline.

---

## 3. The new model tier ladder (heart of the change)

| Tier | Model | Where it runs | Rationale |
|---|---|---|---|
| 🥇 **Deep mode** | `claude-fable-5` | **Escalated into, not default.** Main thread via `/model` or prompt-to-switch; personas: **architect, debugger, security-auditor, product-manager**; dispatcher `power` + fleet conductor; effort `high` (adaptive-thinking always-on) | Deep reasoning / long-horizon agentic. 2× cost justified only where reasoning-per-token is high. |
| 🥈 **Everyday default** | `claude-opus-4-8` | **Session default PM**; heavy implementation; flagship fallback for Fable; dispatcher `assisted` | Strong orchestrator at half Fable's cost. The baseline everything starts on. |
| 🥉 **Workhorse** | `claude-sonnet-4-6` | personas: builder, designer, content-strategist, data-analyst, devops-engineer, qa-engineer, researcher, technical-writer, reviewer, fleet-worker; dispatcher `guided`; all delegated subagents by default | 0.6× cost, fast, the bulk-work default. |
| ⚡ **Bulk** | `claude-haiku-4-5` | format/status/doc-sync hooks; simple lookups; **(eval-gated)** the 7 language reviewers | 0.2× cost, near-frontier. Down-tiering here is where cost savings come from — but must be proven safe. |

**Fallback chains:** Fable → Opus 4.8 → Sonnet 4.6. Sonnet → Haiku for bulk.

### 3.1 Orchestration shape (2-tier default, 3-tier only for fleet)

Native CC subagents do **not** reliably spawn their own subagents — the supported tree is
2 levels (main → leaves). So the everyday shape is a **flat mixed fan-out**, not a 3-level org chart.

```
DEFAULT (everyday):                     FLEET-SCALE (ccc-fleet / ccc-migrate only):
  Opus/Fable PM (main)                    Fable PM (conductor)
   ├─ Opus subagent   (hard leaf)          ├─ Opus lead → Sonnet workers  [worktree]
   ├─ Sonnet subagent (normal leaf)        ├─ Opus lead → Sonnet workers  [worktree]
   └─ Haiku subagent  (bulk leaf)          └─ …
        flat 2-tier, mixed models               3-tier earns its keep ONLY here
```

- **2-tier is the default:** the PM assigns the right *leaf* model directly. No middle-manager layer.
- **3-tier (Fable conducts → Opus leads → Sonnet workers) is reserved for fleet/worktree work** —
  `/ccc-fleet` + `/ccc-migrate` already provide this primitive. Wire Fable as the fleet conductor there.
- **Dynamic effort:** Fable's adaptive thinking is always-on, so "dynamic effort" is native; pin
  `effort: high` on the orchestration thread (planning/synthesis is the high-ROI reasoning).

**When to escalate the main thread to Fable** (drives the prompt-to-switch heuristic in W5):
escalate when reasoning-per-token is high (architecture, planning, migration design, threat modeling,
heavy delegation); stay on Opus when token-volume is high but reasoning is shallow (mechanical edits,
debug/iteration loops, routine review/docs).

---

## 4. Workstreams (6)

### W1 — Catalog truth (foundation, do FIRST)
- `skills/claude-api/shared/models.md`: add Fable 5 + Mythos 5 rows (specs from §1); fix Opus 4.6 mislabel (line ~23) and the `Opus4.7` defaults; update resolver table ("fable"/"most capable"/"most powerful" → `claude-fable-5`; demote "opus" mapping note).
- `skills/claude-api/shared/live-sources.md`: spot-fix any Opus-4.8-specific extraction prompts that should mention Fable.
- **Why first:** every other surface reads from this; a wrong catalog propagates.

### W2 — Selective model: Opus default + Fable deep-mode + prompt-to-switch
- `.claude/settings.json`: **keep** `model: "claude-opus-4-8[1m]"` as the everyday default (do NOT swap to Fable).
- SessionStart hook text: keep "Opus 4.8 (1M context)" but add a line — "deep-reasoning work? escalate with `/model claude-fable-5`."
- **Prompt-to-switch nudge:** extend `ccc-suggest` (UserPromptSubmit hook) to detect deep-reasoning sessions (architecture/planning/migration signals) and surface a single AskUserQuestion chip offering `/model claude-fable-5`. Must be rate-limited (no nagging); off on routine sessions.
- `commander/status-line.js:40` `formatModel` default `'Opus4.7-1M'` → `'Opus4.8-1M'` (fix stale); verify it renders `claude-fable-5` → "Fable5" when active. **Display the active model — never hardcode either.**
- `commander/cockpit.js:164` default `'Opus1M'` → `'Opus4.8'`; same active-model rule.
- `CLAUDE.md` "Session Defaults": document Opus-default + Fable-escalation + the prompt-to-switch behavior; update footer-bar example to show active-model rendering.
- **Verify** `claude-fable-5[1m]` suffix validity once (for the `/model` target); Fable is native 1M so bare ID may be correct.

### W3 — Persona re-tier (22 agents)
- Update frontmatter `model:` in `commander/cowork-plugin/agents/*.md` per §3 ladder.
- Mirror in `commander/cowork-plugin/rules/personas/*.md` ("Default model:" lines) AND the global `~/.claude/rules/personas/*.md` if they diverge (note: global persona files are user-maintained — propose, don't force).
- `commander/cowork-plugin/rules/personas/README.md` model-column table.
- `vscode-extension/src/data/agents.ts` (22 model refs — keep in lockstep).
- **Eval gate:** language-reviewer down-tier (Sonnet→Haiku) requires a QA pass — run 2-3 real review tasks on Haiku vs Sonnet, diff findings; only land if Haiku catches the same P0/P1s. If it misses, keep on Sonnet.

### W4 — Dispatcher + cost engine
- `commander/dispatcher.js`: add `fable: { input: 10, output: 50 }` to `MODEL_PRICING`; **fix `haiku` → `{ input: 1, output: 5 }`** (stale); update the pricing comment block + date.
- `modelKey` detection (line ~251): add `if (modelStr.includes('fable')) modelKey = 'fable'`.
- Tier configs (lines 23-25): re-point `power` model to `fable` (fallback `opus`); leave `assisted`/`guided` sensible per §3.
- Effort comments (lines 136/156-157): "Opus 4.8-specific" → note Fable supports always-on adaptive thinking + effort levels.

### W5 — Optimization (all 4 axes — the cost-neutralizer)
1. **Smart model-routing** — one complexity/reasoning score drives BOTH: (a) **subagent auto-route** (Haiku→Sonnet→Opus→Fable per leaf, silent), and (b) the **main-thread prompt-to-switch** heuristic from W2 (same score crossing the deep-reasoning threshold = fire the Fable nudge). Add a unit test asserting score→model. Also wire **Fable as the `ccc-fleet`/`ccc-migrate` conductor** for the 3-tier fleet shape (§3.1). Highest-leverage axis — it's what keeps Fable's 2× selective.
2. **Token / cost** — prompt-caching on stable system/context blocks; caveman-default on iteration loops; audit the 23 hooks' context injection for redundant payload; surface per-session cost delta in the footer.
3. **Runtime perf** — measure CLI cold-start, hook latency, `update-check` cache, dispatcher overhead; fix the top 2-3 hot paths only (perf-engineer persona: measure first, no guessing).
4. **Code-quality sweep** — `refactor-cleaner` + knip/ts-prune across `commander/`; remove dead/dup; **archive-not-delete**, one PR, reviewed.

### W6 — Ship
- Doc sync: BIBLE.md, CHEATSHEET.md, README.md, SKILLS-INDEX.md, mintlify-docs/**, CLAUDE.md, `commander/contract.json`.
- Version bump via `node scripts/bump-version.js 6.0.0` (**NEVER `--patch`** — §7).
- Run 3 gates; `node --test`; spot-check the diff for host/vendor version corruption.
- CHANGELOG `[6.0.0]` section.
- Mirror to `commanderplugin-com` (separate private repo, push→auto-deploy).

---

## 5. Sequencing & dependencies

```
W1 (catalog) ─┬─> W2 (default)  ─┐
              ├─> W3 (personas) ─┼─> W5 (optimization) ─> W6 (ship)
              └─> W4 (dispatcher)┘
```
W1 is the gate. W2/W3/W4 are parallelizable (non-overlapping files) — dispatch as 3 Sonnet
subagents. W5 depends on W4's pricing/routing being correct. W6 last, single integrator.

---

## 6. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Prompt-to-switch nags on routine sessions → user disables it | 🟠 High | Rate-limit + high threshold; nudge only on clear deep-reasoning signals. Eval: zero nudge on a routine edit session. |
| Under-escalation — users never switch, Fable value never seen | 🟡 Med | Make the nudge genuinely smart + one-click; document the "pay for thinking not typing" heuristic in CLAUDE.md/BIBLE. |
| Subagent auto-route over-picks Fable → spend creep | 🟡 Med | Eval: cost-per-typical-session ≤ 110% of v5.1.2; threshold tuned so Fable is the exception, not the rule. |
| `[1m]` suffix invalid for `claude-fable-5` in CC settings | 🟡 Med | Verify against live CC before W2 lands; Fable is natively 1M so suffix may be unneeded. |
| `check-product-contract --patch` corrupts host/vendor pins | 🟠 High | Use `bump-version.js`; diff every version string; the 3 gates are BLIND to host/vendor corruption (§7). |
| Down-tiering reviewers to Haiku misses bugs | 🟠 High | Eval-gate (W3); keep Sonnet if Haiku underperforms. |
| Global `~/.claude/rules/personas/*` are user-maintained | 🟡 Med | Propose diffs, don't force-write user's global files. |
| Marketing site drift (concurrent writers, shared git identity) | 🟡 Med | Re-check `git status`+HEAD immediately before commit; `/usr/bin/git` not RTK. |

---

## 7. What NOT to do (carried lessons)

- ❌ **`node scripts/check-product-contract.js --patch`** for version bumps — greedy, no `isVersionRelevant` guard in patch path; corrupts `Claude Code v2.1.154`, vendor pins, deps. Use `bump-version.js`; hand-edit doc surfaces.
- ❌ **Blind global sed** of `5.1.2`→`6.0.0` — historical refs in BIBLE/README/SKILLS-INDEX must NOT move.
- ❌ **RTK-routed grep/git/diff** — stale cache. Use `/usr/bin/grep`, `/usr/bin/git`; treat `Read` of file bytes as truth.
- ❌ **Trust subagent "done" reports** — independently re-run the 3 gates + spot-check.
- ❌ **`status=$(...)` in zsh** — reserved var; use `chk`/`out`.

---

## 8. Out of scope (explicit)

- Hosted MCP (v4.1 roadmap item) — unchanged.
- `claude-mythos-5` as a usable tier (invite-only; catalog only).
- Pre-existing `5.0.0.0:6767` typo in `local-llm.mdx` (deferred crumb; optional one-liner).
- Lighthouse perf on `commanderplugin.com/bible` (separate repo, separate task).
- Any vendor-submodule bumps (separate `/ccc-upgrade` flow).

---

## 9. Open questions (resolve before/early in build)

1. **`[1m]` suffix** — does CC `settings.json` accept `claude-fable-5[1m]`, or is the bare ID correct (Fable native 1M)? *Verify live.*
2. **Language reviewers → Haiku** — eval outcome decides; default-keep-Sonnet if unproven.
3. **Cost baseline** — capture a v5.1.2 "typical session" cost number now (via ccusage) to measure the ≤110% eval against.

---

## 10. Execution note

Per Kevin's spec-based-dev rule: execute in a **fresh session** off this file. W1 first (blocking),
then dispatch W2/W3/W4 as parallel Sonnet subagents with non-overlapping file domains, then W5,
then W6 as a single integrator. Each workstream = its own PR to `main`. Tracking: Linear epic
(CC team) — see linked project.
