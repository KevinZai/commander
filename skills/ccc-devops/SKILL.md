---
name: ccc-devops
description: "Route DevOps work to the right sub-skill: CI/CD pipelines, zero-downtime deploys, containers, AWS, Terraform, monitoring and alerting, networking, security hardening and runbooks. Use when the user is building, deploying, hardening or observing infrastructure."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[cicd | deploy | containers | aws | terraform | monitoring | security | network | runbook]"
model: inherit
effort: medium
---

# /ccc-devops — DevOps work, routed

**CC Commander** · ccc-devops · one router that loads the DevOps sub-skill, or short chain of them, the job needs.

Each sub-skill lives in its own directory beside this file. Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` (on Codex, the same path relative to this file) and follow it. Some sub-skills ship helper scripts under their own `scripts/` directory; their SKILL.md names them. The user's selected model is preserved.

Codex: ask each picker as a plain-text question with the same options.

## Sub-skills

| Group | Sub-skill | Use for |
|---|---|---|
| Routing | `devops-router` | Decision tree for requests that match nothing below |
| Foundation | `senior-devops` | Pipeline setup, infrastructure automation, deployment management across AWS, GCP, Azure |
| Deployment | `zero-downtime-deploy` | Blue-green, canary, rolling updates, migrations, feature flags, automated rollback |
| Deployment | `infra-runbook` | Incident diagnosis and recovery runbooks |
| CI/CD | `cicd-pipeline-generator` | GitHub Actions and GitLab CI pipelines: caching, parallel tests, environments |
| CI/CD | `github-actions-security` | Secrets, OIDC, permissions hardening, supply-chain defense |
| CI/CD | `github-actions-reusable-workflows` | `workflow_call`, composite actions, matrix strategies |
| Containers | `docker-development` | Dockerfile optimization, multi-stage builds, compose |
| Containers | `container-security` | Image hardening, vulnerability scanning, runtime policy |
| AWS | `aws-solution-architect` | Architecture and service selection, serverless and IaC templates |
| AWS | `aws-lambda-best-practices` | Function design, cold starts, layers, VPC, cost |
| AWS | `aws-s3-patterns` | Bucket design, lifecycle, presigned URLs, replication, encryption |
| AWS | `aws-cloudfront-optimization` | Cache policies, origin access, Lambda@Edge |
| AWS | `aws-iam-security` | Least-privilege policies, roles, OIDC, permission boundaries, SCPs |
| Infrastructure as code | `terraform-patterns` | Modules, remote state, workspaces, drift detection, imports |
| Monitoring | `prometheus-configuration` | Scrape configs, recording rules, service discovery |
| Monitoring | `grafana-dashboards` | Dashboard JSON, panels, variables, provisioning |
| Monitoring | `promql-alerting` | PromQL, alert rules, SLO-based alerting |
| Monitoring | `performance-monitoring` | APM, RUM, Core Web Vitals, profiling, error tracking |
| Networking | `network-engineer` | VPCs, DNS, load balancing, service mesh, zero-trust |

Per-intent routing, "don't confuse with" pairs and campaign chains: [references/routing.md](references/routing.md).

## When to use / when not to

- Use for pipelines, deploy strategy, containers, cloud architecture, Terraform, observability, network design, infrastructure hardening and incident runbooks.
- Use `ccc-security` for application-level security review, `ccc-testing` for test strategy, `ccc-saas` for application architecture.

## What happens

1. **Detect the toolchain.** Run in one Bash call, silent on failure:

   ```bash
   ls .github/workflows .gitlab-ci.yml Dockerfile docker-compose.yml compose.yaml serverless.yml template.yaml cdk.json prometheus.yml 2>/dev/null
   ls *.tf terraform 2>/dev/null | head -5
   git remote get-url origin 2>/dev/null
   ```

   Report one line: `🏗️ Toolchain: <CI, containers, IaC, cloud detected | none detected>`.

2. **Confirm constraints.** For infrastructure work, confirm the cloud provider, toolchain and environment (dev, staging, production) before proceeding. Ask only for what step 1 did not answer.

3. **Route.** An argument or a clear intent picks the sub-skill or chain from [references/routing.md](references/routing.md). Otherwise ask with AskUserQuestion (header "DevOps"), recommended first. Recommend CI/CD when step 1 found no pipeline; recommend Containers or cloud when a pipeline exists but no Dockerfile or IaC:

   - 🟢 CI/CD pipeline — `cicd-pipeline-generator` + `github-actions-security`
   - Deploy strategy — `zero-downtime-deploy` + `senior-devops`
   - Containers or cloud infra — `docker-development`, `terraform-patterns`, the AWS sub-skills
   - Something else — a follow-up picker with monitoring, security hardening, networking and runbooks

4. **Load and run.** Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` for each step of the chain and follow it.

5. **Verify locally, without touching live infrastructure.** Run whichever apply to the change, then `git status --short`:

   ```bash
   terraform fmt -check && terraform validate      # Terraform
   terraform plan -out=tfplan                       # only with the user's credentials already configured; never apply
   docker build -t local-check .                    # Dockerfile
   command -v actionlint >/dev/null && actionlint   # GitHub Actions
   promtool check config prometheus.yml             # Prometheus, when promtool is installed
   ```

   On failure, report the output and fix before continuing. When a tool is not installed, say so instead of claiming the check passed.

## Done when

- Every validation command that applies to the change ran in this turn and its result is reported.
- `git status --short` lists only the files the task meant to touch.
- A plan (`terraform plan`, deploy strategy) is presented as a plan; nothing was applied.

## Guardrails

- Never run `terraform apply`, `kubectl apply`, `helm upgrade`, a cloud CLI write (`aws ... create|delete|put|update`), a deploy, or a push that triggers one without authorization in this conversation; ask with a picker at that step.
- Never write secrets, keys or tokens into workflow files, Dockerfiles, Terraform or runbooks; use the platform's secret store or OIDC.
- Never widen IAM permissions, open security groups to `0.0.0.0/0`, or disable branch protection to make something work.
- Never print environment dumps or secret-bearing output while diagnosing.

## See also

- `ccc-security` — application security review
- `ccc-testing` — tests the pipeline runs
- `ccc-saas` — application architecture behind the infrastructure
