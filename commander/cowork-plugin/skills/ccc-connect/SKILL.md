---
name: ccc-connect
description: "Opt-in MCP connector setup — click-connect Notion, Slack, GitHub, Supabase, Figma, Linear, Zapier, Google Drive, Firecrawl, Exa, Tavily, and more. Use when the user types /ccc-connect, /ccc connect, says 'connect an MCP', 'add Notion', 'wire up Slack', 'set up GitHub MCP', or wants to expand what Claude can reach."
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
argument-hint: "[research | productivity | dev | design | automation]"
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
  - label: "🔬 Research"
    description: "Tavily, Firecrawl, Exa — web search + scraping for AI."
    preview: "Best for: deep research, competitive analysis, live data."
  - label: "📋 Productivity"
    description: "Notion, Slack, Google Drive, Linear."
    preview: "Best for: team workflows, docs, task tracking."
  - label: "💻 Dev"
    description: "GitHub, Supabase, Cloudflare, Sentry."
    preview: "Best for: repos, DBs, deploys, error monitoring."
  - label: "🎨 Design & Automation"
    description: "Figma, Zapier, n8n, Playwright."
    preview: "Best for: design sync + cross-app workflows."
```

Prepend ⭐ based on project context:
- `package.json` has React/Next → ⭐ Design & Automation (Figma often useful)
- `prisma/schema.prisma` exists → ⭐ Dev (Supabase common)
- Otherwise → ⭐ Research (broadest utility)

## Second-level picker (after category pick)

Each category opens a SECOND `AskUserQuestion` with up to 4 specific connectors.

### Research
```
options:
  - 🌐 Tavily — AI-optimized web search
  - 🔥 Firecrawl — clean web scraping + markdown
  - 🔭 Exa — neural search for dev content
  - 📡 Context7 — live library docs
```

### Productivity
```
options:
  - 📝 Notion — pages, databases, comments
  - 💬 Slack — channels, DMs, threads
  - 📁 Google Drive — docs, sheets, files
  - 🎟️ Linear — issues, projects, cycles
```

### Dev
```
options:
  - 🐙 GitHub — repos, PRs, issues, Actions
  - ⚡ Supabase — auth, DB, storage, edge funcs
  - ☁️ Cloudflare — Workers, Pages, R2
  - 🚨 Sentry — errors, performance, releases
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

### OAuth connectors (GitHub, Slack, Notion, Linear, Google Drive, Figma)

Echo:
> 🔐 <Connector> uses OAuth. Visit this URL to authorize: https://<auth-url>
>
> When you paste the callback token here, I'll save it to `~/.claude/commander/connections/<name>.json` (chmod 600).

### API-key connectors (Tavily, Firecrawl, Exa, Supabase, Cloudflare, Sentry, Zapier, n8n)

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
| Supabase | `claude mcp add supabase -- npx @supabase/mcp` (env `SUPABASE_URL`, `SUPABASE_KEY`) |
| Figma | `claude mcp add figma -- npx @figma/mcp` (env `FIGMA_TOKEN`) |
| Tavily | `claude mcp add tavily -- npx @tavily/mcp` (env `TAVILY_API_KEY`) |
| Firecrawl | `claude mcp add firecrawl -- npx @firecrawl/mcp` (env `FIRECRAWL_API_KEY`) |
| Exa | `claude mcp add exa -- npx @exa/mcp` (env `EXA_API_KEY`) |

Set env vars via the `--env` flag or ask user to export in shell profile.

## Verification

After install:
1. Run `claude mcp list` to confirm it shows up
2. Render:
   > ✅ <Connector> connected. Restart your Claude session to pick up the new tools.
3. Offer follow-up: `AskUserQuestion` — "Connect another?" with yes/no/show-all-connected options.

## Argument handling

- `/ccc-connect research` → skip picker, straight to Research sub-picker
- `/ccc-connect productivity` → Productivity sub-picker
- `/ccc-connect dev` → Dev sub-picker
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

## Brand rules

- Emoji per connector category: 🔬 research, 📋 productivity, 💻 dev, 🎨 design
- PM Consultant voice: "my call: Tavily first — broadest research utility"
- Always echo the exact shell command user can paste — never vague
- Secrets handling: NEVER echo the token back after saving — confirm by name only

## Tips for the agent executing this skill

1. Whole flow is ≤5 turns: category → connector → credential ask → save + install → verify.
2. Create `~/.claude/commander/connections/` directory if it doesn't exist (mkdir -p + chmod 700 on the dir).
3. If `claude mcp add` fails (not installed, wrong version), echo the raw command and tell user to run it manually.
4. For OAuth flows where user can't paste a token mid-session, write a placeholder config and tell them to come back after auth.
5. NEVER log or echo the token after capture — confirm by connector name only.

---

**Bottom line:** category → connector → credential → save (chmod 600) → `claude mcp add` → verify. User clicks at each step. Nothing auto-installs.
