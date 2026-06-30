# Connectors

> **Affiliate links** — rows marked ✅ in the MCP catalog below may earn CC Commander a commission if you sign up via `/ccc-connect`. Revenue funds ongoing maintenance of the MIT-licensed Starter tier. No impact on pricing or product recommendations; non-affiliate alternatives always surfaced. Full list: [Affiliate disclosure](https://kevinzai.github.io/cc-commander/affiliates)

## How tool references work

Plugin files use `~~category` as a placeholder for whatever tool the user connects in that category. For example, `~~project tracker` might mean Linear, Jira, or any other project tracker with an MCP server.

Plugins are **tool-agnostic** — they describe workflows in terms of categories rather than specific products. The `.mcp.json` pre-configures specific MCP servers, but any MCP server in that category works.

## Connectors for this plugin

**Bundled (2)** — work immediately, zero configuration, no API keys:
- `context7` — library documentation lookup
- `sequential-thinking` — structured multi-step reasoning

All other connectors below are **opt-in** via `/ccc-connect` — enable with your own credentials. This prevents silent MCP failures on install day (flagged by R1/R5/R8 reviews).

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

## 🔌 Recommended MCP Servers

> CC Commander bundles **2 credential-free MCP servers** (`context7` + `sequential-thinking`) so the plugin works immediately on install with zero API keys. Everything below is **opt-in** via `/ccc-connect` — users enable per-MCP with their own credentials. No shared keys, no lock-in, no silent failures on install day. Anonymous usage telemetry is opt-out via `CCC_TELEMETRY=0`.

| MCP | Category | Why it matters | Affiliate? | Install |
|-----|----------|----------------|------------|---------|
| Linear | Tasks | First-class CC Commander integration; already wired in Kevin's settings | No | Official Linear MCP |
| **Supabase** ⭐ | Backend (first-class) | **Default backend** for `/ccc-build` SaaS — auth, DB, storage, edge funcs. Also ships as a **Codex plugin**, so the same setup works in Claude Code *and* OpenAI Codex. | ✅ | `npx -y @supabase/mcp-server-supabase` |
| Vercel | Hosting | Matches `/ccc-build` web scaffold | ✅ | Official Vercel MCP |
| Neon | Database | Postgres serverless, lighter than Supabase for tiny projects | ✅ | `npx -y @neondatabase/mcp-server-neon` |
| Fly.io | Hosting | Services + Docker; matches `/ccc-devops` | ✅ | TBD — verify before Pro launch |
| Upstash | Cache/Queue | Redis + Kafka serverless | ✅ | `npx -y @upstash/mcp-server` |
| Notion | Knowledge | Docs workflow; official MCP | No | Official Notion MCP |
| Slack | Comms | Team workflows; official MCP | No | Official Slack MCP |
| Discord | Comms | Pro community lives here | No | Community MCP |
| Sentry | Observability | Error tracking for shipped apps | ✅ | Sentry MCP (official) |
| Stripe | Billing | `/ccc-build` SaaS needs this | ✅ | Stripe MCP (official) |
| Browserbase | Automation | Remote headless browsers beyond Playwright | ✅ | `npx -y @browserbasehq/mcp` |
| Postgres | Database | Direct DB query/schema inspection | No | `npx -y @modelcontextprotocol/server-postgres` |
| Cloudflare | Edge | Workers + R2 + D1 | ✅ | Cloudflare MCP |
| Resend | Email | Transactional email for SaaS | ✅ | TBD — verify before Pro launch |
| AgentMail | Email | Agent-native inbox (new) | No | AgentMail MCP |

## ⭐ Supabase — first-class backend

Supabase is the **default, first-class backend connector** in CC Commander. When `/ccc-build` scaffolds a SaaS, or a user picks the Backend category in `/ccc-connect`, Supabase is recommended first.

- **Why first-class:** auth + Postgres + storage + edge functions in one MCP — covers the whole backend surface a shipped SaaS needs, so it's the broadest single connector.
- **Codex plugin too:** Supabase now also ships as an **OpenAI Codex plugin**. The same Supabase project and credentials work whether you drive it from Claude Code (via the MCP above) or from Codex (via the plugin) — no separate setup.
- **Affiliate (✅):** the Supabase row is an affiliate link. Signing up via `/ccc-connect` may earn CC Commander a commission at no cost to you. This funds maintenance of the MIT-licensed tier and never changes the recommendation — Supabase is recommended on merit. A non-affiliate alternative (Neon, or bring-your-own Postgres) is always surfaced alongside it.
- **Install:** `npx -y @supabase/mcp-server-supabase` (env `SUPABASE_URL`, `SUPABASE_KEY`) — or `/ccc-connect backend` for the click-through flow.

## 🧬 acpx — bring-your-own agent harness

acpx is the **agent-harness layer**, not an MCP server. It's a headless **ACP (Agent Client Protocol)** CLI that CC Commander shells out to for agent-to-agent runs — background, parallel, and crash-resilient sessions that go beyond a single Claude conversation.

- **What it is:** a global CLI (`acpx prompt | exec | sessions`) that drives other agent harnesses headlessly. CC Commander uses it to fan work out across sessions.
- **Not an MCP:** acpx has no `claude mcp add` step and no credential file. It is wired through the `acpx` and `acpx-patterns` skills, not the `.mcp.json` config.
- **Install:** `npm install -g acpx`, then `acpx --help`.
- **When to use:** parallel/background CC sessions, crash-resilient dispatch, or any workflow that needs to coordinate multiple agent harnesses. Reach it via `/ccc-connect agent-harness` or the `acpx` / `acpx-patterns` skills directly.

## 📁 Perforce workspaces

If your repo is under Perforce control (P4V), set `CLAUDE_CODE_PERFORCE_MODE=1` in your shell env. Sub-agents will emit P4-friendly edit hints before writing files. Without this, writes will fail on read-only checked-in files. This is a Claude Code v2.1.98+ feature — transparent to CC Commander skills.
