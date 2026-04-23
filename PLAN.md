# CC Commander — Single Source of Truth

**Last updated:** 2026-04-23 · **Owner:** Kevin Zicherman · **Current version:** v4.0.0-beta.10
**Linear project:** https://linear.app/<team>/project/cc-commander-efd0258dcd62

> This file is the canonical roadmap. When things change, update THIS file (not CLAUDE.md, not CHANGELOG beyond release notes, not scattered task files). Cross-references the CC-* tickets in Linear.

---

## 🎯 North Star

**Product:** CC Commander — Guided AI PM to Master Claude Code Instantly.
**One-liner:** 1 install. 502+ skills. Every AI IDE. Free forever.
**Business model (locked):** Free forever. 4-lever revenue stack: consulting (primary) + affiliate links (passive) + optional Pro Community (post-beta) + GitHub Sponsors (optional). No paid plugin tier planned.
**Publisher:** Kevin Zicherman. Personal publisher for beta → Commander Labs LLC at $50K ARR.

**Brand canon (locked):**
- Product name: **CC Commander**
- Plugin slug: `commander`
- Marketplace slug: `commander-hub` (renamed from `commander-marketplace` in v4.0.0-beta.4 — short, aligns with v4.1 Commander Hub marketplace feature)
- Publisher: `Kevin Zicherman` (not "Kevin Z")

**Non-negotiable design principle:** Plugin stays 100% functional standalone. MCP is ADDITIVE. CI enforces via airplane-mode test (`MCP_DISABLED=1 npm test`).

---

## 🚢 Release History

| Version | Date | Scope | Status |
|---------|------|-------|--------|
| v4.0.0-beta.1 | 2026-04-17 | MCP scaffold + 15 personas + hosted beta infra scaffold | ✅ Released |
| v4.0.0-beta.2 | 2026-04-18 | All-free beta (26 skills unlocked, 0 pro) | ✅ Released |
| v4.0.0-beta.3 | 2026-04-18 | Real MCP server + 8 P0 hooks + plugin hybrid passthrough + airplane-mode CI | ✅ Released |
| v4.0.0-beta.4 | 2026-04-18 | `commander-hub` marketplace rename + broken-symlink fix + PLAN.md | ✅ Released |
| v4.0.0-beta.5 | 2026-04-18 | Removed non-standard `tiers` key + Cowork-first marketing sweep | ✅ Released |
| v4.0.0-beta.6 | 2026-04-19 | Plugin manifest schema compliance (hooks structure + removed skills/agents string fields) + reset-commander-install.sh | ✅ Released |
| v4.0.0-beta.7 | 2026-04-21 | Docs refresh: 28-skill catalog, 8 hooks, 15 agents, 502+ ecosystem skills, Desktop-first positioning, CLI parity audit | ✅ Released |
| v4.0.0-beta.8 | 2026-04-22 | Content-layer mega-refresh: sub-agent architecture docs, aider positioning, free-forever monetization lock, 8 hooks/16 handlers catalog, architecture.mdx + vs-aider.mdx | ✅ Released |
| v4.0.0-beta.9 | 2026-04-22 | Vendor sweep fold-in: /ccc-agent-writing + /ccc-systematic-debugging skills, typescript-reviewer + python-reviewer agents, sequential-thinking MCP (9th server). Plugin skills 28→30, personas 15→17, MCP servers 8→9 | ✅ Released |
| v4.0.0-beta.10 | 2026-04-23 | Hardening + Desktop-first positioning: 5 security fixes, XML strip (17 agents/skills), /ccc-e2e + /save-session + /resume-session skills (30→33), OG image, screenshot scaffold, comprehensive doc sync | 🔄 Current |
| v4.0.0 | TBD | Stable — after beta feedback cycle + deploy of hosted MCP | 📋 Pending |
| v4.1.0 | TBD | Commander Hub marketplace (80/20 rev-share) | 📋 Pending |

---

## 📦 Current Shipped Surface (v4.0.0-beta.10)

