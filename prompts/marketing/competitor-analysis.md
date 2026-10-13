---
name: competitor-analysis
category: marketing
skills: [competitor-alternatives, business-analytics, content-strategy]
mode: plan
estimated_tokens: 750
---

# Competitor Analysis

## When to use
Use before launching a product, feature, or campaign, when you need the competitive landscape as a structured analysis you can act on. For broad, multi-source research, run it through `/deep-research` and apply this template to the results.

## Template

```
Analyze the competitive landscape for the product or feature below. Produce actionable insights, not only a list of competitors.

**Our product:**
{{what_we_do}}

**Our positioning:**
{{how_we_describe_ourselves}}

**Known competitors:**
{{list_known_competitors — or "identify them for me"}}

Step 1: Identify competitors
Categorize each one:
- Direct: same problem, same audience.
- Indirect: same problem solved differently, or a related problem.
- Potential: adjacent products that could enter this space.

For each, record with a source link:
- Website URL
- Pricing model and price points
- Key features
- Target audience
- Company size or funding, when public

Step 2: Feature matrix
| Feature | Us | Competitor A | Competitor B | Competitor C |
|---|---|---|---|---|
| Feature 1 | Y/N/Partial | Y/N/Partial | ... | ... |
| Pricing | $X/mo | $Y/mo | ... | ... |
| Free tier | Y/N | Y/N | ... | ... |

Step 3: Positioning analysis
For each competitor:
- Messaging: what the homepage hero says and which pain it leads with.
- Differentiation: what they claim makes them unique.
- Weaknesses: where users complain (review sites, launch sites, community forums, social posts).
- Strengths: what users praise.

Step 4: Gap analysis
- Features we have that they lack (advantages).
- Features they have that we lack (gaps).
- Underserved segments.
- Unoccupied price points.

Step 5: Recommendations
1. Positioning statement against this landscape.
2. Top 3 differentiators.
3. Feature priorities based on competitive gaps.
4. Messaging angles that address competitor weaknesses truthfully.
5. Content topics competitors cover poorly.

Evidence rules: cite a source for every pricing, feature, and complaint claim. Mark anything you could not verify as "unverified" instead of filling it in.

Output: one markdown document with all tables and recommendations.
```

## Tips
- Use the `competitor-alternatives` skill to turn the analysis into comparison pages.
- Pair with `content-strategy` to turn gaps into calendar items.
- Re-run quarterly; pricing and features drift.
- To share the result, the Artifact tool can publish it as a private page; publishing it more widely is the user's call.

## Example

```
Analyze the competitive landscape for the product or feature below.

**Our product:** An open-source configuration toolkit (skills, hooks, commands) for AI coding assistants
**Our positioning:** Comprehensive, opinionated, community-driven
**Known competitors:** identify them for me
```
