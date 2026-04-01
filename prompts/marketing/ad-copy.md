---
name: ad-copy
category: marketing
skills: [ad-creative, marketing-pack, content-strategy]
mode: code
estimated_tokens: 400
---

# Ad Copy Generation

## When to Use
When creating ad copy for Google Ads, Meta (Facebook/Instagram) Ads, or LinkedIn Ads. This template generates multiple variants optimized for each platform's constraints and best practices.

## Template

```
Generate ad copy for the following product. Create multiple variants for A/B testing, optimized for {{platform}}.

**Product:**
{{what_it_is_and_what_it_does}}

**Target audience:**
{{who_sees_these_ads — demographics, interests, job titles}}

**Platform:**
{{Google Search|Google Display|Meta (FB/IG)|LinkedIn|Twitter/X}}

**Campaign objective:**
{{conversions|traffic|awareness|leads}}

**Landing page:**
{{URL_or_describe_the_landing_page}}

**Budget context:**
{{daily_budget_or_say_unknown}}

**Step 1: Messaging angles**
Identify 3-4 distinct angles to test:
1. **Pain point** — lead with the problem this solves
2. **Benefit** — lead with the outcome/transformation
3. **Social proof** — lead with numbers, testimonials, authority
4. **Curiosity** — lead with a hook that creates intrigue

**Step 2: Generate copy per platform**

**If Google Search Ads:**
For each angle, write:
- Headline 1 (30 chars max): {{primary_value_prop}}
- Headline 2 (30 chars max): {{supporting_point}}
- Headline 3 (30 chars max): {{CTA}}
- Description 1 (90 chars max): {{expanded_benefit}}
- Description 2 (90 chars max): {{proof_or_urgency}}
- Sitelink extensions (4): title + description pairs

**If Meta Ads:**
For each angle, write:
- Primary text (125 chars above fold, 2000 max)
- Headline (40 chars max, appears below image)
- Description (30 chars max)
- CTA button: {{Shop Now|Learn More|Sign Up|Download|Get Started}}
- Suggested image/video concept

**If LinkedIn Ads:**
For each angle, write:
- Introductory text (150 chars above fold, 600 max)
- Headline (70 chars max)
- Description (100 chars max)
- CTA: {{Learn More|Sign Up|Download|Request Demo}}

**Step 3: Negative keywords / exclusions**
- Google: list negative keywords to exclude irrelevant traffic
- Meta/LinkedIn: audience exclusions to avoid waste

**Step 4: Output**
Present all variants in a table for easy comparison and selection:
| Angle | Headline | Description | CTA | Platform constraints met |
|---|---|---|---|---|
```

## Tips
- Use the `ad-creative` skill for visual ad concepts alongside copy
- Always include character counts — platforms reject over-limit ads silently
- Test angles before optimizing copy — the right message matters more than perfect wording

## Example

```
Generate ad copy for the following product. Create multiple variants for A/B testing.

**Product:** CC Commander — 441+ skills, hooks, and commands for Claude Code
**Target audience:** Software developers who use AI coding tools (ages 25-45)
**Platform:** Google Search
**Campaign objective:** Traffic to GitHub repo (stars + installs)
**Landing page:** https://kevinzai.github.io/cc-commander
```
