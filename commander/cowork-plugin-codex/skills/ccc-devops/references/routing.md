# /ccc-devops routing reference

Each specialist is a playbook at `skills/ccc-devops/<specialist>/SKILL.md` in the Commander repository or the installed CLI toolkit. The hub loads one at a time (SKILL.md step 3).

## Specialists

| Category | Specialist | Scope |
|---|---|---|
| Foundation | `devops-router` | Routes a DevOps task to the right specialist |
| Foundation | `senior-devops` | Pipelines, Terraform scaffolding, deployment management across AWS/GCP/Azure |
| Deployment | `zero-downtime-deploy` | Blue-green, canary, rolling updates, database migrations, feature flags, automated rollback |
| Deployment | `infra-runbook` | Incident response procedures, escalation paths, recovery playbooks |
| CI/CD | `cicd-pipeline-generator` | GitHub Actions and GitLab CI pipelines: caching, parallel tests, environment deploys, secrets |
| CI/CD | `github-actions-security` | Secrets, OIDC, least-privilege `permissions`, pinned actions, supply-chain defense |
| CI/CD | `github-actions-reusable-workflows` | `workflow_call`, composite actions, matrix strategies, org-wide templates |
| Containers | `docker-development` | Multi-stage Dockerfiles, compose, layer caching |
| Containers | `container-security` | Image hardening, vulnerability scanning, runtime policies, non-root |
| AWS | `aws-solution-architect` | Well-Architected design, service selection, cost optimization |
| AWS | `aws-lambda-best-practices` | Cold starts, layers, VPC config, concurrency, event sources |
| AWS | `aws-s3-patterns` | Bucket policies, lifecycle, replication, presigned URLs, encryption |
| AWS | `aws-cloudfront-optimization` | Cache policies, origin access, Lambda@Edge, invalidation |
| AWS | `aws-iam-security` | Least-privilege policies, role assumption, permission boundaries, SCPs |
| Monitoring | `prometheus-configuration` | Scrape configs, service discovery, recording rules |
| Monitoring | `grafana-dashboards` | Dashboard JSON, panel queries, variables, provisioning |
| Monitoring | `promql-alerting` | Alert rules, SLO-based alerting, silencing |
| Monitoring | `performance-monitoring` | APM, RUM, Core Web Vitals, profiling, performance budgets |
| IaC | `terraform-patterns` | Modules, remote state, workspaces, drift detection, imports |
| Networking | `network-engineer` | VPCs, DNS, load balancing, service mesh, zero-trust |

## Routing matrix

| Intent | Route to | Not to be confused with |
|---|---|---|
| "Deploy with zero downtime" / "blue-green" / "canary" | `zero-downtime-deploy` + `senior-devops` | `cicd-pipeline-generator` (build pipeline, not deploy strategy) |
| "Set up CI/CD" / "GitHub Actions pipeline" | `cicd-pipeline-generator` + `github-actions-security` | `github-actions-reusable-workflows` (templates, not a full pipeline) |
| "Reusable workflow" / "composite action" | `github-actions-reusable-workflows` | `cicd-pipeline-generator` (project-specific pipeline) |
| "Containerize" / "Dockerfile" / "compose" | `docker-development` + `container-security` | `zero-downtime-deploy` (deployment, not containerization) |
| "Container security" / "image scanning" | `container-security` | `docker-development` (building, not securing) |
| "AWS architecture" / "which AWS services" | `aws-solution-architect` | the service-specific AWS specialists |
| "Lambda" / "serverless" | `aws-lambda-best-practices` | `aws-solution-architect` (broader architecture) |
| "S3 bucket" / "object storage" | `aws-s3-patterns` | `aws-cloudfront-optimization` (edge, not origin) |
| "CDN" / "CloudFront" / "edge caching" | `aws-cloudfront-optimization` | `aws-s3-patterns` (origin, not edge) |
| "IAM" / "permissions" / "roles" | `aws-iam-security` | `github-actions-security` (CI secrets, not IAM) |
| "Prometheus" / "metrics collection" | `prometheus-configuration` + `performance-monitoring` | `grafana-dashboards` (visualization) |
| "Grafana dashboard" | `grafana-dashboards` | `prometheus-configuration` (data source) |
| "Alerting" / "PromQL" | `promql-alerting` | `performance-monitoring` (broader monitoring) |
| "APM" / "Core Web Vitals" / "RUM" | `performance-monitoring` | `prometheus-configuration` (infrastructure metrics) |
| "Incident response" / "runbook" | `infra-runbook` | `promql-alerting` (alerting, not response) |
| "Terraform" / "IaC" | `terraform-patterns` + `senior-devops` | `aws-solution-architect` (architecture, not IaC) |
| "Networking" / "VPC" / "DNS" / "service mesh" | `network-engineer` | `aws-solution-architect` (broader scope) |
| "Security audit" / "harden infrastructure" | `container-security` + `aws-iam-security` + `github-actions-security` | `infra-runbook` (response, not prevention); `/ccc-harden` for hosting and SaaS-account settings |

