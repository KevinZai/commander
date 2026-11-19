---
name: elevenlabs-agents
description: "Build conversational AI voice agents on the ElevenLabs platform. Configure agent + tools + knowledge base, integrate SDK (React / React Native / Swift / JS / server-side), test, deploy. Use whenever the user mentions ElevenLabs, building a voice agent, an AI phone system, an AI receptionist, conversational AI, or troubleshooting deprecated @11labs packages, webhook errors, CSP violations, localhost allowlist, or tool parsing errors."
compatibility: claude-code-only
---

# ElevenLabs Agent Builder

Build a production-ready conversational AI voice agent. Produces a configured agent with tools, knowledge base, and SDK integration.

## Packages

CCC safety: install lines rewritten. Upstream installed every package unpinned and the CLI globally from `@elevenlabs/agents-cli`, which npm marks deprecated and which installs an `agents` command, not the `elevenlabs` command used below. These are the versions current on npm on 2026-11-19, installed exactly; the CLI is a project dev dependency run with `npx --no-install elevenlabs`. Ask the user before installing any of them.

```bash
npm install --save-exact @elevenlabs/react@1.23.1          # React SDK
npm install --save-exact @elevenlabs/client@1.37.1         # JavaScript SDK (browser + server)
npm install --save-exact @elevenlabs/react-native@1.2.42   # React Native SDK
npm install --save-exact @elevenlabs/elevenlabs-js@2.79.0  # Full API (server only)
npm install --save-dev --save-exact @elevenlabs/cli@1.12.2 # CLI ("Agents as Code")
```

**DEPRECATED:** `@11labs/react`, `@11labs/client` -- uninstall if present.

**Server-only warning:** `@elevenlabs/elevenlabs-js` uses Node.js `child_process` and won't work in browsers. Use `@elevenlabs/client` for browser environments, or create a proxy server.

## Workflow

### Step 1: Create Agent via Dashboard or CLI

**Dashboard:** https://elevenlabs.io/app/conversational-ai -> Create Agent

**CLI (Agents as Code):**

CCC safety: commands rewritten for the pinned `@elevenlabs/cli` 1.12.2 (checked against its npm README). Upstream used `push --env dev`; 1.12.2 has no `--env` flag. `agents add` creates the agent and uploads it to the workspace at once, and `push` with no `--agent` force-overwrites every registered agent. Before `agents add` or any push, tell the user which workspace (the account behind `ELEVENLABS_API_KEY`) and which agent will change, and wait for their go-ahead; preview each push with the same flags plus `--dry-run`. The CLI also loads a `.env` file from the working directory: keep the key in the environment and never pass `--xi-api-key` on the command line.

```bash
elevenlabs agents init
# Creates the agent AND uploads it to the workspace (remote write)
elevenlabs agents add "Support Bot" --template customer-service
# Edit agent_configs/support-bot.json; the agent id is in agents.json
elevenlabs agents push --agent <agent_id> --dry-run   # prints the requests, sends nothing
elevenlabs agents push --agent <agent_id>             # same target, after the user approves
```

Templates: `default`, `minimal`, `voice-only`, `text-only`, `customer-service`, `assistant`.

Configure:
- **Voice** -- Choose from 5000+ voices or clone
- **LLM** -- GPT, Claude, Gemini, or custom
- **System prompt** -- Use the 6-component framework below
- **First message** -- What the agent says when conversation starts

### Step 2: Write the System Prompt

Use the 6-component framework for effective agent prompts:

**1. Personality** -- who the agent is:
```
You are [NAME], a [ROLE] at [COMPANY].
You have [EXPERIENCE]. Your traits: [LIST TRAITS].
```

**2. Environment** -- communication context:
```
You're communicating via [phone/chat/video].
Consider [environmental factors]. Adapt to [context].
```

**3. Tone** -- speech patterns and formality:
```
Tone: Professional yet warm. Use contractions for natural speech.
Avoid jargon. Keep responses to 2-3 sentences. Ask one question at a time.
```

