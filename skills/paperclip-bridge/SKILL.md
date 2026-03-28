---
name: paperclip-bridge
description: |
  Integration between Claude Code Bible and Paperclip task management API (localhost:3110).
  Create issues from Bible workflows, track task-commander progress, map priorities,
  auto-close tickets on completion, bidirectional sync, REST API reference, and
  webhook integration for status updates.
triggers:
  - /paperclip-bridge
  - paperclip bridge
  - paperclip integration
  - bible paperclip sync
  - create paperclip issue
  - track in paperclip
---

# Paperclip Bridge

## Overview

Paperclip is the task management control plane running at `http://localhost:3110`. This skill bridges Bible workflows (task-commander, verification-loop, overnight-runner, etc.) into Paperclip's issue tracking system, enabling bidirectional visibility between Claude Code sessions and the agent fleet.

**Key Concepts:**
- Bible **tasks** (in `tasks/todo.md` or `tasks/*.json`) map to Paperclip **issues**
- Bible **priorities** (P0-P10) map to Paperclip **priority levels** (critical, high, medium, low)
- Bible **task-commander** progress updates map to Paperclip **comments**
- Bible **verification-loop** completion maps to Paperclip **status transitions**

## Authentication

Paperclip uses JWT bearer tokens for API access. When running inside a Paperclip heartbeat, env vars are auto-injected:

```bash
PAPERCLIP_API_URL=http://localhost:3110
PAPERCLIP_API_KEY=<jwt-token>
PAPERCLIP_AGENT_ID=<your-agent-id>
PAPERCLIP_COMPANY_ID=<company-id>
PAPERCLIP_RUN_ID=<current-run-id>
```

For Claude Code sessions outside heartbeat context, use the local CLI:

```bash
paperclipai agent local-cli <agent-id> --company-id <company-id>
```

All API calls use: `Authorization: Bearer $PAPERCLIP_API_KEY`

All mutating calls inside a heartbeat MUST include: `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID`

## Creating Issues from Bible Workflows

### From Task Commander

When task-commander identifies work that needs tracking, create a Paperclip issue:

```bash
curl -s -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement auth middleware",
    "description": "From Bible task-commander. See tasks/todo.md line 12.\n\nAcceptance criteria:\n- JWT validation on all /api/* routes\n- Refresh token rotation\n- Rate limiting on auth endpoints",
    "status": "todo",
    "priority": "high",
    "assigneeAgentId": "'"$PAPERCLIP_AGENT_ID"'",
    "projectId": "'"$PROJECT_ID"'",
    "labels": ["bible-task", "auth"]
  }'
```

### From Overnight Runner

Create issues for failed overnight tasks:

```bash
# After overnight-runner detects a failure
curl -s -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Overnight build failure: project-foo",
    "description": "Build failed at phase 2 (test suite).\n\nError: `TypeError: Cannot read property of undefined at auth.test.ts:45`\n\nSee: output/builds/errors/2026-03-28.log",
    "status": "todo",
    "priority": "critical",
    "labels": ["bible-overnight", "build-failure"]
  }'
```

### From Security Scan

Create issues for security findings:

```bash
# For each critical finding
curl -s -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CRITICAL: Hardcoded API key in src/services/payment.ts",
    "description": "Security scan found hardcoded Stripe key at line 23.\n\nRemediation: Move to environment variable `STRIPE_SECRET_KEY`.\n\nScan report: output/security/scan-2026-03-28.md",
    "status": "todo",
    "priority": "critical",
    "labels": ["bible-security", "secret-leak"]
  }'
```

## Priority Mapping

Bible uses P0-P10 numeric priorities. Paperclip uses named levels.

| Bible Priority | Paperclip Level | When to Use |
|---|---|---|
| P0 | `critical` | System down, security breach, data loss |
| P1 | `critical` | Major feature broken, blocking release |
| P2 | `high` | Important feature, significant bug |
| P3 | `high` | Moderate feature, non-blocking bug |
| P4 | `medium` | Nice-to-have feature, minor bug |
| P5 | `medium` | Quality improvement, tech debt |
| P6 | `low` | Cosmetic fix, docs update |
| P7 | `low` | Nice-to-have, no deadline |
| P8-P10 | `low` | Backlog, someday/maybe |

### Mapping Function

```javascript
function biblePriorityToPaperclip(p) {
  if (p <= 1) return 'critical';
  if (p <= 3) return 'high';
  if (p <= 5) return 'medium';
  return 'low';
}
```

## Tracking Task Commander Progress

When task-commander updates a task status, post a comment to the corresponding Paperclip issue:

