---
name: paperclip-bridge
description: Integration with Paperclip task management API for tracking CC Commander workflows
triggers:
  - "/paperclip"
  - "/paperclip-bridge"
disable-model-invocation: true
---

# Paperclip Bridge

> Connect CC Commander workflows to Paperclip task management. Create issues from task-commander, track progress, auto-close tickets, and synchronize status bidirectionally between CC Commander sessions and Paperclip.

## What Paperclip Is

Paperclip is a task management and agent coordination API running at **localhost:3110**. It manages issues, assignments, comments, and agent heartbeats across the OpenClaw fleet. All multi-step work routes through **Neo (orchestrator) to Paperclip** for tracking.

**Core concepts:**
- **Issues** — Tasks with status, priority, assignee, project, and comments
- **Agents** — AI workers that check out and execute issues via heartbeats
- **Projects** — Groupings for related issues (maps to CC Commander projects/workspaces)
- **Heartbeats** — Periodic wake cycles where agents check assignments and do work
- **Comments** — Threaded discussion on issues for progress tracking and handoffs

**Status lifecycle:** `backlog` -> `todo` -> `in_progress` -> `in_review` -> `done` (or `blocked`, `cancelled`)

---

## 1. Creating Issues from CC Commander Workflows

### From task-commander

When CC Commander's task-commander skill creates a multi-step plan, bridge it to Paperclip:

```bash
curl -s -X POST http://localhost:3110/api/companies/${PAPERCLIP_COMPANY_ID}/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}" \
  -d '{
    "title": "Task from CC Commander: implement user auth",
    "description": "## Source\nCC Commander task-commander\n\n## Steps\n1. Design auth schema\n2. Implement JWT middleware\n3. Add login/register endpoints\n4. Write tests",
    "status": "todo",
    "priority": "high",
    "labels": ["bible-task", "task-commander"],
    "projectId": "'${PROJECT_ID}'",
    "assigneeAgentId": "'${AGENT_ID}'"
  }'
```

### From spec-interviewer

When spec-interviewer produces a spec, create a parent issue with sub-tasks:

```bash
# 1. Create parent issue
PARENT=$(curl -s -X POST http://localhost:3110/api/companies/${PAPERCLIP_COMPANY_ID}/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}" \
  -d '{
    "title": "Spec: new billing system",
    "description": "From spec-interviewer. See tasks/spec-20260328.md",
    "status": "todo",
    "priority": "high",
    "labels": ["bible-spec", "spec-interviewer"]
  }' | jq -r '.id')

# 2. Create sub-tasks for each phase
curl -s -X POST http://localhost:3110/api/companies/${PAPERCLIP_COMPANY_ID}/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}" \
  -d '{
    "title": "Phase 1: Database schema migration",
    "parentId": "'$PARENT'",
    "status": "todo",
    "priority": "high",
    "labels": ["bible-spec"]
  }'
```

### From mode-switcher

When switching CC Commander modes (e.g., entering `saas` mode for a feature sprint), optionally create a tracking issue:

```bash
curl -s -X POST http://localhost:3110/api/companies/${PAPERCLIP_COMPANY_ID}/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}" \
  -d '{
    "title": "CC Commander session: SaaS mode sprint",
    "description": "Mode: saas\nStarted: '$(date -u +%Y-%m-%dT%H:%M:%SZ)'\nGoal: Build subscription billing flow",
    "status": "in_progress",
    "priority": "medium",
    "labels": ["bible-session", "mode-saas"]
  }'
```

---

## 2. Priority Mapping

CC Commander workflows use informal priority language. Paperclip uses structured priority values.

| CC Commander Concept | Paperclip Priority | When to Use |
|---------------|-------------------|-------------|
| P0 — System down, data loss | `critical` | Production outages, security breaches |
| P1 — Blocking work | `critical` | Blockers for active sprints |
| P2 — Important, needs attention | `high` | Features with deadlines, important bugs |
| P3 — Normal work | `high` | Standard feature development |
| P4 — Should do soon | `medium` | Improvements, non-urgent bugs |
| P5 — Nice to have | `medium` | Polish, UX improvements |
| P6 — Backlog | `low` | Future considerations |
| P7-P10 — Wishlist/someday | `low` | Ideas, exploration, tech debt |

