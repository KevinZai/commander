---
name: ci-cd-pipeline
category: devops
skills: [github-actions-reusable-workflows, setup-deploy, senior-devops]
mode: code
estimated_tokens: 700
---

# CI/CD Pipeline Design

## When to use

Use it to set up continuous integration and deployment from scratch, or to overhaul a pipeline that is slow, flaky or incomplete. The output is working pipeline configuration committed to the project, not a design document.

## Template

````
Design and implement a CI/CD pipeline for this project. Make it fast, reliable and secure.

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
Read the project's build, test and lint scripts first, then propose these stages. Adjust timeouts to the measured duration of each script.

    trigger (push/PR) → lint → typecheck → test → build → deploy

| Stage | Runs on | Timeout | Depends on |
|---|---|---|---|
| Lint | PR + push to main | 2m | - |
| Typecheck | PR + push to main | 3m | - |
| Unit tests | PR + push to main | 5m | - |
| Integration tests | PR + push to main | 10m | typecheck |
| Build | PR + push to main | 5m | lint, typecheck, tests |
| E2E tests | push to main only | 15m | build |
| Deploy staging | push to main | 5m | e2e |
| Deploy production | manual trigger or tag | 5m | staging verified |

**Step 2: Implementation**
Create the pipeline config in the CI platform's standard location:
- Run lint, typecheck and unit tests as parallel jobs.
- Cache dependencies, build artifacts and Docker layers, keyed on the lockfile.
- Add a matrix strategy only when the project supports more than one runtime version.
- Read every secret from the CI platform's secret store; hardcode none.
- Pin third-party actions or images to a version or commit SHA.
- Write down the branch protection rules to apply; apply them only with my approval.

**Step 3: Quality gates**
Make these checks required before merge:
- [ ] All tests pass
- [ ] Typecheck passes without errors
- [ ] Lint passes with zero warnings
- [ ] Code coverage does not decrease
- [ ] Dependency audit (`npm audit` or the stack's equivalent) reports no high or critical vulnerabilities
- [ ] Build succeeds

**Step 4: Deploy configuration**
- Separate staging and production configuration and secrets.
- Define the rollback mechanism and the exact command or UI action that triggers it.
- Run a health check against the deployed URL after every deploy and fail the job if it does not pass.
- Report success or failure through a channel I name (Slack, email or GitHub status).

**Step 5: Verify**
Ask before pushing a commit, opening a PR or triggering a deploy. After approval:
- Push a test commit or open a draft PR and confirm every stage runs.
- Re-run it and confirm the cache hits (the second run is faster).
- Break one test on a throwaway branch and confirm the pipeline blocks the merge.
Report each result with the run URL or log excerpt.
````

## Tips

- The `github-actions-reusable-workflows` skill covers DRY workflow patterns; `setup-deploy` covers common deploy targets.
- `/ccc-ci` diagnoses a failing pipeline once this one exists; `/ccc-deploy-check` runs the pre-deploy gate.
- Keep total pipeline time under ten minutes; longer pipelines get bypassed.

## Example

````
Design and implement a CI/CD pipeline for this project.

**Project:** ./my-saas
**Stack:** Next.js + Prisma + PostgreSQL
**Hosting:** Vercel (frontend) + Railway (database)
**CI platform:** GitHub Actions
**Current state:** No CI exists — just manual deploys via `vercel --prod`
````