```bash
# Task started
curl -s -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "## Started\n\nTask picked up by Claude Code session.\n\n- Branch: `feat/auth-middleware`\n- Estimated: 30 minutes\n- Skills: senior-backend, verification-loop"
  }'

# Progress update
curl -s -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "## Progress\n\n- [x] Route handlers created\n- [x] JWT validation middleware\n- [ ] Refresh token rotation\n- [ ] Rate limiting\n- [ ] Tests\n\n60% complete, on track."
  }'

# Blocked
curl -s -X PATCH "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "blocked",
    "comment": "## Blocked\n\nMissing `JWT_SECRET` in .env.example. Need Kevin to confirm the secret source (1Password vault or generated)."
  }'
```

## Auto-Close on Task Commander Completion

When task-commander marks a task `done` and verification-loop passes, close the Paperclip issue:

```bash
# Verification passed -- close the issue
curl -s -X PATCH "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "done",
    "comment": "## Completed\n\nAll acceptance criteria met.\n\n- TypeScript compiles: pass\n- Tests pass: 12/12\n- Coverage: 84%\n- No console.log in production code\n- Committed: `feat: add auth middleware (CC-42)`\n\nBranch: `feat/auth-middleware` ready for review."
  }'
```

### Auto-Close Logic

Integrate into your Bible workflow:

```javascript
async function closeOnCompletion(issueId, verificationResults) {
  const allPassed = verificationResults.every(r => r.passed);

  if (!allPassed) {
    const failures = verificationResults
      .filter(r => !r.passed)
      .map(r => `- ${r.name}: ${r.error}`)
      .join('\n');

    await updateIssue(issueId, {
      status: 'blocked',
      comment: `## Verification Failed\n\n${failures}\n\nManual review needed.`
    });
    return;
  }

  await updateIssue(issueId, {
    status: 'done',
    comment: `## Completed\n\nAll ${verificationResults.length} verification checks passed.`
  });
}
```

## Bidirectional Sync

### Bible -> Paperclip (Push)

Bible workflows push state changes to Paperclip:

| Bible Event | Paperclip Action |
|---|---|
| Task created in todo.md | `POST /api/companies/{id}/issues` |
| Task status changed | `PATCH /api/issues/{id}` with status |
| Task completed + verified | `PATCH /api/issues/{id}` status=done |
| Task blocked | `PATCH /api/issues/{id}` status=blocked |
| Progress update | `POST /api/issues/{id}/comments` |
| Error during execution | `POST /api/issues/{id}/comments` |

### Paperclip -> Bible (Pull)

Bible sessions pull assignments from Paperclip:

```bash
# Get my current assignments
curl -s "$PAPERCLIP_API_URL/api/agents/me/inbox-lite" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" | jq '.issues[] | {id, title, status, priority}'
```

### Sync Workflow

```
Session Start:
  1. Read tasks/todo.md (local state)
  2. GET /api/agents/me/inbox-lite (Paperclip state)
  3. Reconcile:
     - New Paperclip issues not in todo.md -> add to todo.md
     - Local tasks not in Paperclip -> create issues (if configured)
     - Status mismatches -> Paperclip wins (source of truth)

During Session:
  4. Task-commander updates -> POST comments to Paperclip
  5. Completion -> PATCH status in Paperclip

Session End:
  6. Write final state to tasks/todo.md
  7. Post session summary as comment on active issues
```

### Sync Configuration

Control sync behavior with `tasks/paperclip-sync.json`:

```json
{
  "enabled": true,
  "direction": "bidirectional",
  "syncOnSessionStart": true,
  "syncOnSessionEnd": true,
  "autoCreateIssues": false,
  "autoCloseOnVerification": true,
  "commentOnProgress": true,
  "commentFrequency": "on-status-change",
  "projectId": "your-project-id",
  "labels": ["bible-session"],
  "priorityThreshold": "P5"
}
```

- `autoCreateIssues: false` -- do not auto-create Paperclip issues for every local task (only explicit ones)
- `priorityThreshold: "P5"` -- only sync tasks at P5 or higher priority
- `commentFrequency: "on-status-change"` -- post comments on status changes only (not every progress tick)

## REST API Reference

### Issues

| Action | Method | Endpoint |
|---|---|---|
| List issues | GET | `/api/companies/{companyId}/issues` |
| Search issues | GET | `/api/companies/{companyId}/issues?q=search+term` |
| Get issue | GET | `/api/issues/{issueId}` |
| Create issue | POST | `/api/companies/{companyId}/issues` |
| Update issue | PATCH | `/api/issues/{issueId}` |
| Checkout issue | POST | `/api/issues/{issueId}/checkout` |
| Release issue | POST | `/api/issues/{issueId}/release` |

### Comments

| Action | Method | Endpoint |
|---|---|---|
| List comments | GET | `/api/issues/{issueId}/comments` |
| Get comment | GET | `/api/issues/{issueId}/comments/{commentId}` |
| Add comment | POST | `/api/issues/{issueId}/comments` |

### Agents

| Action | Method | Endpoint |
|---|---|---|
| My identity | GET | `/api/agents/me` |
| My inbox | GET | `/api/agents/me/inbox-lite` |
| List agents | GET | `/api/companies/{companyId}/agents` |

### Documents

| Action | Method | Endpoint |
|---|---|---|
| List documents | GET | `/api/issues/{issueId}/documents` |
| Get document | GET | `/api/issues/{issueId}/documents/{key}` |
| Create/update doc | PUT | `/api/issues/{issueId}/documents/{key}` |

### Common Query Parameters

```
# Filter by status
?status=todo,in_progress,blocked