## Campaigns

Run the steps in order; each step's output feeds the next. Every step that applies to a shared environment needs the user's yes.

### CI/CD pipeline setup
1. `cicd-pipeline-generator` — scaffold lint, test, build, deploy stages
2. `github-actions-security` — harden secrets, OIDC, pin action versions
3. `github-actions-reusable-workflows` — extract shared pieces when more than one repo uses them
4. `docker-development` — optimize container builds with layer caching
5. `container-security` — scan images in CI, enforce non-root
6. Deliver: a working pipeline with security gates; verify with `actionlint` and a branch run

### Production deployment
1. `zero-downtime-deploy` — choose blue-green, canary or rolling
2. `senior-devops` — orchestrate with rollback support
3. `docker-development` — production Dockerfile
4. `aws-solution-architect` — validate the target infrastructure (when on AWS)
5. `performance-monitoring` — APM and health checks
6. `infra-runbook` — rollback and incident procedures
7. Deliver: deploy plan, health checks and runbook; the deploy itself runs through `/ccc-deploy`

### Monitoring stack
1. `prometheus-configuration` — scrape targets and recording rules
2. `grafana-dashboards` — infrastructure and application dashboards
3. `promql-alerting` — alert rules with severity routing
4. `performance-monitoring` — APM, RUM, Core Web Vitals
5. `infra-runbook` — alert response procedures
6. Deliver: metrics to incident response; verify with `promtool check config` and `promtool check rules`

### Security hardening
1. `aws-iam-security` — tighten IAM to least privilege
2. `container-security` — harden images, scan, enforce runtime policies
3. `github-actions-security` — remove long-lived credentials, configure OIDC
4. `network-engineer` — segment networks, zero-trust, WAF
5. `infra-runbook` — security incident procedures
6. Deliver: defense-in-depth changes, each with its rollback

### AWS infrastructure build
1. `aws-solution-architect` — Well-Architected design
2. `terraform-patterns` — modular IaC
3. `aws-iam-security` — least-privilege access
4. `aws-lambda-best-practices` — serverless components
5. `aws-s3-patterns` — storage, lifecycle, replication
6. `aws-cloudfront-optimization` — CDN cache behaviors
7. `network-engineer` — VPCs, subnets, security groups
8. Deliver: IaC with `terraform plan` output; `apply` only on the user's yes

### Terraform module library
1. `terraform-patterns` — module structure and versioning
2. `aws-solution-architect` — validate architectural decisions
3. `senior-devops` — integrate with the deploy pipeline
4. `cicd-pipeline-generator` — `terraform plan` on PRs, `apply` behind an approval gate
5. Deliver: versioned modules with CI; verify with `terraform validate` and `terraform plan`
