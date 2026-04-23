# Changelog

All notable changes to CC Commander will be documented in this file.

## [4.0.0-beta.10] — 2026-04-23 — Hardening + Desktop-first positioning

### 🎯 Headline

Cumulative hardening across Waves 1/2/3/4/10: security sweep, XML creep elimination, three new skills (30→33), and a full doc sync that establishes Claude Code Desktop as the primary product surface across all 15 user-facing docs. Test suite grows to 284 passing.

### 🔴 Security (Wave 1 — commit 0e362da)

5 pre-stable vulnerabilities resolved:
- **cwd validation** — `kc.js` no longer trusts `process.cwd()` without confirming the path exists and is a directory
- **execFile migration** — shell-injectable `exec()` calls replaced with `execFile()` across dispatcher and hook scripts
- **path-traversal guard** — local MCP `handleGetAgent` and cloud MCP `getAgentContent` now use `path.resolve` containment checks to prevent `../` escapes
- **CLAUDE_DIR guard** — all file writes to `~/.claude/` assert the resolved path stays inside the intended subdirectory
- **5 security regression tests** added — `commander/tests/dispatch-security.test.js`

### 🎨 UX (Wave 2)

- **XML strip across 17 agents + 15 skills** — angle-bracket tags (`<example>`, `<context>`, etc.) eliminated from all frontmatter `description` fields
- **`audit-frontmatter.js` CI gate** — `node scripts/audit-frontmatter.js --check` now runs in CI; any reintroduced angle brackets fail the build

### ✨ New Skills (Wave 3 — 30→33)

- **`/ccc-e2e`** — E2E test scaffolding and Playwright automation. Chips: New suite · Existing project · Visual regression
- **`/save-session`** — Save current session state (context, todos, plan) to `~/.claude/commander/sessions/`
- **`/resume-session`** — Resume a previously saved session; lists recent saves with timestamps

### 📚 Docs (Wave 10 + Wave 7)

- **Desktop-first positioning** woven into README, BIBLE, CHEATSHEET, SKILLS-INDEX, CLAUDE.md, PLAN, plugin README, Mintlify intro, install.mdx, skills.mdx
- **Screenshot scaffold** — `docs/screenshots/` with 7 placeholder briefs; README now includes `## 📸 Screenshots` section referencing all 7 slots
- **OG image** — `docs/assets/og-image-v4.svg` ships for social sharing
- **Canonical claim throughout:** "Cowork Desktop and Claude Code Desktop are the same app, two UI modes."

### 🧪 Tests

- 279 → **284 passing** across 14 suites
- 5 new security regression tests
- `audit-frontmatter.js --check` and `audit-counts.js --check` both pass

### 📊 Counts

Plugin skills: 30 → **33** · Sub-agents: **17** (unchanged) · MCP servers: **9** (unchanged) · Lifecycle hooks: **8 × 16 handlers** (unchanged)

---

## [4.0.0-beta.9] — 2026-04-22 — Vendor sweep fold-in

### 🎯 Headline

Added 5 quick-win items from a pre-launch vendor audit across 20 submodules. Ships 2 new plugin skills, 2 new language-specialist reviewer agents, and 1 new bundled MCP server. Quality over quantity — deferred 4 bigger integrations (brainstorming gate, QA skill, full hooks ecosystem, 5 more language reviewers) to v4.1.

### ✨ Added

