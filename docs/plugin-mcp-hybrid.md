# Plugin + MCP Hybrid Architecture

CC Commander is designed so the plugin **always works standalone**. MCP is opt-in enhancement — never a requirement.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                   Claude Code Session                     │
│                                                           │
│  Plugin (always active)                                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Skills / Agents / Hooks                            │ │
│  │                                                     │ │
│  │   passthrough.call('list_skills', args, {           │ │
│  │     fallback: () => localListSkills()               │ │
│  │   })                                                │ │
│  │          │                                          │ │
│  │          ▼                                          │ │
│  │   MCP configured? ──NO──► local fallback (silent)  │ │
│  │          │                                          │ │
│  │         YES                                         │ │
│  │          │                                          │ │
│  │          ▼                                          │ │
│  │   fetch(mcp_url, 2s timeout)                        │ │
│  │          │               │                          │ │
│  │       success          timeout / error              │ │
│  │          │               │                          │ │
│  │      MCP result    local fallback                   │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

                              │ (opt-in only)
                              ▼

              ┌───────────────────────────┐
              │  MCP Server               │
              │  mcp.cc-commander.com     │
              │                           │
              │  - Hosted skill catalog   │
              │  - License validation     │
              │  - Usage analytics        │
              │  - Community skills       │
              └───────────────────────────┘
```

## The Non-Negotiable Contract

Every code path that touches MCP MUST have a local fallback:

```javascript
const result = await passthrough.call('list_skills', {}, {
  timeout: 2000,
  fallback: async (args) => localListSkills(args),
});
// result is ALWAYS valid — either MCP data or local data
```

`passthrough.call` never throws. It returns the fallback value on:
- MCP not configured in `.claude/mcp.json`
- `MCP_DISABLED=1` environment variable
- Network timeout (default 2s)
- HTTP 4xx or 5xx response
- Any other error

## Opt-In Setup

Copy `commander/cowork-plugin/lib/mcp-config.example.json` to `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "cc-commander": {
      "url": "https://mcp.cc-commander.com/sse",
      "headers": {
        "Authorization": "Bearer YOUR_LICENSE_KEY"
      }
    }
  }
}
```

The plugin reads this file on startup. No restart required — config is read per-call.

## MCP Tool List

| Tool | Description |
|------|-------------|
| `list_skills` | Paginated skill catalog with metadata |
| `get_skill` | Full SKILL.md content by name |
| `search` | Semantic search across 502+ skills |
| `suggest_for` | Top 3-5 skills for a task description |
| `status` | Health check — version, license tier, usage |

## Environment Variables

| Variable | Effect |
|----------|--------|
| `MCP_DISABLED=1` | Force local-only mode (overrides mcp.json) |
| `CCC_MCP_URL=<url>` | Override MCP endpoint URL (for testing/staging) |

## Testing Airplane Mode

The airplane mode test suite proves the contract is maintained:

```bash
# Run airplane mode tests
MCP_DISABLED=1 node --test tests/airplane-mode.test.js

# Run all tests (includes airplane mode)
npm test
```

This is enforced in CI — the `Airplane mode test` step runs before any other tests with `MCP_DISABLED=1`.

## Logs

All passthrough calls are logged (best-effort) to:

```
~/.claude/commander/logs/passthrough.jsonl
```

Sample entries:

```jsonl
{"ts":"2026-04-17T10:00:00Z","event":"call","tool":"list_skills","path":"local","reason":"disabled"}
{"ts":"2026-04-17T10:01:00Z","event":"call","tool":"list_skills","path":"mcp","status":200}
{"ts":"2026-04-17T10:02:00Z","event":"call","tool":"list_skills","path":"local","reason":"timeout"}
```

`path: "local"` means fallback was used. `path: "mcp"` means MCP responded successfully.

## File Map

| File | Purpose |
|------|---------|
| `commander/cowork-plugin/lib/mcp-passthrough.js` | Core passthrough library |
| `commander/cowork-plugin/lib/mcp-config.example.json` | Example `.claude/mcp.json` config |
| `commander/cowork-plugin/.claude-plugin/config-schema.json` | JSON Schema for plugin config |
| `commander/cowork-plugin/MCP.md` | End-user opt-in guide |
| `commander/skill-browser.js` | `listSkillsEnhanced({ useMcp: true })` |
| `tests/airplane-mode.test.js` | Proof of the fallback contract |
