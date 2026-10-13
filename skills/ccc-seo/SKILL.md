---
name: ccc-seo
description: "SEO domain router: technical SEO, AI search optimization, content strategy and briefs, rankings, backlinks, site structure, analytics and programmatic pages, one specialist at a time. Use when the user asks to audit, plan, track or improve search visibility."
allowed-tools:
  - Read
  - Glob
  - Bash
  - Write
  - AskUserQuestion
argument-hint: "[audit | ai-search | content | brief | rankings | programmatic | blog | links | structure | analytics | social]"
model: inherit
effort: medium
---

# /ccc-seo — the right SEO specialist

**CC Commander** · /ccc-seo · one entry to the SEO domain; routes to a single specialist sub-skill in this directory and keeps a shared `seo-context.md` behind every task.

The user's selected model is preserved. Codex: ask pickers as plain-text questions.

## When to use / when not to

- Use for search visibility work: technical SEO, AI search citations, content planning, briefs, rankings, links, site structure, analytics and tracking, programmatic pages, social previews.
- Use `/ccc-marketing` for campaigns, copy and paid channels, `/ccc-content` for writing the piece itself, and `/ccc-data` for warehouse dashboards.

## Sub-skills

Each lives at `<dir>/SKILL.md` beside this file. Load one at a time.

| Directory | Use for |
|---|---|
| `seo-router/` | Decision tree when the intent is unclear |
| `seo-context/` | Capture domain state (rankings, competitors, tools, goals) into `seo-context.md` |
| `seo-optimizer/` | Technical SEO: meta, Open Graph, JSON-LD, sitemaps, robots.txt, Core Web Vitals, hreflang, canonicals |
| `site-architecture/` | Page hierarchy, URL strategy, navigation, internal linking, breadcrumbs |
| `ai-seo/` | Get cited by LLMs and AI answer engines (AEO, GEO) |
| `aaio/` | Make a site usable by AI agents: robots.txt AI bot policy, markdown twins, JSON-LD |
| `content-strategy/` | Content pillars, editorial calendar, distribution |
| `content-cluster/` | Pillar pages, cluster content, internal linking map |
| `seo-content-brief/` | One page's brief for a writer: keyword, intent, structure |
| `blog-engine/` | SEO blog system (MDX, RSS, sitemap, structured data) |
| `guest-blogger/` | Guest post search strategy, quality scoring, pitch templates |
| `serp-analyzer/` | What ranks for a keyword, featured-snippet openings |
| `search-console/` | Google Search Console performance, index coverage, crawl data |
| `backlink-audit/` | Backlink profile, toxic links, disavow candidates, link opportunities |
| `analytics-conversion/` | GA4, Plausible or PostHog events, UTMs, funnels, consent |
| `analytics-product/` | Product funnels, cohorts, retention, north-star metric |
| `bulk-page-generator/` | Template-driven pages at scale (city, comparison, integration pages) |
| `social-integration/` | OG images, Twitter cards, share buttons, share tracking |
| `seo-dashboard/` | Unified health report across technical, content, links and performance |

Keep this table matched to the directory: `ls -d "${CLAUDE_SKILL_DIR}"/*/` (repo fallback `ls -d skills/ccc-seo/*/`).

## What happens

### 1. Pick the lane

An argument or a clear request routes directly:

| Intent | Route to | Not to be confused with |
|---|---|---|
| "Audit my SEO", "what's wrong with my SEO?" | `seo-optimizer` + `seo-dashboard` | `backlink-audit` (links only) |
| "Optimize for AI search", "show up in AI answers" | `ai-seo` + `aaio` | `seo-optimizer` (traditional SEO) |
| "Plan my content", "what should I write about?" | `content-strategy` + `content-cluster` | `seo-content-brief` (one page) |
| "Write an SEO brief for this page" | `seo-content-brief` | `content-strategy` (strategy, not execution) |
| "Track my rankings", "how am I performing?" | `search-console` + `serp-analyzer` | `analytics-conversion` (conversions, not rankings) |
| "Build pages at scale", programmatic SEO | `bulk-page-generator` | `blog-engine` (editorial content) |
| "Set up a blog", blog with SEO | `blog-engine` | `content-strategy` (planning) |
| "Fix my backlinks", link building | `backlink-audit` + `guest-blogger` | `site-architecture` (internal links) |
| "Fix site structure", internal linking | `site-architecture` | `backlink-audit` (external links) |
| "Set up analytics", track conversions | `analytics-conversion` | `analytics-product` (product metrics) |
| User funnels, retention analysis | `analytics-product` | `analytics-conversion` (marketing metrics) |
| Social sharing, OG images | `social-integration` | `content-strategy` (distribution) |

With no argument and no clear intent, ask with AskUserQuestion (header "SEO"):

- 🟢 Full SEO audit — technical, structure, links and performance in one prioritized plan
- AI search optimization — get cited in AI answers and readable by AI agents
- Content plan — topic clusters, pillars and per-page briefs
- More… — rankings, programmatic pages, blog setup, links, analytics, social (a follow-up picker; 🟢 Track rankings first)

Multi-step jobs follow a campaign in [references/campaigns.md](references/campaigns.md).

### 2. Load the context

```bash
test -s seo-context.md && echo "context: present" || echo "context: missing"
```

On `missing`, run `seo-context/SKILL.md` first. On `present`, Read it and carry its domain, competitors and goals into the lane.

### 3. Check data access before an API lane

`backlink-audit`, `serp-analyzer` and `search-console` call third-party APIs. Check the keys they name without printing values:

```bash
for v in SEMRUSH_API_KEY AHREFS_API_KEY SERPAPI_API_KEY GSC_ACCESS_TOKEN; do if printenv "$v" >/dev/null; then echo "$v: set"; else echo "$v: missing"; fi; done
```

A missing key means the lane runs in manual mode on exports the user provides; say so in one line rather than guessing data.

### 4. Run the lane

Read `<lane>/SKILL.md` and follow it. Tell the user in one line which lane ran. Write deliverables (audit, brief, plan) to a Markdown file the user chooses, default `./seo/<topic>-<YYYY-MM-DD>.md`.

## Done when

- The lane's deliverable exists (`test -s <file> && echo ok` printed `ok`) and its path is reported.
- Every finding cites its source: a file and line, a URL fetched this turn, or a named export. Figures not measured this turn are labeled estimates.
- Code changes (meta, sitemap, JSON-LD, robots.txt) were checked with the project's build or test command, and the result is quoted.

## Guardrails

- Never deploy pages, submit sitemaps, file a disavow list, publish posts or send outreach pitches without authorization in the current conversation; ask with a picker at that moment.
- Never print, log or commit an API key or token; read them from the environment only.
- Never load every sub-skill at once, and never skip `seo-context` on a first session.
- Keep internal linking (`site-architecture`) separate from external links (`backlink-audit`), and product metrics (`analytics-product`) separate from marketing conversions (`analytics-conversion`).

## See also

- `/ccc-marketing` — campaigns, copy, launch
- `/ccc-content` — write the piece a brief describes
- `/ccc-data` — dashboards and pipelines beyond SEO
- `/ccc-design` — page layout and OG image design
