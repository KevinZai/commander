---
name: deploy-strategy
category: devops
skills: [setup-deploy, senior-devops, canary]
mode: plan
estimated_tokens: 600
---

# Deployment Strategy

## When to use

Use it to choose and plan a deployment strategy for a production service, typically when moving from manual deploys to zero-downtime releases with a tested rollback. The output is a recommended strategy plus an implementation plan; nothing is deployed.

## Template

````
Design a deployment strategy for this service. Prioritize zero-downtime deploys with fast rollback. Plan only: do not change infrastructure or deploy anything.

**Service:**
{{what_the_service_does}}

**Infrastructure:**
{{AWS|GCP|Vercel|Railway|Fly.io|Kubernetes|bare metal}}

**Current deploy process:**
{{describe — e.g., "git push to main triggers Vercel deploy" or "manual SSH + restart"}}

**Traffic volume:**
{{requests_per_second_or_daily_users}}

**Acceptable risk tolerance:**
{{low — financial/healthcare|medium — SaaS product|high — internal tool}}

**Step 1: Strategy selection**
Evaluate these options against the inputs above and recommend exactly one, with the reason it beats the runner-up:

| Strategy | Zero-downtime | Rollback speed | Complexity | Best for |
|---|---|---|---|---|
| Rolling | Yes | Medium (redeploy) | Low | Stateless services, small teams |
| Blue-green | Yes | Instant (DNS/LB swap) | Medium | Critical services, fast rollback need |
| Canary | Yes | Fast (route shift) | High | High-traffic services, gradual validation |
| Feature flags | N/A | Instant (toggle) | Medium | Feature-level control, A/B testing |
| Recreate | No | Slow (redeploy) | Low | Dev/staging only |

**Step 2: Implementation plan**
For the chosen strategy, specify:

Infrastructure setup:
- Load balancer configuration
- Health check endpoints: what each checks, timeout, failure threshold
- DNS or routing configuration
- Artifact storage (container registry, object storage, etc.)
- Database migration order: how schema changes stay compatible with both the old and new version during the switch

Deploy process:
1. Build the artifact (container image, binary, bundle).
2. Run smoke tests against the artifact.
3. Deploy to the target environment.
4. Run health checks.
5. Shift traffic, gradually or all at once.
6. Watch error rate and latency against the thresholds in Step 3.
7. Complete, or roll back.

Rollback process:
1. Detect the failure (automated threshold or manual call).
2. Revert traffic to the previous version, with the exact command.
3. Investigate the root cause.
4. Fix and redeploy.

**Step 3: Automation**
- CI/CD integration (pair with the `devops/ci-cd-pipeline.md` template).
- Automated health checks after every deploy.
- Automated rollback triggers with concrete thresholds (error rate > X%, p99 latency > Y ms) chosen for this traffic volume.
- Deploy success/failure notification to a channel I name.

**Step 4: Verification checklist**
Include this checklist in the plan, each item with the command or test that proves it:
- [ ] Staging deploys with exactly the production process
- [ ] Rollback tested in staging and confirmed working
- [ ] Health checks cover critical paths, not only `/health` returning 200
- [ ] Monitoring dashboards show deploy markers
- [ ] The team knows how to trigger a manual rollback
- [ ] Deploy runbook documented in the repo
````

## Tips

- Start with rolling deploys; move to blue-green or canary when traffic or risk justifies the complexity.
- The `canary` skill implements gradual rollout; `setup-deploy` configures common deploy targets.
- `/ccc-deploy-check` gates a release, `/ccc-deploy` deploys and verifies the live URL, and `/ccc-rollback` reverts a bad release; each deploy needs your authorization. `/loop` can watch error rates during a canary window.

## Example

````
Design a deployment strategy for this service.

**Service:** SaaS API serving 500 customers, handles payments and user data
**Infrastructure:** AWS ECS (Fargate) + ALB + RDS PostgreSQL
**Current deploy process:** Manual `aws ecs update-service` after pushing image to ECR
**Traffic volume:** ~200 req/sec peak, 50 req/sec average
**Acceptable risk tolerance:** Low — handles financial data
````
