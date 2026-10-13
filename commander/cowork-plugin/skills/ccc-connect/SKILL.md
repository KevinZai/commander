---
name: ccc-connect
description: "Opt-in connector wizard with affiliate disclosure: pick a service (Supabase, Linear, Vercel, Sentry, Notion, Slack, Stripe, research tools and more) and wire it as a plugin with userConfig, an OAuth MCP or a keyed MCP without secrets in chat. Use when connecting an MCP server or service."
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
argument-hint: "[tasks | backend | hosting | cache | knowledge | comms | observability | billing | automation | agent-harness | email | research | productivity | dev | design]"
model: sonnet
effort: medium
disable-model-invocation: true
---

# /ccc-connect — wire one connector safely

**CC Commander** · /ccc-connect · click through category and connector, then wire it through the current Claude Code primitive with no secret ever entering the transcript.

Show this disclosure at the top of every /ccc-connect response:

```
💸 Some links below are affiliate — CCC may earn a commission at no cost to you.
[Disclosure](https://docs.commanderplugin.com/affiliate-disclosure)
```

## When to use / when not to

- Use when the user wants a service connected: a database, host, tracker, chat, observability, billing, email, research or automation tool. Everything here is opt-in and absent by default; Commander bundles only credential-free servers.
- Do not use to change Commander's bundled `.mcp.json`, to debug an already-installed server (`/ccc-doctor`), or for Linear workflows once connected (`/ccc-linear`).

## What happens

1. **Context strip.** One Bash call:

   ```bash
   claude mcp list 2>/dev/null
   claude plugin list --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).filter(p=>p.enabled).map(p=>p.id).join(", ")||"none")}catch{console.log("none")}})'
   ```

   Render `🔌 Connected: <MCP names> · plugins: <ids>`, or "🔌 Nothing wired yet — pick a category below." Never print server env values.

2. **Category picker** (cascade; see Decision points). An argument skips straight to its level. Mark the 🟢 option from project context: `prisma/schema.prisma` or a new SaaS → Build & ship (Supabase); `stripe` in `package.json` → Build & ship (Billing); React or Next in `package.json` → Automate & design (Figma); otherwise Research & observe (broadest utility).

3. **Connector picker.** Show the connectors for the chosen category. A category with one connector skips this picker and confirms the choice in one line.

4. **Account check.** Ask once whether the user already has an account and key for the service; if not, give the signup or keys URL (the affiliate link for `[aff]` rows) and wait.

5. **Choose the wiring path.** Open [references/connectors.md](references/connectors.md) for the connector's row, then check for a plugin:

   ```bash
   claude plugin list --available --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for (const p of (JSON.parse(s).available||[])) if (p.name===process.argv[1]) console.log(p.pluginId)})' <connector-name>
   ```

   Prefer, in order: **P** a Claude Code plugin (it carries its own MCP config and `userConfig`); **H** a remote HTTP MCP with OAuth; **S** a stdio MCP with a key captured by the user's own terminal. acpx is none of these; follow its section in the reference.

6. **Authorize the change.** Ask the install picker before the assistant runs any `claude plugin install` or `claude mcp add`; both change the user's Claude Code configuration. Path S wiring is run by the user, so it needs only the credential picker.

7. **Wire it.**
   - **P — plugin with userConfig.** Run `claude plugin install <pluginId> --config <key>=<value>` for non-secret options only (repeat `--config`; fixed-choice `options` are validated). Then `claude plugin configure <plugin> --json` and report only which option names are unset. Secret options are entered by the user in the `/plugin` configure flow or with the `--values-stdin` template in the reference. A plugin with no options usually authenticates by OAuth in `/mcp`.
   - **H — OAuth MCP.** Run `claude mcp add --transport http <name> <url>`, then the user runs `claude mcp login <name>` (or authenticates from `/mcp`). No credential file is written.
   - **S — keyed MCP.** The user captures the secret in their own terminal with the command below, clicks Done, then runs the wiring command from the reference (it reads the file inside `$(...)`, so the value never appears in a command line).

   Credential capture (Path S), filled in with `<name>`, `<Connector>` and `<kind>` (`oauth` or `api-key`):

   ```bash
   mkdir -p ~/.claude/commander/connections && chmod 700 ~/.claude/commander/connections && \
   read -s -p "Paste your <Connector> credential (input hidden, nothing echoed): " CCC_SECRET && echo && \
   printf '%s' "$CCC_SECRET" | node -e 'const fs=require("fs");let s="";process.stdin.on("data",d=>s+=d).on("end",()=>fs.writeFileSync(process.env.HOME+"/.claude/commander/connections/<name>.json",JSON.stringify({name:"<name>",kind:"<kind>",credential:s,createdAt:new Date().toISOString(),tier:"free"},null,2)+"\n"))' && \
   chmod 600 ~/.claude/commander/connections/<name>.json && \
   unset CCC_SECRET && \
   echo "Saved ~/.claude/commander/connections/<name>.json (chmod 600)."
   ```

   `read -s` hides the input and keeps the secret out of shell history; the value reaches `node` on stdin and is written with `JSON.stringify`, so quotes, backslashes or newlines cannot corrupt the file. The assistant shows the command and waits; it never runs it and never asks for the value back. If the user cannot finish now (an OAuth callback is pending), they run it later and click Done in a later session; never write a placeholder file.

