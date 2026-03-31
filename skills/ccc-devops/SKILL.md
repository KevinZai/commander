---
name: KZ Mega-DevOps
description: "Complete DevOps ecosystem — 20 skills in one. Deployments, CI/CD, containers, AWS, monitoring, security, IaC, networking, and runbooks."
version: 1.0.0
category: CCC domain
brand: Kevin Z's CC Commander
---

# KZ Mega-DevOps

> Load ONE skill. Get the entire DevOps domain. Built from 15 proven skills + 5 new ones.

## Absorbed Skills Manifest

| # | Original Skill | What It Does | Status |
|---|----------------|--------------|--------|
| 1 | `docker-development` | Docker optimization — Dockerfile multi-stage builds, compose orchestration, layer caching | Absorbed |
| 2 | `senior-devops` | Full DevOps toolkit — pipeline generation, Terraform scaffolding, deployment management | Absorbed |
| 3 | `github-actions-security` | GitHub Actions security — secrets management, OIDC, permissions hardening, supply chain defense | Absorbed |
| 4 | `github-actions-reusable-workflows` | Reusable workflows — composite actions, workflow_call, organization-wide CI templates | Absorbed |
| 5 | `aws-solution-architect` | AWS architecture — Well-Architected Framework, service selection, cost optimization | Absorbed |
| 6 | `aws-lambda-best-practices` | Lambda patterns — cold starts, layers, VPC config, concurrency, event source mappings | Absorbed |
| 7 | `aws-s3-patterns` | S3 patterns — bucket policies, lifecycle rules, replication, presigned URLs, event notifications | Absorbed |
| 8 | `aws-cloudfront-optimization` | CloudFront — cache behaviors, origin shields, Lambda@Edge, invalidation strategies | Absorbed |
| 9 | `aws-iam-security` | IAM security — least-privilege policies, role assumption, permission boundaries, SCPs | Absorbed |
| 10 | `container-security` | Container security — image hardening, vulnerability scanning, runtime policies, secrets management | Absorbed |
| 11 | `prometheus-configuration` | Prometheus — scrape configs, recording rules, metric collection, service discovery | Absorbed |
| 12 | `grafana-dashboards` | Grafana — dashboard JSON, panel queries, variables, alerting, provisioning | Absorbed |
| 13 | `promql-alerting` | PromQL — alert rules, expression evaluation, recording rules, silencing strategies | Absorbed |
| 14 | `infra-runbook` | Runbooks — incident response procedures, escalation paths, recovery playbooks | Absorbed |
| 15 | `network-engineer` | Networking — cloud networking, VPCs, service mesh, DNS, load balancing, zero-trust | Absorbed |
| 16 | `devops-router` | Routes your DevOps task to the right specialist | **NEW** |
| 17 | `zero-downtime-deploy` | Zero-downtime deployments — blue-green, canary, rolling updates, automated rollback | **NEW** |
| 18 | `cicd-pipeline-generator` | CI/CD pipeline generation — GitHub Actions, GitLab CI, caching, parallel execution | **NEW** |
| 19 | `performance-monitoring` | Full-stack monitoring — APM, RUM, Core Web Vitals, profiling, error tracking | **NEW** |
| 20 | `terraform-patterns` | Terraform mastery — modules, remote state, workspaces, drift detection, cost estimation | **NEW** |

**Replaces loading:** docker-development, senior-devops, github-actions-security, github-actions-reusable-workflows, aws-solution-architect, aws-lambda-best-practices, aws-s3-patterns, aws-cloudfront-optimization, aws-iam-security, container-security, prometheus-configuration, grafana-dashboards, promql-alerting, infra-runbook, network-engineer

---

## How To Use

**Step 1:** Tell me what you need. I'll route to the right specialist.

**Step 2:** If this involves infrastructure, I'll confirm your cloud provider, toolchain, and constraints before proceeding.

**Step 3:** The specialist skill handles the work. You get senior DevOps expertise without loading 15 separate skills.

---

## Routing Matrix