### Plugin (works fully standalone)
- **33 plugin skills** (13 /ccc-* specialist workflows + 14 ccc-* domain routers + 2 diagnostic/meta + 2 vendor-sourced + /save-session + /resume-session + /ccc-e2e — all free forever)
- **17 specialist sub-agents** with persona voice system (architect, security-auditor, performance-engineer, content-strategist, data-analyst, designer, product-manager, technical-writer, devops-engineer, qa-engineer, reviewer, builder, researcher, debugger, fleet-worker, typescript-reviewer, python-reviewer)
- **8 lifecycle hooks / 16 handlers** (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification, PreCompact, SubagentStop)
- **9 bundled MCP server configs** (Tavily, Context7, Firecrawl, Exa, GitHub, Figma, Playwright, claude-mem, sequential-thinking)
- **10 workflow modes** via mode-switcher skill
- **`commander/cowork-plugin/rules/`** — 10 shared voice files + 17 personas shipped with plugin

### CLI (`ccc` command)
- Interactive TUI with 10 themes
- 83 slash commands
- Knowledge compounding + session memory
- Intelligence layer: complexity scoring, stack detection, smart dispatch
- Airplane-mode tested: works fully offline

### MCP Layer (opt-in, not deployed yet)
- **Local stdio MCP server** at `commander/mcp-server/` — works today for plugin dev
- **Hosted MCP scaffold** at `apps/mcp-server-cloud/` — production-ready code, awaits Fly deploy (Stage 2)
- **Plugin MCP passthrough** at `commander/cowork-plugin/lib/mcp-passthrough.js` — opt-in via `.claude/mcp.json`, graceful fallback

---

## 🚦 Stage Map

```
✅ Stage 0 — Code/docs/tests/releases (DONE — v4.0.0-beta.3 + beta.4)
🔒 Stage 1 — Plugin + CLI functional + upgradable (DONE)
⏸  Stage 2 — Infra provisioning (Kevin auth-gated; BLOCKS Stage 3+)
📋 Stage 3 — Hosted MCP Connector + Affiliate Wiring (after Stage 2 done)
📋 Stage 4 — Real MCP server iteration using mcp-server-builder skill
📋 Stage 5 — Plugin hybrid mode activation (after Stage 3)
📋 Stage 6 — Launch sequence (marketplace submit + posts + community)
```

---

## 🔒 Stage 2 — Infra Provisioning (Kevin's Auth-Gated Todo List)

This is the ONLY blocker between current state and hosted MCP going live.

| # | Action | Where | Linear | Kevin's time |
|---|--------|-------|--------|-------------|
| 1 | `npm login` → `npm token create` → save to OP | Terminal + 1Password | — | 2 min |
| 2 | Update `op://Alfred/s5lmiih75pb4ksxwkpfmkyy7wi/credential` | 1Password | — | 30 sec |
| 3 | Create Supabase project at supabase.com | Browser | CC-311 | 3 min |
| 4 | Run `supabase link --project-ref X` + `supabase db push` | Terminal | CC-311 | 2 min |
| 5 | `fly auth login` + `fly apps create cc-commander-mcp --org personal` | Terminal | CC-311 | 2 min |
| 6 | Create Upstash Redis DB at console.upstash.com | Browser | CC-311 | 3 min |
| 7 | Resend: verify `cc-commander.com` (SPF/DKIM/DMARC in Cloudflare) | Resend + Cloudflare | CC-311 | 10 min (DNS wait) |
| 8 | `vercel link` site/ to Vercel project + `vercel env add` for secrets | Terminal | CC-311 | 3 min |
| 9 | Populate 10 OP vault items (see below) | 1Password | **CC-311** | 15 min |
| 10 | Buy defensive domains | Cloudflare Registrar | — | 5 min |

**Total: ~45 min of Kevin time.**

### 10 OP Vault items required (CC-311 umbrella)

Path pattern: `op://Alfred/cc-commander-<service>/<field>`

| Item name | Field | Source |
|-----------|-------|--------|
| `cc-commander-supabase` | `url` | Supabase project settings |
| `cc-commander-supabase` | `anon-key` | Supabase API settings |
| `cc-commander-supabase` | `service-role-key` | Supabase API settings (never expose client-side) |
| `cc-commander-resend` | `api-key` | Resend dashboard (after domain verify) |
| `cc-commander-upstash` | `url` | Upstash Redis REST URL |
| `cc-commander-upstash` | `token` | Upstash REST token |
| `cc-commander-fly` | `api-token` | `fly auth token` output |
| `cc-commander-jwt` | `secret` | Generate: `openssl rand -base64 32` |
| `cc-commander-vercel` | `project-id` | After `vercel link` |
| `cc-commander-vercel` | `org-id` | Vercel team settings |

