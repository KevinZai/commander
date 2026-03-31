# KZ Mega-DevOps — Architecture

This CCC domain contains 20 DevOps specialist skills organized across 7 domains.

## Skill Map

### Foundation
- `devops-router/` — Central routing (start here)
- `senior-devops/` — Full DevOps toolkit, pipeline generation, deployment orchestration

### Deployment
- `zero-downtime-deploy/` — Blue-green, canary, rolling update strategies
- `infra-runbook/` — Incident response and recovery procedures

### CI/CD
- `cicd-pipeline-generator/` — GitHub Actions / GitLab CI pipeline scaffolding
- `github-actions-security/` — Secrets, OIDC, supply chain hardening
- `github-actions-reusable-workflows/` — Composite actions, org-wide templates

### Containers
- `docker-development/` — Dockerfile optimization, compose, multi-stage builds
- `container-security/` — Image hardening, vulnerability scanning, runtime policies

### AWS
- `aws-solution-architect/` — Architecture design, Well-Architected Framework
- `aws-lambda-best-practices/` — Serverless patterns, cold start optimization
- `aws-s3-patterns/` — Bucket policies, lifecycle, replication, presigned URLs
- `aws-cloudfront-optimization/` — Cache behaviors, Lambda@Edge, origin shields
- `aws-iam-security/` — Least-privilege, role assumption, permission boundaries

### Monitoring & Performance
- `prometheus-configuration/` — Scrape config, recording rules, service discovery
- `grafana-dashboards/` — Dashboard JSON, panels, variables, provisioning
- `promql-alerting/` — Alert rules, expression evaluation, silencing
- `performance-monitoring/` — APM, RUM, Core Web Vitals, profiling

### Infrastructure as Code
- `terraform-patterns/` — Modules, remote state, workspaces, drift detection

### Networking
- `network-engineer/` — Cloud networking, VPCs, service mesh, DNS, zero-trust

## Usage Flow
1. Start with `devops-router` if unsure which skill to use
2. Route via the Routing Matrix in SKILL.md
3. For multi-step operations, follow Campaign Templates
4. Security skills (`container-security`, `aws-iam-security`, `github-actions-security`) should be applied to every production workload

## Domain Boundaries

| Domain | Skills | Boundary |
|--------|--------|----------|
| Deployment | senior-devops, zero-downtime-deploy, infra-runbook | How code reaches production and how to recover |
| CI/CD | cicd-pipeline-generator, github-actions-* | Build and test automation before deployment |
| Containers | docker-development, container-security | Building and securing container images |
| AWS | aws-solution-architect, aws-lambda-*, aws-s3-*, aws-cloudfront-*, aws-iam-* | AWS-specific services and architecture |
| Monitoring | prometheus-*, grafana-*, promql-*, performance-monitoring | Observability from metrics to dashboards to alerts |
| IaC | terraform-patterns | Declarative infrastructure management |
| Networking | network-engineer | Network architecture, routing, segmentation |

## Cross-Domain Workflows

Many real-world tasks span multiple domains. Common cross-domain patterns:

- **New service deployment:** containers → CI/CD → deployment → monitoring
- **Security hardening:** AWS IAM → container security → CI/CD security → networking
- **Observability setup:** Prometheus → Grafana → PromQL alerting → performance monitoring → runbooks
- **Infrastructure migration:** Terraform → AWS architect → networking → deployment

## Anti-Patterns
- Don't deploy without monitoring — always pair deployment with `performance-monitoring` or `prometheus-configuration`
- Don't skip security skills for production workloads — `container-security` and `aws-iam-security` are mandatory
- Don't write Terraform without state management — always configure remote state and locking
- Don't build CI/CD without security gates — always include `github-actions-security` in pipeline setup
- Don't create runbooks in isolation — pair `infra-runbook` with actual alert definitions from `promql-alerting`
