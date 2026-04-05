---
description: "Real-time cost tracking across all agent sessions"
---

# /cost — Cost Tracker

Agent HQ API at localhost:3005. Shows spending across all Claude sessions.

## When activated:

Run: `curl -s http://localhost:3005/api/costs`

Parse the JSON and display:
```
Cost Dashboard
═══════════════════════════════
Today:     $[today]     ([todayTokens] tokens)
Yesterday: $[yesterday] ([yesterdayTokens] tokens)
Total:     $[total]     ([totalTokens] tokens)

By Agent:
  [agent1]  $[cost]  [██████████░░░░░░]  [messages] msgs
  [agent2]  $[cost]  [████░░░░░░░░░░░░]  [messages] msgs
  ...
```

Then present via AskUserQuestion:

| Option | What it does |
|--------|-------------|
| View daily breakdown (Recommended) | Show cost per day for last 7 days |
| View by agent | Show cost per agent with message counts |
| View by model | Group costs by model (opus/sonnet/haiku/flash) |
| Set budget alert | Ask threshold, save to state |
| Something else | Free text |

### Budget Alert

If daily cost > $5, show warning:
```
⚠️  Daily spend: $[amount] (threshold: $5.00)
```

### After every action, suggest next steps via AskUserQuestion.
