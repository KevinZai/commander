---
name: ad-copy
category: marketing
skills: [ad-creative, paid-ads, ccc-marketing]
mode: code
estimated_tokens: 450
---

# Ad Copy Generation

## When to use
Use when writing ad copy for Google Ads, Meta (Facebook/Instagram), LinkedIn, or X. The template produces A/B variants that respect each platform's character limits. It drafts copy only; launching or editing a live campaign is a separate, authorized step.

## Template

```
Generate ad copy for the product below. Produce variants for A/B testing that fit {{platform}} limits.

**Product:**
{{what_it_is_and_what_it_does}}

**Target audience:**
{{who_sees_these_ads — demographics, interests, job titles}}

**Platform:**
{{Google Search|Google Display|Meta (FB/IG)|LinkedIn|X}}

**Campaign objective:**
{{conversions|traffic|awareness|leads}}

**Landing page:**
{{landing_page_URL_or_description}}

**Budget context:**
{{daily_budget_or_unknown}}

Step 1: Messaging angles
Pick 3 or 4 distinct angles to test:
1. Pain point: lead with the problem this solves.
2. Benefit: lead with the outcome.
3. Social proof: lead with numbers, testimonials, or authority. Use only proof I supplied or that you can cite; never invent metrics or quotes.
4. Curiosity: lead with a hook that creates intrigue without misleading.

Step 2: Copy per platform
Google Search, per angle:
- Headline 1 (max 30 chars): primary value proposition
- Headline 2 (max 30 chars): supporting point
- Headline 3 (max 30 chars): call to action
- Description 1 (max 90 chars): expanded benefit
- Description 2 (max 90 chars): proof or urgency
- 4 sitelink extensions: title + description pairs

Meta, per angle:
- Primary text (125 chars before the fold, 2,000 max)
- Headline (max 40 chars, below the image)
- Description (max 30 chars)
- CTA button: {{Shop Now|Learn More|Sign Up|Download|Get Started}}
- Suggested image or video concept

LinkedIn, per angle:
- Introductory text (150 chars before the fold, 600 max)
- Headline (max 70 chars)
- Description (max 100 chars)
- CTA: {{Learn More|Sign Up|Download|Request Demo}}

Step 3: Exclusions
- Google: negative keywords that filter irrelevant traffic.
- Meta and LinkedIn: audience exclusions that cut waste.

Step 4: Output
Return every variant in one comparison table with the actual character count of each field, and flag any field over its limit:
| Angle | Headline (chars) | Description (chars) | CTA | Limits met |
|---|---|---|---|---|
```

## Tips
- Pair with the `ad-creative` skill for visual concepts and `paid-ads` for campaign structure.
- Count characters for every field; platforms truncate or reject over-limit copy.
- Test angles before polishing wording; the message matters more than the phrasing.
- Platform limits change. Confirm current limits in the ad platform before launch.

## Example

```
Generate ad copy for the product below. Produce variants for A/B testing that fit Google Search limits.

**Product:** An open-source plugin that adds planning, review, and shipping workflows to an AI coding assistant
**Target audience:** Software developers who use AI coding tools (ages 25-45)
**Platform:** Google Search
**Campaign objective:** Traffic to the project's install page
**Landing page:** https://example.com/install
```
