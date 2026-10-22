# Model Routing, Effort, and Context

The user's selected model and effort are preserved. The tiers below say where delegated work is routed when a different tier materially helps; they never force a session switch. Use aliases in frontmatter and the Agent tool; aliases track the newest model in each line.

## Model tiers

| Tier | Claude alias | Use |
|---|---|---|
| Deep | `fable` (Claude Fable 5.1) | Architecture, migrations, threat models, verification of load-bearing claims |
| Default | `opus` (Claude Opus 5.5) | Implementation, review, orchestration |
| Fast | `sonnet` (Claude Sonnet 5.5) | Bounded edits, docs, routers, focused reviews |
| Bulk | `haiku` (Claude Haiku 5.5) | Classification, routing, extraction, hook-side summaries |

| Codex role | Model |
|---|---|
| Deep work and verification | `gpt-6-astra` |
| Default executor | `gpt-6.1-sol` |
| Bounded implementation | `gpt-6-sol` |
| Mechanical or bulk steps | `gpt-6-luna` |

Pay deep-tier rates for thinking, not typing: plan and verify on `fable` or `opus`, execute on a cheaper tier (`rules/fable-method.md` Pillars 1 and 11). Verify a model is available in the current CLI before naming it in an override.

## Effort

- Levels: `low`, `medium`, `high`, `xhigh`, `max`. `max` applies to the session only and is not saved as a default.
- Set the session level with `/effort`. Set a subagent's level with the Agent tool `effort` parameter or the agent's `effort:` frontmatter, matched to the brief.
- Escalate for judgment: architecture, anything expensive to reverse, security-sensitive changes, adversarial verification. Drop for mechanics: formatting, renames, well-specified single-file edits.
- `/effort ultracode` is its own toggle for workflow-scale orchestration; it does not raise the effort level by itself.
- Thinking is adaptive on current models; there is no budget to tune for routine work.

## Context window

Current models have a 1M-token window, but quality still degrades as context fills with tool output.

- Keep large-scale refactors and multi-file features out of a nearly full context; hand off first (`/ccc-handoff`).
- Single-file edits, documentation, and small fixes tolerate a fuller context.
- Prompt-cache hits are cheap; avoid changing tools, models, or the system prompt mid-session, which invalidates the cache.

## Build failures

1. Read the first real error, not the last line.
2. Reproduce with the narrowest command.
3. Fix incrementally and re-run after each fix.
4. Hand a stubborn failure to a focused agent with the exact command and error output.