**4. Goal** -- objectives and success criteria:
```
Primary Goal: Resolve customer issues on the first call.
Success: Customer verbally confirms issue is resolved.
```

**5. Guardrails** -- boundaries and ethics:
```
Never: provide medical/legal/financial advice, share confidential info.
Always: verify identity before account access, document interactions.
Escalation: customer requests manager, issue beyond knowledge base.
```

**6. Tools** -- available functions and when to use them:
```
1. lookup_order(order_id) -- Use when customer mentions an order.
2. transfer_to_supervisor() -- Use when issue requires manager approval.
Always explain what you're doing before calling a tool.
```

### Step 3: Add Tools

**Client-side tools (run in browser):**

```typescript
const clientTools = {
  updateCart: {
    description: "Add or remove items from the shopping cart",
    parameters: z.object({
      action: z.enum(['add', 'remove']),
      item: z.string(),
      quantity: z.number().min(1)
    }),
    handler: async ({ action, item, quantity }) => {
      const cart = getCart();
      action === 'add' ? cart.add(item, quantity) : cart.remove(item, quantity);
      return { success: true, total: cart.total, items: cart.items.length };
    }
  },
  navigate: {
    description: "Navigate user to a different page",
    parameters: z.object({ url: z.string().url() }),
    handler: async ({ url }) => { window.location.href = url; return { success: true }; }
  }
};
```

CCC safety: restrict `navigate` to same-origin URLs: resolve the URL against `window.location.origin` and refuse any other origin. As written, the agent can send the user to any site.

**Server-side tools (webhooks):**

```json
{
  "name": "get_weather",
  "description": "Fetch current weather for a city",
  "url": "https://api.weather.com/v1/current",
  "method": "GET",
  "parameters": {
    "type": "object",
    "properties": {
      "city": { "type": "string", "description": "City name" }
    },
    "required": ["city"]
  },
  "headers": {
    "Authorization": "Bearer {{secret__weather_api_key}}"
  }
}
```

Use `{{secret__key_name}}` for API keys in webhook headers -- never hardcode.

**MCP Tools -- CRITICAL COMPATIBILITY NOTE:**

ElevenLabs labels their MCP integration as "Streamable HTTP" but does NOT support the actual MCP 2025-03-26 Streamable HTTP spec (SSE responses). ElevenLabs expects:

- Plain JSON responses (`application/json`), NOT SSE (`text/event-stream`)
- Protocol version `2024-11-05`, NOT `2025-03-26`
- Simple JSON-RPC over HTTP with direct JSON responses

What does NOT work:
- Official MCP SDK's `createMcpHandler` (returns SSE)
- Cloudflare Agents SDK `McpServer.serve()` (returns SSE)
- Any server returning `Content-Type: text/event-stream`

Working MCP server pattern for ElevenLabs:

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const tools = [{
  name: "my_tool",
  description: "Tool description",
  inputSchema: {
    type: "object",
    properties: { param1: { type: "string", description: "Description" } },
    required: ["param1"]
  }
}];

async function handleMCPRequest(request, env) {
  const { id, method, params } = request;
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',  // MUST be 2024-11-05
          serverInfo: { name: 'my-mcp', version: '1.0.0' },
          capabilities: { tools: {} }
        }
      };
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools } };
    case 'tools/call':
      const result = await handleTool(params.name, params.arguments, env);
      return { jsonrpc: '2.0', id, result };
    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown: ${method}` } };
  }
}

const app = new Hono();
app.use('/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'] }));
app.post('/mcp', async (c) => {
  const body = await c.req.json();
  return c.json(await handleMCPRequest(body, c.env));  // Plain JSON, NOT SSE
});
export default app;
```

CCC safety: do not ship `cors({ origin: '*' })`. Allow only the origins that call this server, and check an auth header (a `{{secret__...}}` value set in the tool config) before handling `tools/call`.

