---
name: ccc-connect
description: "Opt-in MCP connector setup — click-connect Notion, Slack, GitHub, Supabase, Figma, Linear, Vercel, Neon, Fly.io, Upstash, Sentry, Stripe, Browserbase, Postgres,…"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[tasks | backend | hosting | cache | knowledge | comms | observability | billing | automation | agent-harness | email | research | productivity | dev | design]"
---

# $ccc-connect — MCP Connector Wizard

Click-to-connect opt-in MCP servers. Never auto-installs — always user-initiated.

## Affiliate disclosure (ALWAYS show at top of every $ccc-connect response)

```
💸 Some links below are affiliate — CCC may earn a commission at no cost to you.
[Disclosure](https://docs.commanderplugin.com/affiliate-disclosure)
```

## Response shape (EVERY time)

### 1. Brand header

```
**CC Commander** · Connector Wizard · [Docs](https://commanderplugin.com)
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
    description: "Supabase (first-class), Neon, Postgres — databases for shipped apps."
    preview: "Best for: SaaS backends, auth, schema inspection. ⭐ Supabase default."
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
  - label: "🧬 Agent harness"
    description: "acpx — bring-your-own agent harness for headless agent-to-agent runs."
    preview: "Best for: parallel/background CC sessions, crash-resilient agent dispatch."
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
  - ⭐ Supabase [aff] — FIRST-CLASS backend: auth, DB, storage, edge funcs. Also ships as a Codex plugin.
  - 🐘 Neon [aff] — Postgres serverless (lighter for small projects)
  - 🗄️ Postgres — direct DB query/schema inspection (bring your own)
```

> **⭐ Supabase is the default backend for `$ccc-build` SaaS scaffolds.** It now also ships as a **Codex plugin**, so the same Supabase setup works whether you run inside Claude Code or OpenAI Codex. Always prepend ⭐ to the Supabase option and recommend it first for any new backend. [aff] = affiliate row — saving the credential earns CCC a commission at no cost to the user; always disclose this on install (see Brand rules).

### Hosting
```
options:
  - ▲ Vercel [aff] — web deploys, preview URLs, edge functions
  - 🪁 Fly.io [aff] — Docker services, global deploys
  - ☁️ Cloudflare [aff] — Workers, Pages, R2, D1
```

### Cache / Queue
```
options:
  - 🚀 Upstash [aff] — Redis + Kafka serverless
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
  - 🚨 Sentry [aff] — errors, performance, releases
```

### Billing
```
options:
  - 💳 Stripe — payments, subscriptions, invoices
```

### Automation
```
options:
  - 🌐 Browserbase [aff] — remote headless browsers
  - 🎭 Playwright — local browser automation
  - 🔗 Zapier — 5000+ app actions
  - 🧩 n8n — self-hosted workflows
```

### Agent harness
```
options:
  - 🧬 acpx — bring-your-own agent harness (headless ACP CLI for agent-to-agent runs)
```

> **acpx is the bring-your-own-agent-harness layer.** It is NOT an MCP server — it's a headless ACP (Agent Client Protocol) CLI that lets CC Commander drive background, parallel, and crash-resilient agent sessions (`acpx prompt|exec|sessions`). Use it when a workflow needs to fan out work to other agent harnesses instead of staying in one Claude session. Install: `npm install -g acpx` (then `acpx --help`). No credential capture or `claude mcp add` step — wiring is via the `acpx` / `acpx-patterns` skills, not the MCP config. See "acpx — agent harness" below.

