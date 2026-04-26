---
name: ccc-marketing
context: fork
description: CCC domain — 45-skill marketing division for AI coding agents. 7 specialist pods covering content, SEO, CRO, channels, growth, intelligence, and sales. Works standalone or with connected web search tools.
allowed-tools:
  - Read
---

# ccc-marketing

> Load ONE skill. Get the entire marketing domain. 45 skills across 7 specialist pods.

## Pod Overview

| Pod | Skills | Key Capabilities |
|-----|--------|-----------------|
| **Foundation** | 2 | Brand context capture, skill routing |
| **Content** | 8 | Strategy → production → editing → humanization |
| **SEO** | 5 | Technical SEO, AI SEO (AEO/GEO), schema, architecture |
| **CRO** | 6 | Page, form, signup, onboarding, popup, paywall optimization |
| **Channels** | 5 | Email sequences, paid ads, cold email, ad creative |
| **Growth** | 4 | A/B testing, referral programs, free tools, churn prevention |
| **Intelligence** | 4 | Competitor analysis, marketing psychology, analytics, campaigns |
| **Sales & GTM** | 2 | Pricing strategy, launch planning |
| **New** | 3 | Influencer outreach, Product Hunt launch, SEO content production |

## Routing Matrix

| Your Intent | Route To |
|-------------|----------|
| "Write content" / "Blog post" / "Article" | Content pod → `content-strategy` + `content-production` |
| "AI-sounding content" / "Humanize" | `content-humanizer` |
| "SEO audit" / "Fix my SEO" | SEO pod → `seo-optimizer` + `seo-content-brief` |
| "AI search" / "Rank in ChatGPT" | `ai-seo` + `aaio` |
| "Improve conversion" / "CRO" | CRO pod → `page-cro` + `signup-flow-cro` |
| "Email sequences" / "Drip campaign" | Channels pod → email sequences skill |
| "Paid ads" / "Ad copy" | `ad-creative` |
| "A/B test" / "Experiment" | Growth pod → `ab-testing` |
| "Referral program" | `referral-program` |
| "Competitor analysis" | Intelligence pod → `competitive-analysis` |
| "Launch strategy" / "Product Hunt" | Sales & GTM pod → `product-hunt-launch` |
| "Pricing strategy" | `pricing-strategy` |
| "Influencer outreach" | `influencer-outreach` |

## Unique Features

- **AI SEO (AEO/GEO/LLMO)** — Optimize for AI citation, not just traditional ranking
- **Content Humanizer** — Detect and fix AI writing patterns with scoring
- **Context Foundation** — One brand context file feeds all 45 skills
- **Zero Dependencies** — All Python tools use stdlib only (27 scripts)

## First-Time Setup

Run the `marketing-context` sub-skill first to capture brand voice, audience personas, and competitive landscape. Every other skill reads this for consistent output.

## When to invoke this skill

**Example 1**
- user: write a blog post about our new feature
- assistant: Loads ccc-marketing and routes to content-production pod — content-strategy → content-production → content-humanizer pipeline.

**Example 2**
- user: improve our landing page conversion rate
- assistant: Loads ccc-marketing and routes to CRO pod — page-cro + signup-flow-cro + form-cro with A/B test recommendations.

**Example 3**
- user: set up email sequences for our SaaS trial
- assistant: Loads ccc-marketing and routes to Channels pod — email sequences skill with onboarding, nurture, and churn prevention flows.
