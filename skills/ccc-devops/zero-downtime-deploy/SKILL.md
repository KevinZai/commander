---
name: Zero-Downtime Deploy
description: "Zero-downtime deployment strategies — blue-green, canary, rolling updates, database migrations, feature flags, and automated rollback."
version: 1.0.0
category: deployment
parent: ccc-devops
---

# Zero-Downtime Deploy

> Ship to production without dropping a single request. Blue-green, canary, rolling updates — with automated rollback when things go wrong.

## Use this skill when

- Deploying to production with zero-downtime requirements
- Choosing between blue-green, canary, and rolling update strategies
- Running database migrations without service interruption
- Implementing automated rollback on failed deployments
- Decoupling deploys from feature releases using feature flags

## Do not use this skill when

- Setting up CI/CD pipelines (use `cicd-pipeline-generator`)
- Building Docker images (use `docker-development`)
- First-time infrastructure setup (use `terraform-patterns` + `aws-solution-architect`)

---

## Strategy Selection

```
Which strategy fits your situation?
│
├── Need instant rollback + simple setup?
│   └── Blue-Green — two identical environments, switch traffic atomically
│
├── Need gradual rollout + risk mitigation?
│   └── Canary — route a percentage of traffic to the new version
│
├── Running Kubernetes or Docker Swarm?
│   └── Rolling Update — replace instances one at a time
│
└── Not sure?
    └── Start with Blue-Green. It's the simplest to reason about.
```

---

## Blue-Green Deployments

Two identical environments (blue = current, green = new). Deploy to green, verify, switch traffic.

### Architecture

```
                    ┌─────────────┐
                    │  Load       │
                    │  Balancer   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐     ┌─────────▼────────┐
     │   Blue (live)   │     │  Green (staged)   │
     │   v1.2.3        │     │  v1.2.4           │
     │   ● ● ●         │     │  ○ ○ ○            │
     └─────────────────┘     └──────────────────┘
```

### Implementation — AWS ALB

```bash
# Deploy new version to green target group
aws ecs update-service \
  --cluster production \
  --service app-green \
  --task-definition app:42 \
  --desired-count 3

# Wait for green to stabilize
aws ecs wait services-stable \
  --cluster production \
  --services app-green

# Run health checks against green
curl -f https://green.internal.example.com/health || exit 1

# Switch ALB listener to green target group
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$GREEN_TG_ARN

# Rollback: switch back to blue
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$BLUE_TG_ARN
```

### Implementation — Nginx

```nginx
# /etc/nginx/conf.d/deploy.conf
upstream app_blue {
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

upstream app_green {
    server 10.0.2.10:3000;
    server 10.0.2.11:3000;
}

# Switch by changing this single line
upstream app_live {
    server 10.0.1.10:3000;  # blue
    server 10.0.1.11:3000;  # blue
}

server {
    listen 80;
    location / {
        proxy_pass http://app_live;
    }
}
```

### Rollback procedure
1. Detect failure (health check, error rate spike, latency increase)
2. Switch load balancer back to blue target group
3. Traffic restores to previous version within seconds
4. Investigate green environment at leisure — no user impact

---

## Canary Releases

Route a small percentage of traffic to the new version. Gradually increase if metrics look good.

### Traffic Splitting — Kubernetes

```yaml
# Istio VirtualService for canary traffic splitting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-canary
spec:
  hosts:
    - app.example.com
  http:
    - route:
        - destination:
            host: app-stable
            port:
              number: 80
          weight: 95
        - destination:
            host: app-canary
            port:
              number: 80
          weight: 5
```

### Progressive Rollout with Flagger

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: app
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  progressDeadlineSeconds: 600
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5        # max failed checks before rollback
    maxWeight: 50       # max traffic to canary
    stepWeight: 10      # increase by 10% each interval
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500       # ms
        interval: 1m
```

### Canary Promotion Stages

| Stage | Traffic % | Duration | Gate |
|-------|-----------|----------|------|
| Deploy | 0% | — | Image pulled, containers healthy |
| Smoke test | 0% | 2 min | Synthetic tests pass against canary |
| Shadow | 5% | 10 min | Error rate < 0.1%, p99 < 500ms |
| Limited | 25% | 15 min | Error rate < 0.05%, no new error types |
| Broad | 50% | 15 min | Same metrics as stable baseline |
| Full | 100% | — | Promote canary to stable |

---

## Rolling Updates

Replace instances one at a time. Native to Kubernetes and Docker Swarm.

### Kubernetes Rolling Update

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # 2 extra pods during update
      maxUnavailable: 1   # at most 1 pod down
  template:
    spec:
      containers:
        - name: app
          image: app:1.2.4
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]  # drain connections
      terminationGracePeriodSeconds: 30
```

### Docker Swarm Rolling Update

```yaml
# docker-compose.yml (Swarm mode)
services:
  app:
    image: app:1.2.4
    deploy:
      replicas: 6
      update_config:
        parallelism: 2        # update 2 at a time
        delay: 30s            # wait 30s between batches
        failure_action: rollback
        monitor: 60s          # monitor for 60s after each batch
        order: start-first    # start new before stopping old
      rollback_config:
        parallelism: 0        # rollback all at once
        order: start-first
```