### Defensive domains to buy

- `commanderhub.ai` (primary — marketplace feature brand)
- `ccommander.ai` (typosquat guard)
- `cc-commander.ai` (alternate)
- Already owned: `cc-commander.com`

### DNS records after purchases (Cloudflare)

```
cc-commander.com              A/CNAME → Vercel
mcp.cc-commander.com          CNAME  → Fly (cc-commander-mcp.fly.dev)
docs.cc-commander.com         CNAME  → Mintlify (optional)
bible.cc-commander.com        CNAME  → Mintlify (optional subdomain for Bible)
commanderhub.ai               → holding page / future Commander Hub
```

---

## 📋 Stage 3 — Hosted MCP Connector + Affiliate Wiring

**Prerequisites:** Stage 2 complete.

```bash
# From repo root on any machine with op CLI + fly + vercel:
bash scripts/deploy.sh
```

The script handles:
1. Preflight check (op + fly + vercel CLIs available; 10 vault items exist)
2. Tests: `npm test` (279/279) + kc.js (27/27) + smoke (6/6)
3. Fly canary deploy: `op run -- fly deploy --strategy canary --app cc-commander-mcp`
4. Healthcheck loop: polls `https://mcp.cc-commander.com/health` for 200 (60s max)
5. Vercel deploy: `vercel --prod --cwd site`
6. Post-deploy smoke: `curl https://cc-commander.com` + `curl https://mcp.cc-commander.com/health`

**Rollback:**
- MCP: `fly releases rollback --app cc-commander-mcp` (<90s)
- Site: Vercel dashboard → Deployments → promote previous

---

## 📋 Stage 4 — Real MCP Server Iteration

The current `apps/mcp-server-cloud/` is production-ready scaffold. Stage 4 iterates on it for real-world edge cases + scale.

**Use the `mcp-server-builder` skill** — canonical in this repo at `skills/engineering-pack/mcp-server-builder/SKILL.md`. Covers:
- Production-ready MCP server design from API contracts
- Schema validation + safe evolution patterns
- Fast scaffolding for additional tools
- HTTP/SSE transport optimizations

**Specific iterations planned (Linear):**
- **CC-323** — Inter-agent cross-session comms (agent_messages Supabase table hooked up)
- **CC-324** — Visible delegation UX ("theater mode" — agents obviously working)
- **CC-326** — Proactive context warnings + budget alerts + stale-check nudges (partial in beta.3, polish)
- **CC-318** — Cost-intelligence layer (shipped in beta.3; monitor + tune)

---

## 📋 Stage 5 — Plugin Hybrid Mode Activation

**Goal:** plugin installs get the MCP benefits (lazy loading, cross-IDE usage counter, feedback gate) while keeping all slash commands + offline fallback.

Current status: code scaffolded in beta.3 (`commander/cowork-plugin/lib/mcp-passthrough.js`). Activates automatically once user adds `.claude/mcp.json` entry for `cc-commander`.

**After Stage 3 deploy:**
1. Update `commander/cowork-plugin/MCP.md` with live endpoint URL (`mcp.cc-commander.com/sse`)
2. Add beta tester instructions: copy the example mcp config + paste license key from `/beta` signup
3. Monitor passthrough logs (`~/.claude/commander/logs/passthrough.jsonl`) to confirm fallback never fires for good reasons

---

## 📋 Stage 6 — Launch Sequence

Execution window: **after Stage 3 deploy + 48h soak period.**

| # | Action | Linear | Assets ready? |
|---|--------|--------|-------------|
| 1 | Submit plugin to Anthropic Claude Code marketplace | — | ✅ plugin.json v4-ready |
| 2 | Announce on Discord (create server first) | — | — |
| 3 | X launch thread | — | ✅ copy at `cc-commander-strategy-2026-04-17/marketing-master/08-distribution-channels.md` |
| 4 | Reddit r/ClaudeAI + r/LocalLLaMA | — | ✅ same doc |
| 5 | HackerNews Show HN | — | ✅ same doc |
| 6 | Product Hunt (optional) | — | ✅ |
| 7 | Recruit 20 beta testers (Linear CC-299 pattern) | CC-299 | — |
| 8 | 2-min demo video | — | 📋 Script in `marketing-master/06-cc-commander-marketing-plan.md` |