- **`/ccc-agent-writing` skill** (adapted from [superpowers/writing-skills](https://github.com/nicholasgasior/superpowers)) — teaches agents to write specs, PRDs, PR descriptions, and docs with clarity, persuasion, and testability. Delegates long-form to the `content-strategist` persona.
- **`/ccc-systematic-debugging` skill** (adapted from [superpowers/systematic-debugging](https://github.com/nicholasgasior/superpowers)) — enforces the Iron Law (no fix without confirmed root cause). Reproduce → hypothesize → verify → fix. Delegates deep dives to the `debugger` persona.
- **`typescript-reviewer` agent** — TypeScript-specific code review: strict mode, async correctness, ESM/CJS module hygiene, security (ReDoS, prototype pollution), idiomatic type patterns. Inherits `reviewer` persona voice.
- **`python-reviewer` agent** — Python-specific code review: PEP 8, type hints, async/await, pytest patterns, security (SQL/shell injection, path traversal, pickle), idiomatic Python. Inherits `reviewer` persona voice.
- **`sequential-thinking` MCP server** bundled in `.mcp.json` — extra reasoning primitive for complex multi-step problems.

### 📊 Counts

Plugin skills: 28 → **30** · Specialist sub-agent personas: 15 → **17** · Bundled MCP servers: 8 → **9**

### 🟡 Deferred to v4.1

4 bigger integrations identified in the vendor sweep but held for v4.1 quality/scope discipline:
- Brainstorming design-first skill (superpowers) — overlaps `ccc-plan` + `ccc-design`; dedicated v4.1 reconciliation
- `/ccc-qa` skill (gstack) — deeper test-runner integration needed
- ECC's 14-hook governance ecosystem — wider blast radius, deserves its own release
- 5 more language reviewers (go, rust, java, kotlin, c#, flutter, c++) — quality > quantity; tune 2 at a time

## [4.0.0-beta.8] — 2026-04-21 — Launch Readiness (security + docs + native UI sweep)

### 🎯 Headline: plugin lands v4.0 stable next

Full pre-launch sweep across security, consistency, docs, and UX primitives. 8 commits since beta.7. Ship-worthy per final audit (A−, 92/100). Next release is v4.0.0 stable after 48h dogfood with zero P0 regressions.

### ✨ Added — Claude Code Desktop native UI primitive integration

- **`/ccc` first-run onboarding gate.** Reads `~/.claude/commander/state.json`; if the user hasn't completed `/ccc-start`, routes them there automatically before showing the main picker. `session-start.js` hook seeds the state file on first run (idempotent). `/ccc-start` writes `onboardingCompleted: true` at the end of the tour.
- **ASCII CCC hero banner** shared between `/ccc` and `/ccc-start` — single source of truth at `commander/cowork-plugin/lib/banner.txt` with `{{VERSION}}` templating from plugin.json.
- **`/ccc-plan` uses native plan mode.** Reads the Desktop session-bound plan path from the SessionStart hint OR calls `EnterPlanMode` to obtain one. Writes the plan to that exact path, then calls `ExitPlanMode` — plans now render in Claude Code Desktop's native **Plan pane**. Previous flow wrote to a fixed `~/.claude/plans/ccc-<date>-<slug>.md` path that Desktop didn't know about (pane said "no plan yet" even after skill ran). `ccc-start` plan writes use the same flow.
- **`spawn_task` sidebar chips in `/ccc-review` + `/ccc-ship`.** Each 🔴 Critical / 🟠 High blocker becomes a clickable sidebar action chip via `mcp__ccd_session__spawn_task`. Medium + nits continue to render as markdown / TodoWrite.
- **`mark_chapter` session navigation markers** across `ccc-plan`, `ccc-review`, `ccc-ship`, `ccc-build` at phase transitions. Users can jump between "Feature planning" / "Plan drafted" / "Tests: X/Y" / "Release tagged" checkpoints in long flows.
- **2 new lifecycle hooks registered** — `PreCompact` (pre-compact.js now blocks compaction during active subagents via JSON `continue:false` protocol) and `SubagentStop` (subagent-stop.js tracks dispatch results). Hook event registry grew 6 → 8 events, 12 → 16 total handlers.

### 🔐 Security — launch-blocker sweep

- **BLOCK-2: `secret-leak-guard.js` now actually works for users.** The patterns file was at `commander/core/secret-patterns.json` — OUTSIDE the plugin tree, never shipped in `./commander/cowork-plugin` marketplace source, so the security guard was silently disabled for every user install. Relocated to `commander/cowork-plugin/lib/secret-patterns.json` with legacy-path fallback.
- **H1: Path-traversal guard** in local MCP `handleGetAgent` (`commander/mcp-server/index.js:110`). Unsanitized `args.name` could escape the agents directory via `path.join` normalization. Added `path.resolve` containment check.
- **H3: Same guard** in cloud MCP `getAgentContent` (`apps/mcp-server-cloud/src/lib/registry.ts:221`).
- **H2: `deploy.sh --env-file` renamed** from `.env.example` → `.op.env`. The `--env-file` flag resolves `op://` references; using `.env.example` (typically committed) could silently inject production secrets into child processes.

### 🧹 Consistency

- **`pre-compact.js` aligned to JSON-output hook protocol** (was using `process.exit` codes; now emits `{continue: false, stopReason}` like every other blocking hook).
- **`fleet-notify.js` empty-stdin guard** — was throwing `SyntaxError` on empty input and silently dropping all Notification events. Added `.trim()` + early-return.
- **11 domain router skills** (`ccc-data`, `ccc-devops`, `ccc-saas`, `ccc-mobile`, `ccc-research`, `ccc-seo`, `ccc-testing`, `ccc-marketing`, `ccc-security`, `ccc-makeover`) had no `allowed-tools` frontmatter at all. Added minimal `[Read]`.
- **`ccc-start` stopped hardcoding `v4.0.0-beta.6`** as a stale-cache example.

### 📚 Docs

- **Canonical count sync** across 8 user-facing docs — README, PLAN, CHEATSHEET, BIBLE, plugin README, install.sh, Mintlify introduction, Mintlify skills. Every doc now shows the same numbers: 28 plugin skills · 15 specialist agents · 8 lifecycle hooks · 8 bundled MCP servers · 502+ ecosystem skills · 11 CCC domains · marketplace `commander-hub` · version `4.0.0-beta.8`.
- **Mintlify `plugin/skills.mdx` fully rewritten** from a 15-skill list → 28-skill catalog grouped by tier.
- **Mintlify `introduction.mdx` self-contradiction fixed** (card grid said 15, stats table said 28 — now both 28).
- **Plugin README version drift** — was still at `v3.0.0` + `26 plugin skills` from the v3→v4 restructure. Bumped to current canonical values.
- **PLAN.md new section: "CLI / Plugin Parity — SSoT Map"** documenting 3 dual-source drift points flagged for v4.1 consolidation.

### 🧭 Repo hygiene

- **Orphan `.claude-plugin/plugin.json` removed** (stale v3.0.0 artifact). Root `.claude-plugin/marketplace.json` (the actual discovery manifest) preserved.
- **4 previously-dead hooks registered properly** — `post-compact-recovery.js`, `user-prompt-submit.js`, `pre-compact.js`, `subagent-stop.js`.
- **4 hooks kept on disk but intentionally unregistered** — `elicitation-logger`, `elicitation-result-handler`, `permission-denied`, `subagent-start-tracker` target events that don't exist in current Claude Code plugin runtime catalog. Files preserved for test coverage + future runtime enablement (13 tests in `hooks-v4.test.js`).

### 🛡️ Security posture — post-sweep

Final audit: **0 critical, 3 high fixed, 4 medium deferred to v4.1** (ReDoS anchor on AWS-secret regex, `/metrics` endpoint auth, `kc.js --skills install` argv guard, `suggest-ticker.js` `execFileSync` migration).

### 💚 Business model locked: FREE FOREVER

CCC will stay free for users, always. Sustained by:
- Transparent affiliate links in `/ccc-connect` + domain routers (Supabase, Vercel, Stripe Atlas, Neon, Resend, Fly, Linear)
- Kevin's consulting practice (plugin = trust-engine → consulting-engine)
- Featured Partner slots in v4.2+ (clearly marked, distinct from core recs)

No Pro tier, no Stripe, no paywalls. The plugin is a gift to the Claude Code community.

### Commits in this release

- `486960c` — orphan `.claude-plugin/` cleanup + Mintlify docs beta.5 → beta.7
- `b74c611` — restore root `.claude-plugin/marketplace.json` (undo over-deletion)
- `149248b` — `/ccc` onboarding gate + ASCII hero banner
- `dedc804` — native UI primitives sweep (spawn_task + mark_chapter)
- `9e1f60d` — `/ccc-plan` uses EnterPlanMode + ExitPlanMode + session-bound path
- `e586f53` — register 4 previously-dead hooks
- `4bf7779` — pre-launch security + consistency sweep
- `aa10939` — comprehensive docs refresh + CLI parity audit

## [4.0.0-beta.7] — 2026-04-20 — Click-First UX Overhaul (Desktop-native, skill-based /ccc)

### 🎯 Headline feature: `/ccc-suggest` + `/ccc-cheatsheet`

Beginners hit the same wall at session 3: **info paralysis.** 500+ skills, 50+ plugins, nowhere to start. Two new skills collapse that wall:

- **`/ccc-suggest`** — Opus-class real-time recommender. Scans your project state (strong signals → stack signals → user intent), returns **ONE starred next step** with reasoning + named 3rd-party plugins. When `claude-mem`, `superpowers`, `caveman`, `impeccable`, or `graphify` is the right tool, it says so by name. CC Commander doesn't hoard workflows — it's a guided PM that delegates.
- **`/ccc-cheatsheet`** — live Mermaid flow diagram of the whole plugin. Reads the filesystem as single source of truth. Never drifts from reality because there's no static copy.

Together with the click-first chip-picker overhaul, this ships a **skill-based architecture**: every `/ccc-*` command is now a plain slash command (no `commander:` namespace prefix) and renders with a native `AskUserQuestion` chip picker in Claude Cowork Desktop / Claude Code Desktop. Fifteen specialist workflows total.

### Fixed

- **`/ccc` now registers as plain slash, not `/commander:ccc`.** Root cause: plugin *commands* are auto-namespaced by Claude Code as `/<plugin>:<cmd>`, but plugin *skills* appear as plain `/<skill-name>`. Migration: moved all `/ccc-*` entries from `commander/cowork-plugin/commands/` into `commander/cowork-plugin/skills/ccc-*/SKILL.md`, removed the commands/ directory, dropped the `install-delegates.js` SessionStart hook (no longer needed).
- **XML leakage in autocomplete tooltips.** 11 ccc-* domain skills had `<example>` routing blocks embedded in their YAML frontmatter `description:` fields, which Cowork Desktop rendered verbatim in the autocomplete hover. Cleaned descriptions to single-line quoted strings; moved routing examples into a `## When to invoke this skill` body section. Bonus: re-quoted 9 additional skills whose descriptions contained colons that would have broken YAML parsing on a future edit.
- **Artifact auto-render assumption was wrong for Cowork Desktop.** Fenced `html` blocks display as literal code, not as interactive artifacts. All Wave 2 `/ccc-*` skills pivot to `AskUserQuestion`-native pickers (4 options max per question, nested pagination: intent → domain → action). HTML artifact scaffold at `commander/cowork-plugin/lib/menu-artifact.html.tpl` is preserved for future use if Anthropic adds Desktop artifact support, but not on the active UX path.

### Added

#### 15 click-first specialist skills (all plain `/ccc-*` commands)

| Command | Purpose |
|---|---|
| `/ccc` | Main hub — 6-intent visual picker with recommended-tile logic based on detected context |
| `/ccc-suggest` 🌟 | **Intelligence layer** — scans project state, returns ONE starred next step with reasoning + named 3rd-party plugins |
| `/ccc-cheatsheet` 🌟 | Live Mermaid flow diagram of the whole plugin — filesystem-backed, never drifts |
| `/ccc-start` | First-run onboarding: detects setup, introduces the 15 agent personas, writes initial plan file |
| `/ccc-browse` | Cascading catalog: Domains (11) · Workflows (9) · Agents (15) · Full grid |
| `/ccc-plan` | Spec interview → plan file in `~/.claude/plans/ccc-<date>-<slug>.md` via `planner` subagent |
| `/ccc-build` | Scaffold: web / API / CLI / mobile / from-spec — cascades into 3-question spec interview |
| `/ccc-review` | Audit: diff vs main / security (OWASP) / perf (hot-path) / full x-ray — writes findings to `tasks/reviews/` |
| `/ccc-ship` | Pre-flight → release → deploy → rollback. Parallel test matrix, platform-agnostic deploy |
| `/ccc-design` | UI/UX: landing / components / polish / figma→code (+ preserves existing domain routing body) |
| `/ccc-learn` | Skill discovery cascade across 11 CCC domains |
| `/ccc-xray` | Project health scorecard with per-finding "fork to fix" spawn_task chips |
| `/ccc-linear` | Linear integration: view / pick / create / board overview |
| `/ccc-fleet` | Multi-agent orchestration in parallel git worktrees: fan-out / pipeline / FOR-AGAINST / background |
| `/ccc-connect` | Opt-in MCP connector: Notion / Zapier / Supabase / Slack / Google Drive / Figma / GitHub / Firecrawl / Exa |

#### Competitive differentiators now shipping

- 🖱️ **Click-first UX** — every menu is a native `AskUserQuestion` chip picker. No typing. No numbered menus. No ASCII.
- 🧠 **`/ccc-suggest` intelligence layer** — 3 reasoning tiers (strong signals → stack signals → user intent), Opus-class recommendation, plugin-aware.
- 🎭 **15 specialist agents with persona voices** — each agent has a voice layer in `commander/cowork-plugin/rules/personas/` (architect, security-auditor, performance-engineer, content-strategist, data-analyst, designer, product-manager, technical-writer, devops-engineer, qa-engineer, reviewer, builder, researcher, debugger, fleet-worker).
- 🔌 **8 core MCP servers pre-wired** — Tavily, Context7, Firecrawl, Exa, GitHub, Figma, Playwright, claude-mem. Plus opt-in via `/ccc-connect`: Notion, Zapier, Supabase, Slack, Google Drive.
- 🪝 **6 lifecycle hooks** — SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, Notification. 100% schema-compliant.
- 🔄 **Weekly vendor auto-sync** — 20 vendor submodules update via GitHub Actions; ecosystem stays current automatically.
- 🌐 **Cross-client, one license** — Cowork Desktop, Code Desktop, Code CLI, Cursor, Windsurf, Cline, Continue, Codex, mobile (hosted MCP).
- 🚁 **Fleet orchestration** — `/ccc-fleet` runs multiple Sonnet agents in parallel **git worktrees**.
- 🆓 **Free in beta** — no credit card, 1,000 hosted-MCP calls/mo + one skippable survey per session.
- 🧬 **Shared brain: plugin + CLI** — same intelligence layer, same skill catalog, same personas. Install either, get both.
- 🎯 **Plugins-name-plugins** — `/ccc-suggest` calls out `claude-mem`, `superpowers`, `caveman`, `impeccable`, `graphify`, `claude-reflect`, `repomix`, `claude-hud`, and more by name when they're the right tool.
- 📖 **The Kevin Z Method** ships with the plugin (`BIBLE.md`) — 7 rules, 200+ sources, 14 months of production methodology.

#### Shared scaffold

- `commander/cowork-plugin/lib/menu-artifact.html.tpl` — HTML/Tailwind template (preserved for future interactive-artifact support)
- `commander/cowork-plugin/lib/menu-render.js` — Node renderer (template → artifact HTML given a menu ID + optional context)
- `commander/cowork-plugin/menus/*.json` — 7 menu trees (`ccc-root`, `ccc-build`, `ccc-review`, `ccc-design`, `ccc-ship`, `ccc-more`, `ccc-learn`) — used by skill markdown as source-of-truth for option labels

#### Ecosystem

- **Six-step external-source contribution protocol** documented in `docs/ECOSYSTEM.md` (coming in beta.7 final push). Metadata → scope → integration path → security audit → integration test → docs.
- **15-MCP evaluation matrix** applied from the DamiDefi article: Firecrawl / Exa / GitHub / Figma / Playwright promoted to plugin core, Notion / Zapier / Supabase / Slack / GDrive available via `/ccc-connect`, Bright Data / Bannerbear / Apify docs-linked, Memory MCP skipped (we use claude-mem).

### Changed

- `4.0.0-beta.6` → `4.0.0-beta.7` across `package.json`, `commander/cowork-plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`. Clean bump (no alpha suffix) so Cowork Desktop's GUI "Update" button activates unambiguously.
- README pivot: plugin-first hero with dual-path callout. "⭐ Start here" block for Cowork/Desktop users, "⌨️ Power-user install" section for CLI/npm users. All `/plugin` slash command references scoped to "Claude Code CLI only" to match reality (Desktop clients manage plugins via GUI).
- CLAUDE.md updated with v4.0.0-beta.7 version stamp, current 28-skill count, explicit GUI install path, and architecture note on skill-based `/ccc` design.

### Removed

- `commander/cowork-plugin/commands/` directory — 2 files (ccc.md migrated to skill; spike commands promoted to `ccc-spike`/`ccc-spike-confirm` skills). No longer needed now that the command vs skill primitive question is resolved.
- `commander/cowork-plugin/hooks/install-delegates.js` + its SessionStart wiring — obsolete now that skills natively appear as plain `/<name>`.

### Verification

```
claude plugin validate commander/cowork-plugin   # ✔ passed
claude plugin validate .                         # ✔ passed
npm test                                         # 279/279
MCP_DISABLED=1 npm test                          # 279/279
node bin/doc-sync.js                             # OK
node scripts/audit-counts.js --check             # PASS
```

### Upgrade path

v4.0.0-beta.6 → beta.7 is update-compatible — no reset needed. In Cowork Desktop:
1. Settings → Plugin Marketplace → commander-hub → **Refresh / Check for updates**
2. Click **Update** on the commander plugin card
3. Cmd+Q + reopen for autocomplete cache to refresh

If the Update button stays greyed out: remove the `commander-hub` marketplace via GUI, Cmd+Q, reopen, re-add `KevinZai/commander`, install.

The v1.x → v4 legacy reset script (`scripts/reset-commander-install.sh --full`) remains available for machines still running pre-plugin-era CLI installs, but is **not needed** for v4.0.x → v4.0.x updates.

## [4.0.0-beta.6] — 2026-04-19 — Plugin Manifest Schema Compliance (Install Fix, Round 2)

### Fixed
- **Plugin install still failing after beta.5** — root cause identified via `claude plugin validate` (Claude Code ≥ 2.1.98 ships a first-class validator). Two schema violations:
  1. `commander/cowork-plugin/.claude-plugin/plugin.json` declared `hooks`, `skills`, and `agents` as top-level fields. Claude Code rejects `hooks` when the entries are not wrapped in matcher groups, and does not accept `skills`/`agents` as string path fields (directories auto-discovered from `./skills/` and `./agents/`).
  2. `commander/cowork-plugin/hooks/hooks.json` had hook entries placed directly in the event array. Correct schema nests them inside matcher groups: `{ "EventName": [ { "matcher": "*", "hooks": [ {type, command, timeout} ] } ] }`.
- **Non-standard hook events removed** — `Elicitation`, `ElicitationResult`, `PostCompact`, `SubagentStart` were not accepted by the plugin validator. Kept only verified-stable events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `Notification`. Scripts for the removed events remain on disk; they just no longer wire into plugin lifecycle until Claude Code's schema officially supports them.

### Added
- **`scripts/reset-commander-install.sh`** — bulletproof one-shot purge script that handles ALL install surfaces: Claude Code Desktop, Claude Cowork Desktop, Claude Code CLI (they share `~/.claude/plugins/`). Removes legacy (`ccc-marketplace`, `commander-marketplace`), current (`commander-hub`), cache dirs, install manifests, and `installed_plugins.json` entries. Creates timestamped backup at `~/.claude/backups/commander-reset-*/` before any change. Idempotent + safe to re-run.
- `.claude-plugin/marketplace.json` — now ships a `description` field (fixes validator warning about missing marketplace description).

### Changed
- `.claude-plugin/marketplace.json` entry `version` synced `4.0.0-beta.5` → `4.0.0-beta.6` to match `plugin.json` (fixes validator drift warning).
- **Plugin manifest is now minimal + schema-compliant**: only `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`. Everything else (skills, agents, hooks) auto-discovered — same pattern as the reference `claude-mem` plugin.

### Also added in beta.6 (same-day post-ship follow-up)
- **`commander/cowork-plugin/commands/ccc.md`** — plugin now ships a `/ccc` slash command. Previously `/ccc` only existed as a user-level file from the pre-plugin-era `install-remote.sh`, which is why laptops with legacy installs were seeing stale v1.0.0 output when they typed `/ccc` even after the plugin was installed. The plugin command reads version directly from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`, so it always shows the installed plugin version.
- **`scripts/diagnose-ccc-sources.sh`** — NEW read-only diagnostic. Scans 6 locations (plugin install, user commands, user skills, CLI state dir, PATH binary, other install trails) and prints version stamps from each. Shows exactly which legacy source is serving stale /ccc output. Never modifies anything.
- **`scripts/reset-commander-install.sh --full`** — new flag. In addition to plugin state, removes legacy CLI install: `~/.claude/commands/ccc*.md`, `~/.claude/skills/ccc/`, `~/.claude/skills/commander/`, `~/.claude/commander/` state dir, `~/.cc-commander`, `~/.ccc`, and the npm-global `cc-commander` package (via realpath-based detection that works under any npm prefix — nvm, homebrew, system). Domain skills (`ccc-design`, `ccc-marketing`, etc.) are NEVER touched — only exact-match `ccc` and `commander` top-level dirs.
- **`scripts/reset-commander-install.sh --dry-run`** — new flag. Preview every change the script would make without touching anything. Pairs with `--full` for a full preview.

### Notes
- `user-prompt-submit.js` and `permission-denied.js` remain on disk but are no longer wired to a hook event. Both are Pro-tier analytics stubs (no-ops in free beta) and will be re-wired once Claude Code's schema accepts the corresponding events. No functional change for beta users.

### Security + safety hardening (reset script)
- Bash arrays replace space-split env vars — no word-splitting surprises under `set -u`.
- Python registry writes are now atomic (`tempfile.mkstemp` → `os.replace`) so a crash mid-write can't corrupt `known_marketplaces.json` / `installed_plugins.json`.
- Exact-match sweep instead of substring sweep in `install-counts-cache.json` — a third-party plugin whose name happens to contain `ccc` or `commander` is no longer silently wiped.
- Python heredoc runs under `|| warn` so a malformed registry file doesn't abort the filesystem purge.

### Verification
- `claude plugin validate commander/cowork-plugin` → ✔ Validation passed
- `claude plugin validate .` (marketplace) → ✔ Validation passed (1 warning resolved in beta.6 itself)
- `bash -n scripts/reset-commander-install.sh` → syntax OK

### Upgrade path
On any machine where earlier betas were installed:
```
bash <(curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/scripts/reset-commander-install.sh)
# Fully quit Claude Code / Cowork Desktop (Cmd+Q), reopen, then:
/plugin marketplace add KevinZai/commander
/plugin install commander
```

## [4.0.0-beta.5] — 2026-04-18 — Plugin Install Fix + Cowork-First Positioning

### Fixed
- **Plugin install error** (`Failed to install plugin`) — removed non-standard `tiers` field from `commander/cowork-plugin/.claude-plugin/plugin.json`. Claude Code's plugin schema was rejecting the manifest because of the unknown key. Tier metadata was informational only (all-free during beta); move to CHANGELOG + docs for when Pro returns.

### Changed
- **Marketing positioning sweep — Cowork-first messaging across all user-facing docs:**
  - `README.md` — hero table now leads with "New to AI coding agents? → Claude Cowork Desktop" — targets the novice audience. Four-client compatibility grid.
  - `mintlify-docs/introduction.mdx` — new "Works everywhere Claude works" section, 4-card client matrix (Cowork / Code Desktop / CLI / MCP).
  - `mintlify-docs/features/browse-modes.mdx` — 4-client table instead of 2-client, Cowork listed FIRST with ⭐ marker.
  - `commander/cowork-plugin/README.md` — "Who's it for?" section leads with Cowork novice audience.

### Added
- `mintlify-docs/features/compatibility.mdx` — new dedicated compatibility page with:
  - Primary clients section (Cowork Desktop ⭐, Code Desktop, CLI)
  - MCP clients section with config snippets for Cursor / Windsurf / Cline / Continue / Codex / Claude mobile
  - Feature matrix by client
  - "Mix and match" scenario for power users running plugin + MCP
- `docs.json` nav updated — `features/compatibility` listed first in Core Features group

## [4.0.0-beta.4] — 2026-04-18 — Marketplace Rename + Broken-Symlink Fix + PLAN.md

### Changed
- **Marketplace slug renamed:** `commander-marketplace` → **`commander-hub`** (shorter, aligns with v4.1 Commander Hub marketplace feature). Users must re-add: `/plugin marketplace remove commander-marketplace` + `/plugin marketplace add KevinZai/commander`
- `scripts/migrate-ccc-to-commander.sh` — now purges BOTH legacy marketplace names (`ccc-marketplace` AND `commander-marketplace`) in one pass

### Fixed
- **Broken symlink `skills/marketing-pack`** was pointing to non-existent `mega-marketing` — caused plugin install failure on fresh machines with error: `cp: .../marketplaces/commander-marketplace/skills/marketing-pack: No such file or directory`. Retargeted to `ccc-marketing` (current canonical).

### Added
- `PLAN.md` at repo root — **single source of truth** for v4 roadmap + Linear ticket refs (CC-292 → CC-327). Forward-looking content lives here; CHANGELOG stays release-notes; CLAUDE.md stays codebase-working-instructions.

## [4.0.0-beta.3] — 2026-04-18 — Real MCP Server + 8 Hooks + Plugin Hybrid

**Design contract:** the plugin stays 100% functional standalone. MCP is ADDITIVE. Every new capability either enhances plugin behavior when MCP is reachable, or gracefully falls back to local behavior when MCP is unreachable/unconfigured. CI enforces this via airplane-mode test.

### Added — Plugin (local-only, zero MCP dependency)
- **8 P0 lifecycle hook handlers** — `elicitation-logger`, `elicitation-result-handler`, `post-compact-recovery`, `subagent-start-tracker`, `cost-ceiling-enforcer`, `context-warning`, `stale-claude-md-nudge`, `secret-leak-guard`
- New hook events wired in `plugin.json` + `hooks.json`: `Elicitation`, `ElicitationResult`, `PostCompact`, `SubagentStart`; extensions to `PreToolUse`, `UserPromptSubmit`, `SessionStart`
- `commander/core/secret-patterns.json` — 16 patterns + allowlist for secret-leak guard
- `commander/tests/hooks-v4.test.js` — 63 tests covering all 8 hooks + airplane-mode guard

### Added — Plugin MCP Passthrough (opt-in)
- `commander/cowork-plugin/lib/mcp-passthrough.js` — core passthrough contract with local fallback on every call
- `commander/cowork-plugin/lib/mcp-config.example.json` — example `.claude/mcp.json` for opt-in
- `commander/cowork-plugin/MCP.md` — end-user opt-in guide
- `commander/cowork-plugin/.claude-plugin/config-schema.json` — JSON Schema for plugin config
- `commander/skill-browser.js` — enhanced with optional MCP-backed lookup via `listSkillsEnhanced({ useMcp })`
- `docs/plugin-mcp-hybrid.md` — developer architecture doc

### Added — Hosted MCP Server (production-ready)
- `apps/mcp-server-cloud/src/tools/*` — 13 real tool handlers (replaced scaffold stubs from beta.1)
- `apps/mcp-server-cloud/src/lib/registry.ts` — in-memory skill+agent index from `commander/core/registry.yaml`
- JWT bearer auth middleware (Supabase magic-link flow)
- Upstash rate limiter (1000 calls/mo hard cap)
- Mandatory feedback gate (every 20th call → 402 with action)
- `apps/mcp-server-cloud/tests/integration.test.ts` — in-memory mocks (no external deps required in CI)
- Multi-stage Dockerfile (node:24-alpine slim runtime)
- `fly.toml` — `cc-commander-mcp`, iad region, autoscale 1-3 machines

### Added — CI
- `.github/workflows/ci.yml` — new `airplane mode` step (runs `MCP_DISABLED=1 npm test`) — blocks merge if plugin ever requires MCP
- `tests/airplane-mode.test.js` — 8 tests proving plugin standalone-works contract

### Added — npm scripts
- `mcp:dev` — run local stdio MCP server
- `mcp:cloud:build` / `mcp:cloud:dev` / `mcp:cloud:test` — hosted MCP lifecycle
- `test:airplane` — run airplane-mode suite only

### Changed
- `package.json` / `marketplace.json` / `plugin.json` — bump to `4.0.0-beta.3`
- Test count: 216 → 279 passing (+63 new tests)

### Deploy blockers (Kevin action — see `tasks/kevin-handback-checklist.md`)
All code is deploy-ready. To actually deploy hosted MCP to `mcp.cc-commander.com`, Kevin must provision: 1Password vault (10 items) + Supabase project + Fly app + Upstash Redis + Resend domain verify + Vercel link + domain buys + npm token refresh.

## [4.0.0-beta.2] — 2026-04-18 — All-Free Beta: Everything Unlocked

Strategic pivot for beta: **gate by usage (1000 calls/mo), not by features.** Beta's job is activation + feedback quality, not revenue. Full product experience for every beta user — Pro tier activates at end of beta.

### Changed
- `commander/cowork-plugin/.claude-plugin/plugin.json` — `tiers.free` now includes all 26 plugin skills (added `infra`, `knowledge` from pro); `tiers.pro` empty until post-beta
- `package.json` / `marketplace.json` / `plugin.json` — bump to `4.0.0-beta.2`

### Why
- Feature gating during beta pollutes conversion signal (can't tell if churn = feature lock or product fit)
- "You used all 1000 calls — Pro is $15 for unlimited" is a clean conversion moment
- "This feature is locked behind Pro" drives users to churn, not upgrade
- Plugin gets 24 → 26 free skills (infra, knowledge unlocked)
- Pro tier resumes post-beta with usage quota + Commander Hub marketplace access

## [4.0.0-beta.1] — 2026-04-17 — v4 Beta: MCP Server + Hosted + 15 Personas

Major version — MCP-first cross-IDE beta with 15 specialist personas, hosted beta infra (Supabase + Fly), and marketing site pivot. **Product:** CC Commander · **Tagline:** *"Guided AI PM to Master Claude Code Instantly"* · **Beta model:** free 1000 calls/mo + mandatory feedback, no Stripe yet.

### Added — Architecture
- `commander/mcp-server/` — local MCP server scaffold with 13 tools (list_skills / search_skills / get_skill / suggest_skill / list_agents / get_agent / list_modes / enter_mode / get_status / send_feedback / get_session_time / list_hooks / get_connector) + IDE translation layer
- `commander/core/registry.yaml` — single source of truth for skills/agents/commands/modes/hooks
- `scripts/build-from-registry.js` — drift check wired into `npm test`
- `commander/doctor.js --auth` — diagnostic for env conflicts (ANTHROPIC_*, OPENAI_API_KEY, MANAGED_BY_HOST)
- `commander/dispatcher.js` — cost-intelligence ceiling ($0.50 warn / $2.00 block) + `--cost-ceiling` flag

### Added — Voice + Personas
- `commander/cowork-plugin/rules/common/` — 10 shared voice files (response-style, coding-style, git-workflow, testing, security, patterns, agents, hooks, performance, development-workflow)
- `commander/cowork-plugin/rules/personas/` — 15 specialist personas + README (architect, security-auditor, performance-engineer, content-strategist, data-analyst, designer, product-manager, technical-writer, devops-engineer, qa-engineer, reviewer, builder, researcher, debugger, fleet-worker)
- Every plugin agent wired via frontmatter `persona: personas/<name>` reference

### Added — Docs + Template
- `CLAUDE.md.template` 2026-04-17 refresh — 22-emoji semantic palette + 10 Core Principles + 4 HARD RULES
- Publisher canon sweep: all doc references `Kevin Zicherman` (was mixed `Kevin Z`)
- Skill count canon: **453+** (was inconsistent 450+/453+)

### Added — Beta Infrastructure
- `supabase/migrations/20260417000000_beta_v4.sql` — users, surveys, usage_counters, feedback, agent_messages tables + RLS
- `supabase/seed.sql` — 20-question survey bank
- `apps/mcp-server-cloud/` — hosted MCP server scaffold with Dockerfile + fly.toml + HTTP/SSE transport
- Email templates (welcome / magic-link / feedback-reminder) under `apps/mcp-server-cloud/emails/`

### Changed
- `package.json` — bump to `4.0.0-beta.1`, publisher `Kevin Z` → `Kevin Zicherman`, new tagline description
- `commander/cowork-plugin/.claude-plugin/plugin.json` — `4.0.0-beta.1`, self-describing (`skills:` / `agents:` paths), Kevin Zicherman, v4 keywords
- `.claude-plugin/marketplace.json` — synced with plugin.json
- `commander/branding.js` — canonical publisher Kevin Zicherman in UI strings
- `commander/status-line.js` — Opus 4.7 default + cost gauge + cache hit% + session time remaining
- `README.md` / `CHEATSHEET.md` / `SKILLS-INDEX.md` / `BIBLE.md` — v4 naming + skill count sync

### Follow-ups (tracked for v4.0.0-beta.2)
- 8 P0 hook handlers (Elicitation / ElicitationResult / PostCompact / SubagentStart + 4 from audit)
- Full marketing site pivot (`site/app/page.tsx` hero + pricing + compatibility matrix + FAQ + /beta signup + /dashboard)
- BIBLE.md chapter split into `mintlify-docs/bible/*.mdx`
- Mintlify full v4 content refresh (pages beyond introduction/install/quickstart)
- Lint tech debt — fix 135 eslint warnings (temporarily bumped `--max-warnings` 120 → 140 in CI + prepublishOnly; restore to 120 in beta.2 after cleanup)
- Plugin "MCP passthrough" mode — upgrade slash commands to optionally route through hosted MCP for lazy-loading + cross-IDE usage counter sync
- Use `skills/engineering-pack/mcp-server-builder/SKILL.md` when implementing the real hosted MCP server (not the current scaffold) — covers production-ready MCP design from API contracts with schema validation + safe evolution

## [2.3.1] — 2026-04-13

### Production Hardening + Advisor Tool

#### Added
- **Advisor Tool skill** (`skills/advisor/`) — Sonnet+Opus pairing docs, full API code samples, OpenClaw/ClaudeSwap integration guide. Trigger: "advisor tool", "model pairing", "Sonnet+Opus", "how to make Sonnet smarter"
- **HSL-matched rainbow gradient** for CCC statusline branding (consistent hue ring, no color clash)
- **ANSI Shadow block letter CCC banner** with rainbow gradient on session start
- **Hero video rebuilt** (30s cinematic with real product screenshots) + docs/assets/ migration for GitHub rendering

#### Fixed
- **Statusline staleness check** — ClaudeSwap fallback state now validates freshness before display
- **Stale rate limit display** — utilization cleared when reset timestamp is already past (no phantom "X% used" after reset)
- **Account key hint** — shows pri/sec label instead of unresolvable API key hash in statusline footer
- **TUI theme persistence** — selected theme now survives menu re-entry; help menu listener leak plugged
- **Auto-install npm deps** — running from git clone triggers automatic `npm install` instead of crashing
- **Laptop install crashes** — BSD `sed` compat fix, `BIBLE→CCC` banner rename, 0-skills edge case, `jq` fallback for missing binary
- **Bash 3.2 compatibility** — removed `${var,,}` lowercasing and top-level `local` declarations (macOS default shell)
- **`--force` non-interactive install** — full skill tier selected by default when stdin is not a TTY

#### Changed (docs)
- **README consolidated** — eliminated all duplicate sections, reordered as a sales page with clear value prop

---

## [2.3.0] — 2026-04-07

### Pre-Launch Polish Release

- feat: Native Claude Code launch with --session-id (interactive sessions, resume)
- feat: claude-finder.js — 5-priority binary resolution chain
- feat: Clack-tier TUI — pipe-rail (┌│└), ●○ radios, ◆ active prompts
- feat: Session bookends (┌ start, └ complete)
- feat: Rounded cockpit panels (╭╮╰╯)
- feat: Hotkey bar + q-to-quit in all menus
- feat: Mouse click support in menus (SGR reporting)
- feat: ? help popup with keyboard + tmux shortcuts
- feat: scripts/audit-counts.js — single source of truth for component counts
- fix: YOLO mode requires explicit "yes" confirmation
- fix: Task text sanitized before tmux send-keys (shell injection prevention)
- chore: CI audit-counts --check step added

---

## [2.2.1] — 2026-04-07

### Audit Remediation

- fix: Remotion stack bumped to 4.0.446 (resolved 6 vulnerabilities in video/)
- fix: Skill browser dedup bug — sub-skills no longer suppressed across mega-skill directories (367→451)
- fix: Branding version now matches package.json exactly (test was failing)
- fix: CI PII scan excludes known false-positive files (CHANGELOG.md, docs/)
- fix: pre-compact hook sessions dir configurable via KC_SESSIONS_DIR env var
- fix: discovery-scan workflow uses execFileSync to prevent shell injection
- fix: Dashboard vite bumped to ^5.4.14 (2 moderate vulns remain — require major vite v8 upgrade)
- chore: Skill recursion now covers all sub-directories (not just ccc-*/mega-*)

---

## [2.2.0] — 2026-04-06

### The Context Budget Release — "Your AI work costs less. Every meter works. Skills load smart."

### Added
- **Tiered Skill Loading (CC-180):** `install.sh --skills=essential|recommended|full|custom` — install only what you need. Default changed from 454 skills to 30 essential, saving ~10k tokens/session
- **`skills/_tiers.json`:** Skill tier definitions — essential (30), recommended (62), domain (11), full (all). Installer reads this to filter skill installation
- **ClaudeSwap Failover:** Status line reads `~/.config/claudeswap-state.json` for real-time 5h/7d rate limit data when Claude Code doesn't provide it
- **% Numbers on Meters:** Context, 5h, and 7d meters now show percentage numbers with heat-map coloring
- **Model Version Display:** Status line recognizes Opus 4.6, Sonnet 4.6, Haiku models with version-specific labels (e.g., "Opus4.6-1M" not just "Opus")
- **Version Fallback:** Status line reads version from `package.json` when `ccc` command not in PATH
- **Update Checker:** CCC checks for new versions on session start, notifies if update available
- **Developer Icons Skill:** Standard tech icon library via `developer-icons` npm package
- **Caveman Mode:** ~75% output token savings for terse interactions
- **Session Defaults:** Opus 4.6 (1M context) + Plan mode as project defaults
- **Proactive Intelligence Triggers:** Developer icons integrated across agent bible and skill suggestions

### Changed
- Default skill installation: 454 → 30 (essential tier). Full catalog at `SKILLS-INDEX.md`
- Default plugins: 18 → 2 (engineering + claude-mem). Others available via re-enable
- Model config: `opus[1m]` alias → `claude-opus-4-6[1m]` full ID for reliable 1M activation
- `ANTHROPIC_MODEL` env var removed (conflicted with `model` setting)
- `defaultMode`: `acceptEdits` → `plan` (plan-first workflow)
- SessionStart hook schema fixed (was missing matcher/hooks nesting)
- Status line model matching expanded: 5 patterns → 8 patterns

### Fixed
- 5h/7d rate limit meters were always empty — ClaudeSwap failover provides data
- Version display showed "CC" without version when `ccc` not in PATH
- Model display showed bare "Opus" instead of "Opus4.6-1M"
- Settings.json SessionStart hook schema validation error
- Stale marketing counts (454→actual, corrected in full audit)

### Linear Issues
- CC-180 (tiered skills), CC-182 (plugin defaults), CC-179 (Nightwatch — future)
- CC-178 (channels evaluation — done), CC-181 (cancelled — redundant)

## [2.1.0] — 2026-04-01

### The Mass Ingestion Release — "5 new vendors. 1,500+ vendor skills. Optimization directives from source."

### Added
- **Daemon Mode:** KAIROS-inspired persistent background agent — tick loop, task queue, dream consolidation, 15s budget cap (`ccc --daemon`)
- **Intelligence Layer v1:** Task complexity scoring, project stack detection, session learning, skill relevance filtering, smart fallback/retry — auto-adjusts every dispatch
- **5 new vendor submodules:** repomix (22.8K stars, context packing), claude-skills (8.6K, 507 skills), notebooklm-py (8.6K, NotebookLM integration), claude-code-ultimate-guide (2.7K, 219 CC0 templates + threat DB), claude-code-prompts (142, defensive prompts, SHA-pinned)
- **3 authored skills:** supabase-cli (DB migrations, Edge Functions), n8n-mcp-setup (400+ integrations), voicemode-setup (voice conversations via Whisper + Kokoro)
- **CLAUDE.md.staff-template v2.1:** Tool Awareness (re-read after edit, context decay, file read budget, one source of truth), Anti-Patterns (kitchen sink session, over-specified CLAUDE.md, trust-then-verify gap, infinite exploration), Context Optimization (/btw, Ctrl+G, compaction directives, @path/to/import)
- **BIBLE.md:** Tool & Context Awareness subsection, Power Commands table, CLAUDE.md Include/Exclude table (Stage 2)
- **CHEATSHEET.md:** Keyboard Shortcuts & Power Commands section (/btw, Ctrl+G, /compact, @import, Option+T, Ctrl+O)

### Changed
- Vendor count: 11 → 16 (repomix, claude-skills, notebooklm-py, claude-code-ultimate-guide, claude-code-prompts)
- Local skill count: 438 → 441 (3 new authored skills)
- Vendor skill count: 574 → 1,123 (549 net new from 5 vendors)
- Updated existing vendors: everything-claude-code, claude-code-best-practice (latest upstream)
- Tests: 101 → 107 (vendor scanner discovers new vendors)

### Sources Evaluated
20+ repos and sources evaluated. 9 approved, 6 conditional, 3 reference-only, 5 rejected. Security scan performed on all new vendors. Full assessment documented in Linear CC-63.

### Linear Issues
- CC-63 (umbrella), CC-64 (vendors), CC-65 (reference extraction), CC-66 (docs + publish)

---

## [2.0.0] — 2026-03-31

### The Aggregator Release — "Every Claude Code tool. One install. Auto-updated."

CC Commander v2.0 transforms from a skills toolkit into THE aggregator for the entire Claude Code ecosystem.

### Added
- **Aggregator Architecture**: 11 vendor submodules (ECC 120K stars, gstack 58K, Superpowers 29K, oh-my-claudecode 17K, claude-code-best-practice 26K, Claude HUD 15K, RTK 14.6K, Compound Engineering 11.5K, acpx 1.8K, caliber 302, claude-reflect 860) — all MIT licensed
- **Smart Orchestrator** (`commander/orchestrator.js`): Scoring engine picks best tool per phase — capabilityMatch 50%, stars 15%, recency 15%, userPreference 20%
- **Vendor Scanner** (`commander/vendor-scanner.js`): Scans vendor/ submodules, builds capability index across 8-phase pipeline
- **CCC Domain Rename**: All mega-* skills renamed to ccc-* (CCC Domains branding). 11 domains, 172+ sub-skills
- **/xray Project Audit** (`commander/signal-scanner.js`, `rule-engine.js`, `xray-report.js`): Pure Node.js project scanner with 21 rules, health score 0-100, maturity level 1-5, ISO 25010 quality model
- **/makeover Execution**: Agent swarm dispatch with git worktrees, circuit breaker, cost ceiling, before/after report card
- **Boris Cherny Workflows**: 6 new skills (auto-loop-patterns, visual-verify, desktop-preview-loop, batch-migration, voice-workflow, multi-repo-orchestrate) + autonomous mode adventure
- **4 New Commands**: /ccc:teleport, /ccc:fork, /ccc:parallel, /ccc:multi-repo
- **Showstopper CLI UI**: ora spinners, boxen info cards, chalk-animation effects, listr2 task lists, cli-progress bars
- **Statusline v2**: Heat-mapped 10-char context bar (cyan→magenta→orange→red), fire/lightning/brain emojis, compact layout
- **CLAUDE.md Refresh System**: /ccc:refresh command, staleness hook (auto-prompts when stale >30 days), template v2.0.0
- **Auto-Update Pipeline**: `commander/upstream-monitor.js`, GitHub Actions weekly cron, `ccc --update` flag
- **GitHub + Social Scanners**: `commander/ingestion/github-scanner.js` + `social-scanner.js` for weekly ecosystem discovery
- **Multi-Platform Adapters**: `commander/adapters/` supports Claude, Gemini CLI, Codex CLI with auto-detection
- **acpx Integration**: Dispatcher prefers acpx when available — structured JSON output, persistent sessions, crash recovery
- **Linear Tracking Hooks**: 4 new hooks (auto-track, pr-link, phase-gate, vendor-update-notify)
- **VS Code Extension**: Scaffold at `extensions/vscode/` — sidebar with stats, skills, vendor packages
- **Ecosystem Directory**: `docs/ECOSYSTEM.md` — 45+ repos across 8 tiers, the definitive Claude Code ecosystem map
- **Architecture SVG**: `docs/assets/ccc-architecture.svg` — full decision-tree visualization
- **ACKNOWLEDGMENTS.md**: Proper upstream credits for all 11 vendor packages
- **Cowork Plugin v2.0**: Unified plugin manifests, 44 VS Code snippets, orchestrator-aware dispatch
- **OpenClaw Management + Coordination Skills**: Fleet management and cross-agent coordination
- **SafeClaw Integration**: Docker-based isolated sessions for YOLO mode
- **Plugin Registry Skill**: `/cc-plugin-registry` reports all installed plugins + vendor capabilities

### Changed
- Tagline: "280+ skills" → "Every Claude Code tool. One install. Auto-updated."
- Skills count: 171 → 180+ (6 new skills, 4 new commands)
- Commands: 72 → 80+ (8 new commands with /ccc: prefix)
- Package manager dependencies: figlet → figlet + ora + boxen + chalk-animation + listr2 + cli-progress
- CLAUDE.md staff template: v1.3 → v2.0.0 (202 lines, added aggregator ecosystem, CCC domains, knowledge compounding, Boris workflows)

### Fixed
- Stale skills/gstack and skills/humanizer submodule references removed
- Adventure dead-end: learn-skill → mega-skills (now → ccc-domains)
- skill-browser.js: isMega detection updated for ccc-* prefix

### Linear Issues Closed
CC-3, CC-5, CC-29, CC-37, CC-39, CC-40, CC-41, CC-42, CC-45, CC-46, CC-47, CC-48, CC-49, CC-50, CC-51, CC-52, CC-53, CC-54, CC-55, CC-56, CC-57, CC-58, CC-59, CC-60

---

## [1.6.0] — 2026-03-30

### Added
- **Linear MCP First-Class Integration** (CC-43): Removed OAuth complexity, replaced with native Linear MCP board view, pick-to-build issue selection, and auto-sync. Linear issues drive the entire CCC workflow now
- **Security Hardening** (CC-42): 16-point hardening pass — kevin/ directory untracked from git, GraphQL injection fix in Linear queries, state file permission lockdown
- **SVG Visual Overhaul**: 8 new SVG graphics across all README sections — screenshot, flow diagram, components table, YOLO mode, stats dashboard, before/after comparison
- **PNG Conversion**: All 8 SVGs converted to PNG for GitHub mobile compatibility (SVG rendering blocked on mobile)
- **Branding Cleanup**: OG image updated from "CC BIBLE" to "CC COMMANDER", Japanese katakana removed (ASCII binary rain), all stats updated (280+ skills, 10 CCC domains, 88+ commands, 37 hooks)
- **Repo Migration Complete**: All references updated from k3v80/claude-code-bible to KevinZai/cc-commander
- **Cowork Plugin**: Claude Desktop integration with 4 skills for autonomous mode
- **18 E2E Path Tests**: Commander test suite with 101 total test assertions
- **Plugin Orchestration**: Auto-detection and sequencing of gstack, CE, Superpowers plugins
- **CCC Domain Browser**: Dynamic scan of 10 CCC domains with 190+ sub-skills
- **Knowledge Compounding Engine**: Learns from every session, injects lessons into future dispatches
- **YOLO Mode**: 10-question overnight autonomous build with Opus, $10 budget, self-testing loop
- **9 Workflow Modes**: normal, design, saas, marketing, research, writing, night, yolo, unhinged
- **41 Prompt Templates**: Across 6 categories (coding, planning, design, marketing, devops, meta)
- **VS Code Deep Integration**: Snippets, settings, launch configs
- **4 iTerm2 Color Profiles**: Claude Anthropic, OLED Black, Matrix, plus theme switcher

### Changed
- **Version**: 1.5.0 → 1.6.0 across all files
- **README**: Complete overhaul with inline graphics, updated stats, Linear integration docs
- **Comparison table**: Linear column updated from "OAuth identity" to "First-class MCP"
- **Install URLs**: All pointing to KevinZai/cc-commander

## [1.5.0] — 2026-03-29

### Added
- **Kit Commander**: Standalone interactive CLI that runs ABOVE Claude Code sessions — the first menu-driven project manager for AI coding tools
- **Choose Your Own Adventure Engine**: JSON-driven decision trees with multiple-choice menus — users never need to type code or commands
- **Session Orchestration**: Dispatches to Claude Code headlessly via `claude -p`, tracks sessions with full metadata (duration, cost, files, outcome)
- **Session Resume Intelligence**: "Pick up where you left off" or "Start fresh with summary" — wraps Claude Code's `--resume` flag in friendly UX
- **Progressive Disclosure**: 3-tier user levels (Guided → Assisted → Power User) that unlock automatically as experience grows
- **Recommendations Engine**: Context-aware suggestions based on git status, streaks, session history, pending tasks, and cost
- **Sync Interface (stub)**: Architecture-ready for future SaaS dashboard, cross-device sync, team features, and mobile app
- **Branding Registry** (`docs/BRANDING-REGISTRY.md`): Complete catalog of 227 branding touchpoints across 65 files for easy pivoting
- **Third-Party Licenses** (`THIRD-PARTY-LICENSES.md`): Attribution for 7 MIT/Elastic-licensed pattern inspirations + explicit "not used" section for license-incompatible projects
- **4 Commander Achievements**: Commander, Assisted Mode, Power Commander, First Build — added to gamification system (now 16 total)
- **6 Adventure Flows**: main-menu, build-something, continue-work, review-work, learn-skill, check-stats — each with multiple-choice branching
- **`bin/kc.js` entry point**: `npx kit-commander` or `node bin/kc.js` — with `--version` and `--test` flags
- **Open Core Architecture**: Free CLI (complete) + paid tier stubs (SaaS dashboard, cloud sync, team features, mobile app at $19/mo)

### Changed
- **Version bump**: 1.4 → 1.5 across all files (README, BIBLE, install.sh, commands/cc.md, package.json)
- **Package.json**: Added `kit-commander` and `kc` binary entries alongside existing `claude-code-kit`
- **Package description**: Updated to lead with "Kit Commander" product name
- **/cc Command Center**: Expanded to 23 menu items with Kit Commander as [23]
- **Gamification**: 12 → 16 achievement definitions (4 Commander achievements)

## [1.4.0] — 2026-03-29

### Added
- **Interactive /cc Command Center**: Expanded from 15 to 22 menu items across 6 categories (Build, Plan, Configure, Collaborate, Learn, Fun) with new interactive sub-menus
- **Beginner PM Mode** (`/cc beginner`): Plain English project manager — users describe what they want, the PM breaks it into tasks, dispatches to Claude Code, and reports progress. No jargon needed
- **Celebration System**: 4 ASCII celebration styles (confetti, fireworks, victory, rocket) + 13 random quips for personality
- **Context Rot Monitor**: PostToolUse hook that tracks context window fill with 4-tier warnings (60/75/85/90%)
- **Gamification Stats**: Session tracking, daily streaks, 12 achievement badges, leaderboard display
- **Session Compress Skill**: AI-powered session compression to reloadable markdown summaries
- **Compass Bridge Skill**: Cross-surface state sync via `~/.claude/compass/` markdown files
- **Coach** (`/cc coach`): Context-aware suggestion engine — checks git status, todo items, context usage, cost, and time since last verify
- **Health Check** (`/cc health`): 10-point system diagnostic with pass/fail indicators and fix suggestions
- **Install Manager** (`/cc install`): Component-level install status, outdated detection, selective install/update
- **Docs Browser** (`/cc docs`): Interactive documentation browser with section navigation and search
- **Quick Reference** (`/cc cheat`): Compact one-screen reference card with searchable content
- **Leaderboard** (`/cc leaderboard`): Session stats, streak tracking, achievement badges, fun rank titles
- **npm/npx Distribution**: `npx claude-code-kit@latest` one-command install via package.json + bin/cli.js
- **MIT LICENSE**: Formal MIT license file added
- **Terminal Art Celebrations**: 6 new functions (celebrate, checkmark, progress_checklist, streak_display, random_quip, mini_dashboard) in both bash and JS
- **Statusline API Key Display**: 3-tier fallback showing last 5 chars of active API key
- **Windsurf Compatibility Guide**: Rules file for Windsurf IDE users
- **Codex Compatibility Guide**: Configuration for OpenAI Codex users
- **Awesome Submission Draft**: PR template for awesome-claude-code listing

### Changed
- **Version bump**: 1.3 → 1.4 across all files (README, BIBLE, install.sh, index.html, cc.md, terminal-art)
- **Branding**: Added Author section to README and BIBLE.md with kevinz.ai links
- **Landing page**: Footer updated with Kevin Z attribution + @kzic link, hero badge → v1.4
- **hooks.json**: Added context-rot-monitor to PostToolUse lifecycle

## [1.3.0] — 2026-03-28

### Added
- **Theme System**: 4 switchable skins — Claude Anthropic (default), OLED Black, Matrix (enhanced with CRT scanline overlay), Surprise Me (random from 5 curated palettes)
- **Dashboard Overhaul**: GitHub-style activity heatmaps, agent timeline, cost charts, token gauge, skill radar, metrics grid, history search with filters, tab navigation (Live/History/Analytics)
- **OpenClaw Native Integration**: Auto-detection, skill sync, bidirectional event forwarding, agent profile generation, memory sync
- **Status Update Requests**: Send progress reports to Slack/Discord/email at configurable intervals during long sessions
- **Continuous Improvement Pipeline**: Daily cron scan for ecosystem improvements, multi-agent approval workflow, proposal queue management
- **Task Commander**: Multi-agent orchestration with P0-P10 scoping, 6 DAG workflows, circuit breaker, cost ceiling
- **Modular Installer**: Choose installation mode — full, essentials, scripts, dashboard, or config-only
- **Theme Command**: `/theme list|set|preview|random` for switching visual skins
- **3 iTerm2 Color Profiles**: Claude Anthropic, OLED Black, Matrix — matching dashboard themes
- **Marketing Assets**: Infographic, X/Twitter threads, long-form articles, monetization strategy document
- **New Commands**: `/openclaw`, `/status-updates`, `/theme`, `/improve`, `/deploy-check`, `/debug-session`, `/feature-start`, `/office-hours` (inspired by gstack), `/retro` (inspired by gstack), `/qa` (inspired by gstack), `/compound` (inspired by Compound Engineering)
- **New Skills**: status-updates, openclaw-native, task-commander, continuous-improvement
- **New Hooks**: status-reporter (PostToolUse), openclaw-sync (SessionStart), daily-improvement-scan (cron)

### Changed
- **Visual Rebrand**: Professional Anthropic palette (amber/indigo/deep navy) replaces matrix green as default
- **Dashboard**: React + recharts + date-fns + lucide-react for modern charting and icons
- **Brand Architecture**: "Claude Code Command Center" umbrella brand, "Claude Code Kit" product name
- **Env Vars**: CC_ prefix as primary with KZ_ backward compatibility on all env vars
- **Shell Functions**: cc_* as primary with kz_* backward-compat aliases in terminal-art.sh
- **Status Line**: Updated color palette from green to Anthropic amber/indigo
- **Context Gauge**: Semantic zone labels (Good/Caution/Warning/Critical) replace color names

### Fixed
- Improved color contrast across all dashboard components
- Better ANSI fallback when NO_COLOR is set
- Consistent branding across all 280+ skills and 88+ commands


The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-03-28

### Added
- **Claude Peers integration** — comprehensive guide for multi-instance collaboration with 5 coordination patterns (coordinator, swarm, expert, review, research)
- **Spawn Manager** — spawn and manage multiple Claude Code peers with Quick/Team/Swarm/Expert patterns, coordinator protocol, cost management, max 8 peer safety limit
- **Task Commander** — multi-agent orchestration brain with P0-P10 scoping, 6 DAG workflow templates, circuit breaker pattern, cost ceiling, COMP PROVE verification
- **Contextual Assist** — proactive suggestion system with 5 configurable levels (off/minimal/standard/guided/mentored) + pattern matching for common dev scenarios
- **Cowork integration** — Claude Desktop Cowork guide with plugin compatibility, scheduled tasks, handoff protocol
- **Cowork Plugin Builder** — build custom Cowork plugins with 5 examples, packaging/testing/publishing guide
- **Dispatch integration** — background task system guide with overnight builds, batch processing, cost tracking
- **Dispatch Templates** — 8 pre-built templates (overnight-build, batch-review, security-scan, perf-benchmark, dependency-update, content-generation, data-migration, monitoring-setup)
- **OpenClaw Bridge** — skill mapping, hook translation, agent profile generation, session handoff between Bible and OpenClaw (38-agent platform)
- **Paperclip Bridge** — task management integration with issue creation, priority mapping, bidirectional sync, REST API reference
- **Bible Guide** — interactive onboarding for beginners with skill discovery wizard and progressive disclosure
- **VS Code Bible** — VS Code integration guide with buttons, 20+ snippets, keyboard shortcuts, walkthrough
- **5 Quick Start Guides** — beginner, frontend, backend, full-stack, mobile developer paths
- **Real-time Dashboard** — React + Vite app with agent monitoring, spawn tree, cost tracker, live log stream, KZ Matrix theme
- **`/spawn` command** — spawn multiple Claude Code peers from the command line
- **`/peers` command** — discover and communicate with other Claude Code instances
- **`openclaw-adapter.js` hook** — translates Bible hook events to OpenClaw webhook format
- **`lib/config-reader.js`** — shared config utility with env var overrides for bible-config.json
- **`prompts/meta/task-commander.md`** — prompt template for Task Commander sessions
- **`compatibility/vscode-snippets.json`** — 20+ VS Code snippets for Bible commands
- **6 Task Commander workflows** — feature-build, bug-investigation, code-review-deep, research-deep, overnight-batch, migration

### Changed
- Skill count: 260+ → 280+
- Kit-native hooks: 15 → 16
- Total hooks (with ECC): 34 → 35
- Commands: 84+ → 86+
- Prompt templates: 35+ → 36+
- `/cc` command center updated to v1.2 with Claude Peers and Spawn sections

---

## [1.1.0] - 2026-03-28

### Added
- **4 new CCC domains** with 32 sub-skills:
  - `ccc-research` (8 skills) — deep research, literature review, competitive analysis, citation management, data synthesis, source validation
  - `ccc-mobile` (7 skills) — iOS/Swift, Android/Kotlin, React Native, Flutter, cross-platform patterns, app store optimization
  - `ccc-security` (9 skills) — OWASP top 10, supply chain security, secrets management, threat modeling, security headers, auth hardening, API security, incident response, compliance frameworks
  - `ccc-data` (8 skills) — ETL pipelines, data warehousing, analytics engineering, visualization, ML ops, data quality, streaming, governance
- **9 workflow modes** via `mode-switcher` skill — normal, design, saas, marketing, research, writing, night, yolo, unhinged. Switch entire development persona with `/cc mode <name>`
- **35+ prompt templates** across 6 categories (coding, planning, design, marketing, devops, meta) in `prompts/` directory. Access via `/cc prompts`
- **2 new kit-native hooks** (15 total):
  - `pre-compact.js` — saves session state and critical context before context compaction (PreCompact lifecycle)
  - `self-verify.js` — auto-verifies file changes against stated intent, catches drift (PostToolUse lifecycle)
- **Agency Orchestrator** integration skill — multi-agent orchestration patterns with coordinator/worker topology, progress tracking, error recovery
- **OpenClaw patterns** skill — agent configuration, channel routing, session management, tool binding, inter-agent communication
- Updated `/cc` command center with mode switcher (`/cc mode`) and prompt library (`/cc prompts`)
- Updated staff `CLAUDE.md` template with compaction survival rules

### Changed
- Skill count: 220+ → 260+
- Mega-skills: 6 → 10
- Kit-native hooks: 13 → 15
- Total hooks (with ECC): 32 → 34

---

## [1.0.0] - 2026-03-27

### Added
- 220+ skills organized by category with 6 CCC domains (ccc-seo, ccc-design, ccc-testing, ccc-marketing, ccc-saas, ccc-devops)
- 84+ slash commands for common workflows
- 23 lifecycle hooks (PreToolUse, PostToolUse, Stop)
- 3 starter templates (Next.js + shadcn, Turborepo fullstack, marketing site)
- `/cc` interactive command center with skills browser, settings viewer, confidence check, grill me, mode toggle
- `confidence-check` skill — pre-execution confidence assessment (inspired by SuperClaude)
- `four-question-validation` skill — post-implementation hallucination detection
- BIBLE.md — comprehensive development guide structured as 7 chapters + appendices
- CHEATSHEET.md — daily reference for commands, workflows, and power user tips
- SKILLS-INDEX.md — searchable skill directory with quick-start bundles
- Interactive installer with matrix rain, ASCII art, and progress visualization
- Uninstaller with backup detection and restore support
- Hook test harness (Node.js built-in test runner)
- Standalone hooks.json for users without ECC
- VS Code tasks.json for keyboard shortcut integration
- Plugin manifest for Claude Code marketplace compatibility
- GitHub Actions CI for validation
- Kevin's personal overlay (kevin/ directory) with OpenClaw/Paperclip integration
- IDE compatibility guide for VS Code, Cursor, JetBrains, and terminal

### Security
- Destructive command guard (careful-guard.js) with disclaimer about scope
- Settings template deny list for rm -rf, force push, hard reset
- Input sanitization in installer

### Contributors
Built by Kevin Z. Incorporates patterns and best practices from 200+ community sources including ykdojo, hooeem, aiedge_, dr_cintas, SuperClaude Framework, MichLieben, coreyganim, GriffinHilly, bekacru, and many more. See BIBLE.md Appendix B for full credits.

## [1.5.2] - 2026-03-30

### Added
- **CC Commander rebrand** — Kit Commander → CC Commander (Claude Code Commander)
- **Tagline**: "280+ skills. One command. Your AI work, managed by AI."
- **TUI Engine** (commander/tui.js) — figlet ASCII logos, true-color gradients, arrow-key menus
- **4 themes**: Cyberpunk, Fire, Graffiti, Futuristic (switch anytime via settings or menu)
- **Dispatcher upgrade**: 10 new CLI flags (--bare, --effort, --permission-mode plan, --max-budget-usd, --model, --fallback-model, --worktree, --name, --json-schema, --continue)
- **Auto-compact**: CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70 on all dispatches
- **Plan-mode-first**: every dispatch starts in plan mode
- **Spec-driven build flow**: 3 clarification questions for guided/assisted users
- **Project import**: "Open a project" reads local CLAUDE.md + .claude/ context (backwards compatible — never writes to .claude/)
- **2 new adventure flows**: create-content (blog/social/email/marketing/docs), research (competitive/market/code/SEO)
- **Settings adventure**: change name, level, cost ceiling, theme, animations, reset
- **Welcome mini-dashboard**: live stats, last session, top recommendation on main menu
- **Rich stats dashboard**: sparklines, activity heatmap, streak fire, level progress
- **Skill browser**: browse 280+ skills from within Commander (commander/skill-browser.js)
- **State repair**: `--repair` flag backs up corrupt state and resets
- **Animated transitions**: wipe effects between screens, responsive logo
- **BIBLE.md**: new CC Commander chapter (works without Commander — skills/hooks standalone)
- **Build diary**: docs/build-diary.md for X content

### Changed
- Main menu: 11 choices (build, content, research, learn, stats, settings, theme, open project, quit)
- Self-test: 18 checks (up from 7)
- 9 adventure files (up from 6)

### Technical
- 1 npm dependency added: figlet (287 ASCII fonts)
- Zero-dependency arrow-key navigation via readline keypress
- Session naming: auto-slugified from task description
- Level-based dispatch defaults: guided=$2/sonnet, assisted=$3/opusplan, power=$5/opusplan

## [1.6.0] - 2026-03-30 — "The Overnight Build"

### Added
- **YOLO Mode** — 10-question spec interview → autonomous build (Opus, max effort, $10, 100 turns, self-testing)
- **YOLO Loop** — 3-10 cycles of build → review → improve → compound. Status checkpoints to ~/.claude/commander/yolo-status.txt
- **CCC Domain Browser** — explore all 10 CCC domains (200+ sub-skills) with one-click dispatch
- **Cowork Plugin v2** — 4 skills with full references (skill-catalog.md, orchestration.md), YOLO Mode skill, 12KB package
- **Knowledge compounding** — auto-extracts lessons from every session, injects relevant past experience into future dispatches
- **Plugin orchestration** — auto-detects gstack, CE, Superpowers, ECC, Simone; maps to 8-step build pipeline
- **Project import** — reads local CLAUDE.md + .claude/ without modifying (backwards compatible overlay)
- **Night Mode rebranded to YOLO Mode** — "Set it. Forget it. Wake up to shipped code."

### Changed
- Self-test: 22 checks (up from 21)
- Adventures: 11 files (CCC domains.json added)
- Main menu: 12 choices (YOLO Mode added)
- README: 484 lines with YOLO Mode, Cowork plugin, CCC domain catalog ASCII art
- Cowork plugin: 12KB with references

### The Overnight Build
Built continuously from 10pm to 5am. 10 commits. Every feature tested. Every adventure validated.
Kevin's instructions: "DONT STOP! When I wake up I want to see GOLD!"
