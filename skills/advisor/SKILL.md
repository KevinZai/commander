---
name: advisor
description: "Anthropic Advisor Tool — pair a cheaper executor model with Opus for guidance. TRIGGER when: user asks about advisor tool, model pairing, Sonnet+Opus, cost optimization with quality, or 'how to make Sonnet smarter'. DO NOT TRIGGER when: general API questions (use claude-api skill instead)."
license: Complete terms in LICENSE.txt
---

# Anthropic Advisor Tool

The Advisor Tool lets a faster, cheaper model (the executor — Haiku or Sonnet) run a task while silently consulting a smarter model (Opus) for guidance whenever it gets stuck or needs a sanity check. Everything happens inside a single `/v1/messages` request: the executor decides when to call the advisor like any other tool, Opus sees the full conversation and returns advice, and the executor continues. No extra round trips, no separate API calls, no special orchestration code on your end.

Think of it as giving Sonnet a senior engineer it can quietly ask for help — without paying Opus rates for the whole job.

---

## When to Use It

**Good fit:**
- Long, multi-step tasks where Sonnet handles most steps but needs occasional guidance on hard parts
- Complex code generation, refactoring, or analysis where quality matters but budget is a concern
- Any task where "Sonnet with supervision" beats "Opus for everything" on cost

**Poor fit:**
- Single-turn Q&A — the overhead isn't worth it for one-shot requests
- Simple pass-through tasks where Sonnet already performs well
- Cases where you need the advisor's full reasoning chain (thinking blocks are stripped; only the advice text reaches the executor)

---

## Model Compatibility

The executor model must be paired with a compatible advisor. Only these combinations are valid:

| Executor | Advisor |
|----------|---------|
| `claude-haiku-4-5` | `claude-opus-4-6` |
| `claude-sonnet-4-6` | `claude-opus-4-6` |
| `claude-opus-4-6` | `claude-opus-4-6` |

**The advisor is always Opus 4.6.** You cannot use Sonnet as an advisor, and you cannot pair Opus 4.5 executor with a different advisor model.

---

## Quick Start (cURL)

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: advisor-tool-2026-03-01" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 4096,
    "tools": [
      {
        "type": "advisor_20260301",
        "name": "advisor",
        "model": "claude-opus-4-6"
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "Refactor this payment processing module to improve error handling and add retry logic."
      }
    ]
  }'
```

---

## Python SDK

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    betas=["advisor-tool-2026-03-01"],
    tools=[
        {
            "type": "advisor_20260301",
            "name": "advisor",
            "model": "claude-opus-4-6",
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "Refactor this payment processing module to improve error handling and add retry logic.",
        }
    ],
)

# The executor's final response — advisor turns are already resolved
print(response.content)
```

### With max_uses and caching

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    betas=["advisor-tool-2026-03-01"],
    tools=[
        {
            "type": "advisor_20260301",
            "name": "advisor",
            "model": "claude-opus-4-6",
            "max_uses": 3,                        # Limit advisor calls per request
            "caching": {
                "type": "ephemeral",
                "ttl": "1h"                       # Cache advisor context for 1 hour
            },
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "Build a complete REST API for a task management app.",
        }
    ],
)
```

---

## TypeScript SDK

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.beta.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  betas: ["advisor-tool-2026-03-01"],
  tools: [
    {
      type: "advisor_20260301",
      name: "advisor",
      model: "claude-opus-4-6",
    },
  ],
  messages: [
    {
      role: "user",
      content:
        "Refactor this payment processing module to improve error handling and add retry logic.",
    },
  ],
});

console.log(response.content);
```

### With max_uses and caching

```typescript
const response = await client.beta.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  betas: ["advisor-tool-2026-03-01"],
  tools: [
    {
      type: "advisor_20260301",
      name: "advisor",
      model: "claude-opus-4-6",
      max_uses: 3,
      caching: {
        type: "ephemeral",
        ttl: "1h",
      },
    },
  ],
  messages: [
    {
      role: "user",
      content: "Build a complete REST API for a task management app.",
    },
  ],
});
```

---

## Cost Controls

### max_uses

