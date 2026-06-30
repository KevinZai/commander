# Claude Model Catalog

**Only use exact model IDs listed in this file.** Never guess or construct model IDs — incorrect IDs will cause API errors. Use aliases wherever available. For the latest information, WebFetch the Models Overview URL in `shared/live-sources.md`.

## Current Models (recommended)

| Friendly Name      | Alias (use this)     | Full ID                       | Context | Max Output | Pricing (in/out per MTok) | Status |
|--------------------|----------------------|-------------------------------|---------|------------|---------------------------|--------|
| Claude Fable 5     | `claude-fable-5`     | `claude-fable-5`              | 1M      | 128K       | $10 / $50                 | Active |
| Claude Opus 4.8    | `claude-opus-4-8`    | —                             | 1M      | 128K       | $5 / $25                  | Active |
| Claude Sonnet 5    | `claude-sonnet-5`    | —                             | 1M      | 64K        | $3 / $15                  | Active |
| Claude Sonnet 4.6  | `claude-sonnet-4-6`  | —                             | 1M      | 64K        | $3 / $15                  | Active |
| Claude Haiku 4.5   | `claude-haiku-4-5`   | `claude-haiku-4-5-20251001`   | 200K    | 64K        | $1 / $5                   | Active |

> **Invite-only:** Claude Mythos 5 (`claude-mythos-5`) is available only via Project Glasswing (anthropic.com/glasswing). Same pricing as Fable 5 ($10/$50), 1M ctx / 128K out, adaptive always-on. **Never default to this model** — suggest `claude-fable-5` unless the user confirms they have Glasswing access.

### Model Descriptions

- **Claude Fable 5** — Anthropic's most capable widely released model (GA 2026-06-09). No dateless alias — use the pinned ID `claude-fable-5` directly. Adaptive thinking is **always-on**; does NOT support the `extended-thinking` parameter. Uses the Opus-4.7+ tokenizer: same text produces ~30% more tokens than pre-4.7 models. Available: Claude API, Bedrock (`anthropic.claude-fable-5`), Vertex (`claude-fable-5`), Microsoft Foundry (200K ctx on Foundry). Knowledge cutoff Jan 2026. Pick Fable 5 when you need maximum capability; note it is 2× the price of Opus 4.8.
- **Claude Opus 4.8** — Best cost/capability ratio for production agents and coding. Adaptive thinking always-on (no `extended-thinking` param); effort defaults to `high` on all surfaces. Adds Fast mode (2.5× speed, ~2× cost) and `ultra`/`xhigh` effort levels. 1M context window. 128K max output (requires streaming for large outputs). Knowledge cutoff Jan 2026.
- **Claude Sonnet 5** — Latest and best Sonnet (succeeds Sonnet 4.6). Best combination of speed and intelligence. Supports both extended thinking and adaptive thinking. 1M context window. 64K max output.
- **Claude Sonnet 4.6** — Previous Sonnet generation. Best combination of speed and intelligence. Supports both extended thinking and adaptive thinking. 1M context window. 64K max output.
- **Claude Haiku 4.5** — Fastest and most cost-effective model for simple tasks. Extended thinking only (no adaptive). 200K context. 64K max output.

## Legacy Models (still active)

| Friendly Name     | Alias (use this)    | Full ID                       | Status |
|-------------------|---------------------|-------------------------------|--------|
| Claude Opus 4.7   | `claude-opus-4-7`   | —                             | Active |
| Claude Opus 4.6   | `claude-opus-4-6`   | —                             | Active (prefer 4.8) |
| Claude Opus 4.5   | `claude-opus-4-5`   | `claude-opus-4-5-20251101`    | Active |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` | `claude-sonnet-4-5-20250929`  | Active |

> **Opus 4.7** — $5/$25, 1M ctx / 128K out, adaptive thinking, introduced the new tokenizer (~30% more tokens vs pre-4.7 models).

## Deprecated Models (retiring soon)

| Friendly Name     | Alias (use this)    | Full ID                       | Status                          |
|-------------------|---------------------|-------------------------------|---------------------------------|
| Claude Opus 4.1   | `claude-opus-4-1`   | `claude-opus-4-1-20250805`    | Deprecated — retires 2026-08-05 |
| Claude Sonnet 4   | `claude-sonnet-4-0` | `claude-sonnet-4-20250514`    | Deprecated — retires 2026-06-15 |
| Claude Opus 4     | `claude-opus-4-0`   | `claude-opus-4-20250514`      | Deprecated — retires 2026-06-15 |
| Claude Haiku 3    | —                   | `claude-3-haiku-20240307`     | Deprecated                      |

## Retired Models (no longer available)

| Friendly Name     | Full ID                       | Retired     |
|-------------------|-------------------------------|-------------|
| Claude Sonnet 3.7 | `claude-3-7-sonnet-20250219`  | Feb 19, 2026 |
| Claude Haiku 3.5  | `claude-3-5-haiku-20241022`   | Feb 19, 2026 |
| Claude Opus 3     | `claude-3-opus-20240229`      | Jan 5, 2026 |
| Claude Sonnet 3.5 | `claude-3-5-sonnet-20241022`  | Oct 28, 2025 |
| Claude Sonnet 3.5 | `claude-3-5-sonnet-20240620`  | Oct 28, 2025 |
| Claude Sonnet 3   | `claude-3-sonnet-20240229`    | Jul 21, 2025 |
| Claude 2.1        | `claude-2.1`                  | Jul 21, 2025 |
| Claude 2.0        | `claude-2.0`                  | Jul 21, 2025 |

## Resolving User Requests

When a user asks for a model by name, use this table to find the correct model ID:

| User says...                              | Use this model ID                                                           |
|-------------------------------------------|-----------------------------------------------------------------------------|
| "fable", "fable 5", "most capable", "most powerful" | `claude-fable-5`                                               |
| "mythos", "mythos 5"                      | Invite-only (Glasswing) — suggest `claude-fable-5` unless user has access  |
| "opus"                                    | `claude-opus-4-8`                                                           |
| "opus 4.8"                                | `claude-opus-4-8`                                                           |
| "opus 4.7"                                | `claude-opus-4-7`                                                           |
| "opus 4.6"                                | `claude-opus-4-6`                                                           |
| "opus 4.5"                                | `claude-opus-4-5`                                                           |
| "opus 4.1"                                | `claude-opus-4-1`                                                           |
| "opus 4", "opus 4.0"                      | `claude-opus-4-0`                                                           |
| "sonnet", "balanced"                      | `claude-sonnet-5`                                                           |
| "sonnet 5"                                | `claude-sonnet-5`                                                           |
| "sonnet 4.6"                              | `claude-sonnet-4-6`                                                         |
| "sonnet 4.5"                              | `claude-sonnet-4-5`                                                         |
| "sonnet 4", "sonnet 4.0"                  | `claude-sonnet-4-0`                                                         |
| "sonnet 3.7"                              | Retired — suggest `claude-sonnet-4-5`                                       |
| "sonnet 3.5"                              | Retired — suggest `claude-sonnet-4-5`                                       |
| "haiku", "fast", "cheap"                  | `claude-haiku-4-5`                                                          |
| "haiku 4.5"                               | `claude-haiku-4-5`                                                          |
| "haiku 3.5"                               | Retired — suggest `claude-haiku-4-5`                                        |
| "haiku 3"                                 | Deprecated — suggest `claude-haiku-4-5`                                     |