### Step 4: Add Knowledge Base (RAG)

CCC safety: upload only documents the user chose and is allowed to share with ElevenLabs. Knowledge-base content leaves the machine and is readable by anyone who talks to the agent.

Upload documents for the agent to reference:
- PDFs, text files, web URLs
- Configure via dashboard: Agent -> Knowledge Base -> Upload
- Or via API: `POST /v1/convai/knowledge-base/file` (multipart/form-data)

CCC safety: upstream gave `/v1/convai/knowledge-base/upload`; the path above is the one `@elevenlabs/elevenlabs-js` 2.79.0 calls for a file upload. Name each file and the target workspace to the user before uploading.
- Agent automatically searches knowledge base during conversation

### Step 5: Integrate SDK

**React** -- a minimal hook setup:

CCC safety: example rewritten for `@elevenlabs/react` 1.23.1 (checked against its type definitions). Upstream called `startConversation`/`stopConversation`, which the hook does not return, and passed the auth route itself as `signedUrl` together with `agentId`, which the SDK treats as mutually exclusive. This version fetches a signed URL from the authenticated server route under Critical Patterns and starts the session with it.

```typescript
import { ConversationProvider, useConversation } from '@elevenlabs/react';

// Render inside the provider: <ConversationProvider><VoiceAgent /></ConversationProvider>
function VoiceAgent() {
  const { startSession, endSession, status } = useConversation({
    clientTools,
    dynamicVariables: {
      user_name: 'John',
      account_type: 'premium',
    },
    onMessage: (message) => { /* transcript and agent responses */ },
  });

  async function start() {
    // Your session cookie authenticates this call; the API key stays on the server
    const res = await fetch('/api/elevenlabs/signed-url', { credentials: 'include' });
    if (!res.ok) throw new Error('Not allowed to start a conversation');
    const { signedUrl } = await res.json();
    startSession({ signedUrl });
  }
  // render buttons that call start() and endSession(), and show status
}
```

System prompt references dynamic variables as `{{user_name}}`.

