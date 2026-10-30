# CC Commander — MCP Opt-In Guide

The plugin is 100% functional without any network connection. MCP is opt-in icing.

## What MCP adds

| Without MCP | With MCP |
|-------------|----------|
| Local skill catalog only | Skill catalog synced from cloud |
| Usage tracked locally | Usage tracked server-side (analytics) |
| Local catalog only | Hosted catalog (needs a CC Commander access token) |
| No cross-IDE support | Works in Cursor, Windsurf, Zed, and any MCP-compatible IDE |

## Hosted endpoint

| | |
|---|---|
| URL | `https://mcp.commanderplugin.com/mcp` (also `https://commander-mcp.fly.dev/mcp`) |
| Transport | MCP Streamable HTTP (`"type": "http"`) |
| Auth | `Authorization: Bearer <token>`. Required on every request |
| Health | `GET https://mcp.commanderplugin.com/health` (no auth) |

There is no `/sse` endpoint (it returns `404`). The legacy `/v1/sse` and
`/v1/call` routes also require a Bearer token.

### Auth and OAuth status

A request with no token gets `401` and an RFC 9728 challenge:

```
WWW-Authenticate: Bearer realm="cc-commander", resource_metadata="https://commander-mcp.fly.dev/.well-known/oauth-protected-resource"
```

The metadata document lists the resource (`https://commander-mcp.fly.dev/mcp`)
and `bearer_methods_supported: ["header"]`, but **no `authorization_servers`**.
MCP clients therefore can't start an OAuth sign-in: they have to send a static
Bearer token in a header. The server accepts CC Commander access tokens
(license JWTs). Self-serve token issuance is not live yet. Without a token, use
the plugin on its own; everything below falls back to the local catalog.

## How to connect Claude Code

Add the server to your project's `.mcp.json` (or run
`claude mcp add --transport http cc-commander https://mcp.commanderplugin.com/mcp --header "Authorization: Bearer $COMMANDER_TOKEN"`).
`lib/mcp-config.example.json` contains this block:

```json
{
  "mcpServers": {
    "cc-commander": {
      "type": "http",
      "url": "https://mcp.commanderplugin.com/mcp",
      "headers": {
        "Authorization": "Bearer ${COMMANDER_TOKEN}"
      }
    }
  }
}
```

Claude Code expands `${COMMANDER_TOKEN}` from your environment, so the token
never has to be committed.

### Plugin passthrough (`lib/mcp-passthrough.js`)

The plugin's own passthrough is separate from Claude Code's MCP client. It
reads a `cc-commander` entry from `.claude/mcp.json` or `~/.claude/mcp.json`
and calls `<url>/health` and `<url>/tools/<name>`, sending any `headers` from
that entry. The hosted server does not serve that REST shape on `/mcp`, so
today the passthrough always takes the local fallback. It does so silently, as
the contract below requires.

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
