# KZ Mega-SEO — Architecture

This CCC domain contains 19 SEO specialist skills organized for domain-complete coverage.

## Skill Map

### Foundation
- `seo-router/` — Central routing (start here)
- `seo-context/` — Domain state capture

### Technical SEO
- `seo-optimizer/` — On-page, meta, sitemaps, Core Web Vitals
- `site-architecture/` — URL structure, internal linking, breadcrumbs

### AI Search
- `ai-seo/` — LLM citation optimization
- `aaio/` — Agentic AI optimization (robots.txt, markdown twins)

### Content
- `content-strategy/` — Planning, editorial calendar
- `content-cluster/` — Topic cluster strategy (pillar + cluster)
- `seo-content-brief/` — Individual page briefs
- `blog-engine/` — Blog system setup
- `guest-blogger/` — Guest posting strategy

### Analytics & Tracking
- `analytics-conversion/` — GA4, Plausible, PostHog conversion tracking
- `analytics-product/` — Product analytics (funnels, cohorts, retention)
- `search-console/` — Google Search Console data
- `serp-analyzer/` — SERP analysis and competitor tracking

### Growth
- `bulk-page-generator/` — Programmatic SEO at scale
- `backlink-audit/` — Link profile analysis
- `social-integration/` — Social sharing optimization

### Dashboard
- `seo-dashboard/` — Unified SEO health overview

## Usage Flow
1. Check for `seo-context` output first
2. Route via the Routing Matrix in SKILL.md
3. Load ONE specialist skill at a time
4. Never try to do everything at once — route, execute, iterate

## Anti-Patterns
- Don't load all 19 skills simultaneously
- Don't skip seo-context on first session
- Don't confuse internal linking (site-architecture) with external linking (backlink-audit)
- Don't use analytics-conversion for product metrics (use analytics-product)
