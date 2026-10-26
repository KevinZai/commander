# /ccc-connect connector reference

💰 Some links below are affiliate — CCC may earn a commission at no cost to you.
[Disclosure](https://docs.commanderplugin.com/affiliate-disclosure)

Loaded by `../SKILL.md` after the user picks a specific connector. Commands marked "TBD" are unverified: link the vendor's official docs instead of guessing a command. `[aff]` marks an affiliate connector (disclosure above). Rows are alphabetical; affiliate status never sets order or a default. The canonical catalog with affiliate status is `commander/cowork-plugin/CONNECTORS.md`.

## CLI surface used here

Every `claude` command and flag in this skill was checked against the installed CLI help on Claude Code 2.1.296 (2026-10-13): `claude mcp --help` lists `add` (with `--transport http` and `-e`), `get`, `list` and `login <name>` ("Authenticate with an MCP server (HTTP, SSE, or claude.ai connector)"); `claude plugin list --help` lists `--json` and `--available` ("requires --json"; output keys `installed`, `available[].name`, `available[].pluginId`); `claude plugin configure --help` lists `--json` and `--values-stdin` ("a JSON object of single-line strings; options left out keep their values"); `claude plugin install --help` lists repeatable `--config <key=value>`. `plugin configure` and `install --config` landed in 2.1.285 (`docs/reference/platform-facts-2026-10.md`). On an older CLI where a command is missing, fall back to authenticating in `/mcp` and entering options in the interactive `/plugin` configure flow.

## Wiring path per connector

Path P = Claude Code plugin (check `claude plugin list --available --json` for a plugin with the connector's name in any marketplace the user has added; `claude plugin marketplace list` shows those marketplaces). Path H = remote HTTP MCP with OAuth. Path S = stdio MCP with an API key captured by the user's own terminal.

| Connector | Credential | Preferred path | stdio fallback (Path S) and env |
|-----------|-----------|----------------|----------------------------------|
| AgentMail | API key | TBD | TBD — link the official docs |
| Browserbase [aff] | API key | S | `npx -y @browserbasehq/mcp` · `BROWSERBASE_API_KEY` |
| Cloudflare [aff] | API token | P if listed, else S | `npx @cloudflare/mcp-server-cloudflare` · `CLOUDFLARE_API_TOKEN` |
| Context7 | none | bundled | Already bundled with Commander (credential-free); nothing to wire |
| Discord | bot token | TBD | Community MCP — verify before use |
| Exa | API key | S | `npx @exa/mcp` · `EXA_API_KEY` |
| Figma | OAuth or token | P if listed, else S | `npx @figma/mcp` · `FIGMA_TOKEN` |
| Firecrawl | API key | S | `npx @firecrawl/mcp` · `FIRECRAWL_API_KEY` |
| Fly.io [aff] | token | TBD | TBD — link the official docs |
| GitHub | OAuth or token | S | `npx @modelcontextprotocol/server-github` · `GITHUB_TOKEN` |
| Linear | OAuth | P if listed, else S | `npx @linear/mcp-server` · `LINEAR_API_KEY` |
| n8n | API key | S | Self-hosted MCP — link the official docs |
| Neon [aff] | API key | P if listed, else S | `npx -y @neondatabase/mcp-server-neon` · `NEON_API_KEY` |
| Notion | OAuth | P if listed, else S | `npx @notionhq/mcp` · `NOTION_API_KEY` |
| Playwright | none | S | Local browser automation; no credential |
| Postgres | connection string | S | `npx -y @modelcontextprotocol/server-postgres` · `DATABASE_URL` |
| Resend [aff] | API key | TBD | TBD — link the official docs |
| Sentry [aff] | OAuth | P if listed, else H | `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp` (the CLI's own example), then authenticate in `/mcp` |
| Slack | OAuth | P if listed | Official Slack MCP · `SLACK_BOT_TOKEN` (verify before use) |
| Stripe | secret key | P if listed, else S | `npx @stripe/mcp-server` · `STRIPE_SECRET_KEY` (verify before use) |
| Supabase [aff] | API key | P if listed, else S | `npx -y @supabase/mcp-server-supabase` · `SUPABASE_URL`, `SUPABASE_KEY` |
| Tavily | API key | S | `npx @tavily/mcp` · `TAVILY_API_KEY` |
| Upstash [aff] | REST URL + token | S | `npx -y @upstash/mcp-server` · `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Vercel [aff] | token | P if listed, else S | `npx @vercel/mcp` · `VERCEL_TOKEN` (verify before use) |
| Zapier | API key | S | Vendor MCP — link the official docs |

"P if listed" means: use the plugin when `claude plugin list --available --json` shows one in a marketplace the user has added; otherwise fall back to the command in the last column.

## Path S wiring command (user runs it in their own terminal)

After the credential file exists (saved by the capture template in the skill), the user wires the server so the secret never appears in the command line, the transcript or shell history:

```bash
claude mcp add <name> -s user \
  -e <ENV_VAR>="$(node -p 'const p=require("path"),o=require("os"),n="<name>.json",l=p.join(process.env.CCC_CONFIG_DIR||process.env.CLAUDE_CONFIG_DIR||p.join(o.homedir(),".claude"),"commander","connections",n),g=p.join(o.homedir(),".claude","commander","connections",n);require(require("fs").existsSync(l)?l:g).credential')" \
  -- <command> <args>
```

Non-secret values (for example `SUPABASE_URL`, `UPSTASH_REDIS_REST_URL`) can be passed as plain `-e KEY=value`. Scope: `-s user` for every project, `-s project` writes a shared `.mcp.json` (never put a secret there; reference `${ENV_VAR}` instead), `-s local` (the default) for this project only.

## Path P details

- Install, with non-secret options set up front (repeatable; values are validated against the plugin's `userConfig` schema, including fixed-choice `options`):

  ```bash
  claude plugin install <plugin>@<marketplace> --config <key>=<value>
  ```

- Show which options are still unset (report option names and set/unset state only):

  ```bash
  claude plugin configure <plugin> --json
  ```

- Secret options: the user enters them in the interactive `/plugin` configure flow, or from their own terminal:

  ```bash
  read -s -p "<Connector> <option> (input hidden): " V && echo && \
  printf '%s' "$V" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify({[process.argv[1]]:s})))' <option-key> \
    | claude plugin configure <plugin> --values-stdin; unset V
  ```

- A plugin whose configure output lists no options usually authenticates its MCP server with OAuth: run `/mcp`, select the server and authenticate.

## Path H details

```bash
claude mcp add --transport http <name> <url>
claude mcp login <name>      # user runs this; opens the OAuth flow in the browser
```

No credential file is written; Claude Code stores the OAuth token.

## acpx — agent harness (not an MCP server)

acpx is a headless ACP (Agent Client Protocol) CLI that Commander shells out to for background, parallel and crash-resilient agent sessions (`acpx prompt|exec|sessions`). It has no credential file and no `claude mcp add` step.

1. Check: `command -v acpx >/dev/null && acpx --version || echo "not installed"`.
2. If missing, show `npm install -g acpx` for the user to run.
3. Confirm by name and point to the `acpx` skill (prompt, exec, sessions) and `acpx-patterns` (background, parallel, crash-resilient recipes).
4. Never write `<config dir>/commander/connections/acpx.json` (the config dir is `CCC_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`, then `~/.claude`) and never add an MCP entry for it.
