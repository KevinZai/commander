---
name: ci-cd-pipeline
category: devops
skills: [github-actions-reusable-workflows, setup-deploy, senior-devops]
mode: code
estimated_tokens: 700
---

# CI/CD Pipeline Design

## When to Use
When setting up continuous integration and deployment from scratch, or when the existing pipeline needs a major overhaul. This template produces working pipeline configuration files.

## Template

```
Design and implement a CI/CD pipeline for this project. The pipeline must be fast, reliable, and secure.

**Project:**
{{project_path}}

**Stack:**
{{e.g., Next.js + PostgreSQL, Python FastAPI, Go microservice}}

**Hosting/Deploy target:**
{{Vercel|AWS|Railway|Fly.io|self-hosted|other}}

**CI platform:**
{{GitHub Actions|GitLab CI|other — or say "recommend one"}}

**Current state:**
{{no CI exists|basic CI exists but incomplete|full CI needs optimization}}

**Step 1: Pipeline design**
Design the pipeline stages:

```
trigger (push/PR) → lint → typecheck → test → build → deploy
```

| Stage | Runs on | Timeout | Depends on |
|---|---|---|---|
| **Lint** | PR + push to main | 2m | - |
| **Typecheck** | PR + push to main | 3m | - |
| **Unit tests** | PR + push to main | 5m | - |
| **Integration tests** | PR + push to main | 10m | typecheck |
| **Build** | PR + push to main | 5m | lint, typecheck, tests |
| **E2E tests** | push to main only | 15m | build |
| **Deploy staging** | push to main | 5m | e2e |
| **Deploy production** | manual trigger or tag | 5m | staging verified |

**Step 2: Implementation**
Read the project structure and create the pipeline config:
- Parallel jobs where possible (lint + typecheck + unit tests run simultaneously)
- Caching: node_modules, build artifacts, Docker layers
- Matrix strategy for multi-version testing if needed
- Secret management (no hardcoded values)
- Branch protection rules

**Step 3: Quality gates**
Configure these checks as required before merge:
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Lint passes with zero warnings
- [ ] Code coverage does not decrease
- [ ] No security vulnerabilities (npm audit)
- [ ] Build succeeds

**Step 4: Deploy configuration**
- Environment-specific configs (staging vs production)
- Rollback mechanism
- Health check after deploy
- Notification on success/failure (Slack, email, or GitHub)

**Step 5: Verify**
- Push a test commit and verify the pipeline runs
- Verify caching works (second run should be faster)
- Test failure handling (intentionally break a test, verify it blocks)
```

## Tips
- Use the `github-actions-reusable-workflows` skill for DRY workflow patterns
- The `setup-deploy` skill handles common deployment configurations
- Keep total pipeline time under 10 minutes — developers won't wait longer

## Example

```
Design and implement a CI/CD pipeline for this project.

**Project:** /Users/me/projects/my-saas
**Stack:** Next.js 14 + Prisma + PostgreSQL
**Hosting:** Vercel (frontend) + Railway (database)
**CI platform:** GitHub Actions
**Current state:** No CI exists — just manual deploys via `vercel --prod`
```
