---
name: aaio
description: Agentic AI Optimization — make websites crawlable, citable, and usable by AI agents and browser automation. Use when building or auditing web projects for AI discoverability, implementing robots.txt AI bot policies, adding JSON-LD structured data, creating markdown twin routes, building accessibility trees for agent UX, or optimizing content structure for AI citation. Triggers on: AI SEO, AAIO, agentic optimization, AI discoverability, llms.txt, markdown twins, agent-ready, AI crawlers, structured data audit, schema.org, AI bot policy.
---

# Agentic AI Optimization (AAIO)

Make sites visible and usable to AI crawlers, citation engines, and browser agents.
Based on Joel Hooks' implementation checklist. Not just "AI SEO" — it's the overlap of traditional SEO, static truth in initial HTML, machine-readable surfaces, and UX ergonomics for agents.

## Core Principle

> If AI crawlers can't read your pages and browser agents can't operate your UI, your site is invisible in the workflows that matter next.

## 8-Step Checklist

### 1. Crawl Policy
Set explicit robots.txt for AI bots. Three classes:
- **Search/indexing:** OAI-SearchBot, Googlebot, Bingbot, Claude-SearchBot, PerplexityBot → Allow
- **User-triggered:** ChatGPT-User, Claude-User, Perplexity-User → Allow
- **Training:** GPTBot, Google-Extended, ClaudeBot → Block (unless you want training)

Add sitemap. Use `noindex` on private pages. Don't confuse `llms.txt` with discoverability — it's a hint surface, not the main channel.

See `references/robots-txt-template.md` for copy-paste template.

### 2. Critical Content in Initial HTML
- Server-render every page you want cited (docs, pricing, features, FAQs)
- Don't ship blank SPA shells — if `curl` can't see it, AI can't see it
- Don't hide facts behind tabs, modals, accordions, or client-side fetches
- Use real `<a href>` links, not `div + onClick`

**Verify:** `curl -sL URL | grep 'key fact'` — if missing, fix rendering.

### 3. Structured Content Patterns
- One heading = one idea. One paragraph = one claim.
- Front-load answers in first sentence under each heading
- Sections must make sense when copied out of context
- Use Q&A blocks, numbered steps, bullets, tables for citable facts
- Replace vague adjectives with measurable claims
- Put canonical answer in ONE place — duplication creates conflict

### 4. JSON-LD Schema
Match schema to page type. See `references/json-ld-templates.md` for templates.

| Page Type | Schema Types | Minimum Fields |
|-----------|-------------|----------------|
| Site-wide | Organization, WebSite | name, url, logo |
| Article/doc | Article, WebPage, BreadcrumbList | headline, description, dates, author, publisher |
| FAQ | FAQPage | mainEntity[] with Question + acceptedAnswer |
| How-to | HowTo | name, step[] |
| Product | Product, Offer | name, description, price, availability, brand |

**Rule:** Every JSON-LD value must match visible page content exactly. Re-validate after every content change.

### 5. Accessibility Tree = Agent Interface
OpenAI Atlas, Microsoft browser automation, and most agent frameworks use ARIA roles/labels/states. A11y work IS agent-interface work.

- Native elements first: `<button>`, `<a>`, `<input>`, `<select>`, `<table>`
- Label every form control. Add `autocomplete` values.
- Use landmarks: `<nav>`, `<main>`, `<header>`, `<footer>`
- Logical heading hierarchy. Descriptive link text.
- Expose state changes via ARIA.

**Anti-patterns:** `<div class="button" onclick>`, `<input placeholder="Email">` without label, `<div onclick="location.href">`

**Verify:** If Playwright `getByRole()` can't find it, agents can't either.

### 6. Machine Interfaces & Markdown Twins
The money section. A page can be indexable and still suck for agents.

**Three-surface pattern:**
- `/page` → HTML for humans
- `/page.md` → Markdown for agents (Content-Type: `text/markdown`)
- `/api/...` → Structured JSON

Same canonical source. Different projections. No drift.

**Discovery surfaces:**
- `robots.txt` → advertise sitemap.xml AND sitemap.md
- `sitemap.md` → list human URLs + markdown twins
- `llms.txt` → point to markdown sitemap and access patterns
- `/api` → discovery route with `next_actions`

**MIME discipline:**
- HTML: `text/html; charset=utf-8`
- Markdown: `text/markdown; charset=utf-8`
- JSON: `application/json; charset=utf-8`
- llms.txt: `text/plain; charset=utf-8`

If a markdown endpoint returns `text/html`, that's a bug.

See `references/machine-interfaces.md` for implementation patterns.

### 7. Agent-Ready Checkout (Commerce Only)
Skip for non-commerce. For e-commerce:
- Clean product catalog (precise titles, current prices, stable SKUs)
- Product + Offer schema on every product page
- Price/availability/shipping in visible HTML
- Evaluate Stripe Agentic Commerce Protocol if applicable

### 8. Measurement & Regression
- Track AI referrals separately (utm_source=chatgpt.com etc.)
- Log bot hits by user-agent
- Track citation presence for core queries
- Regression tests for important pages:

```bash
# AI crawler traffic
rg 'OAI-SearchBot|Googlebot|Claude-SearchBot|PerplexityBot' access.log
# Schema still present
curl -sL URL | rg 'application/ld\+json'
# Text-only smoke test
lynx -dump URL
```

## Quick Audit Workflow
When auditing an existing site:
1. `curl -s SITE/robots.txt` — check AI bot policy
2. `curl -sL SITE/ | head -100` — facts in initial HTML?
3. `curl -sL SITE/ | rg 'application/ld\+json'` — schema present?
4. Check heading hierarchy and content structure
5. Test a11y tree in devtools or Playwright
6. Check for markdown/API discovery surfaces
7. `curl -I -A 'OAI-SearchBot/1.3' SITE/` — bot response correct?

## For Coding Repos (AGENTS.md)
Passive always-on context in AGENTS.md beats optional skills the agent may never load:

```markdown
## Agent retrieval hints
- Prefer retrieval-led reasoning over pretrained guesses
- Start with `/api`, `sitemap.md`, and `/.md` twins before scraping HTML
- Verify Content-Type before parsing
- Treat HTML, markdown, JSON as projections of same resource

## Operator path
- Machine-readable content: try `{page}.md` first
- Structured discovery: `/api`
- Broad site discovery: `/sitemap.md`
```

## Definition of Done
- [ ] Search bots allowed, training bots blocked
- [ ] Critical facts in raw HTML
- [ ] Descriptive headings, direct answers, lists, tables
- [ ] JSON-LD validates
- [ ] A11y tree exposes buttons, links, forms, state
- [ ] Markdown/JSON discovery surfaces exist
- [ ] Analytics tracking AI referrals
