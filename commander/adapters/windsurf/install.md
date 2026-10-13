# How to Install Commander in Windsurf

This installs Commander through the hosted MCP endpoint. The endpoint below is the W7 deploy target and may be replaced before GA.

## Prerequisites

- Windsurf with Cascade.
- MCP access enabled for your account or team.
- Network access to `https://mcp.commanderplugin.com/v1/sse`.

No license key is required — the hosted endpoint is free for everyone with a
100-call/mo anti-abuse cap.

## Option A - One-Line Install

Merge the Commander MCP server into your Windsurf MCP config:

```bash
mkdir -p "$HOME/.codeium/windsurf" && node -e 'const fs=require("fs");const p=process.env.HOME+"/.codeium/windsurf/mcp_config.json";let cfg={mcpServers:{}};try{cfg=JSON.parse(fs.readFileSync(p,"utf8"))}catch{}cfg.mcpServers=cfg.mcpServers||{};cfg.mcpServers["cc-commander"]={serverUrl:"https://mcp.commanderplugin.com/v1/sse"};fs.writeFileSync(p,JSON.stringify(cfg,null,2)+"\n");console.log("Installed cc-commander MCP in "+p);'
```

Restart Windsurf, then refresh MCPs in Cascade.

## Option B - Manual Install

1. Open Windsurf.
2. Open Cascade.
3. Click the MCPs icon or go to **Windsurf Settings -> Cascade -> MCP Servers**.
4. Choose **View Raw Config**.
5. Paste or merge the contents of `windsurf-mcp-config.template.json`.
6. Save, refresh MCPs, and restart Windsurf if the server does not appear.

[Screenshot placeholder: Cascade MCPs menu]

[Screenshot placeholder: Windsurf raw mcp_config.json editor]

## Add Commander Rules

Recommended workspace rule:

```bash
mkdir -p .windsurf/rules
cp commander/adapters/windsurf/windsurfrules.template .windsurf/rules/commander.md
```

If your team uses a root `.windsurfrules` convention, copy the same template there:

```bash
cp commander/adapters/windsurf/windsurfrules.template .windsurfrules
```

[Screenshot placeholder: Windsurf Customizations or Rules panel showing Commander rule active]

## Verify

In Cascade, ask:

```text
Use Commander to suggest the right workflow for adding an auth feature.
```

Cascade should call `commander_suggest_for` or another `commander_*` MCP tool. If it does not, open the MCP server settings and confirm `cc-commander` is enabled and its tools are toggled on.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `cc-commander` is missing | Confirm `~/.codeium/windsurf/mcp_config.json` exists, then refresh MCPs in Cascade. |
| Requests rejected | You may have hit the free 100-call/mo anti-abuse cap — the plugin falls back to the local catalog automatically. |
| Tools appear but are not used | Add `.windsurf/rules/commander.md` from `windsurfrules.template`. |
| Admin blocks MCP | Ask the team admin to allow `cc-commander` or add the hosted endpoint to the team MCP registry. |
| Endpoint fails | W7 may not have deployed the hosted endpoint yet; keep the config and retry after deploy. |
