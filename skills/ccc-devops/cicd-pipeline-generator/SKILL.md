---
name: CI/CD Pipeline Generator
description: "CI/CD pipeline generation — GitHub Actions, GitLab CI, caching, parallel tests, environment-based deployments, and secret management."
version: 1.0.0
category: ci-cd
parent: ccc-devops
---

# CI/CD Pipeline Generator

> Scaffold production-grade CI/CD pipelines. GitHub Actions workflows, GitLab CI templates, caching strategies, and environment-based deployments — generated for your stack.

## Use this skill when

- Setting up a CI/CD pipeline from scratch
- Migrating between CI/CD platforms (GitHub Actions, GitLab CI, CircleCI)
- Optimizing slow pipelines with caching and parallelism
- Adding deployment stages to existing build pipelines
- Configuring environment-based deployments (staging, production)

## Do not use this skill when

- Securing an existing pipeline (use `github-actions-security`)
- Making workflows reusable across repos (use `github-actions-reusable-workflows`)
- Deploying with zero-downtime strategies (use `zero-downtime-deploy`)

---

## Pipeline Architecture

Every pipeline follows the same logical stages, regardless of platform:

```
┌────────┐    ┌────────┐    ┌────────┐    ┌──────────┐    ┌────────┐
│  Lint  │───▶│  Test  │───▶│ Build  │───▶│ Security │───▶│ Deploy │
└────────┘    └────────┘    └────────┘    └──────────┘    └────────┘
   ▲             ▲              ▲              ▲              ▲
   │             │              │              │              │
 ESLint     Unit+Integ    Docker/Build    Trivy/Snyk    Env-based
 Prettier   Coverage      Artifacts      SAST/DAST     Approvals
 TypeCheck  Parallel                     License       Rollback
```

---

## GitHub Actions — Full Pipeline

### Node.js / TypeScript

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  packages: write
  id-token: write  # OIDC

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Format check
        run: npx prettier --check .

  test:
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npx vitest --reporter=verbose --coverage --shard=${{ matrix.shard }}/4
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/

  coverage-merge:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Download coverage artifacts
        uses: actions/download-artifact@v4
        with:
          pattern: coverage-*
          merge-multiple: true
          path: coverage/

      - name: Check coverage threshold
        run: |
          COVERAGE=$(npx c8 report --reporter=text-summary | grep 'Lines' | awk '{print $3}' | tr -d '%')
          echo "Coverage: ${COVERAGE}%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage ${COVERAGE}% is below 80% threshold"
            exit 1
          fi

  build:
    runs-on: ubuntu-latest
    needs: test
    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  security:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name != 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_STAGING }}
          aws-region: us-east-1

      - name: Deploy to staging
        run: |
          aws ecs update-service \
            --cluster staging \
            --service app \
            --task-definition app \
            --force-new-deployment

      - name: Wait for deployment
        run: aws ecs wait services-stable --cluster staging --services app

      - name: Smoke test
        run: |
          for i in {1..10}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.example.com/health)
            if [ "$STATUS" = "200" ]; then
              echo "Staging is healthy"
              exit 0
            fi
            sleep 5
          done
          echo "Staging health check failed"
          exit 1

  deploy-production:
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_PRODUCTION }}
          aws-region: us-east-1

      - name: Deploy to production
        run: |
          aws ecs update-service \
            --cluster production \
            --service app \
            --task-definition app \
            --force-new-deployment

      - name: Wait for deployment
        run: aws ecs wait services-stable --cluster production --services app

      - name: Production smoke test
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://app.example.com/health)
          if [ "$STATUS" != "200" ]; then
            echo "Production health check failed — initiating rollback"
            aws ecs update-service \
              --cluster production \
              --service app \
              --task-definition app:${{ env.PREVIOUS_TASK_DEF }}
            exit 1
          fi

      - name: Notify deployment
        if: success()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-Type: application/json' \
            -d '{"text":"Deployed ${{ github.sha }} to production"}'
