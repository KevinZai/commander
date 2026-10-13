# /ccc-marketing — sub-skill catalog and routing

Reference for SKILL.md steps 2–3. Not shown to the user as a menu.

Sub-skills ship with the Commander CLI toolkit at `skills/ccc-marketing/<name>/SKILL.md`. When a sub-skill is not available in the session, apply the one-line method in its row. All of them read the brand context file (`marketing-context.md` or `.agents/marketing-context.md`) first.

## Catalog by pod

| Pod | Sub-skills |
|---|---|
| Foundation | `marketing-context`, `marketing-ops` (router), `brand-guidelines` |
| Content | `content-strategy`, `content-production`, `content-humanizer`, `copywriting`, `copy-editing`, `social-content`, `social-media-manager`, `seo-content-production` |
| SEO (overlaps `/ccc-seo`) | `seo-audit`, `ai-seo`, `schema-markup`, `site-architecture`, `programmatic-seo` |
| CRO | `page-cro`, `signup-flow-cro`, `onboarding-cro`, `form-cro`, `popup-cro`, `paywall-upgrade-cro` |
| Channels | `email-sequence`, `paid-ads`, `ad-creative`, `cold-email`, `influencer-outreach` |
| Growth | `ab-test-setup`, `referral-program`, `free-tool-strategy`, `churn-prevention` |
| Intelligence | `competitor-alternatives`, `marketing-psychology`, `campaign-analytics`, `analytics-tracking`, `social-media-analyzer` |
| Sales and GTM | `pricing-strategy`, `launch-strategy`, `product-hunt-launch`, `marketing-strategy-pmm`, `marketing-demand-acquisition` |
| Other | `marketing-ideas`, `app-store-optimization`, `prompt-engineer-toolkit` |

`content-creator` is deprecated; route its requests to `content-production` or `content-strategy`.

## Intent → route

| Intent | Route |
|---|---|
| "Set up brand voice", "who is my customer", ICP | `marketing-context` |
| "Write content", blog, article | `content-strategy` → `content-production` → `content-humanizer` |
| "Sounds like AI", humanize | `content-humanizer` |
| Landing page or homepage copy | `copywriting`, then `copy-editing` |
| Social calendar or posts | `social-content`, `social-media-manager` |
| "SEO audit", "fix my SEO" | `seo-audit`, or hand off to `/ccc-seo` |
| "Rank in ChatGPT", AI search | `ai-seo`, or `/ccc-seo` for the full AI-search flow |
| "Improve conversion", CRO | `page-cro` (+ `signup-flow-cro` or `form-cro` by surface) |
| Onboarding, activation | `onboarding-cro` |
| Paywall, upgrade screen | `paywall-upgrade-cro` |
| Email sequence, drip campaign | `email-sequence` |
| Paid ads, ad copy | `paid-ads`, `ad-creative` |
| Cold outreach | `cold-email` |
| A/B test, experiment | `ab-test-setup` |
| Referral or affiliate program | `referral-program` |
| Free tool as lead magnet | `free-tool-strategy` |
| Churn, cancel flow, dunning | `churn-prevention` |
| Competitor comparison pages | `competitor-alternatives` |
| Positioning, GTM | `marketing-strategy-pmm` |
| Launch plan, Product Hunt | `launch-strategy` → `product-hunt-launch` |
| Pricing | `pricing-strategy` |
| Influencer outreach | `influencer-outreach` |
| Campaign ROI, attribution | `campaign-analytics` |
| Tracking plan, GA4, GTM | `analytics-tracking` |
| "Give me ideas" | `marketing-ideas` |

## One-line methods (fallback when the sub-skill is not loaded)

- `marketing-context`: interview for product, ICP, personas, positioning, competitors, voice and banned phrases; write them as `##` sections in `marketing-context.md`.
- `content-strategy`: pick three to five pillars from the ICP's problems; map each to searchable topics and a publishing cadence.
- `content-production`: brief → outline → draft → edit → final, with a CTA tied to one goal.
- `content-humanizer`: cut filler, hedges and stock phrases; vary sentence length; add specific examples; score before and after.
- `copywriting`: one reader, one promise, one CTA per page; headline names the outcome; proof follows every claim.
- `page-cro`: audit value prop clarity, friction, trust and CTA hierarchy; return fixes ranked by expected impact and effort.
- `signup-flow-cro` / `form-cro`: remove every field that is not required now; inline validation; show progress.
- `email-sequence`: map trigger → goal → number of emails; each email has one job; include exit conditions.
- `ad-creative` / `paid-ads`: angle × format matrix; check character limits per platform (the toolkit ships `scripts/ad_copy_validator.py`).
- `ab-test-setup`: hypothesis, primary metric, guardrail metric, sample size (the toolkit ships `scripts/sample_size_calculator.py`), stop rule.
- `referral-program`: incentive for both sides, trigger moment, fraud limits.
- `competitor-alternatives`: honest comparison table, where each option fits best, sourced claims only.
- `pricing-strategy`: value metric first, then tiers, then price points; plan the communication for any increase.
- `launch-strategy`: pre-launch audience, launch-day checklist, post-launch follow-up; owners and dates for each.

## Example routes

- "Write a blog post about our new feature" → `content-strategy` → `content-production` → `content-humanizer`.
- "Improve our landing page conversion rate" → `page-cro` + `signup-flow-cro`, with an `ab-test-setup` plan for the top fix.
- "Set up email sequences for our SaaS trial" → `email-sequence` for onboarding and nurture, `churn-prevention` for the cancel flow.