**Marketing-master copy library** (~280K words of pre-written assets at `<clawd-output>/cc-commander-strategy-2026-04-17/marketing-master/`):
- `00-index.md` — navigator
- `01-agent-personas-unified.md`
- `02-marketing-skills-catalog.md`
- `03-content-templates-unified.md`
- `04-brand-identity.md`
- `05-marketing-playbooks.md`
- `06-cc-commander-marketing-plan.md`
- `07-competitor-positioning.md`
- `08-distribution-channels.md`
- `09-execution-checklist.md`

---

## 🎫 Open Linear Tickets (CC-292 → CC-327)

Active tracker: https://linear.app/<team>/project/cc-commander-efd0258dcd62

### Kevin-gated (external auth/accounts)
- **CC-311** — 1Password vault populate (10 items) · umbrella for all Stage 2 work
- Deploy-related (implicit in Stage 2) — no distinct ticket yet

### Done in beta.1–beta.3
- **CC-318** — Cost-intelligence layer (shipped beta.3)
- **CC-327** — Per-persona hook matrix (shipped beta.1)
- Most v4 architecture work is merged

### Still open / follow-up
- **CC-315** — Mode Switcher 2.0 (7 workflow modes: Race/Production/Learning/Silent/Explore/Deep/Vibe) — partial, iterate in beta.5
- **CC-316** — `ccc create` scaffolder (6 templates: saas/api/cli/mobile/landing/mcp-server) — beta.5
- **CC-317** — Confidence meters (per-response model certainty) — beta.5
- **CC-323** — Inter-agent cross-session comms (Supabase `agent_messages` table schema in place; wire up post-deploy)
- **CC-324** — Visible delegation UX ("theater mode") — post-deploy
- **CC-325** — BIBLE.md split into Mintlify chapters (beta.5)
- **CC-326** — Proactive UX + `ccc doctor --auth` (partially shipped beta.3; polish)
- **CC-312** — Creator rev-share 80/20 — v4.1 (defuse Agent37 threat)
- **CC-313** — Emdash partnership — v4.1 distribution multiplier

---

## 🧩 Deferred to v4.0.0-beta.5+

Tracked here instead of scattered TODOs:

- **Full marketing site pivot** — populate `site/app/{beta,dashboard,compatibility,faq,commander-hub}/page.tsx` using `20-content-for-marketing-site.md` copy (skeleton dirs exist)
- **Wire `/api/auth/magic-link` + `/api/auth/callback` + `/api/beta/signup` routes** in `site/app/api/`
- **BIBLE.md chapter split into Mintlify** (CC-325)
- **Full Mintlify v4 content refresh** — pages beyond introduction/install/quickstart/browse-modes/upgrade
- **Lint tech debt** — reduce 143 warnings back to <120 (`--max-warnings 150` temporarily)
- **End-to-end MCP handshake test** (local + hosted)
- **Supabase migration validation on fresh project**

---

## 🚨 Known Issues / Constraints

- **npm token 401** — `op://Alfred/s5lmiih75pb4ksxwkpfmkyy7wi/credential` is expired. Blocks `npm publish`. Refresh required.
- **Mac Mini migration complete**, **laptop migration needs re-run** with the fixed symlink (shipped in beta.4):
  ```bash
  curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash
  ```
- **Anthropic MAX account** in `disabled_billing` — not CC Commander's issue but affects Kevin's Claude usage for dev work. Falls back via ClaudeSwap.
- **Marketplace rename `commander-hub` → `commander-hub`** in beta.4 — users need one-time re-add:
  ```
  /plugin marketplace remove commander-hub
  /plugin marketplace add KevinZai/commander
  ```

---

## 🔗 Critical Reference Files (in repo)

- `PLAN.md` — this file (single source of truth)
- `CHANGELOG.md` — release notes history
- `CLAUDE.md` — codebase working instructions
- `CLAUDE.md.template` — v4 template shipped to plugin users
- `BIBLE.md` — The Kevin Z Method, philosophy + playbooks
- `commander/cowork-plugin/MCP.md` — end-user opt-in guide for plugin MCP mode
- `commander/cowork-plugin/CONNECTORS.md` — 10 connector categories
- `docs/plugin-mcp-hybrid.md` — developer architecture doc
- `mintlify-docs/features/browse-modes.mdx` — public-facing explainer
- `mintlify-docs/plugin/upgrade.mdx` — upgrade guide per version
- `scripts/deploy.sh` — Stage 3 deploy orchestrator
- `scripts/migrate-ccc-to-commander.sh` — legacy marketplace migration one-liner
- `.github/workflows/ci.yml` — airplane-mode + PII + doc-sync + lint gates
- `.github/workflows/deploy.yml` — Stage 3 deploy CI
- `tasks/kevin-handback-checklist.md` — detailed 7-step deploy playbook (legacy doc; superseded by this PLAN.md)