```

---

## GitLab CI — Full Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - build
  - security
  - deploy

variables:
  NODE_VERSION: "20"
  DOCKER_TLS_CERTDIR: "/certs"

.node-cache: &node-cache
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules/
    policy: pull

lint:
  stage: lint
  image: node:${NODE_VERSION}-alpine
  <<: *node-cache
  cache:
    policy: pull-push  # first job creates cache
  script:
    - npm ci
    - npm run lint
    - npx tsc --noEmit
    - npx prettier --check .

test:
  stage: test
  image: node:${NODE_VERSION}-alpine
  <<: *node-cache
  services:
    - postgres:16-alpine
    - redis:7-alpine
  variables:
    POSTGRES_DB: testdb
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@postgres:5432/testdb
    REDIS_URL: redis://redis:6379
  parallel: 4
  script:
    - npm ci
    - npx vitest --coverage --shard=${CI_NODE_INDEX}/${CI_NODE_TOTAL}
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build
        --cache-from $CI_REGISTRY_IMAGE:latest
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        --tag $CI_REGISTRY_IMAGE:latest
        .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest

security-scan:
  stage: security
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --severity CRITICAL,HIGH --exit-code 1 $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  allow_failure: false

deploy-staging:
  stage: deploy
  environment: staging
  only:
    - develop
  script:
    - echo "Deploying to staging..."
    # Add your deployment commands here

deploy-production:
  stage: deploy
  environment: production
  only:
    - main
  when: manual  # require manual approval
  script:
    - echo "Deploying to production..."
    # Add your deployment commands here
```

---

## Caching Strategies

### Node.js — npm cache

```yaml
# GitHub Actions
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # auto-caches ~/.npm

# For monorepos with workspaces
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
      packages/*/node_modules
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-${{ runner.os }}-
```

### Docker layer caching

```yaml
# GitHub Actions — BuildKit cache
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max

# For self-hosted runners — local cache
- uses: docker/build-push-action@v5
  with:
    cache-from: type=local,src=/tmp/.buildx-cache
    cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max

# Prevent cache growth
- name: Rotate cache
  run: |
    rm -rf /tmp/.buildx-cache
    mv /tmp/.buildx-cache-new /tmp/.buildx-cache
```

### Terraform provider cache

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.terraform.d/plugin-cache
    key: terraform-${{ runner.os }}-${{ hashFiles('**/.terraform.lock.hcl') }}

- name: Terraform init with plugin cache
  run: terraform init -plugin-dir=~/.terraform.d/plugin-cache
```

---

## Parallel Test Execution

### Vitest sharding

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npx vitest --shard=${{ matrix.shard }}/4
```

### Playwright sharding

```yaml
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}
```

### pytest parallel

```yaml
strategy:
  matrix:
    group: [1, 2, 3, 4]
steps:
  - run: pytest --splits 4 --group ${{ matrix.group }} --splitting-algorithm least_duration
```

---

## Branch Protection Rules

```bash
# Configure via GitHub CLI
gh api repos/{owner}/{repo}/rulesets -X POST --input - <<'EOF'
{
  "name": "main-protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [
          { "context": "lint" },
          { "context": "test" },
          { "context": "security-scan" }
        ],
        "strict_required_status_checks_policy": true
      }
    },
    { "type": "required_linear_history" },
    { "type": "deletion" }
  ]
}
EOF
```

---

## Secret Management in CI

### GitHub Actions — OIDC (no long-lived credentials)

```yaml
permissions:
  id-token: write   # required for OIDC
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/GitHubActions
      aws-region: us-east-1
      # No access key or secret key — OIDC handles it
```

### Environment-scoped secrets

```yaml
# Production secrets only available in production environment
deploy-production:
  environment: production  # gates access to production secrets
  steps:
    - run: echo "Using ${{ secrets.PROD_DATABASE_URL }}"
    # PROD_DATABASE_URL only available to jobs targeting 'production' environment
```

### Secret scanning prevention

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

---

## Deployment Notifications

```yaml
# Slack notification on deploy
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "${{ job.status == 'success' && ':white_check_mark:' || ':x:' }} *${{ github.repository }}* deployed to *${{ github.ref_name }}*\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View run>"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
    SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

## Pipeline Optimization Checklist

- [ ] Caching enabled for package manager (npm, pip, cargo)
- [ ] Docker builds use BuildKit cache (`type=gha` or `type=local`)
- [ ] Tests run in parallel (sharding or matrix)
- [ ] `concurrency` configured to cancel superseded runs
- [ ] OIDC configured for cloud credentials (no long-lived secrets)
- [ ] Environment-based deployment with manual approval for production
- [ ] Security scanning (Trivy, TruffleHog) before deploy
- [ ] Branch protection requires CI to pass
- [ ] Deployment notifications sent to team channel
- [ ] Coverage thresholds enforced (80% minimum)
