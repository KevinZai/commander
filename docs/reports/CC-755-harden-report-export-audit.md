# CC-755 slice 1 — /ccc-harden report-export audit (read-only)

Date: 2026-10-21. Scope: inventory what report/export code exists today for `/ccc-harden`. No tokens, no gating, no code changes.

## What exists

| Surface | Location | Output today |
|---|---|---|
| Skill (Desktop plugin) | `commander/cowork-plugin/skills/ccc-harden/SKILL.md` (Codex mirror is generated) | Aggregates pillar output into a terminal report; "Save report" writes `.harden.report.md` (Markdown only) |
| Pillar fallback checks | `.../ccc-harden/references/pillars.md` | Read-only commands used when the engine is absent |
| Engine (external, not in repo) | `~/.claude/skills/harden-site/` (`HARDEN_SITE_DIR`), `lib/report.sh`, 11 `pillars/*.sh` | Terminal text, or `--json` per pillar |
| Registry | `commander/core/registry.yaml` (`tier: free`) | Metadata only |

Not found anywhere in the repo or engine: HTML export, PDF export, a report template (`harden-site/templates/` is empty), any Pro/licence gate for harden, cron/scheduled scan, auto-fix-all (SKILL.md forbids it), or Linear issue creation code (the skill only describes using the connector on explicit approval).

## Findings on the export path

1. **Only Markdown export, and it is prose in SKILL.md, not code.** `.harden.report.md` is produced by the model following step 7; there is no deterministic renderer, so output shape varies run to run.
2. **`--json` output is invalid JSON** (`lib/report.sh`, `report_summary`): it emits `{"_end":true}]` then `"summary":{...}}` with no comma or key context, and a sentinel `{"_end":true}` element inside `checks`. Each pillar also prints its own header, so a multi-pillar run is several concatenated objects, not one document. A parser must be written before any HTML/PDF layer.
3. **JSON escaping is incomplete**: only `"` is escaped; backslashes, newlines and tabs in `found`/`fix` break the output.
4. **No aggregation code.** SKILL.md step 5 (totals, severity ranking, top actions, skipped pillars) is done by the model. JSON has `status` (pass/warn/fail/skip) but no CRITICAL/HIGH/MEDIUM/LOW field, so severity ranking cannot be reproduced from data.
5. **Secret hygiene is already good** and must carry over: `safe_secret` prints a sha256 prefix only, and SKILL.md says never to quote secret values. Any exported HTML/PDF must reuse that and must not embed raw `found` strings from secrets-pii scans.
6. **Privacy guardrail conflict to resolve before building**: SKILL.md says "sends no findings anywhere: no telemetry, no upload". A hosted or emailed report would break that; export must stay a local file.
7. **Engine is outside the repo.** The report code lives in a per-user directory, so a Pro feature cannot depend on it being present. The skill already has an engine-absent mode.
8. `.harden.report.md` ignore check (`git check-ignore`) is described in the skill but not enforced by code. A tracked `.harden.json` exists at the repo root.

## Suggested next slices (not started)

| Slice | Content | Size |
|---|---|---|
| 2 | Fix `report.sh` JSON (valid single document, full escaping, severity field), in the engine repo | small |
| 3 | Deterministic renderer: aggregated JSON to `.harden.report.md` and a self-contained local HTML file (no network, no upload) | small-medium |
| 4 | PDF via browser print-to-PDF of the HTML (avoids a new dependency) | small |
| 5 | Gating design, decision for Kevin (below) | decision |

## Decision for Kevin (gating, nothing implemented)

- A. Keep Markdown free; HTML/PDF export Pro, enforced by the existing tier mechanism in `commander/` (🟢 recommended: matches "core skills stay free" and the idea's own list).
- B. Everything free, sell only auto-remediation, token pillars and weekly scans.
- C. Separate $19/mo "audit + alerts" product, outside the plugin.

Note: CLAUDE.md says core skills remain free and integrations opt-in; any gate needs a licence story that does not break the MIT distribution. Slice 5 should settle this before code.
