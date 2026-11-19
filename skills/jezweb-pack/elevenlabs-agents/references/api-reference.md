# ElevenLabs Agents API Reference

CCC safety: `POST`, `PATCH` and `DELETE` calls here change or remove live agents and knowledge-base documents. Show the user a redacted preview of the request (method, path, target id, body, and `xi-api-key: [redacted]`) and get their go-ahead first; never put an API key in a URL, on a command line or in a log.

## Base URL

```
https://api.elevenlabs.io/v1/convai
```

## Authentication

All requests require an API key in the header:

CCC safety: example rewritten. Upstream put the key on the `curl` command line, where it lands in shell history and the process list. Call the API from server code that reads the key from the environment (or use `@elevenlabs/elevenlabs-js`, which reads `ELEVENLABS_API_KEY` itself), and show only redacted previews.

```typescript
// Server-side only; the key comes from the environment and is never printed
const res = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
  headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
});
```

---

## Agents

### Create Agent

**Endpoint**: `POST /agents/create`

**Request Body**:
```json
{
  "name": "Support Agent",
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": "You are a helpful support agent.",
        "llm": "<verify current model id in dashboard>",
        "temperature": 0.7,
        "max_tokens": 500,
        "tool_ids": ["tool_123"],
        "knowledge_base": ["doc_456"]
      },
      "first_message": "Hello! How can I help?",
      "language": "en"
    },
    "tts": {
      "model_id": "eleven_turbo_v2_5",
      "voice_id": "voice_abc123",
      "stability": 0.5,
      "similarity_boost": 0.75,
      "speed": 1.0
    },
    "asr": {
      "quality": "high",
      "provider": "deepgram"
    },
    "turn": {
      "mode": "normal"
    }
  }
}
```

**Response**:
```json
{
  "agent_id": "agent_abc123",
  "name": "Support Agent",
  "created_at": "2025-11-03T12:00:00Z"
}
```

### Update Agent

**Endpoint**: `PATCH /agents/:agent_id`

**Request Body**: Same as Create Agent

### Get Agent

**Endpoint**: `GET /agents/:agent_id`

**Response**:
```json
{
  "agent_id": "agent_abc123",
  "name": "Support Agent",
  "conversation_config": { ... },
  "created_at": "2025-11-03T12:00:00Z",
  "updated_at": "2025-11-03T14:00:00Z"
}
```

### List Agents

**Endpoint**: `GET /agents`

**Response**:
```json
{
  "agents": [
    {
      "agent_id": "agent_abc123",
      "name": "Support Agent",
      "created_at": "2025-11-03T12:00:00Z"
    }
  ]
}
```

### Delete Agent

**Endpoint**: `DELETE /agents/:agent_id`

CCC safety: deletion is permanent. Name the agent (id and name) and its workspace to the user and delete only after they confirm that exact agent.

**Response**:
```json
{
  "success": true
}
```

---

## Conversations

### Create Conversation

**Endpoint**: `POST /conversations/create`

**Request Body**:
```json
{
  "agent_id": "agent_abc123",
  "dynamic_variables": {
    "user_name": "John",
    "account_tier": "premium"
  },
  "overrides": {
    "agent": {
      "prompt": {
        "prompt": "Custom prompt override"
      }
    }
  }
}
```

**Response**:
```json
{
  "conversation_id": "conv_xyz789",
  "signed_url": "wss://api.elevenlabs.io/v1/convai/...",
  "created_at": "2025-11-03T12:00:00Z"
}
```

### Get Conversation

**Endpoint**: `GET /conversations/:conversation_id`

**Response**:
```json
{
  "conversation_id": "conv_xyz789",
  "agent_id": "agent_abc123",
  "transcript": "...",
  "duration_seconds": 120,
  "status": "completed",
  "created_at": "2025-11-03T12:00:00Z",
  "ended_at": "2025-11-03T12:02:00Z"
}
```

---

## Knowledge Base

### Upload Document

**Endpoint**: `POST /knowledge-base/file`

