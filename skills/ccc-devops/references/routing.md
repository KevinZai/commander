# ccc-devops — routing reference

Loaded by [../SKILL.md](../SKILL.md) when intent is specific or spans several sub-skills. Not shown to the user as a menu. For anything unmatched, read `devops-router/SKILL.md`.

## Routing matrix

| Intent | Route to | Don't confuse with |
|---|---|---|
| "Deploy with zero downtime" / "blue-green" / "canary" | `zero-downtime-deploy` + `senior-devops` | `cicd-pipeline-generator` (build pipeline, not deploy strategy) |
| "Set up CI/CD" / "GitHub Actions pipeline" | `cicd-pipeline-generator` + `github-actions-security` | `github-actions-reusable-workflows` (shared templates) |
| "Reusable workflow" / "composite action" | `github-actions-reusable-workflows` | `cicd-pipeline-generator` (project pipeline) |
| "Containerize" / "Dockerfile" / "Docker Compose" | `docker-development` + `container-security` | `zero-downtime-deploy` (deployment) |
| "Container security" / "image scanning" | `container-security` | `docker-development` (building, not securing) |
| "AWS architecture" / "which AWS services?" | `aws-solution-architect` | individual AWS sub-skills (service-specific) |
| "Lambda function" / "serverless" | `aws-lambda-best-practices` | `aws-solution-architect` (broader architecture) |
| "S3 bucket" / "object storage" | `aws-s3-patterns` | `aws-cloudfront-optimization` (CDN, not storage) |
| "CDN" / "CloudFront" / "edge caching" | `aws-cloudfront-optimization` | `aws-s3-patterns` (origin, not edge) |
| "IAM" / "permissions" / "roles" | `aws-iam-security` | `github-actions-security` (CI secrets) |
| "Prometheus" / "metrics collection" | `prometheus-configuration` + `performance-monitoring` | `grafana-dashboards` (visualization) |
| "Grafana dashboard" / "visualize metrics" | `grafana-dashboards` | `prometheus-configuration` (data source) |
| "Alerting" / "PromQL alerts" | `promql-alerting` | `performance-monitoring` (broader monitoring) |
| "APM" / "Core Web Vitals" / "RUM" | `performance-monitoring` | `prometheus-configuration` (infrastructure metrics) |
| "Incident response" / "runbook" | `infra-runbook` | `promql-alerting` (alerting, not response) |
| "Terraform" / "infrastructure as code" | `terraform-patterns` + `senior-devops` | `aws-solution-architect` (architecture, not IaC) |
| "Networking" / "VPC" / "DNS" / "service mesh" | `network-engineer` | `aws-solution-architect` (broader scope) |
| "Security audit" / "harden infrastructure" | `container-security` + `aws-iam-security` + `github-actions-security` | `infra-runbook` (response, not prevention) |

## Campaign chains

Run one sub-skill per step and run the SKILL.md step 5 checks between steps that change files. Nothing in a chain applies changes to live infrastructure without authorization.

**CI/CD pipeline setup**

1. `cicd-pipeline-generator` — lint, test, build and deploy stages
2. `github-actions-security` — secrets, pinned action versions, OIDC
3. `github-actions-reusable-workflows` — extract shared components
4. `docker-development` — layer caching for container builds
5. `container-security` — image scanning in CI, non-root images

**Production deployment**

1. `zero-downtime-deploy` — choose blue-green, canary or rolling
2. `senior-devops` — orchestration with rollback support
3. `docker-development` — production Dockerfile
4. `aws-solution-architect` — validate the infrastructure design
5. `performance-monitoring` — APM and health checks
6. `infra-runbook` — rollback and incident procedures

**Monitoring stack**

1. `prometheus-configuration` — scrape targets and recording rules
2. `grafana-dashboards` — infrastructure and application dashboards
3. `promql-alerting` — alert rules with severity and routing
4. `performance-monitoring` — APM, RUM, Core Web Vitals
5. `infra-runbook` — alert response procedures

**Security hardening**

1. `aws-iam-security` — least-privilege audit
2. `container-security` — image hardening, vulnerability scans, runtime policy
3. `github-actions-security` — OIDC, remove long-lived credentials
4. `network-engineer` — zero-trust networking, VPC segmentation, WAF
5. `infra-runbook` — security incident procedures

**AWS infrastructure build**

1. `aws-solution-architect` — Well-Architected design
2. `terraform-patterns` — modular infrastructure as code
3. `aws-iam-security` — least-privilege access
4. `aws-lambda-best-practices` — serverless components
5. `aws-s3-patterns` — storage, lifecycle, replication
6. `aws-cloudfront-optimization` — CDN cache behaviors
7. `network-engineer` — VPCs, subnets, security groups

**Terraform module library**

1. `terraform-patterns` — module structure and versioning
2. `aws-solution-architect` — validate architectural decisions
3. `senior-devops` — integrate with the deployment pipeline
4. `cicd-pipeline-generator` — `terraform plan` in CI, apply gated on approval