### Mapping from CC Commander Skills

| CC Commander Skill | Default Priority | Rationale |
|-------------|-----------------|-----------|
| `harden` / `pentest-checklist` | `critical` | Security work is always high priority |
| `tdd-workflow` / `e2e-testing` | `high` | Testing blocks shipping |
| `task-commander` | `high` | Active planned work |
| `spec-interviewer` | `medium` | Planning phase, not yet executing |
| `brainstorming` | `low` | Exploration, no commitment |
| `retro` / `review` | `medium` | Process improvement |

---

## 3. Tracking Task Progress

### Updating Issues from CC Commander Sessions

As you work through a task-commander plan, update the Paperclip issue:

```bash
# Mark as in-progress with a progress comment
curl -s -X PATCH http://localhost:3110/api/issues/${ISSUE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}" \
  -d '{
    "status": "in_progress",
    "comment": "Step 2/4 complete: JWT middleware implemented and tested."
  }'
```

### Progress Comment Format

When posting updates from CC Commander workflows, use this structure:

```markdown
## CC Commander Progress Update

- **Skill:** task-commander
- **Step:** 2/4
- **Status:** In progress
- **Done:** JWT middleware implemented, unit tests passing
- **Next:** Login/register endpoints
- **Blockers:** None
```

### Automated Progress via Hook

The `openclaw-adapter.js` hook can forward tool events to Paperclip. When `KZ_PAPERCLIP_TRACKING` is set to an issue ID, each significant tool call (file writes, test runs, git commits) appends a lightweight progress entry:

```bash
export KZ_PAPERCLIP_TRACKING="issue-uuid-here"
```

---

## 4. Auto-Closing Tickets

### When CC Commander Tasks Complete

After `task-commander` marks all steps done, or after `verification-loop` passes:

```bash
curl -s -X PATCH http://localhost:3110/api/issues/${ISSUE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}" \
  -d '{
    "status": "done",
    "comment": "## Completed\n\n- All steps executed\n- Tests passing (Vitest: 42/42)\n- No TypeScript errors\n- Committed: feat: add user auth (abc1234)"
  }'
```

### Auto-Close Conditions

| Trigger | Action | Condition |
|---------|--------|-----------|
| All task-commander steps checked | Close issue | All sub-items marked done |
| `verification-loop` passes | Close issue | All checks green |
| Git commit with issue reference | Update issue | Comment with commit SHA |
| `/save-session` with active tracking | Update issue | Add session summary comment |
| Session ends (Stop hook) | Update or leave open | Close only if all steps done |

### Guard: Never Auto-Close

- Issues with `blocked` status (requires human intervention)
- Issues with open sub-tasks (parent stays open)
- Issues assigned to a different agent (not yours to close)
- Issues in `in_review` status (waiting for human review)

---

## 5. Bidirectional Sync Patterns

### CC Commander to Paperclip (Push)

| CC Commander Event | Paperclip Action |
|-------------|-----------------|
| `/plan` starts | Create issue with `todo` status |
| Task execution begins | `PATCH` status to `in_progress` |
| Step completed | `POST` comment with progress |
| Test failure / blocker | `PATCH` status to `blocked` |
| All steps done | `PATCH` status to `done` |
| `git commit` with reference | `POST` comment with commit details |
| `/save-session` | `POST` comment with session summary |
| Mode switch | `POST` comment noting mode change |

### Paperclip to CC Commander (Pull)

| Paperclip Event | CC Commander Action |
|-----------------|-------------|
| New assignment (via heartbeat) | Load issue context, resume work |
| Comment from another agent | Read and incorporate context |
| Status changed to `blocked` | Check blocker, attempt resolution |
| Priority escalated to `critical` | Interrupt current work, address immediately |
| Issue reassigned to Claude Code | Pick up via `/resume-session` |

### Sync Cadence

- **Real-time push:** Every significant CC Commander event fires immediately
- **Periodic pull:** Check assignments at session start and every 30 tool calls
- **On-demand:** User can run `/paperclip` to check status manually

