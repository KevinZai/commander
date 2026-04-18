---
name: ccc-devops
context: fork
description: |
  CCC domain — complete DevOps ecosystem — 21 skills in one. Deployments, CI/CD, containers, AWS, monitoring, security, IaC, networking, and runbooks.

  <example>
  user: set up a CI/CD pipeline with GitHub Actions
  assistant: Loads ccc-devops and routes to cicd-pipeline-generator + github-actions-security for a hardened pipeline with OIDC and pinned action versions.
  </example>

  <example>
  user: deploy with zero downtime using blue-green strategy
  assistant: Loads ccc-devops and routes to zero-downtime-deploy + senior-devops with automated rollback configuration.
  </example>

  <example>
  user: set up Prometheus and Grafana monitoring
  assistant: Loads ccc-devops and routes to prometheus-configuration → grafana-dashboards → promql-alerting → infra-runbook pipeline.
  </example>
version: 1.0.0
category: CCC domain
# NOTE: ccc-devops is a candidate for the `monitors` key in a future plugin.json schema update
# (for automated infra health checks). Not added pending GA confirmation of the monitors schema.
---

# ccc-devops

> Load ONE skill. Get the entire DevOps domain. 21 skills in one.

## What's Inside

| Category | Skills |
|----------|--------|
| Foundation | devops-router, senior-devops |
| Deployment | zero-downtime-deploy, infra-runbook |
| CI/CD | cicd-pipeline-generator, github-actions-security, github-actions-reusable-workflows |
| Containers | docker-development, container-security |
| AWS | aws-solution-architect, aws-lambda-best-practices, aws-s3-patterns, aws-cloudfront-optimization, aws-iam-security |
| Monitoring | prometheus-configuration, grafana-dashboards, promql-alerting, performance-monitoring |
| IaC | terraform-patterns |
| Networking | network-engineer |

## Routines Integration

For **scheduled deployments** and automated infra tasks, see: https://code.claude.com/docs/en/scheduled-tasks — ccc-devops skills (especially `cicd-pipeline-generator` and `zero-downtime-deploy`) can be wrapped as scheduled routines for nightly deployments, weekly security scans, or periodic drift detection.

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Deploy with zero downtime" | `zero-downtime-deploy` + `senior-devops` |
| "Set up CI/CD" / "GitHub Actions" | `cicd-pipeline-generator` + `github-actions-security` |
| "Reusable workflow" / "Composite action" | `github-actions-reusable-workflows` |
| "Containerize" / "Dockerfile" | `docker-development` + `container-security` |
| "AWS architecture" | `aws-solution-architect` |
| "Lambda function" / "Serverless" | `aws-lambda-best-practices` |
| "S3 bucket" / "Object storage" | `aws-s3-patterns` |
| "CDN" / "CloudFront" | `aws-cloudfront-optimization` |
| "IAM" / "Permissions" | `aws-iam-security` |
| "Prometheus" / "Metrics" | `prometheus-configuration` + `performance-monitoring` |
| "Grafana dashboard" | `grafana-dashboards` |
| "Alerting" / "PromQL" | `promql-alerting` |
| "APM" / "Core Web Vitals" | `performance-monitoring` |
| "Incident response" / "Runbook" | `infra-runbook` |
| "Terraform" / "IaC" | `terraform-patterns` + `senior-devops` |
| "Networking" / "VPC" / "DNS" | `network-engineer` |
| "Security audit" / "Harden infra" | `container-security` + `aws-iam-security` + `github-actions-security` |

## Campaign Templates

### CI/CD Pipeline Setup
1. `cicd-pipeline-generator` → scaffold lint, test, build, deploy stages
2. `github-actions-security` → harden secrets, OIDC, pin action versions
3. `docker-development` → optimize container builds
4. `container-security` → scan images in CI

### Monitoring Stack
1. `prometheus-configuration` → scrape targets + recording rules
2. `grafana-dashboards` → infrastructure and application dashboards
3. `promql-alerting` → alert rules with severity routing
4. `performance-monitoring` → APM, RUM, Core Web Vitals
5. `infra-runbook` → alert response procedures

### AWS Infrastructure Build
1. `aws-solution-architect` → Well-Architected Framework design
2. `terraform-patterns` → IaC with modular design
3. `aws-iam-security` → least-privilege access
4. `aws-lambda-best-practices` → serverless optimization
5. `aws-s3-patterns` → storage + lifecycle
6. `aws-cloudfront-optimization` → CDN cache behaviors
7. `network-engineer` → VPCs, subnets, security groups
