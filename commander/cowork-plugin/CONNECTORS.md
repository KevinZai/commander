# Connectors

> **Affiliate links** — rows marked ✅ in the MCP catalog below may earn CC Commander a commission if you sign up via `/ccc-connect`. Revenue funds maintenance of the MIT-licensed core, which stays free forever. No impact on pricing or recommendations; a non-affiliate alternative is always surfaced. Full list: [Affiliate disclosure](https://docs.commanderplugin.com/affiliate-disclosure)

## How tool references work

Plugin files use `~~category` as a placeholder for whatever tool the user connects in that category. For example, `~~project tracker` might mean Linear, Jira, or any other project tracker with an MCP server.

Plugins are **tool-agnostic** — they describe workflows in terms of categories rather than specific products. The `.mcp.json` pre-configures specific MCP servers, but any MCP server in that category works.

## Connectors for this plugin

**Bundled (2)** — work immediately, zero configuration, no API keys:
- `context7` — library documentation lookup
- `sequential-thinking` — structured multi-step reasoning

All other connectors below are **opt-in** via `/ccc-connect` — enable each with your own credentials. Nothing that needs a key is bundled, so nothing fails silently on install day.

| Category | Placeholder | Opt-in servers | Other options |
|----------|-------------|-----------------|---------------|
| Project tracker | `~~project tracker` | Linear | Jira, Asana, Shortcut, ClickUp |
| Source control | `~~source control` | GitHub | GitLab, Bitbucket |
| Chat | `~~chat` | Slack | Microsoft Teams, Discord |
| Email | `~~email` | Gmail | Outlook |
| Calendar | `~~calendar` | Google Calendar | Outlook Calendar |
| Knowledge base | `~~knowledge base` | — | Notion, Confluence, Coda |
| Social media | `~~social media` | — | Typefully, Buffer |
| Bookmarks | `~~bookmarks` | — | Raindrop, Pocket |
| CI/CD | `~~CI/CD` | — | GitHub Actions, CircleCI, Jenkins |
| Monitoring | `~~monitoring` | — | Datadog, New Relic, Grafana |
| Web search | `~~web search` | Tavily | Brave Search, SerpAPI |
| Library docs | `~~library docs` | Context7 (bundled) | — |
| Files | `~~files` | Google Drive | Dropbox, OneDrive |

## 🔌 The 16 opt-in MCP servers

> CC Commander bundles **2 credential-free MCP servers** (`context7` + `sequential-thinking`) so the plugin works immediately on install with zero API keys. Everything below is **opt-in** via `/ccc-connect` — users enable per-MCP with their own credentials. No shared keys, no lock-in, no silent failures on install day. Anonymous usage telemetry is off unless you opt in with `CCC_TELEMETRY=1`; `CCC_OFFLINE=1` blocks every outbound call (see the plugin README, "Data & network").

| MCP | Category | Why it matters | Affiliate? | Install |
|-----|----------|----------------|------------|---------|
| AgentMail | Email | Agent-native inbox (new) | No | AgentMail MCP |
| Browserbase | Automation | Remote headless browsers beyond Playwright | ✅ | `npx -y @browserbasehq/mcp` |
| Cloudflare | Edge | Workers + R2 + D1 | ✅ | Cloudflare MCP |
| Discord | Comms | Pro community lives here | No | Community MCP |
| Fly.io | Hosting | Services + Docker; matches `/ccc-devops` | ✅ | Unverified — `/ccc-connect` links the official docs |
| Linear | Tasks | First-class CC Commander integration (`/ccc-linear`, `/ccc-linear-board`) | No | Official Linear MCP |
| Neon | Database | Postgres serverless, lighter than Supabase for tiny projects | ✅ | `npx -y @neondatabase/mcp-server-neon` |
| Notion | Knowledge | Docs workflow; official MCP | No | Official Notion MCP |
| Postgres | Database | Direct DB query/schema inspection | No | `npx -y @modelcontextprotocol/server-postgres` |
| Resend | Email | Transactional email for SaaS | ✅ | Unverified — `/ccc-connect` links the official docs |
| Sentry | Observability | Error tracking for shipped apps | ✅ | Sentry MCP (official) |
| Slack | Comms | Team workflows; official MCP | No | Official Slack MCP |
| Stripe | Billing | `/ccc-build` SaaS needs this | ✅ | Stripe MCP (official) |
| Supabase | Backend | Auth, DB, storage, edge funcs in one MCP. Also ships as a **Codex plugin**, so the same setup works in Claude Code *and* OpenAI Codex. | ✅ | `npx -y @supabase/mcp-server-supabase` |
| Upstash | Cache/Queue | Redis + Kafka serverless | ✅ | `npx -y @upstash/mcp-server` |
| Vercel | Hosting | Matches `/ccc-build` web scaffold | ✅ | Official Vercel MCP |

## Supabase — backend connector

Supabase is one of three Backend options in `/ccc-connect` (Neon, Postgres, Supabase, listed alphabetically). No backend is pre-selected.

- **What it covers:** auth + Postgres + storage + edge functions in one MCP.
- **Codex plugin too:** Supabase now also ships as an **OpenAI Codex plugin**. The same Supabase project and credentials work whether you drive it from Claude Code (via the MCP above) or from Codex (via the plugin) — no separate setup.
- **Affiliate (✅):** the Supabase row is an affiliate link. Signing up via `/ccc-connect` may earn CC Commander a commission at no cost to you. This funds maintenance of the MIT-licensed core and never changes the order or the default. A non-affiliate alternative (bring-your-own Postgres) is always surfaced alongside it.
- **Install:** `/ccc-connect backend` → Supabase for the click-through flow (it prefers a Claude Code plugin when one is listed, otherwise wires `npx -y @supabase/mcp-server-supabase` with `SUPABASE_URL` and `SUPABASE_KEY` without putting the secret on the command line).

## 🧬 acpx — bring-your-own agent harness

acpx is the **agent-harness layer**, not an MCP server. It's a headless **ACP (Agent Client Protocol)** CLI that CC Commander shells out to for agent-to-agent runs — background, parallel, and crash-resilient sessions that go beyond a single Claude conversation.

- **What it is:** a global CLI (`acpx prompt | exec | sessions`) that drives other agent harnesses headlessly. CC Commander uses it to fan work out across sessions.
- **Not an MCP:** acpx has no `claude mcp add` step and no credential file. It is wired through the `acpx` and `acpx-patterns` skills, not the `.mcp.json` config.
- **Install:** `npm install -g acpx`, then `acpx --help`.
- **When to use:** parallel/background CC sessions, crash-resilient dispatch, or any workflow that needs to coordinate multiple agent harnesses. Reach it via `/ccc-connect agent-harness` or the `acpx` / `acpx-patterns` skills directly.

## 📁 Perforce workspaces

If your repo is under Perforce control (P4V), set `CLAUDE_CODE_PERFORCE_MODE=1` in your shell env. Sub-agents will emit P4-friendly edit hints before writing files. Without this, writes will fail on read-only checked-in files. This is a Claude Code v2.1.98+ feature — transparent to CC Commander skills.
