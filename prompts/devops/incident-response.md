---
name: incident-response
category: devops
skills: [infra-runbook, senior-devops, harden]
mode: plan
estimated_tokens: 500
---

# Incident Response Playbook

## When to Use
When you need to create an incident response playbook before an outage happens, or when documenting the response process after an incident. Having this ready is the difference between a 10-minute recovery and a 2-hour panic.

## Template

```
Create an incident response playbook for this service. It should be usable by any on-call engineer at 3am without prior context.

**Service:**
{{what_the_service_does}}

**Architecture:**
{{brief_description — e.g., "Next.js on Vercel, API on AWS ECS, PostgreSQL on RDS, Redis on ElastiCache"}}

**Team size:**
{{number_of_engineers_who_could_be_on_call}}

**Step 1: Severity definitions**

| Severity | Impact | Response time | Who's paged |
|---|---|---|---|
| **SEV1 — Critical** | Service fully down, data loss risk | Immediate | All engineers + leadership |
| **SEV2 — Major** | Core feature broken, workaround exists | 15 minutes | On-call engineer + lead |
| **SEV3 — Minor** | Non-core feature degraded | 1 hour | On-call engineer |
| **SEV4 — Low** | Cosmetic issue, no user impact | Next business day | Ticket created |

**Step 2: First responder checklist (0-5 minutes)**
When paged:
- [ ] Acknowledge the alert
- [ ] Open monitoring dashboard: {{dashboard_url}}
- [ ] Determine severity level
- [ ] Start incident channel (Slack/Discord) with naming: `inc-YYYY-MM-DD-{{brief_description}}`
- [ ] Post initial status: "Investigating {{symptom}}, severity {{level}}"

**Step 3: Diagnosis runbook**
For each common failure mode:

**Service unreachable:**
1. Check: is the service running? `{{health_check_command}}`
2. Check: DNS resolution working? `dig {{domain}}`
3. Check: load balancer healthy targets? `{{lb_check_command}}`
4. Check: recent deploys? `{{deploy_log_command}}`
5. Check: upstream dependencies? `{{dependency_check}}`

**High error rate:**
1. Check: error logs `{{log_command}}`
2. Check: recent code changes `git log --oneline -10`
3. Check: database connectivity
4. Check: third-party API status pages
5. Check: resource exhaustion (CPU, memory, connections)

**High latency:**
1. Check: database query performance
2. Check: cache hit rates
3. Check: connection pool exhaustion
4. Check: resource saturation (CPU, memory)
5. Check: external dependency latency

**Step 4: Mitigation actions**
| Action | Command | When to use |
|---|---|---|
| Rollback deploy | `{{rollback_command}}` | Bad deploy identified |
| Scale up | `{{scale_command}}` | Traffic spike / resource exhaustion |
| Restart service | `{{restart_command}}` | Memory leak / stuck process |
| Failover DB | `{{failover_command}}` | Primary DB unresponsive |
| Enable maintenance mode | `{{maintenance_command}}` | Need time to fix safely |

**Step 5: Post-incident**
After resolution:
- [ ] Post all-clear with summary in incident channel
- [ ] Update status page
- [ ] Schedule post-mortem within 48 hours
- [ ] Write post-mortem doc:
  - Timeline of events
  - Root cause analysis (5 Whys)
  - Impact assessment (duration, affected users, data impact)
  - Action items to prevent recurrence
  - What went well / what could improve

**Step 6: Output**
Save the playbook to `docs/incident-response.md` and link it from the project's CLAUDE.md and README.
```

## Tips
- Use the `infra-runbook` skill to auto-generate runbooks from infrastructure code
- The `senior-devops` skill provides expert-level infrastructure guidance
- Test this playbook with a tabletop exercise — walk through a scenario before a real incident

## Example

```
Create an incident response playbook for this service.

**Service:** E-commerce checkout API — handles payments, inventory, and order creation
**Architecture:** Express.js on AWS ECS, PostgreSQL on RDS, Stripe for payments, Redis for sessions, CloudFront CDN
**Team size:** 4 engineers rotating weekly on-call
```
