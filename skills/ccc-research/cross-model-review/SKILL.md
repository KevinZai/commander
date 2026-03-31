---
name: cross-model-review
description: "Review code, architecture, or decisions using multiple AI models for diverse perspectives and higher confidence."
version: 1.0.0
category: research
parent: ccc-research
tags: [ccc-research, review, multi-model]
disable-model-invocation: true
---

# Cross-Model Review

## What This Does

Uses multiple AI models to review the same code, architecture, or decision from different perspectives. Each model brings different training data, reasoning patterns, and blind spots. Cross-model review catches issues that single-model review misses and provides higher confidence when models agree.

## Instructions

1. **Identify what needs review.** Collect the artifact to review:
   - Code files, diffs, or PRs
   - Architecture decisions or design documents
   - Technical approaches or trade-off analyses
   - Specific questions where you want diverse opinions

2. **Select review perspectives.** Choose 2-3 models based on the task:
   - **Claude (Opus/Sonnet):** Deep reasoning, nuanced analysis, safety awareness
   - **Gemini Pro:** Large context window, broad knowledge, different training data
   - **GPT-4/GPT-5:** Different architectural patterns, alternative approaches
   - **Open models (Llama, Codestral):** Community-aligned perspectives, cost-free validation

3. **Craft the review prompt.** Send the same review request to each model with:
   - The artifact under review (code, doc, decision)
   - Specific review criteria (correctness, security, performance, maintainability)
   - Request for structured output (findings categorized by severity)
   - Ask each model to note areas of LOW confidence in their review

4. **Dispatch reviews in parallel.** Use subagents or tool calls to query multiple models simultaneously. Each review should be independent — models should not see each other's reviews.

5. **Synthesize results.** Compare the reviews:
   - **Agreement zone:** Issues flagged by 2+ models — highest confidence
   - **Unique findings:** Issues flagged by only one model — investigate further
   - **Contradictions:** Models disagree — present both perspectives with reasoning
   - **Blind spots:** Areas no model flagged — consider if coverage is sufficient

6. **Deliver the cross-model report.** Present the synthesized findings with attribution.

## Output Format

```markdown
# Cross-Model Review: {Subject}

## Models Used
- {Model 1}: {what it reviewed, its strengths for this task}
- {Model 2}: {what it reviewed, its strengths for this task}
- {Model 3}: {what it reviewed, its strengths for this task}

## Consensus Findings (2+ models agree)
| # | Finding | Severity | Models | Recommendation |
|---|---------|----------|--------|----------------|
| 1 | {issue} | {HIGH/MED/LOW} | {which models} | {fix} |

## Unique Findings (single model)
| # | Finding | Source Model | Confidence | Recommendation |
|---|---------|-------------|------------|----------------|
| 1 | {issue} | {model} | {H/M/L} | {fix or investigate} |

## Contradictions
| Topic | Model A Says | Model B Says | Resolution |
|-------|-------------|-------------|------------|
| {topic} | {position} | {position} | {which to follow and why} |

## Overall Assessment
- Consensus confidence: {HIGH/MEDIUM/LOW}
- Key risk areas: {list}
- Recommended actions: {prioritized list}
```

## Tips

- Cross-model review is most valuable for security reviews, architecture decisions, and complex algorithms
- Models tend to have different strengths: use the right model for the right review aspect
- If all models agree, your confidence should be high — but remember they may share common blind spots
- For cost control, use free-tier models (Ollama, Groq, Cloudflare Workers) for initial review and paid models for targeted deep dives
- The contradiction section is often the most valuable — it reveals genuine trade-offs
- Don't use this for trivial code changes — the overhead is only worthwhile for consequential decisions
