---
name: incident-response
category: devops
skills: [infra-runbook, senior-devops, ccc-rollback]
mode: plan
estimated_tokens: 500
---

# Incident Response Playbook

## When to use

Use it to write an incident response playbook before an outage, or to document the response process after one. The output is a playbook file in the repo that an on-call engineer can follow without prior context.

## Template

````
Create an incident response playbook for this service. Write it so an on-call engineer with no prior context can follow it step by step.

**Service:**
{{what_the_service_does}}

**Architecture:**
{{brief_description — e.g., "Next.js on Vercel, API on AWS ECS, PostgreSQL on RDS, Redis on ElastiCache"}}

**Team size:**
{{number_of_engineers_who_could_be_on_call}}

Read the repo's infrastructure code, deploy config and existing runbooks first. Fill each `{{...}}` command below with the real command for this stack; mark any you cannot confirm as "TODO: confirm" instead of guessing.

**Step 1: Severity definitions**

| Severity | Impact | Response time | Who is paged |
|---|---|---|---|
| SEV1 — Critical | Service fully down, data loss risk | Immediate | All engineers + leadership |
| SEV2 — Major | Core feature broken, workaround exists | 15 minutes | On-call engineer + lead |
| SEV3 — Minor | Non-core feature degraded | 1 hour | On-call engineer |
| SEV4 — Low | Cosmetic issue, no user impact | Next business day | Ticket created |

**Step 2: First responder checklist (0–5 minutes)**
When paged:
- [ ] Acknowledge the alert
- [ ] Open the monitoring dashboard: {{dashboard_url}}
- [ ] Determine the severity level
- [ ] Start an incident channel (Slack/Discord) named `inc-YYYY-MM-DD-{{brief_description}}`
- [ ] Post the initial status: "Investigating {{symptom}}, severity {{level}}"

**Step 3: Diagnosis runbook**
For each common failure mode:

Service unreachable:
1. Is the service running? `{{health_check_command}}`
2. Does DNS resolve? `dig {{domain}}`
3. Does the load balancer have healthy targets? `{{lb_check_command}}`
4. Was there a recent deploy? `{{deploy_log_command}}`
5. Are upstream dependencies up? `{{dependency_check}}`

High error rate:
1. Error logs: `{{log_command}}`
2. Recent code changes: `git log --oneline -10`
3. Database connectivity
4. Third-party API status pages
5. Resource exhaustion (CPU, memory, connections)

High latency:
1. Database query performance
2. Cache hit rates
3. Connection pool exhaustion
4. Resource saturation (CPU, memory)
5. External dependency latency

**Step 4: Mitigation actions**
| Action | Command | When to use |
|---|---|---|
| Roll back deploy | `{{rollback_command}}` | Bad deploy identified |
| Scale up | `{{scale_command}}` | Traffic spike or resource exhaustion |
| Restart service | `{{restart_command}}` | Memory leak or stuck process |
| Fail over DB | `{{failover_command}}` | Primary DB unresponsive |
| Enable maintenance mode | `{{maintenance_command}}` | Need time to fix safely |

**Step 5: Post-incident**
After resolution:
- [ ] Post the all-clear with a summary in the incident channel
- [ ] Update the status page
- [ ] Schedule the post-mortem within 48 hours
- [ ] Write the post-mortem doc:
  - Timeline of events
  - Root cause analysis (5 Whys)
  - Impact assessment (duration, affected users, data impact)
  - Action items to prevent recurrence
  - What went well and what to improve

**Step 6: Output**
Save the playbook to `docs/incident-response.md` and link it from the project's CLAUDE.md and README. Do not run any mitigation command while writing the playbook. List every command left as "TODO: confirm".
````

## Tips

- The `infra-runbook` skill generates runbooks from infrastructure code; `senior-devops` covers deeper infrastructure questions.
- During a live incident, `/ccc-ci` pulls a failing deploy run's log, and `/ccc-rollback` reverts a bad release; the rollback needs your authorization before it pushes or redeploys.
- Rehearse the playbook with a tabletop exercise before a real incident.

## Example

````
Create an incident response playbook for this service.

**Service:** E-commerce checkout API — handles payments, inventory, and order creation
**Architecture:** Express.js on AWS ECS, PostgreSQL on RDS, Stripe for payments, Redis for sessions, CloudFront CDN
**Team size:** 4 engineers rotating weekly on-call
````
