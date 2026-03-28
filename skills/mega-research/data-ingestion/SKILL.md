---
name: data-ingestion
description: "Ingest, process, and summarize large documents, codebases, or datasets into structured, actionable summaries."
version: 1.0.0
category: research
parent: mega-research
tags: [mega-research, ingestion, summarization]
disable-model-invocation: true
---

# Data Ingestion

## What This Does

Processes large volumes of information — codebases, documentation sets, datasets, PDF collections, or API responses — and produces structured summaries. Handles content that would overwhelm a single prompt by using chunking, parallel processing, and progressive summarization.

## Instructions

1. **Assess the input.** Determine:
   - What type of content? (codebase, docs, dataset, PDFs, API output)
   - How large? (file count, total size, estimated token count)
   - What structure? (flat files, directory tree, database tables)
   - What does the user need from it? (summary, architecture map, key patterns, data dictionary)

2. **Plan the ingestion strategy.** Based on size and type:
   - **Small (< 50K tokens):** Direct read and summarize
   - **Medium (50K-200K tokens):** Chunk by logical boundaries, summarize each, then synthesize
   - **Large (200K+ tokens):** Hierarchical summarization — summarize leaves, then branches, then root
   - **Too large for Claude:** Route to `gemini-fallback` for 1M context window

3. **Chunk intelligently.** Split content at natural boundaries:
   - **Code:** By file, by module, by class/function
   - **Documents:** By section, by chapter, by heading
   - **Data:** By table, by schema, by partition
   - Never split mid-function, mid-paragraph, or mid-record

4. **Process each chunk.** For each chunk, extract:
   - **Code:** Purpose, dependencies, public API, key patterns, complexity hotspots
   - **Documents:** Key claims, definitions, relationships, action items
   - **Data:** Schema, distributions, anomalies, relationships, quality issues

5. **Synthesize across chunks.** Combine chunk summaries into:
   - High-level overview (what is this?)
   - Structure map (how is it organized?)
   - Key findings (what matters most?)
   - Cross-references (how do parts relate?)
   - Quality assessment (what's good, what's concerning?)

6. **Deliver the summary.** Format based on content type.

## Output Format

### For Codebases
```markdown
# Codebase Summary: {name}

## Overview
{What this codebase does, tech stack, estimated size}

## Architecture
{High-level architecture: layers, modules, data flow}

## Directory Structure
{Key directories and their purposes}

## Key Components
| Component | Purpose | Dependencies | Complexity |
|-----------|---------|-------------|------------|
| {name} | {what it does} | {imports/uses} | {simple/moderate/complex} |

## Patterns and Conventions
- {Pattern 1: how X is done throughout the codebase}
- {Pattern 2}

## Quality Observations
- {Observation 1 — positive or concerning}
- {Observation 2}

## Entry Points
- {Where to start reading: main files, route definitions, etc.}
```

### For Documents
```markdown
# Document Summary: {title}

## Key Takeaways
1. {Takeaway 1}
2. {Takeaway 2}

## Section Summaries
### {Section 1}
{Summary}

## Definitions and Terms
| Term | Definition |
|------|-----------|
| {term} | {definition} |

## Action Items
- [ ] {Action identified in the document}
```

### For Datasets
```markdown
# Dataset Summary: {name}

## Schema
| Field | Type | Description | Completeness |
|-------|------|-------------|-------------|
| {field} | {type} | {desc} | {%} |

## Statistics
{Key distributions, counts, date ranges}

## Quality Issues
- {Issue 1: nulls, duplicates, anomalies}

## Relationships
{How tables/collections relate}
```

## Tips

- Always start by assessing size before reading everything — prevents context overflow
- Use `wc -l`, `find | wc`, or `du -sh` to estimate before diving in
- For codebases, read `package.json`, `README`, and entry points first — they're the map
- Process the most important files first in case you run out of context
- If the content is too large, say so and recommend `gemini-fallback` rather than producing a shallow summary
- Progressive summarization (summarize summaries) works better than trying to hold everything in context
