# The 5-Layer Token Optimization Stack for Claude Code

> DRAFT, slice 1. Local only: not published, not sent. Every number below is
> tied to a source in `CLAIMS.md`. Items marked **[VERIFY BEFORE PUBLISH]** are
> not independently measured and must be re-checked or softened first.

Your context window is finite. Most setups waste it.

Run one `grep` across a large repo and 315KB of output can land in context when you needed about 5KB. Do that all session and quality drops before the window is even full. The fix is not one trick. It is five layers, each attacking a different kind of waste.

## Layer 1: context-mode (tool output sandboxing)

context-mode intercepts tool results from Read, Grep, Bash, WebFetch and similar tools. Instead of dumping the raw output into context, it stores it in SQLite with FTS5 full-text search and returns only BM25-ranked snippets.

In our documented benchmark, a 315KB grep came back as a roughly 3-5KB snippet. That is where the "~98%" figure comes from. **[VERIFY BEFORE PUBLISH]** It is one benchmark, not a fleet-wide average. Say "in one measured grep" or re-run it.

Credit and license: context-mode is by Murat Kemal Soylu under the Elastic License 2.0. CC Commander installs it as an external npm package and does not bundle it.

## Layer 2: RTK (CLI output filtering)

RTK sits earlier in the pipeline. A PreToolUse hook rewrites shell commands such as `git status`, `ls` and `npm install` so their output is filtered before it reaches context. A 500-line `git log` becomes the few lines that matter.

The docs quote 99.5% reduction of raw shell output. **[VERIFY BEFORE PUBLISH]** We found no measurement behind it in this repo. Replace it with a number from your own `rtk gain` output, or write "up to".

## Layer 3: Tiered skill loading

Skills cost tokens before you type anything. CC Commander installs in tiers:

| Tier | Flag | Skills |
|------|------|--------|
| Essential (default) | `--skills=essential` | 38 |
| Recommended | `--skills=recommended` | essential + 61 |
| Domain | `--skills=domain` | 11 routers |
| Full | `--skills=full` | 467 |

The essential tier is about 38 skills (the ticket's "30 vs 454" is out of date; see CLAIMS.md) and the repo estimates it saves about 10k tokens per session against loading everything. **[VERIFY BEFORE PUBLISH]** The 10k figure is an estimate, not a measurement. Either measure it or say "roughly".

You can still load anything on demand mid-session by name.

## Layer 4: ClaudeSwap (rate-limit rotation)

ClaudeSwap rotates between multiple MAX accounts as limits approach, and CC Commander's status line reads its state file to show live 5-hour and 7-day meters. The point is that a session does not die on a rate limit.

**[VERIFY BEFORE PUBLISH]** Two things need a human decision. First, ClaudeSwap is not part of this repo; link its source or drop the layer. Second, rotating accounts to get around limits may conflict with Anthropic's usage terms, so check them before publishing. A safe alternative framing is "show your rate meters and plan around them".

## Layer 5: Prompt caching

Anthropic's prompt caching bills cache reads at a fraction of normal input price (a 90% discount), and an extended 1-hour TTL is available. CC Commander's CLAUDE.md template puts static content first and dynamic content last so the cache prefix stays stable.

**[VERIFY BEFORE PUBLISH]** Check the current Anthropic pricing page for the discount and the TTL write premium. Also confirm the exact env var for the 1-hour TTL. The repo only mentions `ENABLE_PROMPT_CACHING_1H` in an archived hook comment.

## How the layers combine

| Layer | Attacks | Where |
|-------|---------|-------|
| RTK | shell noise | before context |
| context-mode | tool-result bulk | after execution |
| Tiered skills | idle skill definitions | session start |
| ClaudeSwap | rate-limit stalls | account level |
| Prompt caching | repeated context cost | API level |

They work at different points, so they do not duplicate each other. Avoid the word "zero conflict": we have not tested every pairing. "Designed to be complementary" is the honest version.

Do not multiply the percentages. They apply to different things (shell output, tool results, skill definitions, price), so there is no single combined number. The repo's own "98% context savings" headline is the context-mode figure, not a stack total.

## Try it

CC Commander is free and open source. Install it, then check your own numbers with `rtk gain` and `ctx_stats` before you trust ours.

<!-- CTA: install link to be added by the publisher. Cross-post to Dev.to is a later slice. -->
