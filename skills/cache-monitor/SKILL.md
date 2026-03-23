---
name: cache-monitor
description: |
  Analyze Claude Code and OpenClaw session costs and cache efficiency.
  Parses JSONL session files to report cache hit rates, token waste,
  cost by project/agent. Use to optimize the $100/month budget.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Cache Monitor

## When to Use
- Weekly cost review
- After noticing expensive sessions
- After changing CLAUDE.md or settings.json (check for cache busting)
- When Kevin asks "how much did that cost?"

## Analysis Commands

### Per-Session Cost (Claude Code)
```bash
# Find today's sessions
find ~/.claude/projects/ -name "*.jsonl" -mtime -1 2>/dev/null | head -20
```

### Per-Agent Cost (OpenClaw)
```bash
# Cost by agent (last 24h)
for dir in ~/.openclaw/agents/*/; do
  agent=$(basename "$dir")
  cost=$(find "$dir/sessions/" -name "*.jsonl" -mtime -1 -exec grep -h '"totalCost"' {} \; 2>/dev/null | \
    jq -s '[.[].totalCost // 0] | add' 2>/dev/null || echo "0")
  if [ "$cost" != "0" ] && [ "$cost" != "null" ]; then
    echo "$agent: \$$cost"
  fi
done | sort -t'$' -k2 -rn
```

### Cache Hit Rate
```bash
# Check cache_read_input_tokens vs input_tokens ratio
# Higher ratio = better caching = lower cost
find ~/.openclaw/agents/*/sessions/ -name "*.jsonl" -mtime -1 -exec \
  grep -h '"cache_read_input_tokens"' {} \; 2>/dev/null | \
  jq -s 'if length > 0 then
    { total_input: ([.[].input_tokens // 0] | add),
      cache_read: ([.[].cache_read_input_tokens // 0] | add) } |
    .cache_rate = (if .total_input > 0 then (.cache_read / .total_input * 100 | round) else 0 end)
  else { note: "no data" } end'
```

## Output Report
```markdown
# Cost & Cache Report — YYYY-MM-DD

## Summary
- Period: Last 24h / 7d / 30d
- Total cost: $X.XX
- Budget remaining: $XX.XX of $100/month
- Cache hit rate: XX%

## By Agent (top 10)
| Agent | Sessions | Cost | Cache Rate |
|-------|----------|------|-----------|

## By Project (top 10)
| Project | Sessions | Cost | Notes |
|---------|----------|------|-------|

## Alerts
- 🔴 Agents with <30% cache rate (settings misconfigured?)
- 🟡 Agents with cost >$5/day
- ✅ Well-optimized agents (>70% cache rate)

## Recommendations
- Specific actions to reduce cost
```

## Gotchas
- JSONL format varies by OpenClaw version — some fields may be nested differently
- Cache rate of 0% for first session is normal (cold start)
- Opus sessions will always cost more — that's by design for complex work
- Agent-HQ at localhost:3001 has aggregated data too
