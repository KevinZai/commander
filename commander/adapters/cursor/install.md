# How to Install Commander in Cursor

This installs Commander through the hosted MCP endpoint. The endpoint below is the W7 deploy target and may be replaced before GA.

## Prerequisites

- Cursor editor or Cursor CLI.
- `COMMANDER_LICENSE_KEY` from the Commander beta signup.
- Network access to `https://mcp.cc-commander.com/v1/sse`.

## Option A - One-Line Install

Set the license key in your shell first:

```bash
export COMMANDER_LICENSE_KEY="your-commander-license-key"
```

Then merge the Commander MCP server into your global Cursor MCP config:

```bash
mkdir -p "$HOME/.cursor" && node -e 'const fs=require("fs");const p=process.env.HOME+"/.cursor/mcp.json";let cfg={mcpServers:{}};try{cfg=JSON.parse(fs.readFileSync(p,"utf8"))}catch{}cfg.mcpServers=cfg.mcpServers||{};cfg.mcpServers["cc-commander"]={url:"https://mcp.cc-commander.com/v1/sse",headers:{Authorization:"Bearer ${env:COMMANDER_LICENSE_KEY}"}};fs.writeFileSync(p,JSON.stringify(cfg,null,2)+"\n");console.log("Installed cc-commander MCP in "+p);'
```

Restart Cursor after writing the config.

## Option B - Manual Install

1. Open Cursor.
2. Go to **Cursor Settings -> MCP**.
3. Add a new custom MCP server.
4. Paste the contents of `cursor-mcp-config.template.json`.
5. Replace `COMMANDER_LICENSE_KEY` with your environment variable or literal beta key if your setup does not resolve env interpolation.
6. Save and restart Cursor.

[Screenshot placeholder: Cursor Settings -> MCP server list]

[Screenshot placeholder: Add custom remote MCP server]

## Add Commander Rules

Copy the rule template into the project root:

```bash
cp commander/adapters/cursor/cursorrules.template .cursorrules
```

For teams using Cursor's newer Project Rules format, paste the same content into `.cursor/rules/commander.mdc` and mark it as always applied.

[Screenshot placeholder: Cursor rules panel showing Commander rule active]

## Verify

In Cursor Chat, ask:

```text
Use Commander to suggest the right workflow for adding an auth feature.
```

Cursor should call `commander_suggest_for` or another `commander_*` MCP tool. If you use Cursor CLI, you can also run:

```bash
cursor-agent mcp list
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `cc-commander` is missing | Confirm `~/.cursor/mcp.json` exists and Cursor was restarted. |
| Auth fails | Confirm `COMMANDER_LICENSE_KEY` is exported before launching Cursor. |
| Tools appear but are not used | Add `.cursorrules` or a `.cursor/rules/commander.mdc` project rule. |
| Endpoint fails | W7 may not have deployed the hosted endpoint yet; keep the config and retry after deploy. |