**React Native, Swift, widget embed** -- the upstream boilerplates are not bundled in this pack (see the pack's `DECISIONS.md`); follow the current ElevenLabs SDK docs at https://elevenlabs.io/docs.

### Step 6: Test

**CLI testing:**

CCC safety: commands rewritten for `@elevenlabs/cli` 1.12.2: `agents test` takes the agent id, not its name, and `tests add` uploads the new test to the workspace at once. A test run makes the agent's LLM calls on the account (whether runs are billed was not verified). Name the agent and workspace and get the user's go-ahead before adding or running tests.

```bash
# Run the tests attached to one agent (polls to completion)
elevenlabs agents test <agent_id>

# Create a test from a template; this uploads it (remote write)
elevenlabs tests add "Refund Request" --template basic-llm
```

**Test configuration:**

```json
{
  "name": "Refund Request Test",
  "scenario": "Customer requests refund for defective product",
  "user_input": "I want a refund for order #12345. The product arrived broken.",
  "success_criteria": [
    "Agent acknowledges the issue empathetically",
    "Agent asks for or uses provided order number",
    "Agent verifies order details",
    "Agent provides clear next steps or refund timeline"
  ],
  "evaluation_type": "llm"
}
```

**Tool call testing:**

```json
{
  "name": "Order Lookup Test",
  "scenario": "Customer asks about order status",
  "user_input": "What's the status of order ORD-12345?",
  "expected_tool_call": {
    "tool_name": "lookup_order",
    "parameters": { "order_id": "ORD-12345" }
  }
}
```

**API simulation:**

CCC safety: upstream's `client.agents.simulate(...)` example is removed. That method does not exist in `@elevenlabs/elevenlabs-js` 2.79.0, whose `simulateConversation` is marked deprecated with removal on 31 Oct 2026, in favour of attached tests. Use `elevenlabs agents test <agent_id>` above, with the same approval.

**CI/CD integration:**

CCC safety: example rewritten. Upstream ran on every push and pull request, uploading tests and running them against the workspace each time, with an unpinned action and CLI. This version runs only when someone starts it by hand (`workflow_dispatch`) for a named agent, pins the action to the commit Commander's own `ci.yml` uses and the CLI to 1.12.2, and passes the agent id through the environment rather than into the shell line. Add a workflow to a repository only with the user's go-ahead.

```yaml
name: Test Agent
on:
  workflow_dispatch:
    inputs:
      agent_id:
        description: Agent id to test (from agents.json)
        required: true
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
      - run: npm install --global @elevenlabs/cli@1.12.2
      - run: elevenlabs tests push
        env:
          ELEVENLABS_API_KEY: ${{ secrets.ELEVENLABS_API_KEY }}
      - run: elevenlabs agents test "$AGENT_ID"
        env:
          AGENT_ID: ${{ inputs.agent_id }}
          ELEVENLABS_API_KEY: ${{ secrets.ELEVENLABS_API_KEY }}
```

### Step 7: Deploy

CCC safety: rewritten for `@elevenlabs/cli` 1.12.2, which has no `--env` flag; a push targets `--agent <agent_id>` and optionally `--branch <name|id>`, and without `--agent` it force-overwrites every registered agent. Run the dry run, show its output to the user, and push with exactly the same target only after the user says go. Upstream's dev/staging/prod environment workflow is removed: 1.12.2 has agent branches instead, and which branch serves live traffic is set on the ElevenLabs side (not verified here), so confirm it with the user before a push.

```bash
# Dry run first (always): prints the requests, sends nothing
elevenlabs agents push --agent <agent_id> --branch <branch> --dry-run

# Deploy the same agent and branch, only after the user approves the dry run
elevenlabs agents push --agent <agent_id> --branch <branch>
```

---

## Critical Patterns

### Signed URLs (Security)

Never expose API keys in client code. Use a server endpoint:

CCC safety: example rewritten. Upstream handed a signed URL to any caller and sent a `POST` with a body to an endpoint that `@elevenlabs/elevenlabs-js` 2.79.0 calls as `GET` with an `agent_id` query parameter. This version requires a signed-in user, checks that user may use the agent, chooses the agent on the server, checks the upstream response, and returns only the signed URL (field `signed_url` on the wire), which the browser passes to `startSession({ signedUrl })`.

```typescript
// requireUser: your app's session middleware; it sets req.user or answers 401
app.get('/api/elevenlabs/signed-url', requireUser, async (req, res) => {
  const agentId = process.env.ELEVENLABS_AGENT_ID; // chosen by the server, never by the caller
  if (!canUseAgent(req.user, agentId)) return res.sendStatus(403);

  const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/get-signed-url');
  url.searchParams.set('agent_id', agentId);
  const upstream = await fetch(url, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
  });
  if (!upstream.ok) return res.sendStatus(502); // do not forward the upstream body
  const { signed_url } = await upstream.json();
  if (typeof signed_url !== 'string') return res.sendStatus(502);
  res.set('Cache-Control', 'no-store').json({ signedUrl: signed_url });
});
```

### Agent Versioning (A/B Testing)

Dashboard: Agent -> Versions -> Create Branch. Compare metrics, promote winner.

### Post-Call Webhook

```json
{
  "type": "post_call_transcription",
  "data": {
    "conversation_id": "conv_xyz789",
    "transcript": "...",
    "duration_seconds": 120,
    "analysis": { "sentiment": "positive", "resolution": true }
  }
}
```

Verify with HMAC SHA-256:

CCC safety: example rewritten. Upstream hashed `JSON.stringify(request.body)` (a re-serialised body, not the bytes received), checked no timestamp and left rejection as a comment. This version reads the raw body and uses the SDK's `webhooks.constructEvent` (`@elevenlabs/elevenlabs-js` 2.79.0), which parses the `t=...,v0=...` header, rejects timestamps older than 30 minutes and checks the HMAC of `timestamp.rawBody`; anything that fails gets 401 before processing. The header name comes from upstream and could not be checked against the ElevenLabs docs from this session. The helper compares hashes with `!==`, not in constant time.

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

## Cost Optimisation

Model lineups and pricing rot fast — check the live list in the ElevenLabs dashboard (Agent → LLM dropdown) or docs before picking, and don't hardcode a model id you haven't verified this session. The durable picks: a current cheap-fast model for most agents (upgrade only where quality demands it), a long-context model when the knowledge base is large.

Key savings:
- **LLM caching**: up to 90% on repeated prompts (enable in config)
- **Prompt length**: 150 tokens > 500 tokens for same instructions
- **RAG over context**: use knowledge base instead of stuffing system prompt
- **Duration limits**: set `max_duration_seconds` to prevent runaway conversations
- **Turn mode**: "patient" mode = fewer LLM calls = lower cost

---

## CLI Quick Reference

CCC safety: rewritten for `@elevenlabs/cli` 1.12.2 (its npm README). Upstream's `auth login`, `--env`, `agents widget "Name"` and `tools add-webhook` are not in that README's command list (the binary itself was not run); authentication is the `ELEVENLABS_API_KEY` environment variable. Lines marked "remote write" change the workspace, and `pull` can overwrite local config: name the target and get the user's go-ahead first, after a `--dry-run` where the command has one.

```bash
elevenlabs agents init                                       # Init project (local)
elevenlabs agents add "Name" --template default              # Add agent (remote write)
elevenlabs agents push --agent <agent_id> --dry-run          # Preview a push
elevenlabs agents push --agent <agent_id> [--branch <branch>]  # Push (remote write)
elevenlabs agents pull --agent <agent_id> --dry-run          # Preview a pull (local overwrite)
elevenlabs agents test <agent_id>                            # Run attached tests
elevenlabs agents list                                       # Agents in the workspace (API)
elevenlabs agents status                                     # Local agents and sync status
elevenlabs agents widget embed <agent_id>                    # Print widget snippet
elevenlabs tools add "Name" --type webhook --config-path tool.json  # Add tool (remote write)
elevenlabs tests add "Name" --template basic-llm             # Add test (remote write)
```

Environment: `ELEVENLABS_API_KEY` for the CLI and CI/CD.

---

## Optional References

For specialised use cases, see:
- `references/api-reference.md` -- full REST API for programmatic agent management
- `references/workflow-examples.md` -- multi-agent routing, escalation, multi-language

---

## Asset Files

- `assets/system-prompt-template.md` -- System prompt guide
- `assets/agent-config-schema.json` -- Config schema reference

## Next step

- 🟢 Apply it: does the task with this skill's guidance, then runs the project's checks
- Another Jezweb skill: back to the `jezweb-pack` router to pick a different sub-skill
- Review: runs `/ccc-review` on the result
- Done: you continue manually

## Source

- Upstream: https://github.com/jezweb/claude-skills
- Path: `plugins/integrations/skills/elevenlabs-agents/`
- Pinned commit: `1260fa7439b36b18dbf16648ccc7fb44783f6c23`
- License: MIT, Copyright (c) 2025 Jeremy Dawes (Jezweb); full text in `LICENSE.txt` beside this file (also at `skills/jezweb-pack/licenses/jezweb_claude-skills-LICENSE.txt`)
- Local changes: lines starting "CCC safety:", the Next step and Source sections, the Step 5, Optional References and Asset Files edits for the seven upstream files this pack omits, and the examples rewritten or removed for safety and for the pinned CLI and SDKs (Steps 1 and 4 to 7, Signed URLs, Post-Call Webhook, CLI Quick Reference, and in `references/api-reference.md`); all listed in the pack's `DECISIONS.md`
