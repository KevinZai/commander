---
name: competitor-analysis
category: marketing
skills: [competitor-alternatives, business-analytics, content-strategy]
mode: plan
estimated_tokens: 700
---

# Competitor Analysis

## When to Use
When you need to understand the competitive landscape before launching a product, feature, or marketing campaign. This template produces a structured analysis you can act on.

## Template

```
Analyze the competitive landscape for the following product/feature. Produce actionable insights, not just a list of competitors.

**Our product:**
{{what_we_do}}

**Our positioning:**
{{how_we_describe_ourselves}}

**Known competitors:**
{{list_known_competitors — or say "identify them for me"}}

**Step 1: Identify competitors**
Research and categorize:
- **Direct competitors** — solve the same problem for the same audience
- **Indirect competitors** — solve the same problem differently, or a related problem
- **Potential competitors** — adjacent products that could enter our space

For each, find:
- Website URL
- Pricing model and price points
- Key features
- Target audience
- Company size / funding (if public)

**Step 2: Feature matrix**
Create a comparison table:

| Feature | Us | Competitor A | Competitor B | Competitor C |
|---|---|---|---|---|
| Feature 1 | Y/N/Partial | Y/N/Partial | ... | ... |
| Feature 2 | ... | ... | ... | ... |
| Pricing | $X/mo | $Y/mo | ... | ... |
| Free tier | Y/N | Y/N | ... | ... |

**Step 3: Positioning analysis**
For each competitor:
- **Messaging:** What do they say on their homepage hero? What pain do they lead with?
- **Differentiation:** What do they claim makes them unique?
- **Weaknesses:** Where do users complain? (check G2, Product Hunt, Reddit, Twitter)
- **Strengths:** What do users praise?

**Step 4: Gap analysis**
- Features we have that they don't (our advantages)
- Features they have that we don't (our gaps)
- Underserved segments (audiences nobody is targeting well)
- Pricing gaps (price points nobody occupies)

**Step 5: Strategic recommendations**
Based on the analysis:
1. **Positioning statement:** How should we position against this landscape?
2. **Key differentiators:** Top 3 things that make us different
3. **Feature priorities:** What should we build next based on competitive gaps?
4. **Messaging angles:** Headlines and copy that exploit competitor weaknesses
5. **Content opportunities:** Topics competitors aren't covering well

**Output:**
Save as a structured markdown document with all tables and recommendations.
```

## Tips
- Use the `competitor-alternatives` skill for automated competitive intelligence
- Pair with the `content-strategy` skill to turn gaps into content calendar items
- Update this analysis quarterly — the landscape changes fast

## Example

```
Analyze the competitive landscape for the following product/feature.

**Our product:** An open-source Claude Code configuration toolkit (skills, hooks, commands)
**Our positioning:** "The Claude Code Bible" — comprehensive, opinionated, community-driven
**Known competitors:** Cline, Continue.dev, Aider, Cursor rules repos
```
