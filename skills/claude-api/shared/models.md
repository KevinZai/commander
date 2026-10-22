# Claude Model Catalog

**Only use exact model IDs listed in this file.** Never guess or construct model IDs — incorrect IDs will cause API errors. For the latest information, WebFetch the Models Overview URL in `shared/live-sources.md`.

Verified 2026-10-13 against platform.claude.com/docs/en/about-claude/models/overview.

## Current Models (recommended)

Dateless IDs are pinned snapshots (from the 4.6 generation on) and double as the alias. There is no `-latest` alias.

| Friendly Name      | Model ID (also the alias) | Context | Max Output | Pricing (in/out per MTok) | Default effort | Role |
|--------------------|---------------------------|---------|------------|---------------------------|----------------|------|
| Claude Fable 5.1   | `claude-fable-5-1`        | 1M      | 128K       | $10 / $50                 | high           | Demanding reasoning, long-horizon agentic work |
| Claude Opus 5.5    | `claude-opus-5-5`         | 1M      | 128K       | $4 / $20                  | medium         | Long-running agentic coding and knowledge work — **recommended default** |
| Claude Sonnet 5.5  | `claude-sonnet-5-5`       | 1M      | 128K       | $2 / $10                  | high           | Best speed/intelligence balance |
| Claude Haiku 5.5   | `claude-haiku-5-5`        | 1M      | 128K       | from $0.10 / $0.50        | medium         | High-volume, latency-sensitive: classification, extraction, routing |

> **Approved organizations only:** Claude Mythos 5.1 shares the underlying model with Fable 5.1 and is available only to approved organizations. **Never default to it** — suggest `claude-fable-5-1` unless the user confirms access.

### Model notes

- **Thinking.** Adaptive and always on for Fable 5.1 and Opus 5.5; adaptive for Sonnet 5.5 and Haiku 5.5. `thinking: {type: "disabled"}` is not accepted at `xhigh` or `max` effort.
- **Effort levels.** `low`, `medium`, `high`, `xhigh`, `max`. Defaults per model are in the table above.
- **Prompt-cache reads.** 2.5% of the input price on Fable 5.1; 5% on Opus 5.5 and Sonnet 5.5; 10% on other models.
- **Retirement commitments.** Fable 5.1 not before 2027-09-01; Opus 5.5 2027-09-22; Sonnet 5.5 2027-09-28; Haiku 5.5 2027-10-07.
- **Choosing.** Start with `claude-opus-5-5`. Move up to `claude-fable-5-1` for the hardest reasoning or long-horizon work (2.5× the Opus 5.5 price); move down to `claude-sonnet-5-5` for speed or `claude-haiku-5-5` for volume.
- **Max output.** Large outputs (toward 128K) require streaming.

## Legacy Models (still served — do not recommend as defaults)

Use a legacy model only when the user explicitly asks for it; otherwise use the current model in the same line.

| Friendly Name     | Model ID                                         | Current replacement  |
|-------------------|--------------------------------------------------|----------------------|
| Claude Fable 5    | `claude-fable-5`                                 | `claude-fable-5-1`   |
| Claude Opus 5     | `claude-opus-5`                                  | `claude-opus-5-5`    |
| Claude Opus 4.8   | `claude-opus-4-8`                                | `claude-opus-5-5`    |
| Claude Opus 4.7   | `claude-opus-4-7`                                | `claude-opus-5-5`    |
| Claude Opus 4.6   | `claude-opus-4-6`                                | `claude-opus-5-5`    |
| Claude Opus 4.5   | `claude-opus-4-5` (`claude-opus-4-5-20251101`)   | `claude-opus-5-5`    |
| Claude Sonnet 5   | `claude-sonnet-5`                                | `claude-sonnet-5-5`  |
| Claude Sonnet 4.6 | `claude-sonnet-4-6`                              | `claude-sonnet-5-5`  |
| Claude Haiku 4.5  | `claude-haiku-4-5` (`claude-haiku-4-5-20251001`) | `claude-haiku-5-5`   |

## Retired or Unlisted Models

Any model ID not in the two tables above is retired or unverified. Do not send it. Examples whose retirement dates have passed: `claude-opus-4-1-20250805`, `claude-opus-4-20250514`, `claude-sonnet-4-20250514`, every `claude-3-*` and `claude-2.*` ID. If a user needs a model not listed here, WebFetch the Models Overview page first.

## Resolving User Requests

| User says...                                                  | Use this model ID                                                     |
|---------------------------------------------------------------|-----------------------------------------------------------------------|
| "fable", "most capable", "most powerful"                      | `claude-fable-5-1`                                                    |
| "mythos"                                                      | Approved organizations only — suggest `claude-fable-5-1` unless the user has access |
| "opus", "default", or no preference                           | `claude-opus-5-5`                                                     |
| "sonnet", "balanced"                                          | `claude-sonnet-5-5`                                                   |
| "haiku", "fast", "cheap"                                      | `claude-haiku-5-5`                                                    |
| an older version by number (e.g. "opus 4.8", "sonnet 4.6")    | The matching ID from the Legacy table, after noting the current replacement |
| a version in neither table (e.g. "sonnet 3.7", "haiku 3")     | Retired — suggest the current model in that line                      |

## Claude Code aliases

In Claude Code (subagent `model:` frontmatter, `/model`, the Agent tool) use the aliases `fable`, `opus`, `sonnet`, `haiku`, or `inherit`. Aliases track the newest model in that line; name a full ID only when you mean a specific model.
