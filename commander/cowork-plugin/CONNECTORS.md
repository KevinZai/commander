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
| Supabase | Backend | Primary DB recommendation for `/ccc-build` SaaS | ✅ | `npx -y @supabase/mcp-server-supabase` |
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

## 📁 Perforce workspaces

If your repo is under Perforce control (P4V), set `CLAUDE_CODE_PERFORCE_MODE=1` in your shell env. Sub-agents will emit P4-friendly edit hints before writing files. Without this, writes will fail on read-only checked-in files. This is a Claude Code v2.1.98+ feature — transparent to CC Commander skills.