---

## Database Migrations Without Downtime

The expand-contract pattern: never make breaking schema changes in a single deploy.

### Phase 1: Expand (backward-compatible changes)

```sql
-- Add new column (nullable, no default constraint)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;

-- Add new index concurrently (PostgreSQL)
CREATE INDEX CONCURRENTLY idx_users_email_verified ON users (email_verified);
```

### Phase 2: Migrate (backfill data, dual-write)

```typescript
// Application code writes to BOTH old and new columns
async function updateUser(id: string, data: UpdateUserDTO) {
  return db.user.update({
    where: { id },
    data: {
      ...data,
      email_verified: data.emailVerified ?? false,  // new column
      is_verified: data.emailVerified ?? false,       // old column (keep in sync)
    },
  });
}

// Background job: backfill existing rows
async function backfillEmailVerified() {
  await db.$executeRaw`
    UPDATE users
    SET email_verified = is_verified
    WHERE email_verified IS NULL
  `;
}
```

### Phase 3: Contract (remove old column)

```sql
-- Only after ALL application instances use the new column
-- and backfill is complete
ALTER TABLE users DROP COLUMN is_verified;
```

### Migration Safety Rules
1. Never rename a column — add new, migrate data, drop old
2. Never change a column type in-place — add new column with new type
3. Never add a NOT NULL constraint without a default — add nullable first, backfill, then add constraint
4. Always use `CREATE INDEX CONCURRENTLY` in PostgreSQL
5. Deploy application changes BEFORE schema changes that remove old fields
6. Deploy schema changes that add new fields BEFORE application changes that use them

---

## Feature Flags for Deploy Decoupling

Separate deployment (code reaches production) from release (users see the feature).

```typescript
// Feature flag check — deploy code without activating
if (featureFlags.isEnabled('new-checkout-flow', { userId: user.id })) {
  return renderNewCheckout();
}
return renderClassicCheckout();

// Progressive rollout via feature flag
const flags = {
  'new-checkout-flow': {
    type: 'percentage',
    percentage: 10,        // 10% of users
    allowlist: ['staff'],  // always on for staff
  },
};
```

### Feature Flag Lifecycle
1. **Create** flag with `off` default
2. **Deploy** code behind flag — safely reaches production with no user impact
3. **Enable** for internal users / staff — validate in production
4. **Ramp** gradually — 1% → 5% → 25% → 50% → 100%
5. **Monitor** at each ramp step — error rates, latency, user feedback
6. **Remove** flag and dead code path after full rollout

---

## Health Check Integration

Every deployment strategy depends on reliable health checks.

```typescript
// Express health check endpoint
app.get('/health', (req, res) => {
  const checks = {
    database: checkDatabase(),
    redis: checkRedis(),
    diskSpace: checkDiskSpace(),
    memory: checkMemory(),
  };

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    checks,
  });
});

// Readiness check (can accept traffic?)
app.get('/ready', async (req, res) => {
  const dbReady = await db.$queryRaw`SELECT 1`;
  const cacheReady = await redis.ping();

  if (dbReady && cacheReady === 'PONG') {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});
```

---

## Automated Rollback Triggers

Define conditions that automatically trigger a rollback.

```yaml
# Rollback policy (conceptual — implement in your deploy script or Flagger)
rollback_triggers:
  - metric: error_rate
    threshold: 0.05        # > 5% error rate
    window: 5m
    action: immediate_rollback

  - metric: p99_latency_ms
    threshold: 2000         # p99 > 2 seconds
    window: 5m
    action: immediate_rollback

  - metric: health_check_failures
    threshold: 3            # 3 consecutive failures
    action: immediate_rollback

  - metric: cpu_usage_percent
    threshold: 90           # sustained > 90% CPU
    window: 10m
    action: pause_and_alert  # don't auto-rollback, but stop rollout

  - metric: memory_usage_percent
    threshold: 85
    window: 10m
    action: pause_and_alert
```

### Rollback Script

```bash
#!/bin/bash
set -euo pipefail

PREVIOUS_VERSION="${1:?Usage: rollback.sh <previous-version>}"
CLUSTER="production"
SERVICE="app"

echo "Rolling back to version ${PREVIOUS_VERSION}..."

# Get previous task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition "${SERVICE}:${PREVIOUS_VERSION}" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

# Update service to previous version
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$TASK_DEF" \
  --desired-count 3

# Wait for stability
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services "$SERVICE"

echo "Rollback complete. Service running ${PREVIOUS_VERSION}."

# Notify team
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"ROLLBACK: ${SERVICE} reverted to ${PREVIOUS_VERSION}\"}"
```

---

## Verification Checklist

Before any production deployment:

- [ ] Health check endpoint responds correctly (`/health`, `/ready`)
- [ ] Database migrations are backward-compatible (expand-contract)
- [ ] Rollback procedure is documented and tested
- [ ] Monitoring alerts are configured for error rate, latency, and health
- [ ] Feature flags are in place for risky changes
- [ ] Load testing confirms new version handles current traffic
- [ ] Deployment strategy matches risk tolerance (blue-green for safety, canary for gradual)
- [ ] Team is aware of the deploy window and rollback procedure