CCC safety: upstream gave `POST /knowledge-base/upload`; `/knowledge-base/file` is the path `@elevenlabs/elevenlabs-js` 2.79.0 calls for a file upload (the response shape below is upstream's and was not checked). Name each file and the target workspace, and upload only after the user confirms; the content leaves the machine and the agent can quote it to anyone who talks to it.

**Request Body** (multipart/form-data):
```
file: <binary>
name: "Support Documentation"
```

**Response**:
```json
{
  "document_id": "doc_456",
  "name": "Support Documentation",
  "status": "processing"
}
```

### Compute RAG Index

**Endpoint**: `POST /knowledge-base/:document_id/rag-index`

CCC safety: indexing processes the document on ElevenLabs (cost not verified). Name the document id and embedding model and run it only after the user confirms.

**Request Body**:
```json
{
  "embedding_model": "e5_mistral_7b"
}
```

**Response**:
```json
{
  "document_id": "doc_456",
  "status": "computing"
}
```

### Get RAG Index Status

**Endpoint**: `GET /knowledge-base/:document_id/rag-index`

**Response**:
```json
{
  "document_id": "doc_456",
  "status": "ready",
  "embedding_model": "e5_mistral_7b",
  "created_at": "2025-11-03T12:00:00Z"
}
```

---

## Tools

### Create Webhook Tool

**Endpoint**: `POST /tools/webhook`

CCC safety: `@elevenlabs/elevenlabs-js` 2.79.0 creates tools with `POST /tools` (a `tool_config` body); upstream's `/tools/webhook` path and the flat body below were not verified against it, so check the current API reference first. A webhook tool lets the agent call that URL during conversations: confirm the URL, method and headers with the user before creating it.

**Request Body**:
```json
{
  "name": "get_weather",
  "description": "Fetch current weather for a city",
  "url": "https://api.weather.com/v1/current",
  "method": "GET",
  "parameters": {
    "type": "object",
    "properties": {
      "city": {
        "type": "string",
        "description": "City name"
      }
    },
    "required": ["city"]
  },
  "headers": {
    "Authorization": "Bearer {{secret__weather_api_key}}"
  }
}
```

**Response**:
```json
{
  "tool_id": "tool_123",
  "name": "get_weather",
  "created_at": "2025-11-03T12:00:00Z"
}
```

---

## Testing

CCC safety: upstream's "Simulate Conversation" section (`POST /agents/:agent_id/simulate`) is removed. `@elevenlabs/elevenlabs-js` 2.79.0 calls `POST /agents/:agent_id/simulate-conversation` and marks it deprecated, with removal on 31 Oct 2026, in favour of agent tests (`elevenlabs agents test <agent_id>` with `@elevenlabs/cli` 1.12.2). Running tests calls the agent's LLM on the account; name the agent and get the user's go-ahead first.

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request body format |
| 401 | Unauthorized | Verify API key is correct |
| 403 | Forbidden | Check agent visibility settings |
| 404 | Not Found | Verify resource ID exists |
| 429 | Rate Limited | Implement backoff strategy |
| 500 | Server Error | Retry with exponential backoff |

---

## Rate Limits

- **Standard Tier**: 100 requests/minute
- **Pro Tier**: 500 requests/minute
- **Enterprise Tier**: Custom limits

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1730640000
```

---

## Pagination

**Query Parameters**:
```
?page=1&per_page=50
```

**Response Headers**:
```
X-Total-Count: 250
X-Page: 1
X-Per-Page: 50
```

---

## Webhook Events

### Post-Call Webhook

**Event Type**: `post_call_transcription`

**Payload**:
```json
{
  "type": "post_call_transcription",
  "data": {
    "conversation_id": "conv_xyz789",
    "agent_id": "agent_abc123",
    "transcript": "...",
    "duration_seconds": 120,
    "analysis": {
      "sentiment": "positive",
      "resolution": true,
      "extracted_data": {}
    }
  },
  "event_timestamp": "2025-11-03T12:02:00Z"
}
```

**Verification** (HMAC SHA-256):

CCC safety: example rewritten, as in the SKILL.md Post-Call Webhook section. Upstream hashed re-serialised JSON, checked no timestamp and never rejected. This version verifies the raw body with the SDK's `webhooks.constructEvent` (`@elevenlabs/elevenlabs-js` 2.79.0: `t=...,v0=...` header, 30-minute timestamp window, HMAC of `timestamp.rawBody`) and returns 401 before processing. The header name is upstream's and was not checked against the ElevenLabs docs; the helper compares hashes with `!==`, not in constant time.

```typescript
import express from 'express';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient(); // reads ELEVENLABS_API_KEY from the server environment

app.post('/webhooks/elevenlabs', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = await elevenlabs.webhooks.constructEvent(
      req.body.toString('utf8'),               // raw body, exactly as received
      req.get('elevenlabs-signature') ?? '',
      process.env.WEBHOOK_SECRET,
    );
  } catch {
    return res.sendStatus(401); // bad, missing or stale signature: stop here
  }
  res.sendStatus(200);
  // process `event` here, after verification
});
```

---

## SDK vs API

| Feature | SDK | API |
|---------|-----|-----|
| WebSocket Connection | ✅ | ❌ |
| Client Tools | ✅ | ❌ |
| Real-time Events | ✅ | ❌ |
| Agent Management | ❌ | ✅ |
| Tool Management | ❌ | ✅ |
| Knowledge Base | ❌ | ✅ |

**Recommendation**: Use SDK for conversations, API for agent management.
