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

Browse, preview, and activate any of the 11 CCC domain routers. Each domain is a meta-skill that dispatches to specialist sub-skills automatically. Full menu sourced from `references/ccc-domains.json`.

## Quick Mode (default)

Present the 11 domains with skill counts via AskUserQuestion:

| Domain | Skills | Focus |
|--------|--------|-------|
| `/ccc-design` | 39 | UI/UX, animation, responsive, a11y |
| `/ccc-marketing` | 45 | CRO, email, ads, social, content |
| `/ccc-saas` | 20 | Auth, billing, API, multi-tenant |
| `/ccc-testing` | 15 | Unit, integration, E2E, load |
| `/ccc-devops` | 20 | CI/CD, Docker, AWS, monitoring |
| `/ccc-seo` | 19 | Technical SEO, Core Web Vitals, schema |
| `/ccc-security` | 8 | OWASP, pen-test, secrets, hardening |
| `/ccc-research` | 8 | Competitive, market analysis, data |
| `/ccc-mobile` | 8 | React Native, Expo, mobile patterns |
| `/ccc-data` | 8 | SQL, ETL, analytics, visualization |
| `/ccc-makeover` | 3 | /xray audit + /makeover swarm |

Ask: "Which domain? (or describe what you want to accomplish)"

If the user describes a task instead of naming a domain, recommend the best-fit domain and confirm.

## Power Mode

Full domain detail from `references/ccc-domains.json`. Activate by passing `--power`, `all`, or `detailed`.

### Domain Routing

When a domain is selected:

1. Check if the domain skill is installed:
   ```bash
   ls ~/.claude/skills/ccc-{domain}/ 2>/dev/null || ls ~/.claude/commands/ccc-{domain}.md 2>/dev/null
   ```

2. If installed: use Agent to invoke `/ccc-{domain}` with the user's task description as context.

3. If not installed: show install instruction:
   ```
   Domain not found in ~/.claude/skills/. Install CCC domain plugins separately:
   - From the marketplace: claude plugins add ccc-{domain}
   - Or add KevinZai/commander via: claude plugins add KevinZai/commander
     then browse domain skills from the /ccc:domains menu
   ```

### Domain Descriptions

**ccc-design (39 sub-skills)**
UI/UX design, impeccable polish, visual effects, responsive design, accessibility, animation, color theory, typography, layout, component design, design systems, Tailwind patterns, shadcn/ui, dark mode, motion design, canvas design, SVG animation, generative backgrounds, particle systems, WebGL shaders.

**ccc-marketing (45 sub-skills)**
Content strategy, CRO, growth hacking, email sequences, ad creative, analytics, conversion optimization, landing pages, signup flows, paywall optimization, churn prevention, referral programs, cold email, guest blogging, backlink audits, SEO content briefs, SERP analysis, competitor alternatives, free tool strategy, social integration, video gallery, form CRO, A/B testing, email capture, bulk page generation.

**ccc-saas (20 sub-skills)**
Authentication (Better Auth, Clerk, Auth0), billing (Stripe subscriptions), API design, database design (PostgreSQL, Drizzle), deployment, monitoring, SaaS metrics, Redis patterns, caching, session management, rate limiting, webhooks, multi-tenancy.

**ccc-testing (15 sub-skills)**
Unit testing (Vitest), integration testing, E2E testing (Playwright), load testing, security testing, accessibility testing, visual regression, API testing, test coverage, TDD workflow, webapp testing, Python testing, AI regression testing.

**ccc-devops (20 sub-skills)**
CI/CD (GitHub Actions), Docker development, AWS (Lambda, S3, IAM, CloudFront), container security, Prometheus configuration, Grafana dashboards, PromQL alerting, infrastructure runbooks, deployment automation, PCI compliance, GDPR data handling.

**ccc-seo (19 sub-skills)**
Technical SEO, content optimization, schema markup (JSON-LD), sitemap generation, robots.txt, Core Web Vitals, keyword research, SERP analysis, search console integration, AEO audit, AI SEO optimization, backlink audit, competitor analysis, local SEO, image optimization.

**ccc-security (8 sub-skills)**
OWASP Top 10 audit, penetration testing, dependency scanning, secrets detection, API security, authentication hardening, CSRF/XSS prevention, container security, compliance checking.

**ccc-research (8 sub-skills)**
Competitive analysis, market research, technology evaluation, codebase analysis, user research synthesis, data analysis, trend identification, multi-source research.

**ccc-mobile (8 sub-skills)**
React Native, Flutter, iOS patterns, Android patterns, mobile-responsive design, app store optimization, mobile testing.

**ccc-data (8 sub-skills)**
Data pipelines, ETL, data visualization, statistical analysis, SQL optimization, database migrations, data validation, dashboard building.

**ccc-makeover (3 sub-skills)**
/xray audit + /makeover swarm — complete visual and UX overhaul workflow.

## If Connectors Available

If **~~knowledge base** is connected:
- Pull relevant prior work for the chosen domain before activating it
- Save domain-specific lessons back to the knowledge base after completion

## Tips

1. Pass a domain name directly as argument (e.g., `domains design`) to skip the menu and activate that domain immediately.
2. If you describe a task (e.g., "I need to add Stripe"), the skill recommends the best domain — usually `saas` — and confirms before routing.
3. Each domain skill uses its own internal router — you don't need to know the sub-skill names upfront.
