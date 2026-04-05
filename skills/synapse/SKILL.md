---
name: synapse
description: "Synapse — real-time agent observability and session analytics"
triggers: ["synapse", "observe", "monitoring", "agent status", "what are my agents doing"]
---

# /syn — Synapse Observability

Synapse API at localhost:4682. Real-time agent monitoring and session analytics.

## When activated:

Run: `curl -s http://localhost:4682/api/health`

Display health status, then present via AskUserQuestion:

| Option | What it does |
|--------|-------------|
| Live session overview (Recommended) | Show all active agent sessions with status, tokens, cost |
| Session timeline | Show recent events: tool calls, messages, errors |
| Token usage breakdown | Show input/output tokens by agent, with bars |
| Cost analysis | Show cost by agent, by day, trending |
| Search sessions | Filter by agent, time range, or keyword |
| Something else | Free text |

### Display Format

For session overview, render as markdown table:
```
| Agent | Status | Tokens | Cost | Duration | Tools |
|-------|--------|--------|------|----------|-------|
| Alfred | active | 45K in / 12K out | $0.23 | 14m | 28 |
| Morpheus | idle | 120K in / 35K out | $0.89 | 42m | 67 |
```

For token usage, render ASCII bars:
```
Alfred    [████████░░░░░░░░]  45K tokens  $0.23
Morpheus  [████████████████]  120K tokens  $0.89
Viper     [██░░░░░░░░░░░░░░]  8K tokens   $0.04
```

### After every action, suggest next steps via AskUserQuestion:
- Refresh data
- View specific agent
- Check costs
- Set alert threshold
- Back to main menu
- Something else
