---
name: prompt-library
description: 50+ battle-tested prompt templates for Claude Code — coding, planning, design, marketing, devops, meta workflows
tags: [prompts, templates, library]
---

# Prompt Library

50+ battle-tested prompt templates for Claude Code. Each template is designed for Claude Code's tooling, subagent system, and mega-skill architecture — not generic chatbot prompts.

## How to Use

1. Find the template that matches your task
2. Copy the template section
3. Replace `{{placeholders}}` with your specifics
4. Paste into Claude Code (respect the suggested mode)

## Coding

| # | Name | File | Description | Mode | Est. Tokens |
|---|------|------|-------------|------|-------------|
| 1 | Code Review | `coding/code-review.md` | Comprehensive code review with actionable findings | plan | 800 |
| 2 | Systematic Debugging | `coding/debug-systematic.md` | Structured debugging with reproduction and root cause | code | 600 |
| 3 | Safe Refactoring | `coding/refactor-safe.md` | Refactor with test preservation and rollback safety | plan | 700 |
| 4 | Test Generation | `coding/test-generation.md` | Generate unit/integration/E2E tests for existing code | code | 500 |
| 5 | Performance Optimization | `coding/optimize-performance.md` | Identify and fix performance bottlenecks | plan | 700 |
| 6 | TypeScript Strict Migration | `coding/typescript-strict.md` | Migrate codebase to TypeScript strict mode | plan | 800 |
| 7 | API Design | `coding/api-design.md` | Design REST/GraphQL endpoints with validation | plan | 600 |
| 8 | Schema Design | `coding/schema-design.md` | Database schema design with migrations | plan | 600 |
| 9 | Security Audit | `coding/security-audit.md` | Scan for vulnerabilities and generate fixes | plan | 700 |
| 10 | Documentation | `coding/documentation.md` | Auto-generate docs from code | code | 400 |

## Planning

| # | Name | File | Description | Mode | Est. Tokens |
|---|------|------|-------------|------|-------------|
| 1 | Spec Interview | `planning/spec-interview.md` | 5-7 question spec interview before building | plan | 500 |
| 2 | Architecture Decision | `planning/architecture-decision.md` | Architecture Decision Record (ADR) | plan | 700 |
| 3 | Feature Plan | `planning/feature-plan.md` | Full feature implementation plan with phases | plan | 800 |
| 4 | Migration Plan | `planning/migration-plan.md` | Database/API migration strategy with rollback | plan | 700 |
| 5 | Tech Debt Assessment | `planning/tech-debt-assessment.md` | Technical debt evaluation and prioritization | plan | 600 |

## Design

| # | Name | File | Description | Mode | Est. Tokens |
|---|------|------|-------------|------|-------------|
| 1 | Landing Page | `design/landing-page.md` | Landing page design + copy generation | code | 800 |
| 2 | Component Design | `design/component-design.md` | React/UI component design with variants | code | 600 |
| 3 | Animation Polish | `design/animation-polish.md` | Micro-interaction and animation design | code | 500 |
| 4 | Responsive Audit | `design/responsive-audit.md` | Responsive design audit across breakpoints | plan | 500 |
| 5 | Design System | `design/design-system.md` | Design system/token setup from scratch | plan | 700 |

## Marketing

| # | Name | File | Description | Mode | Est. Tokens |
|---|------|------|-------------|------|-------------|
| 1 | SEO Content | `marketing/seo-content.md` | SEO-optimized content creation pipeline | code | 600 |
| 2 | Competitor Analysis | `marketing/competitor-analysis.md` | Competitive analysis framework | plan | 700 |
| 3 | Email Campaign | `marketing/email-campaign.md` | Email campaign design with sequences | code | 600 |
| 4 | Social Media | `marketing/social-media.md` | Social media content strategy and calendar | plan | 500 |
| 5 | Ad Copy | `marketing/ad-copy.md` | Ad copy generation for Google/Meta | code | 400 |

## DevOps

| # | Name | File | Description | Mode | Est. Tokens |
|---|------|------|-------------|------|-------------|
| 1 | CI/CD Pipeline | `devops/ci-cd-pipeline.md` | CI/CD pipeline design and implementation | code | 700 |
| 2 | Docker Setup | `devops/docker-setup.md` | Docker containerization from scratch | code | 600 |
| 3 | Deploy Strategy | `devops/deploy-strategy.md` | Deployment strategy (blue-green, canary, rolling) | plan | 600 |
| 4 | Monitoring Setup | `devops/monitoring-setup.md` | Monitoring and alerting setup | code | 600 |
| 5 | Incident Response | `devops/incident-response.md` | Incident response playbook generation | plan | 500 |

## Meta

| # | Name | File | Description | Mode | Est. Tokens |
|---|------|------|-------------|------|-------------|
| 1 | Overnight Runner | `meta/overnight-runner.md` | Overnight autonomous task setup | plan | 600 |
| 2 | Parallel Research | `meta/parallel-research.md` | Multi-agent parallel research dispatch | plan | 500 |
| 3 | Session Handoff | `meta/session-handoff.md` | Session handoff between contexts | code | 400 |
| 4 | Cost Optimize | `meta/cost-optimize.md` | Cost optimization for long sessions | plan | 500 |
| 5 | Mode Switch | `meta/mode-switch.md` | Mode switching workflow for different task types | code | 400 |

## Pairing with Skills

Most templates reference skills from CC Commander's skill library. Use `/skills` to browse available skills, or check `SKILLS-INDEX.md` for the full directory. Key pairings:

| Template Category | Recommended Skills |
|---|---|
| Coding | `tdd-workflow`, `code-review`, `systematic-debugging`, `security-audit` |
| Planning | `evals-before-specs`, `spec-interviewer`, `dialectic-review` |
| Design | `landing-page-builder`, `frontend-design`, `shadcn-ui` |
| Marketing | `seo-content-brief`, `content-strategy`, `ai-seo` |
| DevOps | `senior-devops`, `ci-cd-pipeline`, `docker-development` |
| Meta | `overnight-runner`, `delegation-templates`, `strategic-compact` |
