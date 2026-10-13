# CC Commander — MCP Opt-In Guide

The plugin is 100% functional without any network connection. MCP is opt-in icing.

## What MCP adds

| Without MCP | With MCP |
|-------------|----------|
| Local skill catalog only | Skill catalog synced from cloud |
| Usage tracked locally | Usage tracked server-side (analytics) |
| Local catalog only | 100-call/mo anti-abuse cap — no account, no license key |
| No cross-IDE support | Works in Cursor, Windsurf, Zed, and any MCP-compatible IDE |

## How to opt in

1. Copy `lib/mcp-config.example.json` to `.claude/mcp.json` in your project root.
2. That's it. The plugin detects the config automatically on next session start.

There are no license keys — the hosted endpoint is free for everyone with a
100-call/mo anti-abuse cap. No `Authorization` header is needed.

```json
{
  "mcpServers": {
    "cc-commander": {
      "url": "https://mcp.commanderplugin.com/sse"
    }
  }
}
```

## Fallback contract

Every MCP call is wrapped with a local fallback:

```
passthrough.call('list_skills', args, { fallback: localLookup })
```

- Timeout (default 2s) → local fallback
- Network error → local fallback
- 4xx / 5xx → local fallback
- MCP not configured → local fallback (silent)
- `MCP_DISABLED=1` env var → local fallback (silent)

The plugin behaves identically with or without MCP. No errors are surfaced to the user.

## Testing airplane mode

```bash
MCP_DISABLED=1 npm test
```

All tests must pass. This is enforced in CI.

## Logs

Passthrough call logs are written to:

```
~/.claude/commander/logs/passthrough.jsonl
```

Each line is a JSON object: `{ ts, event, tool, path, reason? }`.

`path` is either `"mcp"` (remote call succeeded) or `"local"` (fallback used).
