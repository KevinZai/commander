# Advisor Tool — OpenClaw Integration

## Auto-inject advisor for Sonnet agents

Add to your agent's model config in `~/.openclaw/openclaw.json`:

```json
{
  "models": {
    "sonnet-with-advisor": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "extraHeaders": {
        "anthropic-beta": "advisor-tool-2026-03-01"
      },
      "tools": [
        {
          "type": "advisor_20260301",
          "name": "advisor",
          "model": "claude-opus-4-6",
          "max_uses": 3
        }
      ]
    }
  }
}
```

## ClaudeSwap request interceptor

If using ClaudeSwap (port 8082), add advisor injection to the proxy pipeline.
In `~/.claudeswap/config.json`:

```json
{
  "advisorInjection": {
    "enabled": true,
    "executorModels": ["claude-sonnet-4-6"],
    "advisorModel": "claude-opus-4-6",
    "maxUses": 3,
    "caching": {"type": "ephemeral", "ttl": "5m"}
  }
}
```

## Cost notes

- Advisor calls bill at the advisor model's rates (Opus)
- With max_uses: 3, a typical Sonnet request adds ~$0.03-0.10 in Opus costs
- Use caching (ttl: "5m") to reduce repeated advisor costs in multi-turn conversations
- Monitor via Langfuse or ClaudeSwap dashboard
