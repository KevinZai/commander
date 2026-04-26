---
name: research
description: "\"Research, analyze, audit, or investigate any topic. Use when: 'research', 'analyze', 'competitive analysis', 'audit', 'investigate', 'market research', 'code audit', 'SEO analysis', 'deep dive'.\""
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
argument-hint: "<topic, URL, repo, or competitor to research>"
---

# /ccc:research

> Placeholders like ~~knowledge base refer to connected tools. See [CONNECTORS.md](../../CONNECTORS.md).

Run a focused research session on any topic — competitive analysis, market research, code audits, SEO, or custom investigations. Delegates to the `researcher` agent for deep multi-source work.

## Quick Mode (default)

Ask two questions:

**Question 1 — What to research:**
"What do you want to research or analyze?" (free text)

**Question 2 — Research type:**
- A: Competitive analysis — compare against rivals
- B: Market research — size, trends, opportunities
- C: Code audit — quality, security, architecture review
- D: SEO / analytics — rankings, content gaps, technical health
- E: Custom — I'll describe what I need

Then delegate immediately to the `researcher` agent with context and research type.

## Power Mode

Activate by passing `--power` or `detailed`.

Multi-source research pipeline with parallel agents:
1. **Source gathering** — web search, docs, repos, internal knowledge
2. **Analysis** — pattern identification, gap analysis, synthesis
3. **Fact-checking** — cross-reference key claims
4. **Report** — structured output with sources and confidence levels

Output a full research report to `output/research/YYYY-MM-DD-<slug>.md`.

## Research Types

### Competitive Analysis
```
For each competitor:
- Product: features, pricing, positioning
- Technical: stack, performance, APIs
- Distribution: channels, SEO, social
- Strengths and weaknesses
- Opportunities for differentiation
```

### Market Research
```
- Market size (TAM/SAM/SOM)
- Key players and segments
- Trends (3-5 year horizon)
- Customer pain points
- Entry barriers
```

### Code Audit
```
- Architecture review (coupling, cohesion)
- Security scan (OWASP top 10)
- Performance hotspots
- Test coverage gaps
- Dependency health (outdated, vulnerable)
- Technical debt score
```

### SEO Analysis
```
- Core Web Vitals
- Technical health (crawlability, indexability)
- Content gaps vs. competitors
- Backlink profile
- Top ranking opportunities
```

## If Connectors Available

If **~~knowledge base** is connected:
- Search internal docs and prior research first before going external
- Avoid re-researching topics already covered
- Append findings to existing knowledge base docs

If **~~web search** (Tavily) is connected:
- Pull real-time web data for current pricing, news, competitive moves
- Search multiple sources in parallel for synthesis
- Extract clean structured data from competitor pages

If **~~project tracker** is connected:
- Create a research task to track the investigation
- Link output report to the issue on completion

## Output Format

```markdown
# Research Report: [Topic]
**Type:** [Research type]  **Date:** [Date]  **Confidence:** [High/Med/Low]

## Executive Summary
[3-5 bullet points — the key findings]

## Findings
[Detailed section per research type]

## Sources
[Numbered list of sources with URLs]

## Recommended Next Actions
1. [ ] [Action item]
```

## Tips

1. **Narrow the scope** — "analyze Vercel's edge functions vs. Cloudflare Workers" beats "research hosting."
2. **Parallel agents scale** — Power Mode runs 3-5 agents in parallel for 5x faster research.
3. **Output persists** — reports save to `output/research/` so future sessions can build on prior work.
4. **Code audits need a target** — provide a repo path or GitHub URL for the best code audit results.
