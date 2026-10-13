---
description: "Show what agent sessions cost today, yesterday and in total, broken down by day, agent or model, with a daily budget alert. Use when the user asks about spend, token usage or burn rate."
---

# /ccc-cost — what sessions are costing

**CC Commander** · /ccc-cost · a spend dashboard from the first cost source this machine has.

Every figure here is an estimate computed from token counts and per-model rates, not a bill. Say so whenever you quote a number; point to the provider's billing page for the invoice.

## What happens

1. Find a cost source, in this order, and use the first that answers:

   1. A cost API the user runs, when `COST_API_URL` is set (opt-in):

      ```bash
      curl -s --max-time 3 "$COST_API_URL/api/costs"
      ```

      Expected JSON fields: `today`, `todayTokens`, `yesterday`, `yesterdayTokens`, `total`, `totalTokens`, and a per-agent list with `cost` and `messages`.
   2. `ccusage`, when installed (opt-in, absent by default; check with `command -v ccusage`):

      ```bash
      ccusage daily --json
      ```

   3. Commander's local log `~/.claude/commander/mission-control/metrics.jsonl` (cost per app per day), read with the Read tool.

   If none answers, say "No cost source found. Set `COST_API_URL`, install `ccusage`, or run `/ccc-usage` for Commander's estimates." and stop. That is not an error.

2. Print the dashboard from the parsed data:

   ```
   Cost dashboard (estimates)
   Today:     $<today>      (<todayTokens> tokens)
   Yesterday: $<yesterday>  (<yesterdayTokens> tokens)
   Total:     $<total>      (<totalTokens> tokens)

   By agent:
     <agent>  $<cost>  <bar scaled to the top agent>  <messages> msgs
   ```

   Omit a row or section the source does not provide rather than filling it with zeros.

3. Budget alert. Read the daily threshold from `~/.claude/commander/cost-budget.json` (`{"dailyUsd": <number>}`); default to $5.00 when the file is absent. If today's spend exceeds it, print:

   ```
   ⚠️ Daily spend: $<amount> (threshold: $<threshold>)
   ```

4. Ask with AskUserQuestion (Codex: a plain-text question):

   - 🟢 Daily breakdown — cost per day for the last 7 days
   - By agent — cost and message count per agent
   - By model — costs grouped by the model ids the source reports (`ccusage daily --breakdown` when ccusage is the source)
   - Set budget alert — asks for a daily threshold and saves it

5. For **Set budget alert**, ask for the amount, write `~/.claude/commander/cost-budget.json`, then read it back and report the stored value.

6. After each view, offer the same picker again with a Done option in place of the view just shown.

## Done when

The dashboard printed real values from a named source (say which one), or the no-source message was shown. A threshold change is confirmed by reading the file back.

## Guardrails

- Never present an estimate as an invoice amount.
- Never print API keys or tokens from a cost source's config.
- Do not install `ccusage` or any package as a side effect; suggest it instead.

## See also

`/ccc-usage` · `/ccc-console` · `/ccc-context-budget`
