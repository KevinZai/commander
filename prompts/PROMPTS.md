---
name: prompt-library
description: Reusable prompt templates for Claude Code and Codex — coding, planning, design, marketing, devops and meta workflows
tags: [prompts, templates, library]
---

# Prompt Library

Reusable prompt templates for Claude Code, each written for its tools, subagents and the Commander skill domains. This index lists every template under `prompts/`, one line each.

## How to Use

1. Find the template that matches the task.
2. Copy its Template block.
3. Replace each `{{placeholder}}` with your specifics.
4. Paste it into the session. The Mode column is the suggested posture: `plan` means design and get approval before editing; `code` means implement directly. Your selected model and permission mode stay as they are.

## Coding

| Template | File | Use | Mode | Est. tokens |
|---|---|---|---|---|
| Code Review | [coding/code-review.md](./coding/code-review.md) | Full review of finished changes before a pull request | plan | 800 |
| Systematic Debugging | [coding/debug-systematic.md](./coding/debug-systematic.md) | Reproduce, isolate and fix a bug at its root cause | code | 600 |
| Safe Refactoring | [coding/refactor-safe.md](./coding/refactor-safe.md) | Restructure code without changing behavior, one tested step at a time | plan | 700 |
| Test Generation | [coding/test-generation.md](./coding/test-generation.md) | Backfill unit, integration or E2E tests for existing code | code | 500 |
| Performance Optimization | [coding/optimize-performance.md](./coding/optimize-performance.md) | Find and fix a measured performance bottleneck | plan | 700 |
| TypeScript Strict Mode Migration | [coding/typescript-strict.md](./coding/typescript-strict.md) | Move a codebase to TypeScript strict mode | plan | 800 |
| API Design | [coding/api-design.md](./coding/api-design.md) | Design and review REST or GraphQL endpoints before implementing them | plan | 600 |
| Database Schema Design | [coding/schema-design.md](./coding/schema-design.md) | Design or extend a database schema before writing migrations | plan | 600 |
| Security Audit | [coding/security-audit.md](./coding/security-audit.md) | Code-level vulnerability review with fixes | plan | 700 |
| Auto-Generate Documentation | [coding/documentation.md](./coding/documentation.md) | Document existing code from its source | code | 400 |

## Planning

| Template | File | Use | Mode | Est. tokens |
|---|---|---|---|---|
| Spec Interview | [planning/spec-interview.md](./planning/spec-interview.md) | Targeted question interview that ends in a written spec | plan | 500 |
| Architecture Decision Record | [planning/architecture-decision.md](./planning/architecture-decision.md) | Record a decision that is expensive to reverse | plan | 700 |
| Feature Implementation Plan | [planning/feature-plan.md](./planning/feature-plan.md) | Break an approved spec into verifiable phases | plan | 800 |
| Migration Plan | [planning/migration-plan.md](./planning/migration-plan.md) | Schema, API or framework migration with rollback | plan | 700 |
| Technical Debt Assessment | [planning/tech-debt-assessment.md](./planning/tech-debt-assessment.md) | Evaluate and prioritize technical debt | plan | 600 |

## Design

| Template | File | Use | Mode | Est. tokens |
|---|---|---|---|---|
| Landing Page Design | [design/landing-page.md](./design/landing-page.md) | Design and build a landing page with its copy | code | 800 |
| Component Design | [design/component-design.md](./design/component-design.md) | Reusable UI component with variants, states and accessibility | code | 600 |
| Animation Polish | [design/animation-polish.md](./design/animation-polish.md) | Micro-interactions and motion for a working feature | code | 500 |
| Responsive Design Audit | [design/responsive-audit.md](./design/responsive-audit.md) | Check a page or components across device sizes | plan | 500 |
| Design System Setup | [design/design-system.md](./design/design-system.md) | Tokens and design system from scratch or from inconsistent styling | plan | 700 |

## Marketing

| Template | File | Use | Mode | Est. tokens |
|---|---|---|---|---|
| SEO Content Creation | [marketing/seo-content.md](./marketing/seo-content.md) | SEO-optimized content creation pipeline | code | 600 |
| Competitor Analysis | [marketing/competitor-analysis.md](./marketing/competitor-analysis.md) | Competitive analysis framework | plan | 750 |
| Email Campaign Design | [marketing/email-campaign.md](./marketing/email-campaign.md) | Email campaign with sequences | code | 650 |
| Social Media Content Strategy | [marketing/social-media.md](./marketing/social-media.md) | Social content strategy and calendar | plan | 550 |
| Ad Copy Generation | [marketing/ad-copy.md](./marketing/ad-copy.md) | Ad copy for search and social platforms | code | 450 |

## DevOps

| Template | File | Use | Mode | Est. tokens |
|---|---|---|---|---|
| CI/CD Pipeline Design | [devops/ci-cd-pipeline.md](./devops/ci-cd-pipeline.md) | Set up or overhaul a CI/CD pipeline | code | 700 |
| Docker Containerization | [devops/docker-setup.md](./devops/docker-setup.md) | Containerize an app or harden an existing Docker setup | code | 600 |
| Deployment Strategy | [devops/deploy-strategy.md](./devops/deploy-strategy.md) | Choose and plan blue-green, canary or rolling deploys | plan | 600 |
| Monitoring and Alerting Setup | [devops/monitoring-setup.md](./devops/monitoring-setup.md) | Metrics, logs, traces and alerts for a production service | code | 600 |
| Incident Response Playbook | [devops/incident-response.md](./devops/incident-response.md) | Write or document an incident response process | plan | 500 |

## Meta

| Template | File | Use | Mode | Est. tokens |
|---|---|---|---|---|
| Overnight Runner Setup | [meta/overnight-runner.md](./meta/overnight-runner.md) | Set up a safe unattended run with checkpoints and guardrails | plan | 600 |
| Parallel Research | [meta/parallel-research.md](./meta/parallel-research.md) | Fan research angles out to parallel subagents and synthesize | plan | 500 |
| Session Handoff | [meta/session-handoff.md](./meta/session-handoff.md) | Hand work to a fresh session without losing context | code | 400 |
| Cost Optimization | [meta/cost-optimize.md](./meta/cost-optimize.md) | Cut token use and route work to the right model tier | plan | 500 |
| Mode Switching Workflow | [meta/mode-switch.md](./meta/mode-switch.md) | Switch tool usage and pacing between plan, code, review and other modes | code | 400 |
| Task Commander Session | [meta/task-commander.md](./meta/task-commander.md) | Orchestrate a multi-agent task with cost ceilings and verification gates | plan | 800 |

## Pairing with Skills

Most templates name skills from the Commander toolkit; [SKILLS-INDEX.md](../SKILLS-INDEX.md) lists them. Key pairings:

| Template category | Recommended skills |
|---|---|
| Coding | `tdd-workflow`, `systematic-debugging`, `security-audit`, `/ccc-code-review` |
| Planning | `evals-before-specs`, `spec-interviewer`, `dialectic-review`, `/ccc-plan` |
| Design | `landing-page-builder`, `frontend-design`, `shadcn-ui` |
| Marketing | `seo-content-brief`, `content-strategy`, `ai-seo` |
| DevOps | `senior-devops`, `docker-development`, `/ccc-ci` |
| Meta | `overnight-runner`, `delegation-templates`, `strategic-compact`, `/ccc-handoff` |
