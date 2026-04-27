---
name: ccc-connect
description: "Opt-in MCP connector setup — click-connect Notion, Slack, GitHub, Supabase, Figma, Linear, Vercel, Neon, Fly.io, Upstash, Sentry, Stripe, Browserbase, Postgres, Cloudflare, Resend, AgentMail, Zapier, Google Drive, Firecrawl, Exa, Tavily, and more. Use when the user types /ccc-connect, says connect an MCP, add Notion, wire up Slack, set up GitHub MCP, or wants to expand what Claude can reach. [Commander]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[tasks | backend | hosting | cache | knowledge | comms | observability | billing | automation | email | research | productivity | dev | design]"
---

# /ccc-connect — MCP Connector Wizard

Click-to-connect opt-in MCP servers. Never auto-installs — always user-initiated.

## Response shape (EVERY time)

### 1. Brand header

```
**CC Commander** · Connector Wizard · [Docs](https://cc-commander.com)
```

### 2. Context strip

Detect currently-connected MCPs in parallel via a single Bash call:
- `claude mcp list 2>/dev/null | grep -c '^  ' || echo 0` → count
- `claude mcp list 2>/dev/null | awk '{print $1}' | tr '\n' ',' || echo "none"` → names

Render:
> 🔌 Currently connected: <count> MCPs · <comma-list or 'none yet'>

If none connected: "🔌 No MCPs wired up — pick a category below and I'll walk you through."

### 3. Category picker — `AskUserQuestion`

```
question: "Which category?"
header: "Connect"
multiSelect: false
options:
  - label: "📋 Tasks"
    description: "Linear — first-class CC Commander integration."
    preview: "Best for: issue tracking, sprint planning, CC-* task routing."
  - label: "🗄️ Backend"
    description: "Supabase, Neon, Postgres — databases for shipped apps."
    preview: "Best for: SaaS backends, auth, schema inspection."
  - label: "🚀 Hosting"
    description: "Vercel, Fly.io, Cloudflare — deploy and edge."
    preview: "Best for: web deploys, Docker services, Workers + R2."
  - label: "⚡ Cache / Queue"
    description: "Upstash — Redis + Kafka serverless."
    preview: "Best for: rate limiting, job queues, session storage."
  - label: "📚 Knowledge"
    description: "Notion — pages, databases, comments."
    preview: "Best for: docs, wikis, team knowledge bases."
  - label: "💬 Comms"
    description: "Slack, Discord — team and community channels."
    preview: "Best for: team workflows, Pro community, notifications."
  - label: "🚨 Observability"
    description: "Sentry — errors, performance, releases."
    preview: "Best for: monitoring shipped apps, alerting on regressions."
  - label: "💳 Billing"
    description: "Stripe — payments for SaaS."
    preview: "Best for: subscription management, payment links, invoices."
  - label: "🤖 Automation"
    description: "Browserbase, Playwright, Zapier, n8n — browser + workflows."
    preview: "Best for: remote headless browsers, cross-app automation."
  - label: "✉️ Email"
    description: "Resend, AgentMail — transactional and agent-native email."
    preview: "Best for: SaaS emails, agent inbox workflows."
  - label: "🔬 Research"
    description: "Tavily, Firecrawl, Exa, Context7 — web search + scraping."
    preview: "Best for: deep research, competitive analysis, live docs."
  - label: "🎨 Design & Automation"
    description: "Figma, Zapier, n8n — design sync + cross-app workflows."
    preview: "Best for: design handoff, automated triggers."
```

Prepend ⭐ based on project context:
- `package.json` has React/Next → ⭐ Design & Automation (Figma often useful)
- `prisma/schema.prisma` exists → ⭐ Backend (Supabase common)
- `package.json` has stripe → ⭐ Billing
- Otherwise → ⭐ Research (broadest utility)

## Second-level picker (after category pick)

Each category opens a SECOND `AskUserQuestion` with specific connectors.

### Tasks
```
options:
  - 🎟️ Linear — issues, projects, cycles (first-class CCC integration)
```

### Backend
```
options:
  - ⚡ Supabase — auth, DB, storage, edge funcs
  - 🐘 Neon — Postgres serverless (lighter for small projects)
  - 🗄️ Postgres — direct DB query/schema inspection (bring your own)
```

### Hosting
```
options:
  - ▲ Vercel — web deploys, preview URLs, edge functions
  - 🪁 Fly.io — Docker services, global deploys
  - ☁️ Cloudflare — Workers, Pages, R2, D1
```