| Your Intent | Route To | Don't Confuse With |
|-------------|----------|--------------------|
| "Deploy with zero downtime" / "Blue-green deploy" | `senior-devops` + `zero-downtime-deploy` | `cicd-pipeline-generator` (build pipeline, not deploy strategy) |
| "Set up CI/CD" / "GitHub Actions pipeline" | `github-actions-security` + `cicd-pipeline-generator` | `github-actions-reusable-workflows` (reusable templates, not full pipeline) |
| "Reusable workflow" / "Composite action" | `github-actions-reusable-workflows` | `cicd-pipeline-generator` (project-specific pipeline) |
| "Containerize" / "Dockerfile" / "Docker Compose" | `docker-development` + `container-security` | `zero-downtime-deploy` (deployment, not containerization) |
| "Container security" / "Image scanning" | `container-security` | `docker-development` (building, not securing) |
| "AWS architecture" / "Which AWS services?" | `aws-solution-architect` | Individual AWS skills (service-specific) |
| "Lambda function" / "Serverless" | `aws-lambda-best-practices` | `aws-solution-architect` (broader architecture) |
| "S3 bucket" / "Object storage" | `aws-s3-patterns` | `aws-cloudfront-optimization` (CDN, not storage) |
| "CDN" / "CloudFront" / "Edge caching" | `aws-cloudfront-optimization` | `aws-s3-patterns` (origin, not edge) |
| "IAM" / "Permissions" / "Roles" | `aws-iam-security` | `github-actions-security` (CI secrets, not IAM) |
| "Prometheus" / "Metrics collection" | `prometheus-configuration` + `performance-monitoring` | `grafana-dashboards` (visualization, not collection) |
| "Grafana dashboard" / "Visualize metrics" | `grafana-dashboards` | `prometheus-configuration` (data source, not visualization) |
| "Alerting" / "PromQL alerts" | `promql-alerting` | `performance-monitoring` (broader monitoring) |
| "APM" / "Core Web Vitals" / "RUM" | `performance-monitoring` | `prometheus-configuration` (infrastructure metrics, not app performance) |
| "Incident response" / "Runbook" | `infra-runbook` | `promql-alerting` (alerting, not response) |
| "Terraform" / "Infrastructure as Code" | `terraform-patterns` + `senior-devops` | `aws-solution-architect` (architecture, not IaC) |
| "Networking" / "VPC" / "DNS" / "Service mesh" | `network-engineer` | `aws-solution-architect` (broader scope) |
| "Security audit" / "Harden infrastructure" | `container-security` + `aws-iam-security` + `github-actions-security` | `infra-runbook` (response, not prevention) |

---

## Campaign Templates

### CI/CD Pipeline Setup
1. `cicd-pipeline-generator` → scaffold the pipeline (lint, test, build, deploy stages)
2. `github-actions-security` → harden secrets, pin action versions, configure OIDC
3. `github-actions-reusable-workflows` → extract reusable components for the org
4. `docker-development` → optimize container builds with layer caching
5. `container-security` → scan images in CI, enforce non-root
6. Deliver: working pipeline with security gates and fast builds

### Production Deployment
1. `zero-downtime-deploy` → choose strategy (blue-green, canary, rolling)
2. `senior-devops` → orchestrate deployment with rollback support
3. `docker-development` → production Dockerfile optimization
4. `aws-solution-architect` → validate infrastructure design
5. `performance-monitoring` → set up APM and health checks
6. `infra-runbook` → write rollback and incident procedures
7. Deliver: production-ready deployment with monitoring and runbooks

### Monitoring Stack
1. `prometheus-configuration` → configure scrape targets and recording rules
2. `grafana-dashboards` → build dashboards for infrastructure and application metrics
3. `promql-alerting` → define alert rules with severity levels and routing
4. `performance-monitoring` → add APM, RUM, and Core Web Vitals tracking
5. `infra-runbook` → document alert response procedures
6. Deliver: complete observability stack from metrics collection to incident response

### Security Hardening
1. `aws-iam-security` → audit and tighten IAM policies, implement least-privilege
2. `container-security` → harden images, scan vulnerabilities, enforce runtime policies
3. `github-actions-security` → secure CI/CD pipeline, configure OIDC, remove long-lived credentials
4. `network-engineer` → implement zero-trust networking, segment VPCs, configure WAF
5. `infra-runbook` → document security incident response procedures
6. Deliver: hardened infrastructure with defense-in-depth across all layers

### AWS Infrastructure Build
1. `aws-solution-architect` → design architecture using Well-Architected Framework
2. `terraform-patterns` → implement infrastructure as code with modular design
3. `aws-iam-security` → configure least-privilege access
4. `aws-lambda-best-practices` → optimize serverless components
5. `aws-s3-patterns` → configure storage with lifecycle and replication
6. `aws-cloudfront-optimization` → set up CDN with proper cache behaviors
7. `network-engineer` → configure VPCs, subnets, security groups
8. Deliver: production AWS environment with IaC, security, and CDN

### Terraform Module Library
1. `terraform-patterns` → design module structure with versioning
2. `aws-solution-architect` → validate architectural decisions
3. `senior-devops` → integrate with deployment pipeline
4. `cicd-pipeline-generator` → add terraform plan/apply to CI
5. Deliver: reusable, versioned Terraform modules with CI integration