Caps the number of times the executor can call the advisor in a single request. Without this, an executor running a very long task could call the advisor many times, which adds up since each advisor call is billed at Opus rates.

```json
{
  "type": "advisor_20260301",
  "name": "advisor",
  "model": "claude-opus-4-6",
  "max_uses": 2
}
```

When the executor hits the limit, it continues without advisor access for the rest of that request.

### caching

Caches the advisor's context so repeated advisor calls within the TTL window reuse the cached prompt tokens instead of re-encoding them. Useful when the system prompt or conversation history is large.

```json
{
  "type": "advisor_20260301",
  "name": "advisor",
  "model": "claude-opus-4-6",
  "caching": {
    "type": "ephemeral",
    "ttl": "5m"
  }
}
```

Valid TTL values: `"5m"` or `"1h"`. Use `"1h"` for long-running tasks where the same context will be reused across multiple advisor calls.

---

## Response Handling

The advisor runs entirely server-side. From your code's perspective, you make one `/v1/messages` request and get one response back from the executor. You never see the advisor's raw output — only the executor's final response.

However, the response content may include two block types that indicate advisor activity:

| Block type | Meaning |
|------------|---------|
| `advisor_result` | Advisor responded with advice that reached the executor |
| `advisor_redacted_result` | Advisor responded but the content was redacted (safety policy) |

Both block types appear in the response `content` array. For most use cases you can ignore them — just look for the final `text` block from the executor.

```python
for block in response.content:
    if block.type == "text":
        print(block.text)         # The executor's final answer
    elif block.type == "advisor_result":
        pass                      # Advisor ran — no action needed
    elif block.type == "advisor_redacted_result":
        pass                      # Advisor ran but content was filtered
```

---

## Error Codes

| HTTP | Error type | Cause | Fix |
|------|------------|-------|-----|
| 400 | `invalid_request_error` | Invalid model pair (e.g., Sonnet executor + Sonnet advisor) | Use `claude-opus-4-6` as advisor |
| 400 | `invalid_request_error` | Missing beta header | Add `anthropic-beta: advisor-tool-2026-03-01` |
| 400 | `invalid_request_error` | `max_uses` is 0 or negative | Set `max_uses` to a positive integer |
| 400 | `invalid_request_error` | Invalid `ttl` value | Use `"5m"` or `"1h"` only |
| 529 | `overloaded_error` | Advisor model overloaded | Retry with exponential backoff |

---

## OpenClaw Integration

For users running OpenClaw, the advisor tool integrates at the model config layer. You can either inject it per-request in agent configs or have ClaudeSwap inject it automatically for all Sonnet requests.

### Option 1 — Per-agent in openclaw.json

Add an `advisorTool` block to any agent's model config:

```json
{
  "agents": {
    "your-agent-id": {
      "model": "claude-sonnet-4-6",
      "modelConfig": {
        "advisorTool": {
          "type": "advisor_20260301",
          "name": "advisor",
          "model": "claude-opus-4-6",
          "max_uses": 3,
          "caching": {
            "type": "ephemeral",
            "ttl": "1h"
          }
        }
      }
    }
  }
}
```

Back up first: `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup-$(date +%Y%m%d-%H%M%S)`

### Option 2 — ClaudeSwap injection (global)

ClaudeSwap (:8082) proxies all Anthropic requests from OpenClaw. You can configure it to inject the advisor tool into every outgoing Sonnet request without touching agent configs:

```json
{
  "inject": {
    "model_match": "claude-sonnet-4-6",
    "tools": [
      {
        "type": "advisor_20260301",
        "name": "advisor",
        "model": "claude-opus-4-6",
        "max_uses": 2
      }
    ],
    "beta_headers": ["advisor-tool-2026-03-01"]
  }
}
```

This is the lowest-friction path if you want Opus supervision on all Sonnet agents without individual config changes.

### Cost estimate

A typical Sonnet request that triggers the advisor once adds roughly one Opus input call at the length of the full transcript. On a 10K-token conversation, that's ~$0.05 extra per advisor invocation. Use `max_uses: 1` or `max_uses: 2` to keep it predictable.
