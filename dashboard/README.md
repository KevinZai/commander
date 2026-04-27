# CC Commander Dashboard

Local-only browser dashboard MVP for inspecting CC Commander activity.

## Run

```sh
node dashboard/server.js
```

Open `http://127.0.0.1:4690/`.

The server binds to `127.0.0.1` only and uses no runtime dependencies.

## Endpoints

- `GET /` serves the dashboard UI.
- `GET /api/sessions` lists `~/.claude/sessions/*.tmp` files sorted by modified time.
- `GET /api/sessions/:filename` returns one `.tmp` session file as text.
- `GET /api/health` returns `{ "status": "ok", "uptime", "version" }`.
- `GET /health` is a monitoring alias for the same health payload.

All non-GET methods return `405`. Missing `~/.claude/sessions/` returns an empty array.

## Extend

Keep v0.1 read-only and dependency-free. Good v0.2 additions:

- parse session content into turns, tools, and skill usage,
- add route-level views for agents, skills, and cost,
- integrate `commander-cli ccusage`,
- add claude-mem search,
- add git and Linear correlation,
- switch from polling to Server-Sent Events only when the data needs push updates.