### Cache / Queue
```
options:
  - 🚀 Upstash — Redis + Kafka serverless
```

### Knowledge
```
options:
  - 📝 Notion — pages, databases, comments
```

### Comms
```
options:
  - 💬 Slack — channels, DMs, threads
  - 🎮 Discord — Pro community + team server
```

### Observability
```
options:
  - 🚨 Sentry — errors, performance, releases
```

### Billing
```
options:
  - 💳 Stripe — payments, subscriptions, invoices
```

### Automation
```
options:
  - 🌐 Browserbase — remote headless browsers
  - 🎭 Playwright — local browser automation
  - 🔗 Zapier — 5000+ app actions
  - 🧩 n8n — self-hosted workflows
```

### Email
```
options:
  - 📨 Resend — transactional email for SaaS
  - 📬 AgentMail — agent-native inbox
```

### Research
```
options:
  - 🌐 Tavily — AI-optimized web search
  - 🔥 Firecrawl — clean web scraping + markdown
  - 🔭 Exa — neural search for dev content
  - 📡 Context7 — live library docs
```

### Design & Automation
```
options:
  - 🎨 Figma — files, components, comments
  - 🔗 Zapier — 5000+ app actions
  - 🧩 n8n — self-hosted workflows
  - 🎭 Playwright — browser automation
```

## Credential capture (per connector)

After user picks a specific connector, ask for credentials via a follow-up flow:

### OAuth connectors (GitHub, Slack, Notion, Linear, Google Drive, Figma, Discord)

Echo:
> 🔐 <Connector> uses OAuth. Visit this URL to authorize: https://<auth-url>
>
> When you paste the callback token here, I'll save it to `~/.claude/commander/connections/<name>.json` (chmod 600).

### API-key connectors (Tavily, Firecrawl, Exa, Supabase, Cloudflare, Sentry, Zapier, n8n, Stripe, Resend, Upstash, Neon, Browserbase, AgentMail, Postgres)

Echo:
> 🔑 <Connector> uses an API key.
> 1. Get one at https://<keys-url>
> 2. Paste it in your next message.
>
> I'll save it to `~/.claude/commander/connections/<name>.json` (chmod 600) and wire the MCP config.

## Writing the config (after credentials received)

Two files to write per connector:

### 1. Secret storage

Path: `~/.claude/commander/connections/<name>.json`

```json
{
  "name": "<connector>",
  "kind": "oauth | api-key",
  "credential": "<token>",
  "createdAt": "<iso-date>",
  "tier": "free | pro"
}
```

After write: `chmod 600 ~/.claude/commander/connections/<name>.json`

### 2. MCP config (wire into Claude Code)

Run: `claude mcp add <name> -- <command> <args>` — the exact command depends on the connector:

| Connector | Install command template |
|-----------|--------------------------|
| GitHub | `claude mcp add github -- npx @modelcontextprotocol/server-github` (env `GITHUB_TOKEN`) |
| Notion | `claude mcp add notion -- npx @notionhq/mcp` (env `NOTION_API_KEY`) |
| Linear | `claude mcp add linear -- npx @linear/mcp-server` (env `LINEAR_API_KEY`) |
| Supabase | `claude mcp add supabase -- npx -y @supabase/mcp-server-supabase` (env `SUPABASE_URL`, `SUPABASE_KEY`) |
| Neon | `claude mcp add neon -- npx -y @neondatabase/mcp-server-neon` (env `NEON_API_KEY`) |
| Postgres | `claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres` (env `DATABASE_URL`) |
| Vercel | `claude mcp add vercel -- npx @vercel/mcp` (env `VERCEL_TOKEN`) — verify before Pro launch |
| Fly.io | TBD — verify before Pro launch |
| Cloudflare | `claude mcp add cloudflare -- npx @cloudflare/mcp-server-cloudflare` (env `CLOUDFLARE_API_TOKEN`) |
| Upstash | `claude mcp add upstash -- npx -y @upstash/mcp-server` (env `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) |
| Sentry | `claude mcp add sentry -- npx @sentry/mcp-server` (env `SENTRY_AUTH_TOKEN`) — verify before Pro launch |
| Stripe | `claude mcp add stripe -- npx @stripe/mcp-server` (env `STRIPE_SECRET_KEY`) — verify before Pro launch |
| Browserbase | `claude mcp add browserbase -- npx -y @browserbasehq/mcp` (env `BROWSERBASE_API_KEY`) |
| Resend | TBD — verify before Pro launch |
| AgentMail | TBD — verify before Pro launch |
| Figma | `claude mcp add figma -- npx @figma/mcp` (env `FIGMA_TOKEN`) |
| Tavily | `claude mcp add tavily -- npx @tavily/mcp` (env `TAVILY_API_KEY`) |
| Firecrawl | `claude mcp add firecrawl -- npx @firecrawl/mcp` (env `FIRECRAWL_API_KEY`) |
| Exa | `claude mcp add exa -- npx @exa/mcp` (env `EXA_API_KEY`) |
| Slack | Official Slack MCP (env `SLACK_BOT_TOKEN`) — verify before Pro launch |
| Discord | Community MCP — verify before Pro launch |

Set env vars via the `--env` flag or ask user to export in shell profile.

## Verification

After install:
1. Run `claude mcp list` to confirm it shows up
2. Render:
   > ✅ <Connector> connected. Restart your Claude session to pick up the new tools.
3. Offer follow-up: `AskUserQuestion` — "Connect another?" with yes/no/show-all-connected options.

## Argument handling

- `/ccc-connect tasks` → skip picker, straight to Tasks sub-picker
- `/ccc-connect backend` → Backend sub-picker (Supabase / Neon / Postgres)
- `/ccc-connect hosting` → Hosting sub-picker (Vercel / Fly.io / Cloudflare)
- `/ccc-connect cache` → Cache/Queue sub-picker
- `/ccc-connect knowledge` → Knowledge sub-picker
- `/ccc-connect comms` → Comms sub-picker (Slack / Discord)
- `/ccc-connect observability` → Observability sub-picker
- `/ccc-connect billing` → Billing sub-picker
- `/ccc-connect automation` → Automation sub-picker
- `/ccc-connect email` → Email sub-picker (Resend / AgentMail)
- `/ccc-connect research` → Research sub-picker (Tavily / Firecrawl / Exa / Context7)
- `/ccc-connect productivity` → opens Tasks + Knowledge + Comms options
- `/ccc-connect dev` → opens Backend + Hosting + Observability + Billing options
- `/ccc-connect design` → Design & Automation sub-picker
- `/ccc-connect` bare → top-level category picker

## Anti-patterns — DO NOT

- ❌ Install an MCP without user-initiated click — always opt-in
- ❌ Write credentials to a file that isn't `chmod 600`
- ❌ Hardcode API keys in MCP config — use env vars or Claude's secret storage
- ❌ Proceed without confirming the user has the account/key (ask explicitly)
- ❌ Skip the "restart your session" reminder — MCPs only load at session start
- ❌ Write secrets to git-tracked files — `.claude/commander/connections/` must be gitignored
- ❌ Ignore connector-specific rate limits — document them in the "after install" message
- ❌ Connect >5 MCPs in one session — each adds tools to load, slows startup
- ❌ Use install commands marked "TBD" — tell user to check the official docs instead

## Brand rules

- Emoji per connector category: 📋 tasks, 🗄️ backend, 🚀 hosting, ⚡ cache, 📚 knowledge, 💬 comms, 🚨 observability, 💳 billing, 🤖 automation, ✉️ email, 🔬 research, 🎨 design
- PM Consultant voice: "my call: Supabase first for SaaS — broadest backend utility"
- Always echo the exact shell command user can paste — never vague
- Secrets handling: NEVER echo the token back after saving — confirm by name only
- Affiliate disclosure: rows marked ✅ in CONNECTORS.md may earn CCC a commission — always mention this when installing an affiliate connector

## Tips for the agent executing this skill

1. Whole flow is ≤5 turns: category → connector → credential ask → save + install → verify.
2. Create `~/.claude/commander/connections/` directory if it doesn't exist (mkdir -p + chmod 700 on the dir).
3. If `claude mcp add` fails (not installed, wrong version), echo the raw command and tell user to run it manually.
4. For OAuth flows where user can't paste a token mid-session, write a placeholder config and tell them to come back after auth.
5. NEVER log or echo the token after capture — confirm by connector name only.
6. For connectors marked "TBD — verify before Pro launch", link to the official docs page rather than guessing a command.

---

**Bottom line:** category → connector → credential → save (chmod 600) → `claude mcp add` → verify. User clicks at each step. Nothing auto-installs.
