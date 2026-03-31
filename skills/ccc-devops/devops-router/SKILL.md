---
name: DevOps Router
description: "Routes DevOps tasks to the correct specialist skill within KZ Mega-DevOps."
version: 1.0.0
category: routing
parent: ccc-devops
---

# DevOps Router

> Don't know which DevOps skill to use? Start here. Describe what you need and get routed to the right specialist.

## How It Works

1. Parse the user's request for DevOps signals
2. Match against the intent taxonomy below
3. Recommend 1-3 skills in execution order
4. If ambiguous, ask one clarifying question before routing

## Quick Decision Tree

```
What are you trying to do?
│
├── DEPLOYING code?
│   ├── Need zero-downtime strategy? → zero-downtime-deploy
│   ├── General deployment orchestration? → senior-devops
│   ├── Writing deploy runbook? → infra-runbook
│   └── Setting up deploy pipeline? → cicd-pipeline-generator
│
├── BUILDING CI/CD?
│   ├── Full pipeline (lint→test→build→deploy)? → cicd-pipeline-generator
│   ├── Securing existing workflows? → github-actions-security
│   ├── Making workflows reusable across repos? → github-actions-reusable-workflows
│   └── General DevOps pipeline? → senior-devops
│
├── CONTAINERIZING?
│   ├── Writing/optimizing Dockerfile? → docker-development
│   ├── Docker Compose setup? → docker-development
│   ├── Securing container images? → container-security
│   └── Container runtime security? → container-security
│
├── AWS infrastructure?
│   ├── Architecture design / service selection? → aws-solution-architect
│   ├── Lambda / serverless? → aws-lambda-best-practices
│   ├── S3 / object storage? → aws-s3-patterns
│   ├── CloudFront / CDN? → aws-cloudfront-optimization
│   └── IAM / permissions / roles? → aws-iam-security
│
├── MONITORING / OBSERVABILITY?
│   ├── Prometheus setup / metrics collection? → prometheus-configuration
│   ├── Grafana dashboards? → grafana-dashboards
│   ├── Alert rules / PromQL? → promql-alerting
│   ├── APM / Core Web Vitals / RUM? → performance-monitoring
│   └── Incident response procedures? → infra-runbook
│
├── INFRASTRUCTURE AS CODE?
│   ├── Terraform modules / state / workspaces? → terraform-patterns
│   ├── General IaC scaffolding? → senior-devops + terraform-patterns
│   └── Importing existing infrastructure? → terraform-patterns
│
├── NETWORKING?
│   ├── VPC / subnets / security groups? → network-engineer
│   ├── DNS / load balancing? → network-engineer
│   ├── Service mesh / zero-trust? → network-engineer
│   └── Cloud networking architecture? → network-engineer + aws-solution-architect
│
└── SECURITY?
    ├── Container security? → container-security
    ├── IAM / cloud permissions? → aws-iam-security
    ├── CI/CD security? → github-actions-security
    ├── Network security? → network-engineer
    └── Full security audit? → container-security + aws-iam-security + github-actions-security
```

## Intent Taxonomy

### Deployment
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| deploy, release, rollout, ship, push to prod | `senior-devops` + `zero-downtime-deploy` | High |
| blue-green, canary, rolling update, zero-downtime | `zero-downtime-deploy` | High |
| rollback, revert, recover, incident | `infra-runbook` | High |
| feature flag, dark launch, traffic splitting | `zero-downtime-deploy` | Medium |

### CI/CD
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| pipeline, workflow, github actions, CI/CD | `cicd-pipeline-generator` | High |
| secrets, OIDC, supply chain, action pinning | `github-actions-security` | High |
| reusable, composite action, workflow_call, shared workflow | `github-actions-reusable-workflows` | High |
| gitlab ci, jenkins, circleci | `cicd-pipeline-generator` | Medium |

### Containers
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| dockerfile, docker-compose, multi-stage, image size | `docker-development` | High |
| trivy, grype, CVE, vulnerability scan, image hardening | `container-security` | High |
| container, docker, podman | `docker-development` | Medium — clarify build vs. security |

### AWS
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| architecture, well-architected, cost optimization | `aws-solution-architect` | High |
| lambda, serverless, cold start, layers | `aws-lambda-best-practices` | High |
| s3, bucket, presigned, lifecycle | `aws-s3-patterns` | High |
| cloudfront, cdn, edge, cache invalidation | `aws-cloudfront-optimization` | High |
| iam, policy, role, permission boundary, scp | `aws-iam-security` | High |
| aws, cloud | `aws-solution-architect` | Low — clarify service |

### Monitoring
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| prometheus, scrape, exporter, recording rule | `prometheus-configuration` | High |
| grafana, dashboard, panel, variable | `grafana-dashboards` | High |
| promql, alert rule, alertmanager, silence | `promql-alerting` | High |
| apm, rum, core web vitals, sentry, datadog | `performance-monitoring` | High |
| monitoring, observability, metrics | `prometheus-configuration` + `performance-monitoring` | Medium — clarify infra vs. app |

### Infrastructure
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| terraform, module, state, workspace, plan, apply | `terraform-patterns` | High |
| vpc, subnet, security group, nacl | `network-engineer` | High |
| dns, route53, load balancer, alb, nlb | `network-engineer` | High |
| service mesh, istio, envoy, zero-trust | `network-engineer` | High |
| runbook, playbook, incident, escalation | `infra-runbook` | High |

## Combining Skills

Skills compose naturally. Common combinations:

| Workflow | Skills Used |
|----------|------------|
| New service to production | docker-development → cicd-pipeline-generator → zero-downtime-deploy → performance-monitoring |
| Security hardening | aws-iam-security → container-security → github-actions-security → network-engineer |
| Observability stack | prometheus-configuration → grafana-dashboards → promql-alerting → infra-runbook |
| AWS infrastructure | aws-solution-architect → terraform-patterns → aws-iam-security → network-engineer |
| CI/CD overhaul | cicd-pipeline-generator → github-actions-security → github-actions-reusable-workflows → docker-development |