---

## 6. REST API Quick Reference

All endpoints relative to `http://localhost:3110`. All requests use `Authorization: Bearer $PAPERCLIP_API_KEY`. All bodies are JSON.

### Issues

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/companies/:companyId/issues` | List issues. Query params: `status`, `assigneeAgentId`, `projectId`, `priority`, `labelId`, `q` (search), `limit`, `offset` |
| `GET` | `/api/issues/:id` | Get single issue with full details |
| `POST` | `/api/companies/:companyId/issues` | Create issue. Body: `title` (required), `description`, `status`, `priority`, `assigneeAgentId`, `projectId`, `parentId`, `goalId`, `labels[]`, `billingCode` |
| `PATCH` | `/api/issues/:id` | Update issue. Body: any updatable field + optional `comment` |
| `DELETE` | `/api/issues/:id` | Delete issue (prefer `cancelled` status instead) |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/issues/:id/comments` | List comments. Query params: `after` (cursor), `order` (`asc`/`desc`), `limit` |
| `GET` | `/api/issues/:id/comments/:commentId` | Get single comment |
| `POST` | `/api/issues/:id/comments` | Add comment. Body: `body` (markdown), `authorAgentId` |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agents/me` | Current agent identity |
| `GET` | `/api/agents/me/inbox-lite` | Compact assignment inbox |
| `GET` | `/api/companies/:companyId/agents` | List all agents |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/companies/:companyId/projects` | List projects |
| `POST` | `/api/companies/:companyId/projects` | Create project. Body: `name`, `description`, `workspace` |

### Checkout / Release

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/issues/:id/checkout` | Check out issue for work. Body: `agentId`, `expectedStatuses[]`. Returns 409 if already checked out by another agent. |
| `POST` | `/api/issues/:id/release` | Release checkout without changing status |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/companies/:companyId/dashboard` | Aggregated dashboard data: issue counts by status, agent activity, recent changes |

### Search

```bash
# Full-text search across titles, descriptions, comments
GET /api/companies/:companyId/issues?q=auth+middleware&status=todo,in_progress
```

---

## 7. Webhook Integration

### Paperclip to CC Commander Notifications

Paperclip can send webhooks when issues change. Configure in Paperclip settings:

```json
{
  "webhooks": [{
    "note": "Gateway has no HTTP webhook endpoints - use openclaw CLI instead",
    "events": ["issue.status_changed", "issue.assigned", "issue.commented"],
    "secret": "shared-secret-here"
  }]
}
```

### Webhook Payload Format

```json
{
  "event": "issue.status_changed",
  "timestamp": "2026-03-28T12:00:00.000Z",
  "issue": {
    "id": "uuid",
    "identifier": "PAP-142",
    "title": "Implement user auth",
    "status": "in_progress",
    "previousStatus": "todo",
    "priority": "high",
    "assigneeAgentId": "codex"
  }
}
```

### Consuming Webhooks in CC Commander Hooks

The `openclaw-adapter.js` hook can optionally listen for Paperclip webhook events when forwarded through the OpenClaw gateway. Events with `source: "paperclip"` are logged but do not modify Claude Code behavior directly — they surface as informational stderr messages when `KZ_OPENCLAW_DEBUG=1`.

---

## 8. Labels and Categories

### CC Commander Skill to Paperclip Label Mapping

| CC Commander Skill Category | Paperclip Label | Color |
|----------------------|----------------|-------|
| `mega-*` skills | `bible-mega` | purple |
| `task-commander` | `bible-task` | blue |
| `spec-interviewer` | `bible-spec` | green |
| `tdd-workflow` | `bible-tdd` | yellow |
| `verification-loop` | `bible-verify` | teal |
| `code-review` | `bible-review` | orange |
| `harden` / security | `bible-security` | red |
| `brainstorming` | `bible-ideation` | pink |
| Mode sessions | `mode-{name}` | gray |

### Auto-Labeling Rules

When creating issues from CC Commander workflows, apply labels automatically:

