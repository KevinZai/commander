---
name: deploy-strategy
category: devops
skills: [setup-deploy, senior-devops, canary]
mode: plan
estimated_tokens: 600
---

# Deployment Strategy

## When to Use
When choosing and implementing a deployment strategy for a production service. Use this when moving beyond manual deploys to something that supports zero-downtime releases and safe rollbacks.

## Template

```
Design a deployment strategy for this service. Prioritize zero-downtime deploys with fast rollback.

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
Evaluate and recommend one:

| Strategy | Zero-downtime | Rollback speed | Complexity | Best for |
|---|---|---|---|---|
| **Rolling** | Yes | Medium (redeploy) | Low | Stateless services, small teams |
| **Blue-green** | Yes | Instant (DNS/LB swap) | Medium | Critical services, fast rollback need |
| **Canary** | Yes | Fast (route shift) | High | High-traffic services, gradual validation |
| **Feature flags** | N/A | Instant (toggle) | Medium | Feature-level control, A/B testing |
| **Recreate** | No | Slow (redeploy) | Low | Dev/staging only |

**Step 2: Implementation plan**
For the chosen strategy:

**Infrastructure setup:**
- Load balancer configuration
- Health check endpoints (what they check, timeout, threshold)
- DNS / routing configuration
- Artifact storage (Docker registry, S3, etc.)

**Deploy process:**
1. Build artifact (Docker image, binary, bundle)
2. Run smoke tests against the artifact
3. Deploy to target environment
4. Run health checks
5. Shift traffic (gradually or all-at-once)
6. Monitor error rates and latency
7. Complete or rollback

**Rollback process:**
1. Detect failure (automated or manual)
2. Revert traffic to previous version
3. Investigate root cause
4. Fix and re-deploy

**Step 3: Automation**
- CI/CD integration (link to `ci-cd-pipeline` template)
- Automated health checks post-deploy
- Automated rollback triggers (error rate > X%, latency > Yms)
- Notification on deploy success/failure

**Step 4: Verification checklist**
- [ ] Deploy to staging mirrors production process exactly
- [ ] Rollback tested and confirmed working
- [ ] Health checks cover critical paths (not just `/health` returning 200)
- [ ] Monitoring dashboards show deploy markers
- [ ] Team knows how to trigger manual rollback
- [ ] Deploy runbook documented
```

## Tips
- Use the `canary` skill for gradual rollout implementation
- The `setup-deploy` skill automates common deployment configurations
- Start with rolling deploys — upgrade to blue-green or canary only when traffic justifies the complexity

## Example

```
Design a deployment strategy for this service.

**Service:** SaaS API serving 500 customers, handles payments and user data
**Infrastructure:** AWS ECS (Fargate) + ALB + RDS PostgreSQL
**Current deploy process:** Manual `aws ecs update-service` after pushing image to ECR
**Traffic volume:** ~200 req/sec peak, 50 req/sec average
**Acceptable risk tolerance:** Low — handles financial data
```