# Filter by assignee
?assigneeAgentId={agentId}

# Filter by project
?projectId={projectId}

# Filter by label
?labelId={labelId}

# Search
?q=search+term

# Pagination
?limit=50&offset=0
```

### Response Envelope

All responses follow the standard envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

### Status Values

`backlog` | `todo` | `in_progress` | `in_review` | `done` | `blocked` | `cancelled`

### Priority Values

`critical` | `high` | `medium` | `low`

## Webhook Integration

### Paperclip to Bible (Inbound Webhooks)

Paperclip can notify Bible sessions of external changes:

```json
{
  "event": "issue.updated",
  "issue": {
    "id": "abc-123",
    "title": "Implement auth",
    "status": "todo",
    "priority": "high",
    "assigneeAgentId": "claude-code"
  },
  "changes": {
    "status": { "from": "blocked", "to": "todo" },
    "comment": "Unblocked -- JWT_SECRET added to 1Password vault."
  }
}
```

Bible can listen for these via the session-startup skill:

```bash
# Check for recent Paperclip updates at session start
RECENT=$(curl -s "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues?assigneeAgentId=$PAPERCLIP_AGENT_ID&status=todo,in_progress&updatedSince=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY")

echo "$RECENT" | jq -r '.data[] | "- [\(.status)] \(.title) (\(.identifier))"'
```

### Bible to Paperclip (Outbound Webhooks)

Bible PostToolUse hooks can notify Paperclip of session activity. Use the pattern from `openclaw-adapter.js` adapted for Paperclip:

```javascript
function postToPaperclip(event) {
  const apiUrl = process.env.PAPERCLIP_API_URL || 'http://localhost:3110';
  const apiKey = process.env.PAPERCLIP_API_KEY;
  if (!apiKey) return;

  const payload = {
    source: 'claude-code-bible',
    event: event.type,
    timestamp: new Date().toISOString(),
    sessionId: process.env.CLAUDE_SESSION_ID || 'unknown',
    data: event.data
  };

  // POST to Paperclip webhook endpoint
  // (fire and forget -- do not block tool execution)
  fetch(`${apiUrl}/api/webhooks/bible`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  }).catch(() => {});
}
```

## Workflow Examples

### Example 1: Feature Development

```
1. Claude Code starts session
2. Read Paperclip inbox -> find assigned issue CC-42
3. Checkout CC-42 (POST /api/issues/{id}/checkout)
4. Task-commander picks up the task
5. Progress comments posted to CC-42 as work proceeds
6. Verification-loop runs on completion
7. All checks pass -> PATCH CC-42 status=done
8. Commit with message: "feat: implement feature (CC-42)"
```

### Example 2: Overnight Batch

```
1. Overnight-runner starts batch processing
2. Create Paperclip issue: "Overnight batch 2026-03-28"
3. For each batch item, post progress comment
4. On completion, update issue with summary
5. If failures, create child issues for each failure
6. Close parent issue with final report
```

### Example 3: Security Scan -> Issue Creation

```
1. Security-scan dispatch runs
2. Finds 3 critical, 5 high, 12 medium findings
3. Creates Paperclip issue for each critical finding
4. Creates one rollup issue for high findings
5. Logs medium findings in the scan report (no issues)
6. Posts summary comment linking all created issues
```

## Gotchas

- Always checkout before working on an issue -- direct PATCH to `in_progress` is not allowed
- Never retry a 409 Conflict -- the issue is owned by another agent
- Include `X-Paperclip-Run-Id` on all mutating requests inside heartbeat runs
- Paperclip is the source of truth for status -- if Bible and Paperclip disagree, Paperclip wins
- Comment links must use the company prefix format: `[CC-42](/CC/issues/CC-42)`
- Do not create issues for every trivial task -- use `priorityThreshold` in sync config
- Rate limit awareness: do not post more than 1 comment per minute per issue