1. Always add `cc-task` to any CC Commander-originated issue
2. Add the source skill label (e.g., `bible-spec` for spec-interviewer)
3. Add mode label if a mode is active (e.g., `mode-saas`)
4. Add `bible-security` for any security-related skill
5. Never exceed 5 labels per issue — prioritize specificity

---

## 9. Dashboard Integration

### Paperclip Dashboard to CC Commander Status

The Paperclip dashboard at `http://localhost:3110` shows all issues, agent activity, and project health. CC Commander-originated issues are identifiable by their `cc-*` labels.

### CC Commander Dashboard Widget Data

Pull dashboard data for display in CC Commander status reports:

```bash
# Get dashboard summary
DASHBOARD=$(curl -s http://localhost:3110/api/companies/${PAPERCLIP_COMPANY_ID}/dashboard \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}")

# Extract CC Commander-specific metrics
echo "$DASHBOARD" | jq '{
  total_bible_issues: [.issues[] | select(.labels[] | contains("bible"))] | length,
  open: [.issues[] | select(.labels[] | contains("bible")) | select(.status == "todo" or .status == "in_progress")] | length,
  done_today: [.issues[] | select(.labels[] | contains("bible")) | select(.status == "done")] | length,
  blocked: [.issues[] | select(.labels[] | contains("bible")) | select(.status == "blocked")] | length
}'
```

### Status Report Format

```markdown
## Paperclip CC Commander Status — YYYY-MM-DD

| Metric | Count |
|--------|-------|
| Open CC Commander issues | X |
| In progress | X |
| Blocked | X |
| Completed today | X |
| Total tracked | X |

### Active Issues
| ID | Title | Status | Priority | Agent |
|----|-------|--------|----------|-------|
| PAP-142 | User auth | in_progress | high | codex |
```

---

## 10. Setup

### Prerequisites

- Paperclip running at `localhost:3110`
- `PAPERCLIP_API_KEY` and `PAPERCLIP_COMPANY_ID` environment variables set
- `curl` and `jq` available

### Configuration

```bash
# Add to shell profile
export PAPERCLIP_API_URL="http://localhost:3110"
export PAPERCLIP_COMPANY_ID="your-company-id"
export PAPERCLIP_API_KEY="your-api-key"

# Optional: auto-track CC Commander sessions
export KZ_PAPERCLIP_TRACKING=""  # Set to issue ID to enable per-session tracking
```

### Verify Connection

```bash
# Health check
curl -s http://localhost:3110/api/health

# Test authentication
curl -s http://localhost:3110/api/agents/me \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}"

# List recent issues
curl -s "http://localhost:3110/api/companies/${PAPERCLIP_COMPANY_ID}/issues?limit=5" \
  -H "Authorization: Bearer ${PAPERCLIP_API_KEY}" | jq '.[] | {id, title, status}'
```

---

## Troubleshooting

### Connection Refused

```
Symptom: curl to localhost:3110 fails
Fix: Check PM2 — `pm2 list | grep paperclip`
     Restart if needed — `pm2 restart paperclip`
     Check logs — `pm2 logs paperclip --lines 20 --nostream`
```

### Authentication Failures (401)

```
Symptom: API returns 401 Unauthorized
Fix: Verify PAPERCLIP_API_KEY is set and valid
     For heartbeat runs, check PAPERCLIP_RUN_ID header
     Regenerate key if expired — see Paperclip admin
```

### Issue Creation Failures

```
Symptom: POST /api/issues returns 400
Common causes:
  - Missing required field (title)
  - Invalid status value (must be: backlog, todo, in_progress, in_review, done, blocked, cancelled)
  - Invalid priority value (must be: critical, high, medium, low)
  - Non-existent projectId or parentId
  - Non-existent assigneeAgentId
```

### Stale Tracking Issue

```
Symptom: KZ_PAPERCLIP_TRACKING points to a closed/cancelled issue
Fix: Unset the variable — `unset KZ_PAPERCLIP_TRACKING`
     Or set to a new issue ID for the current session
```

### Missing Labels

```
Symptom: CC Commander labels not appearing on issues
Fix: Labels are created on first use in Paperclip
     Ensure label names match exactly (case-sensitive)
     Check that label array in POST body is formatted correctly
```
