# `commander_visualize` — Mermaid-only tool contract (CC-320 slice 1)

Status: **contract + fixtures only.** Nothing here is implemented, installed, hosted or billed.

Scope of this slice: the request/response shape for the first backend (Mermaid) so a later
slice can build against fixtures. Out of scope: Playwright screenshots, draw.io/Excalidraw,
Chart.js renderer (the ~$5/mo Fly.io service), auto-trigger logic, the 24h cache, any install
of `mermaid-cli`, any new port or network call.

## Tool

`commander_visualize(type, input)`

| Field | Type | Rules |
| -- | -- | -- |
| `type` | `"mermaid"` | Only value accepted in this slice. Any other value returns `unsupported_type`. |
| `input.source` | string | Mermaid source, 1–20,000 chars. Must begin with a supported diagram keyword. |
| `input.title` | string, optional | ≤ 120 chars, display only. |
| `input.render` | `"code"` (default) | `"code"` returns source only. `"image"` is reserved and returns `render_unavailable` until a renderer slice lands. |

Supported leading keywords (maps to the issue's triggers): `flowchart`/`graph` (architecture),
`sequenceDiagram` (flow of X), `erDiagram` (DB schema).

## Response

Success:

```json
{ "ok": true, "type": "mermaid", "format": "mermaid", "code": "<source>", "title": "...", "diagram": "flowchart" }
```

Failure:

```json
{ "ok": false, "error": { "code": "<code>", "message": "<human text>" } }
```

Error codes: `unsupported_type`, `empty_source`, `source_too_large`, `unsupported_diagram`,
`render_unavailable`.

## Behaviour rules

- Pure and deterministic: same input, same output. No filesystem, network or process access,
  so no cache is needed in this slice (the 24h cache belongs to the renderer slice).
- Never executes the source and never shells out. Validation is a string check on the first
  non-comment line only; full syntax checking is deferred to `mermaid-cli`.
- Callers (Claude Desktop) render the returned `code` in a ```` ```mermaid ```` fence.

## Fixtures

`commander/tests/fixtures/visualize/mermaid-cases.json` holds `{name, request, response}` cases:
three success cases (one per diagram family) and one per error code. A future implementation
must reproduce every `response` exactly.

## Follow-up slices (not started)

1. Implement `commander_visualize` for `render: "code"` against these fixtures.
2. Trigger matching (when to auto-invoke), behind a feature flag.
3. `mermaid-cli` image rendering + 24h cache — needs an install decision.
4. Playwright / diagrams / charts backends — charts need the Fly.io spend approved.
