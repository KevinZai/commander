# Codex models — roles and settings

Source of truth: `docs/reference/platform-facts-2026-10.md` §3.1 in the Commander repository. If this table and the facts sheet disagree, the facts sheet wins. The live catalog on any machine: `codex debug models`.

## Current lineup

| Model id | Role in Commander | Notes |
|---|---|---|
| `gpt-6-astra` | Deep work, review, verification | Most capable; costliest |
| `gpt-6.1-sol` | Default executor | Codex catalog default |
| `gpt-6-sol` | Bounded implementation | Complex coding at lower cost than Astra |
| `gpt-6-luna` | Mechanical, high-volume edits | Fastest; effort up to `max`, not `ultra` |

Previous-generation ids stay in the registry for fallback only; never set them as defaults.

## Fallbacks

When a model is unavailable, `getFallbackChain(id)` in `commander/adapters/codex/models.js` gives the order to try: Astra falls back through GPT-6.1 Sol and GPT-6 Sol; Luna falls back to the previous Luna.

## Claude tier to Codex model

Commander's Codex mirror maps agent `model:` aliases this way (`resolveClaudeTier` in `commander/adapters/codex/models.js`):

| Claude alias | Codex model |
|---|---|
| `fable` | `gpt-6-astra` |
| `opus` | `gpt-6.1-sol` |
| `sonnet` | `gpt-6-sol` |
| `haiku` | `gpt-6-luna` |
| `inherit` or unset | `gpt-6.1-sol` |

## Reasoning effort

`model_reasoning_effort` accepts `low`, `medium`, `high`, `xhigh`, `max`, `ultra` (model and client dependent; `ultra` uses subagents). Inherit the configured value unless the task or the user calls for a change.

## Where the settings live

| Setting | Key | Scope |
|---|---|---|
| Default model | `model` | top level of `config.toml`, or a profile file |
| Default effort | `model_reasoning_effort` | same |
| Review model | `review_model` | used by `codex review` |
| Subagent defaults | `[agents] default_subagent_model`, `default_subagent_reasoning_effort` | `config.toml` |
| Per run | `-m <id>` on `codex exec` / `codex exec review`; `-c model="<id>"` anywhere | command line only |
