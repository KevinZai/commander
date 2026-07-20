# External Subagent Library — Decision Doc

**Date:** 2026-07-18 · **Scope:** research only, no repo edits · **Question:** should CC Commander roll in external subagent collections as a new "Library" surface in the Commander Cockpit?

---

## 1. VoltAgent/awesome-claude-code-subagents — verdict

**License: MIT, confirmed.** `gh api repos/VoltAgent/awesome-claude-code-subagents` → `license.spdx_id: MIT`, copyright VoltAgent 2025, standard MIT text in `LICENSE`. 23,453 stars. **MIT-safe to bundle with attribution** — this is the one candidate here that can actually be copied into `vendor/`, not just linked.

**Format vs CCC's `commander/cowork-plugin/agents/*.md`:**

| | CCC agent | VoltAgent agent |
|---|---|---|
| Frontmatter | `name, description, model, effort, persona, memory, color, tools[], maxTurns, hooks` | `name, description, tools (comma string), model` |
| Voice | Delegates to `rules-lib/personas/*.md`, has an explicit "Voice (persona: X)" section | Inline "You are a senior X..." — no separate persona file |
| Body | Protocol + output format + severity rubric + voice rules (~80-120 lines) | "When invoked: 1-4 steps" + long bullet checklists (~200-350 lines, denser but flatter) |
| Hooks | `SubagentStop` logs to `agent-runs.jsonl` (CCC's own analytics) | none |

**Convertible, not compatible as-is.** A straight file copy into `commander/cowork-plugin/agents/` would work at the frontmatter level (Claude Code only requires `name`/`description`; CCC's extra fields — `effort`, `persona`, `memory`, `hooks`, `maxTurns` — are optional and would just be absent, meaning: no cockpit analytics logging, no persona-voice consistency with the other 22). Real integration needs a **conversion pass per agent**: strip verbose checklist prose down to CCC's protocol/output-format/voice shape, add the `hooks.SubagentStop` logging line, assign a `persona` (either reuse an existing CCC persona or add a new voice file), pick a `color`. Not a copy-paste; call it ~15-30 min of editorial work per agent kept.

**Quality — spot-checked 4 files** (`api-designer.md`, `typescript-pro.md`, `security-engineer.md`, skimmed `game-developer.md`, 286 lines):
- Genuinely competent, non-generic technical content — real checklists (e.g. security-engineer: "CIS benchmarks compliance verified," "Zero critical vulnerabilities in production," specific OWASP/DevSecOps categories), not filler.
- Weakness vs CCC's agents: no structured **output format** contract (CCC agents specify exact markdown headers/severity emoji so downstream tooling — like the Cockpit's agent-analytics tab — can parse results). VoltAgent agents are prose instructions with no machine-readable output contract. That's a real gap, not cosmetic — CCC's whole cockpit/analytics pipeline depends on agents returning structured output.
- No persona/voice — every VoltAgent agent reads the same register ("You are a senior X with deep expertise in Y"). Fine as a base, less distinctive than CCC's per-persona voice files.

**Category → roll-in candidates (avoiding CCC's existing 22):**

| VoltAgent agent | Category | Why it adds something CCC lacks | MIT-safe? |
|---|---|---|---|
| `terraform-engineer` | 03-infrastructure | CCC's `devops-engineer` is generalist; IaC-specific depth (state, modules, drift) is a real gap | ✅ |
| `kubernetes-specialist` | 03-infrastructure | CCC has nothing k8s-specific | ✅ |
| `database-administrator` / `postgres-pro` | 03/05 | CCC's `data-analyst` ≠ DBA; no schema/index/replication specialist | ✅ |
| `sre-engineer` / `incident-responder` | 03-infrastructure | CCC has no on-call/postmortem specialist | ✅ |
| `mcp-developer` | 06-dev-experience | Directly relevant to CCC's own MCP work (`.mcp.json`, `/ccc-connect`) — nobody else in the 22 covers this | ✅ |
| `mobile-app-developer` / `expo-react-native-expert` | 02/07 | CCC has zero mobile coverage (ccc-mobile domain exists as skills but no dedicated agent) | ✅ |
| `payment-integration` | 07-specialized-domains | CCC's saas domain has 21 skills but no dedicated Stripe/payments agent | ✅ |
| `prompt-engineer` | 05-data-ai | CCC has no meta-agent for prompt design (ironic gap for a Claude Code toolkit) | ✅ |
| `llm-architect` / `ai-engineer` | 05-data-ai | No AI/LLM-systems specialist in the 22 | ✅ |
| `accessibility-tester` | 04-quality-security | ccc-design has an accessibility skill but no dedicated audit agent | ✅ |
| `legal-advisor` / `license-engineer` | 08-business-product | Genuinely novel — CCC has product-manager/content-strategist but nothing legal/licensing (relevant given CCC is itself MIT and cares about license hygiene) | ✅ |
| `workflow-orchestrator` / `multi-agent-coordinator` | 09-meta-orchestration | Overlaps conceptually with CCC's own `/ccc-fleet` — **skip**, CCC already owns this pattern natively | ⚠️ redundant, not a license issue |
| `code-reviewer`, `debugger`, `qa-expert`, `security-auditor`, `product-manager`, `technical-writer`, `performance-engineer`, `test-automator`, `architect-reviewer`, generic `devops-engineer` | multiple | **Direct duplicates of CCC's existing 22** — do not roll in | N/A — excluded |
| Language pros (`python-pro`, `golang-pro`, `rust-engineer`, `javascript-pro`, `swift-expert`, `elixir-expert`, `php-pro`, etc.) | 02-language-specialists | CCC already has 7 language **reviewers** (audit-focused, read+report). VoltAgent's are **builder**-focused (write code). Different job — could add as a second tier ("X-builder" vs CCC's "X-reviewer") but that doubles agent count for marginal gain — **defer, not a first-wave pick** | ✅ but low priority |

**Net: ~10-12 genuinely additive agents out of 100+**, everything else is either a duplicate of CCC's 22 or a different-flavor version of something CCC already owns (`/ccc-fleet` vs `workflow-orchestrator`).

---

## 2. Other MIT-licensed collections considered

| Repo | License | Stars | What's unique | MIT-importable? |
|---|---|---|---|---|
| **wshobson/agents** | MIT | 37,993 | Largest of the bunch, but has **evolved into a multi-harness plugin marketplace** (Claude Code + Codex + Cursor + OpenCode + Copilot + Gemini), not a flat subagent folder — each "plugin" (e.g. `backend-development`) bundles `agents/ + commands/ + skills/` together. Structurally closer to a competitor-to-CCC-itself than a source to strip agents from. | ✅ license-wise, but **shape mismatch** — importing means picking individual `agents/*.md` out of ~80 plugin dirs, one at a time; more integration cost than VoltAgent for similar content quality. Worth a second-wave look, not first. |
| **davepoon/claude-code-subagents-collection** | MIT | 3,189 | This is **not itself a subagent source** — it's the codebase for buildwithclaude.com, a directory/search site that indexes *other* people's agents, skills, hooks, MCP servers. Useful as a discovery tool (worth linking from CCC docs), not a bundle candidate. | ❌ not applicable — it's a catalog app, nothing to bundle |
| **vijaythecoder/awesome-claude-agents** | MIT | 4,348 | "Orchestrated sub-agent dev team" — a tech-lead-orchestrator pattern (routes work to specialist agents). Conceptually overlaps `/ccc-fleet` + CCC's builder/architect split. Worth a read for orchestration-pattern ideas, agents themselves likely redundant with CCC's 22. | ✅ license-wise; recommend **ideas-only**, skip bundling |
| **0xfurai/claude-code-subagents** | MIT | 960 | "100+ production-ready" — smaller community, much lower star count/validation than VoltAgent. Not independently verified for quality (out of scope to spot-check given time budget) — flagging as a lower-confidence option, do not prioritize over VoltAgent without a quality pass. | ✅ license-wise, unverified quality — low priority |
| **iannuttall/claude-agents** | MIT | 2,055 | **Archived** (per GitHub API `archived: true`) — unmaintained. Skip. | ✅ license but abandoned — skip |

**Bottom line on "other collections":** none of the four beat VoltAgent on the combination of (license clarity + flat per-agent file format + validated star count + genuine category breadth). wshobson/agents is the only one worth a second-wave look, and only because of its scale — its shape costs more to integrate than VoltAgent's does.

---

## 3. Recommended Cockpit "Library" surface

### Alignment with CCC's existing external-source pattern

CCC already has a working model for this — don't invent a new one. Per `CLAUDE.md` "Aggregator Ecosystem": **19 vendor submodules in `vendor/`**, scored by a smart orchestrator on **capability 50% + stars 15% + recency 15% + user pref 20%**, built by an 8-phase capability-index pipeline. That's the precedent to extend, not replace.

**Recommendation: don't bundle VoltAgent as a 20th git submodule wholesale.** A git submodule pulls in the *entire* upstream repo (100+ agents, docs, install scripts) for ~10-12 agents CCC actually wants — that's the wrong grain size, and it also means every non-adopted VoltAgent agent sits in the repo unconverted and unmaintained, which is exactly the vendor-drift problem CCC's scoring system exists to manage. Instead:

**Concept: "Library" tab in the Cockpit (6th tab, alongside browse/ideas/enhance/analytics/agent-manager)**

- **What it shows:** a curated, hand-picked list of external agents (starting with the ~10-12 VoltAgent candidates above), each card showing: name, source repo + link, license badge (MIT), one-line "why this isn't already in your 22," and a **"Convert & Install"** action vs a **"View source"** link-only action.
- **Two tiers, matching the licensing guardrail:**
  - **Tier 1 — MIT-bundled:** the ~10-12 converted VoltAgent agents, physically copied into `commander/cowork-plugin/agents/` (converted to CCC's frontmatter shape, attribution comment at top of file: `<!-- Adapted from VoltAgent/awesome-claude-code-subagents (MIT) -->`), NOTICE.md updated per CCC's existing NOTICE.md convention (check `NOTICE.md` root file — it likely already lists vendor attributions; extend it, don't invent a new format).
  - **Tier 2 — ideas/link-only:** wshobson/agents (shape mismatch), vijaythecoder (orchestration pattern), davepoon (discovery tool) — Cockpit shows them as **external links with a "why we didn't bundle this" note**, no code copied. This is the guardrail for anything that's MIT but not worth the integration cost, and it's also where any non-MIT collection would land if Kevin finds one later (this scan found none — everything checked was MIT, so there's no active non-MIT case to flag right now, but the tier exists for when one shows up).
- **License guardrail (hard rule for future additions):** only copy code from a repo with a *permissive* license (MIT/Apache-2.0/BSD) confirmed via `gh api repos/<owner>/<repo> --jq .license.spdx_id` before any file is copied — same check this scan ran. GPL/AGPL/no-license repos are Tier-2-only (link + idea, never copied), matching the existing precedent that killed bundling `claude-mem` (AGPL-3.0, noted in CLAUDE.md's Aggregator Ecosystem section — "ships under AGPL-3.0 which is incompatible with CC Commander's MIT license... treated as an external opt-in MCP, not a bundled vendor").

### Effort estimate

| Work item | Estimate |
|---|---|
| Convert 10-12 VoltAgent agents to CCC frontmatter/voice shape | ~4-6 hrs (15-30 min/agent × 12, plus persona-voice assignment) |
| Cockpit Library tab (6th tab in existing 5-tab artifact) — UI + data | ~3-4 hrs, reusing existing cockpit-template.html patterns from the browse/analytics tabs |
| NOTICE.md attribution update + license-check script (`gh api ... .license.spdx_id` gate, could become a small reusable script for future vendor adds) | ~1 hr |
| Wire converted agents into `commander/cowork-plugin/agents/`, update agent count in CLAUDE.md/plugin.json (23 → 34-35) | ~1 hr, mechanical |
| **Total** | **~1-1.5 days of focused work** |

### What NOT to do

- Don't add VoltAgent as a `vendor/` git submodule — wrong grain, drags in 90 unused agents.
- Don't roll in the 7 language "pro/builder" agents alongside CCC's existing language "reviewer" agents in the same wave — different job (write vs audit), worth a deliberate follow-up decision, not bundled into this pass.
- Don't touch `workflow-orchestrator`/`multi-agent-coordinator` — redundant with `/ccc-fleet`, CCC already owns that lane.
- Don't bundle davepoon's repo — it's a web app, not agent content; link to buildwithclaude.com instead if a "discover more" outbound link is wanted.

---

## Summary table

| Source | License | MIT-safe to bundle | Recommendation |
|---|---|---|---|
| VoltAgent/awesome-claude-code-subagents | MIT | ✅ | **Bundle ~10-12 converted agents**, Tier 1 |
| wshobson/agents | MIT | ✅ (shape mismatch) | Tier 2 link-only for now, revisit later |
| davepoon/claude-code-subagents-collection | MIT | N/A (catalog app) | Link only, not a content source |
| vijaythecoder/awesome-claude-agents | MIT | ✅ | Tier 2, ideas-only (orchestration pattern) |
| 0xfurai/claude-code-subagents | MIT | ✅ (unverified quality) | Tier 2, low priority, needs a quality pass before bundling |
| iannuttall/claude-agents | MIT | ✅ but archived/unmaintained | Skip |

**Nothing found in this scan requires refusing on license grounds** — all six candidates are MIT. The filter that matters here is quality-and-shape fit, not licensing; VoltAgent wins on both.