8. **Verify.**

   ```bash
   claude mcp get <name> 2>/dev/null || claude mcp list 2>/dev/null | grep -i '<name>'
   claude plugin list --json 2>/dev/null | grep -i '"<plugin>@'     # Path P only
   ```

   On success: "✅ <Connector> connected. Run `/mcp reconnect all` (or restart the session) to load its tools." Add the connector's rate-limit note when the vendor documents one. If `claude mcp add` or `claude plugin install` fails, show the raw command for the user to run and the error; do not retry blindly.

9. **Next.** Ask the follow-up picker.

## Decision points

All pickers are `AskUserQuestion`, single select, at most four options, 🟢 on the recommended one (listed first). In Codex or any surface without it, ask the same options as one plain-text question.

**Category picker, level 1** (header "Connect"):

- **🏗️ Build & ship** — Backend, Hosting, Cache / Queue, Billing.
- **📋 Team & comms** — Tasks, Knowledge, Comms, Email.
- **🔬 Research & observe** — Research, Observability.
- **🤖 Automate & design** — Automation, Design, Agent harness.

**Level 2** lists the categories inside the chosen group. **Level 3, connectors per category:**

| Category | Connector options |
|---|---|
| 🗄️ Backend | 🟢 Supabase [aff] — first-class backend: auth, DB, storage, edge functions; also ships as a Codex plugin · Neon [aff] — serverless Postgres · Postgres — bring your own database |
| 🚀 Hosting | Vercel [aff] — web deploys, previews · Fly.io [aff] — Docker services · Cloudflare [aff] — Workers, Pages, R2, D1 |
| ⚡ Cache / Queue | Upstash [aff] — serverless Redis and Kafka |
| 💳 Billing | Stripe — payments, subscriptions, invoices |
| 📋 Tasks | Linear — issues, projects, cycles (first-class Commander integration) · GitHub — issues and PRs |
| 📚 Knowledge | Notion — pages, databases, comments |
| 💬 Comms | Slack — channels, threads · Discord — community server |
| ✉️ Email | Resend [aff] — transactional email · AgentMail — agent-native inbox |
| 🔬 Research | Tavily — web search · Firecrawl — scraping to markdown · Exa — neural search · Context7 — live library docs (already bundled) |
| 🚨 Observability | Sentry [aff] — errors, performance, releases |
| 🤖 Automation | Browserbase [aff] — remote headless browsers · Playwright — local browser automation · Zapier — app actions · n8n — self-hosted workflows |
| 🎨 Design | Figma — files, components, comments |
| 🧬 Agent harness | acpx — bring-your-own agent harness; install-only, no MCP wiring |

Supabase is the default backend for `/ccc-build` SaaS scaffolds: always list it first with 🟢 in Backend.

**Arguments:** a category name (`tasks`, `backend`, `hosting`, `cache`, `knowledge`, `comms`, `observability`, `billing`, `automation`, `agent-harness`, `email`, `research`, `design`) opens its level-3 picker; `productivity` opens level 2 with Tasks, Knowledge, Comms; `dev` opens level 2 with Backend, Hosting, Observability, Billing; no argument opens level 1.

**Install picker** (header "Install"): 🟢 **Install now** (runs the one install command shown) · **Show the command only** (the user runs it) · **Cancel**.

**Credential picker** (Path S, header "Credential"): 🟢 **Done — saved** (continue to wiring) · **Cancel**.

**Follow-up picker** (header "Next"): 🟢 **Connect another** · **Show everything connected** · **Done**.

## Done when

- `claude mcp get <name>` (or `claude mcp list`) shows the server, or `claude plugin list --json` shows the plugin enabled, and the result was reported as observed.
- For Path S, `ls -l ~/.claude/commander/connections/<name>.json` shows `-rw-------`.
- The user was told how to load the new tools (`/mcp reconnect all` or a restart).

## Guardrails

- Installing a plugin or MCP server changes the user's configuration: only on a click in this conversation, never automatically.
- Never ask for, accept, echo or log a secret in chat, and never run a command that contains one. If a user pastes a secret anyway, tell them to rotate it.
- Never pass a secret with `--config` or `-e KEY=value` in a command the assistant runs; secrets go through `/plugin` configure, `--values-stdin` from the user's terminal, OAuth, or the capture file.
- Never write a secret into a git-tracked file or a project `.mcp.json`; reference `${ENV_VAR}` there instead.
- Never use a command marked TBD; link the vendor's official docs.
- Never treat acpx as an MCP server: no `claude mcp add acpx`, no acpx credential file.
- Always show the affiliate disclosure before an `[aff]` connector is installed.
- Suggest at most five new servers in one session; each adds tools to load. `/ccc-xray context` measures plugin cost.

## See also

- `/ccc-linear` — Linear workflows once connected.
- `/ccc-build` — SaaS scaffolds that default to Supabase.
- `/ccc-doctor` — diagnose a server that fails to start.
- `/ccc-xray` — `context` scope inventories each plugin's token cost.

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