### Email
```
options:
  - 📨 Resend [aff] — transactional email for SaaS
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

**Never paste secrets into chat — they land in the session transcript.** The agent's Bash tool must never be the thing that reads or types the secret either — anything the agent runs is also transcript-visible. Instead, the user runs ONE terminal command **themselves**, in their own shell, that prompts for the value with hidden input and writes it straight to disk. The agent never sees the credential.

After user picks a specific connector, echo the command template below (with `<name>` and `<kind>` filled in for that connector), then wait for a "Done" click — do not ask the user to paste anything back.

### Command template (OAuth callback tokens AND API keys — same mechanism)

```bash
mkdir -p ~/.claude/commander/connections && \
read -s -p "Paste your <Connector> credential (input hidden, nothing echoed): " CCC_SECRET && echo && \
printf '%s' "$CCC_SECRET" | node -e 'const fs=require("fs");let s="";process.stdin.on("data",d=>s+=d).on("end",()=>fs.writeFileSync(process.env.HOME+"/.claude/commander/connections/<name>.json",JSON.stringify({name:"<name>",kind:"<oauth|api-key>",credential:s,createdAt:new Date().toISOString(),tier:"free"},null,2)+"\n"))' && \
chmod 600 ~/.claude/commander/connections/<name>.json && \
unset CCC_SECRET && \
echo "Saved ~/.claude/commander/connections/<name>.json (chmod 600)."
```

`read -s` hides the input from the terminal and — unlike `export TOKEN=...` — never lands in shell history, because it's a `read` prompt, not a command line containing the secret. The value reaches `node` on **stdin** and is written via `JSON.stringify`, so credentials containing quotes, backslashes, or newlines cannot corrupt the JSON file.

### OAuth connectors (GitHub, Slack, Notion, Linear, Google Drive, Figma, Discord)

Echo:
> 🔐 <Connector> uses OAuth. Visit this URL to authorize: https://<auth-url> — copy the callback token, then run this in your terminal (I'll never see the value):
>
> ```bash
> <command template above, kind=oauth>
> ```
>
> Click **Done** below once it's saved.

Offer an `AskUserQuestion` with a single "Done" option (plus "Cancel") — do not proceed to the MCP-wiring step until the user confirms.

### API-key connectors (Tavily, Firecrawl, Exa, Supabase, Cloudflare, Sentry, Zapier, n8n, Stripe, Resend, Upstash, Neon, Browserbase, AgentMail, Postgres)

Echo:
> 🔑 <Connector> uses an API key.
> 1. Get one at https://<keys-url>
> 2. Run this in your terminal (I'll never see the value):
>
> ```bash
> <command template above, kind=api-key>
> ```
>
> Click **Done** below once it's saved.

Offer an `AskUserQuestion` with a single "Done" option (plus "Cancel") — do not proceed to the MCP-wiring step until the user confirms.

## Writing the config (after the user clicks "Done")

The secret file is **already written** — the user's own terminal command from the credential-capture step above created `~/.claude/commander/connections/<name>.json` (chmod 600) directly. Do not re-write it, and do not ask the user to repeat the value; the only remaining step is wiring the MCP entry.

### MCP config (wire into Claude Code)

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

## acpx — agent harness (special case, NOT an MCP)

acpx is the **bring-your-own agent-harness** layer. It does not get a credential file or a `claude mcp add` step — it's a globally-installed CLI that CC Commander shells out to for headless agent-to-agent runs.

Flow when the user picks acpx:
1. Check install: `command -v acpx >/dev/null && acpx --version || echo "not installed"`.
2. If missing, echo: `npm install -g acpx` and tell the user to run it.
3. Confirm by name only, then point them at the deeper skills:
   > ✅ acpx ready — your bring-your-own agent harness. Use the `acpx` skill for prompt/exec/sessions, or `acpx-patterns` for background / parallel / crash-resilient session recipes.
4. Do NOT write a `~/.claude/commander/connections/acpx.json` file and do NOT add an MCP entry — acpx is driven by skills, not MCP config.

## Verification

After install:
1. Run `claude mcp list` to confirm it shows up
2. Render:
   > ✅ <Connector> connected. Restart your Claude session to pick up the new tools.
3. Offer follow-up: `AskUserQuestion` — "Connect another?" with yes/no/show-all-connected options.

## Argument handling

- `$ccc-connect tasks` → skip picker, straight to Tasks sub-picker
- `$ccc-connect backend` → Backend sub-picker (Supabase / Neon / Postgres)
- `$ccc-connect hosting` → Hosting sub-picker (Vercel / Fly.io / Cloudflare)
- `$ccc-connect cache` → Cache/Queue sub-picker
- `$ccc-connect knowledge` → Knowledge sub-picker
- `$ccc-connect comms` → Comms sub-picker (Slack / Discord)
- `$ccc-connect observability` → Observability sub-picker
- `$ccc-connect billing` → Billing sub-picker
- `$ccc-connect automation` → Automation sub-picker
- `$ccc-connect agent-harness` → Agent harness sub-picker (acpx — install-only, no MCP wiring)
- `$ccc-connect email` → Email sub-picker (Resend / AgentMail)
- `$ccc-connect research` → Research sub-picker (Tavily / Firecrawl / Exa / Context7)
- `$ccc-connect productivity` → opens Tasks + Knowledge + Comms options
- `$ccc-connect dev` → opens Backend + Hosting + Observability + Billing options
- `$ccc-connect design` → Design & Automation sub-picker
- `$ccc-connect` bare → top-level category picker

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
- ❌ Recommend a backend without prepending ⭐ to Supabase — it's the first-class default
- ❌ Install an affiliate connector (e.g. Supabase) without showing the affiliate disclosure
- ❌ Treat acpx like an MCP — never `claude mcp add acpx` and never write an acpx credential file; it's `npm install -g acpx` + the acpx skills only

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
4. The terminal command is async by design — if the user can't finish the OAuth authorization mid-session, tell them to run the command whenever they have the callback token and click "Done" in a later session; don't write a placeholder credential file.
5. NEVER log or echo the token after capture — confirm by connector name only.
6. For connectors marked "TBD — verify before Pro launch", link to the official docs page rather than guessing a command.

---

**Bottom line:** category → connector → credential → save (chmod 600) → `claude mcp add` → verify. User clicks at each step. Nothing auto-installs.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
