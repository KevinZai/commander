---
name: gemini-fallback
description: "Route tasks to Gemini's 1M+ token context window when content exceeds Claude's context limits."
version: 1.0.0
category: research
parent: mega-research
tags: [mega-research, gemini, large-context]
disable-model-invocation: true
---

# Gemini Fallback

## What This Does

Routes tasks to Google's Gemini models when the content size exceeds Claude's context window (200K tokens). Gemini's 1M+ token context window can process entire codebases, large document sets, or extensive datasets in a single pass. This skill handles the handoff — preparing the payload, crafting the prompt, and integrating the results back.

## Instructions

1. **Determine if Gemini fallback is needed.** Check:
   - Estimated total tokens of the content to process
   - Claude's current context usage (are we near the limit?)
   - Can the task be accomplished by chunking within Claude instead?
   - Rule of thumb: if content exceeds 150K tokens, consider Gemini

2. **Prepare the payload.** Organize the content for Gemini:
   - Concatenate files with clear delimiters and file paths
   - Include a table of contents at the top listing all files
   - Strip unnecessary content (node_modules, build artifacts, binary files)
   - Add context about what the user needs from this content

3. **Craft the Gemini prompt.** Structure the request:
   ```
   You are analyzing a {codebase/document set/dataset}.

   ## Files Included
   {table of contents with file paths}

   ## Task
   {Specific task: summarize, find patterns, answer questions, etc.}

   ## Output Format
   {Expected structure of the response}

   ## Content
   {The actual files/content}
   ```

4. **Send to Gemini.** Use the appropriate method:
   - If Gemini MCP is available: use the MCP tool
   - If using API directly: `gemini-pro` or `gemini-2.5-pro` model
   - If using OpenRouter: route via `google/gemini-2.5-pro`
   - Set temperature to 0 for analytical tasks, 0.3-0.7 for creative tasks

5. **Validate the response.** Check Gemini's output for:
   - Completeness: did it address the full task?
   - Accuracy: spot-check specific claims against the source material
   - Hallucination: verify file names, function names, and line references exist
   - Format compliance: does it match the requested output format?

6. **Integrate results.** Bring Gemini's findings back into the Claude context:
   - Summarize the key findings in Claude's context
   - If Gemini produced code, validate it with Claude
   - If Gemini produced analysis, cross-reference with what Claude already knows
   - Present the final integrated result to the user

## Output Format

```markdown
# Gemini Fallback Report

## Task
{What was sent to Gemini and why}

## Content Processed
- Files: {count}
- Estimated tokens: {count}
- Model used: {gemini-pro / gemini-2.5-pro}

## Gemini's Findings
{The processed and validated results from Gemini}

## Validation
- [ ] File references checked — {pass/fail}
- [ ] Key claims spot-checked — {pass/fail}
- [ ] Output format matches request — {pass/fail}
- [ ] No obvious hallucinations detected — {pass/fail}

## Integration Notes
{How these findings connect to the current Claude context}
```

## Tips

- Always try chunking within Claude first — Gemini fallback adds latency and cost
- Strip binary files, images, and generated code (dist/, build/, node_modules/) before sending
- Include file paths as headers so Gemini can reference specific locations
- Gemini handles code analysis well but may format output differently than Claude — normalize the output
- For very large codebases, even Gemini has limits — prioritize the most relevant files
- Validate Gemini's output before trusting it — different models have different hallucination patterns
- Keep a copy of what was sent so you can reproduce or refine the request
- If the task is "understand this codebase," send a directory tree first, then the key files
