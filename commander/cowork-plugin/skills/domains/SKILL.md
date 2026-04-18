---
name: domains
description: "CCC domain router — browse and activate any of the 11 CCC skill domains. Use when the user says 'ccc domains', 'domain skills', 'show categories', 'what skills are available', 'design skills', 'marketing skills', or names any CCC domain."
allowed-tools:
  - Read
  - Bash
  - Glob
  - Agent
  - AskUserQuestion
argument-hint: "[design | marketing | saas | testing | devops | seo | security | research | mobile | data | makeover]"
---

# /ccc:domains

> Placeholders like ~~knowledge base refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Browse, preview, and activate any of the 11 CCC domain MEGA routers. Each domain is a meta-skill that dispatches to specialist sub-skills automatically.

## Quick-install

```
/plugin install commander
```

Then invoke any domain directly:

```
/ccc:domains design          # route to design domain
/ccc:domains marketing       # route to marketing domain
/ccc:domains saas            # route to SaaS domain
/ccc:domains testing         # route to testing domain
/ccc:domains devops          # route to DevOps domain
/ccc:domains seo             # route to SEO domain
/ccc:domains security        # route to security domain
/ccc:domains research        # route to research domain
/ccc:domains mobile          # route to mobile domain
/ccc:domains data            # route to data domain
/ccc:domains makeover        # route to makeover domain
```

## Browse — 11 MEGA Routers

| Domain | Skills | Focus |
|--------|--------|-------|
| `/ccc:domains design` | **39** | UI/UX, animation, responsive, a11y, Impeccable suite |
| `/ccc:domains marketing` | **45** | CRO, email, ads, social, content, AI SEO |
| `/ccc:domains saas` | **21** | Auth, billing, API, multi-tenant, scaffolding |
| `/ccc:domains testing` | **15** | TDD, E2E, verification, QA, load testing |
| `/ccc:domains devops` | **21** | CI/CD, Docker, AWS, monitoring, IaC |
| `/ccc:domains seo` | **20** | Technical SEO, AI search, content, programmatic |
| `/ccc:domains security` | **8** | OWASP, secrets, dependency audits, prompt injection |
| `/ccc:domains research` | **8** | Deep research, specs, competitive analysis |
| `/ccc:domains mobile` | **8** | React Native, Flutter, SwiftUI, ASO |
| `/ccc:domains data` | **8** | Pipelines, SQL, ML, vector search |
| `/ccc:domains makeover` | **3** | xray audit + makeover swarm + report card |

**Total reachable via /ccc:domains: 196 sub-skills**

## Quick Mode (default)

Present the 11 domains via AskUserQuestion. Ask: "Which domain? (or describe what you want to accomplish)"

If the user describes a task instead of naming a domain, recommend the best-fit domain and confirm before activating.

## Power Mode

Activate by passing `--power`, `all`, or `detailed` to show full domain descriptions and sub-skill listings.

### Domain Routing

When a domain is selected:

1. Check if the domain skill is installed:
   ```bash
   ls ~/.claude/skills/ccc-{domain}/ 2>/dev/null || echo "not installed"
   ```

2. If installed: use Agent to invoke `/ccc:{domain}` with the user's task description as context.

3. If not installed — the domain MEGA skills are bundled with the Commander plugin. Ensure the plugin is installed:
   ```
   /plugin install commander
   ```

### Domain Descriptions

**ccc-design (39 sub-skills)**
UI/UX design, Impeccable polish suite (19 skills), visual effects, responsive design, accessibility, animation, color theory, typography, layout, component design, design systems, Tailwind patterns, shadcn/ui, dark mode, motion design, canvas design, SVG animation, generative backgrounds, particle systems, WebGL shaders. Aligned with Anthropic's `frontend-design` plugin.

**ccc-marketing (45 sub-skills)**
Content strategy, CRO, growth hacking, email sequences, ad creative, analytics, conversion optimization, landing pages, signup flows, paywall optimization, churn prevention, referral programs, cold email, guest blogging, backlink audits, SEO content briefs, SERP analysis, competitor alternatives, free tool strategy, social integration, influencer outreach, Product Hunt launch, SEO content production.

**ccc-saas (21 sub-skills)**
Authentication (Better Auth, Clerk, Auth0), billing (Stripe subscriptions), API design, database design (PostgreSQL, Drizzle), deployment, monitoring, SaaS metrics, Redis patterns, caching, session management, rate limiting, webhooks, multi-tenancy, feature flags, saas-scaffolder.

**ccc-testing (15 sub-skills)**
Unit testing (Vitest), integration testing, E2E testing (Playwright), load testing, visual regression, security testing, accessibility testing, API testing, test coverage, TDD workflow, webapp testing, Python testing, AI regression testing, eval harness, test strategy. Default isolation: worktree.

**ccc-devops (21 sub-skills)**
CI/CD (GitHub Actions), Docker development, AWS (Lambda, S3, IAM, CloudFront), container security, Prometheus configuration, Grafana dashboards, PromQL alerting, infrastructure runbooks, deployment automation, zero-downtime deploy, Terraform patterns, network engineering. Routines integration for scheduled deploys.

**ccc-seo (20 sub-skills)**
Technical SEO, content optimization, schema markup (JSON-LD), sitemap generation, robots.txt, Core Web Vitals, keyword research, SERP analysis, AI SEO (AEO/GEO/LLMO), bulk page generator, backlink audit, competitor analysis, social integration, analytics tracking, seo dashboard.

**ccc-security (8 sub-skills)**
OWASP Top 10 audit, penetration testing, dependency scanning, secrets detection, API security, prompt injection defense, CodeQL integration, variant analysis, incident response. Invokes built-in `/security-review`.

**ccc-research (8 sub-skills)**
Deep multi-source research, spec interviews, cross-model review, literature review, competitive analysis, data ingestion, trend analysis, Gemini 1M fallback. Channels (Telegram/Discord) as research surfaces.

**ccc-mobile (8 sub-skills)**
React Native, Flutter, SwiftUI, Jetpack Compose, mobile testing (Detox/Maestro), app store optimization, push notifications, deep linking.

**ccc-data (8 sub-skills)**
Data pipelines (Airflow/dbt/Dagster), SQL optimization, data visualization, machine learning (scikit-learn/PyTorch), data quality, analytics setup, automated reporting, vector search (pgvector/Pinecone/Qdrant).

**ccc-makeover (3 sub-skills)**
xray audit (6-dimension health scan, 0-100 score, maturity 1-5) + makeover swarm (auto-apply top recommendations) + report card (formatted score card with improvement history). Wraps `/ultrareview` native.

## If Connectors Available

If **~~knowledge base** is connected:
- Pull relevant prior work for the chosen domain before activating it
- Save domain-specific lessons back to the knowledge base after completion

## Tips

1. Pass a domain name directly as argument (e.g., `domains design`) to skip the menu and activate immediately.
2. Describe your task (e.g., "I need to add Stripe") — the skill recommends the best domain and confirms before routing.
3. Each domain skill uses its own internal router — you don't need to know sub-skill names upfront.
4. All 11 domains are bundled with the Commander plugin — no separate installs needed.
