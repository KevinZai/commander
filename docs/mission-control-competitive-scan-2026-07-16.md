# Mission Control Competitive Scan — Steal-List (2026-07-16)

Synthesis of three scans (GitHub repos · X/Twitter · Anthropic/platform + store UX). Claims labeled observed (source cited) or inferred. Recency window: last 6 months preferred.

## 1. TL;DR

- **Nobody ships what CCC v6.8.0 is building.** Closest four (forxidian/agent-mission-control, disler's observability stack, CloudCLI, hermes-agent-mission-control) are all standalone dev-facing apps. Zero of the 427 official marketplace plugins ship a local agent mission-control dashboard (observed, anthropics/claude-plugins-official marketplace.json) — CCC is first-in-category as a plugin.
- **Single best idea found:** the "awaiting-permission" amber state + pause/refine/restart steering verbs on every task card (GitHub Agent HQ mission control + @mickces status bar + @obie's subagent-transparency complaint). It's THE state non-coders running unattended fleets care about, and no Claude Code tool surfaces it.
- **Biggest gap CCC exploits:** hook-event telemetry (23 hooks nobody else has) + persona/skill/cost semantics + non-coder framing, inside Claude Code Desktop. Anthropic owns raw session listing; GitHub owns repo-level cross-vendor control; standalone apps are dying (Vibe Kanban sunset, opcode 9mo stale, Crystal rebranded) — the in-plugin position is the defensible one.
- **Explorer wave has one mature comp and it's beatable:** davila7/claude-code-templates (aitmpl.com, 29.6k★) is a web catalog, not in-product, and its last release is ~8 months stale. Steal its Stack Builder cart + component taxonomy; render CCC's catalog as an org chart with role labels (viral 42-skills-as-org-chart post + Mollick's "job titles are the analogy for average people"), never a flat list (GPT Store anti-pattern).
- **The artifact snapshot must be a living page, not an export.** Anthropic markets artifacts as "a living project dashboard" (@claudeai 2026-06-18) and Cursor 3.1 Canvas proves agents-generate-live-dashboards works — redeploy the same artifact URL from the event feed.

## 2. Steal-list (ranked)

| # | Idea (concrete mechanism) | Source | Where it goes | Effort |
|---|---|---|---|---|
| 1 | Task-card state machine: queued → running → **awaiting-permission (amber)** → review → done, with pause/refine/restart verbs; PermissionRequest hook feeds the amber state | GitHub Agent HQ (github.blog mission-control post, 2025-12) + @mickces/status/2070074724999151955 + @obie/status/1951475729230885155 | Mission Control wave-1 | M |
| 2 | Event schema: `--source-app` tag on every event; promote `tool_name`/`agent_id`/`tool_use_id`/`notification_type` to top-level columns; `GET /events/filter-options`; optional LLM `--summarize` of payloads for human-readable feed | disler/claude-code-hooks-multi-agent-observability (1,490★, pushed 2026-07-16) | Mission Control wave-1 | S |
| 3 | Roster heartbeat schema: `{id, name, emoji, role, status, currentTask, tasksCompleted, totalCost}` — one POST endpoint, agent-agnostic; one-line "what it's working on now" per card | sharbelxyz/hermes-agent-mission-control (143★, 2026-07-14) + conductor.build | Mission Control wave-1 | S |
| 4 | Per-roster-row gauges: context-%, tokens, rate-limit countdown, cost + deep link to the agent's OUTPUT (diff/PR/artifact), not just status; reuse claude-hud transcript-parsing for agent detection | abtop (@GithubProjects/status/2071813479523348795) + Agent HQ + jarrodwatts/claude-hud (26.4k★, vendored) | Mission Control wave-1 | M |
| 5 | Artifact snapshot = self-refreshing live artifact: redeploy same URL on hook events; version history; doubles as phone-readable status page | @claudeai/status/2067671912038240487 + Cursor 3.1 Canvas (cursor.com/changelog 2026-04-16) + Cowork cross-device check-in | Mission Control wave-1 | M |
| 6 | Delegation-flow view renders parent→child trees WITH loop topologies (plan→build→judge→repeat) + workers/managers filter; click any node → its transcript pane | Devin sub-Devin filter (docs.devin.ai/release-notes/2026) + @AnatoliKopadze/status/2068690663919530207 + disler SubagentStart/Stop transcript capture | Mission Control wave-1 | M |
| 7 | Stack Builder cart: multi-select skills/agents in the explorer → emit ONE combined install/enable command block per card and per cart | aitmpl.com (davila7/claude-code-templates, 29.6k★) | Explorer wave-2 | M |
| 8 | Explorer = org chart / departments with role labels + category-count chips; default view = curated tiers (essential ~30 → recommended → full 467), never a flat list | x.com/i/web/status/2076221471375122811 (42-skills org chart) + @_simonsmith/status/2011438846068543740 (Mollick) + GPT Store failure (babich.biz) + CCC `skills/_tiers.json` | Explorer wave-2 | M |
| 9 | Compat filtering: "Ready to run" vs "Needs setup" badge computed from installed MCPs/keys/deps; default filter = ready | Raycast Store ("everything you see works on your machine") | Explorer wave-2 | M |
| 10 | Detail pane shows PERSONAL usage ("fired 14× in your sessions" from knowledge.js) instead of global installs; plus triggers + example invocation + author badge (official/bundled/vendor/community) | Raycast/VS Code detail pattern + CCC moat (inferred) | Explorer wave-2 | M |
| 11 | Browse-by-role entry point: "I'm a founder / marketer / PM / support lead" → curated bundles (feeds ccc-smb-ops) | SkillsMP SOC-role browsing (skillsmp.com) + @PawelHuryn PM pack | Explorer wave-2 | M |
| 12 | Company-agent creation = "Remix an existing persona" default path + spec-interviewer Q&A → generated agent .md; output shape = company plugin pack (agents+skills+connectors bundled) | anthropics/skills skill-creator + artifacts remix + Anthropic finance packs (@claudeai/status/2051679629488865498) | Company-agents | M |
| 13 | BOOTSTRAP.md pattern: ship the dashboard/explorer as a minimal shell + bootstrap doc the user's own Claude session extends ("send your agent at this codebase") | hermes-agent-mission-control README | Company-agents | S |
| 14 | Delegation keeps a human owner: task card shows human owner + agent delegate in the same assignee picker | linear.app/docs/agents-in-linear | Mission Control task board | S |
| 15 | LIVE vs SIMULATED/STALE data-freshness badge on every panel (trust-critical when artifact snapshot lags localhost pane) | PROJECT NULLFRAME (x.com/i/web/status/2065387473794994355) | Mission Control wave-1 polish | S |
| 16 | Quick-launch overlay: persistent "Delegate a task" mini-form (prompt + project + persona) on every dashboard view; board is for tracking, not launching | GitHub agents panel (github.blog 2025-08-19) | Mission Control wave-1 polish | M |
| 17 | Synthetic test-event injector (`just test-event` equivalent) for demo mode + health check tab (agents/MCPs green-red) | disler justfile + aitmpl `--health-check` | Mission Control wave-1 polish | S |
| 18 | Second-opinion review button: hand one session's output to another agent for review, with templates + history (maps to verifier≠worker doctrine) | forxidian/agent-mission-control (16★, 2026-07-01) | Suggest-engine | M |
| 19 | Per-thread artifact timeline: parse sessions for files/images/HTML/URLs → artifact gallery with preview/open | forxidian/agent-mission-control | Explorer wave-2 | M |
| 20 | Git-native task store option: board reads/writes markdown task files (agent-writable, diffable) rather than a private DB | MrLesk/Backlog.md (6.2k★, 2026-07-15) | Mission Control task board | M |
| 21 | Marketing copy: "teammates, not silent workers" (Omnara) + "98% of people running agents have no clue what's going on" (@BentoBoiNFT) + "under 5 minutes" setup KPI | @harjtaggar/status/1957821931505480168 + @BentoBoiNFT/status/2028957770687427011 | Positioning | S |
| 22 | Ambient tier (fast-follow): menu-bar glyph / compact widget with 3-4 agent states (working / waiting-on-you / stuck / done) | OC-Claw (@DanKornas/status/2059224518418178113) | Fast-follow | L |

## 3. Platform-risk read — do NOT rebuild

- **Session listing/monitoring is OWNED by Claude Code Desktop** (redesign 2026-04-14: status/project filters, auto-archive on PR merge, usage metrics, pane layouts). Consume its states; differentiate on persona identity, delegation tree, per-session cost, active skill, Linear binding, hook-event feed.
- **Cowork owns task history + scheduling + cross-device check-in** (support.claude.com 13345190). Don't clone the tasks sidebar; bind to it.
- **Artifacts gallery + publish/share/remix is Anthropic's surface** — ride it (explorers AS artifacts), don't build a parallel gallery.
- **GitHub Agent HQ owns cross-vendor, repo-level "mission control"** — CCC stays inside Claude Code Desktop at the persona/task altitude; naming caution: "Mission Control" is now GitHub-flavored vocabulary.
- **Anthropic has NOT shipped** (inferred): agent-roster/persona dashboard, skill-usage analytics, non-coder fleet view, delegation-flow viz. That slice is open.

## 4. Do-NOT-copy

- **Standalone app / external server stack** (disler's uv+Bun, opcode Tauri, Vibe Kanban) — violates no-new-app; the category's standalone players are dead or dying (Bloop shutdown observed, vibekanban.com/blog/shutdown).
- **Flat searchable catalog for 467 items** — the GPT Store anti-pattern (sparse categories, icon+name cards, keyword-only search).
- **Visual drag-drop agent-builder canvas** — OpenAI killed AgentKit's (effective 2026-11-30); interview + remix wins.
- **Global install counts / star ratings** — CCC has no telemetry to back them; fake-looking numbers destroy trust. Use personal usage instead.
- **Any pricing/tier surface in the dashboard or explorers** — monetization HELD; core free forever.
- **Cloudflare-tunnel remote access by default** (aitmpl `--chats --tunnel`) — wrong security posture for non-coders; the published artifact snapshot already covers mobile check-in. Opt-in later at most.
- **Gamified pixel-pet as the primary UI** (DanWahlin/agent-mission-control, OC-Claw) — cute demo, wrong altitude for "manage your company's agents"; keep as optional ambient tier only.
- **Cloning Desktop's session sidebar** — see platform-risk.

## 5. Coverage notes (searched, came up empty)

- "claude orchestrator dashboard" — 0 GitHub repo hits.
- "claude artifacts explorer" — 0 hits; nobody publishes skill/agent explorers AS Claude artifacts. CCC would be first.
- First-party Anthropic dashboard — none in anthropics org; official marketplace's 17 "monitoring" plugins are all external observability vendors (Datadog, Grafana, Sentry, dash0, langfuse).
- Skill-explorer UIs at scale — only a 3-star static demo (Hayder-IRAQ/claude-code-skills-explorer); aitmpl.com is the sole mature catalog and lives on the web, not in-product.
- "subagent monitor" — 0-2-star experiments only; subagent visualization effectively unclaimed.
- "agent fleet dashboard" — 0-star toys (OpenClaw heartbeat clones).
- AskUserQuestion- or artifact-driven agent-selector UX inside Claude Code — no repo found; opcode (stale) is the only agent-library-picker precedent.
- X engagement counts unavailable (API 402 credits depleted) — X ranking is steal-value + recency + virality signals (inferred), dates exact via snowflake IDs (observed).
- Conductor (conductor.build) is closed-source — website claims only, no repo scanned.
