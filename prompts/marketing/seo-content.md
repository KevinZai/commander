---
name: seo-content
category: marketing
skills: [seo-content-brief, ai-seo, content-strategy]
mode: code
estimated_tokens: 600
---

# SEO Content Creation

## When to use
Use when creating content that needs to rank in search and answer engines. The template covers keyword analysis, structure, on-page SEO, and structured data, all executable in the repository that holds the site content. It writes files; publishing or deploying the page is a separate, authorized step.

## Template

~~~
Create SEO-optimized content for the topic below. The content must be genuinely useful, not keyword-stuffed, while meeting every on-page SEO requirement.

**Topic:**
{{what_the_content_is_about}}

**Target keyword:**
{{primary_keyword}}

**Secondary keywords:**
{{keyword_2, keyword_3, keyword_4 — or "research for me"}}

**Content type:**
{{blog post|landing page|documentation|comparison page}}

**Target word count:**
{{1500|2500|4000 — or "recommend based on what currently ranks"}}

Step 1: Keyword analysis
- Search existing site content (Grep) for the target keyword to catch cannibalization; report any page that already targets it.
- Identify search intent: informational, navigational, transactional, or commercial.
- Pick the format that matches intent: how-to, listicle, comparison, or guide.

Step 2: Structure
- Title (H1): includes the primary keyword, under 60 characters.
- Meta description: 150-160 characters, includes the keyword and a CTA.
- URL slug: short, keyword-rich, hyphenated.
- H2 sections: each targets a subtopic or secondary keyword.
- H3 subsections: break down complex H2s.
- FAQ section aimed at featured snippets and "People also ask".

Step 3: Write
- Write for people first, search engines second.
- Put the primary keyword in the title, first paragraph, one H2, and the meta description.
- Use secondary keywords where they read naturally.
- Add internal links to {{number}} related pages that exist; list each target path.
- Link to authoritative external sources for factual claims.
- Write alt text for every image.
- Keep paragraphs to 2-3 sentences.
- End with a clear CTA.

Step 4: Technical SEO
- Add JSON-LD structured data where it applies: Article (blog posts), FAQPage (FAQ sections), HowTo (tutorials), Product (product pages).
- Keep heading hierarchy valid: one H1, sequential H2/H3.
- Set the canonical URL.
- Set Open Graph and Twitter Card meta tags.

Step 5: Output
Write the content as a markdown file whose frontmatter carries the SEO metadata:

```yaml
title: "..."
description: "..."
slug: "..."
keywords: [...]
schema_type: "..."
```

Then report the title and meta-description character counts and validate the JSON-LD parses.
~~~

## Tips
- Use `seo-content-brief` to produce a full brief before writing.
- Use `ai-seo` to structure content for AI search and answer engines.
- Check existing site content first to avoid cannibalization.

## Example

```
Create SEO-optimized content for the topic below.

**Topic:** How to set up an AI coding assistant for team development
**Target keyword:** "AI coding assistant team setup"
**Secondary keywords:** "shared project instructions", "team hooks configuration", "AI code review workflow"
**Content type:** Tutorial / how-to guide
**Target word count:** 2500
```
