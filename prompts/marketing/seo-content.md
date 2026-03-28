---
name: seo-content
category: marketing
skills: [seo-content-brief, ai-seo, content-strategy]
mode: code
estimated_tokens: 600
---

# SEO Content Creation

## When to Use
When creating content that needs to rank in search engines. This template covers keyword research, content structure, and on-page SEO optimization — all executable within Claude Code.

## Template

```
Create SEO-optimized content for the following topic. The content must be genuinely useful (not keyword-stuffed) while hitting all on-page SEO requirements.

**Topic:**
{{what_the_content_is_about}}

**Target keyword:**
{{primary_keyword}}

**Secondary keywords:**
{{keyword_2, keyword_3, keyword_4 — or say "research for me"}}

**Content type:**
{{blog post|landing page|documentation|comparison page}}

**Target word count:**
{{1500|2500|4000 — or say "recommend based on SERP analysis"}}

**Step 1: Keyword analysis**
- Use Grep to check existing content for keyword cannibalization
- Identify search intent: informational, navigational, transactional, or commercial
- Determine content format that matches intent (how-to, listicle, comparison, guide)

**Step 2: Content structure**
Build the outline:
- **Title (H1):** Include primary keyword, under 60 characters
- **Meta description:** 150-160 characters, includes keyword, has a CTA
- **URL slug:** short, keyword-rich, hyphenated
- **H2 sections:** each targets a subtopic or secondary keyword
- **H3 subsections:** break down complex H2s
- FAQ section (targets featured snippet / People Also Ask)

**Step 3: Write content**
- Write for humans first, search engines second
- Include the primary keyword in: title, first paragraph, one H2, meta description
- Use secondary keywords naturally throughout (not forced)
- Add internal links to {{number}} related pages
- Include external links to authoritative sources
- Write alt text for all images
- Use short paragraphs (2-3 sentences max)
- Include a clear CTA

**Step 4: Technical SEO**
- Add structured data (JSON-LD) if applicable:
  - Article schema for blog posts
  - FAQ schema for FAQ sections
  - HowTo schema for tutorials
  - Product schema for product pages
- Ensure heading hierarchy is correct (one H1, sequential H2/H3)
- Add canonical URL
- Set Open Graph and Twitter Card meta tags

**Step 5: Output**
Write the content as a markdown file, plus a frontmatter block with all SEO metadata:
```yaml
title: "..."
description: "..."
slug: "..."
keywords: [...]
schema_type: "..."
```
```

## Tips
- Use the `ai-seo` skill for AI search optimization (LLM-friendly structured content)
- The `seo-content-brief` skill generates a full content brief before writing
- Check existing site content first to avoid cannibalization

## Example

```
Create SEO-optimized content for the following topic.

**Topic:** How to set up Claude Code for team development
**Target keyword:** "Claude Code team setup"
**Secondary keywords:** "Claude Code configuration", "Claude Code CLAUDE.md", "Claude Code hooks"
**Content type:** Tutorial / how-to guide
**Target word count:** 2500
```