---

---

## 🔀 CLI / Plugin Parity — SSoT Map

Audited 2026-04-21. Documents where each data type actually comes from in CLI vs plugin flows.

| Data | CLI reads from | Plugin reads from | SSoT match? |
|------|---------------|-------------------|-------------|
| **Version** | `package.json` → `branding.js` → `bin/kc.js` | `commander/cowork-plugin/.claude-plugin/plugin.json` | ⚠️ **Dual source** — package.json is authoritative; plugin.json must be manually kept in sync |
| **Skills list** | `skills/` dir + `skills/_tiers.json` via `commander/skill-browser.js` | `commander/cowork-plugin/skills/` dir (separate subtree) | ⚠️ **Separate dirs** — CLI reads from repo-root `skills/`, plugin reads from `cowork-plugin/skills/`. The 28 plugin skills ≠ the 502+ CLI skills |
| **Agents list** | Not used — CLI dispatches via `dispatcher.js` | `commander/cowork-plugin/agents/` dir | ⚠️ **Plugin-only** — CLI has no agent concept; agents are a plugin primitive |
| **Commands list** | `commands/` dir (83 slash command .md files) | Plugin skills serve as commands (no separate commands dir in plugin) | ⚠️ **Different primitives** — CLI uses slash command .md files; plugin uses skills |
| **Hooks** | `hooks/` dir + `hooks.json` (25 kit-native hooks) | `commander/cowork-plugin/hooks/` dir + `.claude-plugin/plugin.json` hooks block | ⚠️ **Separate registries** — kit hooks run in CLI context; plugin hooks run in Desktop context |
| **Marketplace slug** | N/A | `commander/cowork-plugin/.claude-plugin/marketplace.json` | ✅ Single source |
| **MCP config** | `commander/mcp-server/` (local stdio) | `commander/cowork-plugin/.mcp.json` (9 bundled servers) | ⚠️ **Separate configs** — local MCP for CLI dev; `.mcp.json` bundled with plugin |

### Top 3 Findings

1. **Version dual-source (P1):** `package.json` version (CLI) and `plugin.json` version (plugin) are manually kept in sync. Current state: both say `4.0.0-beta.9`. Risk: they drift on npm publish if someone bumps `package.json` without updating `plugin.json`. Fix: add a pre-commit hook or CI check that asserts `package.json.version === plugin.json.version`.

2. **Skills in separate dirs (P2):** The 28 plugin skills live in `commander/cowork-plugin/skills/` and are NOT the same files as the 502+ skills in the repo-root `skills/` dir. Plugin skills are standalone SKILL.md files; ecosystem skills are organized into domain subdirs. This is intentional architecture but creates a maintenance burden — updates to a shared concept require edits in two places. Fix: consider symlinking the ccc-* domain routers from `skills/ccc-*/` into `cowork-plugin/skills/` so plugin and CLI share one copy.

3. **Hook registries diverged (P3):** CLI hooks (`hooks/` + `hooks.json`) and plugin hooks (`cowork-plugin/hooks/` + `plugin.json`) are separate. A fix to a shared hook behavior (e.g. cost-tracker) must be applied twice. Fix: evaluate whether plugin hooks can import from the kit's `hooks/` dir or share a common `lib/hooks/` module.

---

## 📝 How to update this file

When state changes that affects the roadmap:
1. Edit this file first
2. Reference the Linear ticket in the change
3. Commit with message: `docs(plan): <concise change>`
4. Don't duplicate the info in CHANGELOG (CHANGELOG is release notes per version; PLAN is forward-looking)
5. Don't duplicate in CLAUDE.md (CLAUDE.md is codebase working instructions, not roadmap)

**Single source of truth rule:** if the info is forward-looking/roadmap → PLAN.md. If it's release-specific → CHANGELOG.md. If it's "how to work in this codebase" → CLAUDE.md.
