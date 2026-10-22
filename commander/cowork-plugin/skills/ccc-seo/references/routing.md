# /ccc-seo — sub-skill catalog and routing

Reference for SKILL.md steps 2–3. Not shown to the user as a menu.

Sub-skills ship with the Commander CLI toolkit at `skills/ccc-seo/<name>/SKILL.md`. When a sub-skill is not available in the session, apply the one-line method in its row.

## Catalog

| Category | Sub-skills |
|---|---|
| Foundation | `seo-router`, `seo-context` |
| Technical SEO | `seo-optimizer`, `site-architecture` |
| AI search | `ai-seo`, `aaio` |
| Content | `content-strategy`, `content-cluster`, `seo-content-brief`, `blog-engine`, `guest-blogger` |
| Analytics and tracking | `analytics-conversion`, `analytics-product`, `search-console`, `serp-analyzer` |
| Growth | `bulk-page-generator`, `backlink-audit`, `social-integration` |
| Dashboard | `seo-dashboard` |

## Intent → route

| Intent | Route |
|---|---|
| "Fix technical SEO", audit | `seo-optimizer` |
| Site structure, URL strategy, internal links | `site-architecture` |
| Rank in AI search, ChatGPT or Perplexity citations | `ai-seo` + `aaio` |
| Content plan, editorial calendar | `content-strategy` + `content-cluster` |
| SEO content brief | `seo-content-brief` |
| Set up a blog | `blog-engine` |
| Guest posting | `guest-blogger` |
| Track conversions, GA4 setup | `analytics-conversion` |
| Product analytics, retention | `analytics-product` |
| Search Console data | `search-console` |
| Competitor SERP analysis | `serp-analyzer` |
| Programmatic SEO, scale pages | `bulk-page-generator` |
| Backlink audit | `backlink-audit` |
| Social sharing, OG images | `social-integration` |
| SEO health overview | `seo-dashboard` |

## Flows

### Technical audit + fix

1. `seo-context` → capture domain state
2. `seo-optimizer` → meta tags, sitemaps, canonicals, Core Web Vitals
3. `site-architecture` → URL structure and internal linking
4. `search-console` → crawl errors and index coverage (needs the user's Google credentials)
5. `seo-dashboard` → health overview

### AI search optimization

The terms: AEO (answer engine optimization) structures content for direct answers; GEO (generative engine optimization) targets AI-generated summaries; LLMO (large language model optimization) raises citation likelihood in assistants such as ChatGPT, Claude, Perplexity and Gemini.

1. `seo-context` → baseline
2. `ai-seo` → citation-ready structure: question headings, concise answers, sourced facts
3. `aaio` → AI-crawler rules in `robots.txt`, markdown twins, JSON-LD
4. `content-cluster` → topic authority

### Content engine setup

1. `content-strategy` → pillars and editorial calendar
2. `seo-content-brief` → per-page keyword targeting
3. `blog-engine` → Next.js or Astro blog with MDX and a sitemap
4. `analytics-conversion` → track content conversions

## One-line methods (fallback when the sub-skill is not loaded)

- `seo-context`: record domain, goals, target keywords, competitors and available tools in `seo-context.md`.
- `seo-optimizer`: per route, a unique title (≤ 60 chars) and description (≤ 155 chars), canonical, Open Graph tags, JSON-LD, sitemap and robots; check Core Web Vitals with the framework's tooling.
- `site-architecture`: flat hierarchy (important pages ≤ 3 clicks deep), descriptive URLs, hub pages linking to their cluster.
- `ai-seo`: lead each section with a one- or two-sentence answer, use question-shaped headings, cite sources, keep facts current and dated.
- `aaio`: explicit AI-crawler rules, a clean markdown version of key pages, complete JSON-LD for the organization and products.
- `content-cluster`: one pillar page per topic, eight to fifteen cluster pages, each linking back to the pillar.
- `seo-content-brief`: primary and secondary keywords, search intent, outline from the top results, questions to answer, target length.
- `blog-engine`: MDX posts, categories and tags, RSS, per-post metadata and sitemap entries.
- `analytics-conversion`: define conversion events first, then wire the analytics provider the project already uses, with UTM handling.
- `search-console`: performance by query and page, index coverage, URL inspection for priority pages.
- `serp-analyzer`: top results for a keyword, their format and depth, SERP features, the gap to target.
- `bulk-page-generator`: one template, one data source, unique value per page, schema markup, sitemap entries; refuse thin duplicates.
- `backlink-audit`: referring domains, anchor distribution, toxic links, link-gap versus competitors.
- `social-integration`: Open Graph and Twitter card tags, generated OG images, share buttons.
- `seo-dashboard`: one view combining technical, content, backlink and performance data.

## Example routes

- "Audit my site's SEO and fix the technical issues" → Technical audit + fix, starting at `seo-optimizer`.
- "Optimize my site to appear in ChatGPT and Perplexity answers" → AI search optimization (`ai-seo` + `aaio`).
- "Generate city landing pages for programmatic SEO" → `bulk-page-generator` with schema markup.
