---
name: delegation-templates
description: "Structured subagent delegation with 7 agent types, report format enforcement, and model selection. Use when delegating work to subagents, spawning parallel agents, or orchestrating multi-agent tasks. Triggers: 'delegate', 'subagent', 'orchestrate agents', 'spawn worker', 'multi-agent', 'dispatch agent'."
metadata:
  version: 1.0.0
  source: "griffinhilly/claude-code-synthesis (adapted)"
---

# Delegation Templates

Structured templates for subagent delegation. Every dispatch includes a mandatory report format, assumed verification, and escalation-as-safe-default.

## Structural Discipline (All Agents)

1. **Mandatory report format.** Empty fields = visible signal. Validate before accepting.
2. **Assumed verification.** Every prompt: "Your output will be reviewed by a separate agent."
3. **Escalation as safe default.** BLOCKED > wrong. Reporting uncertainty = success.

## Model Selection Matrix

| Favor Sonnet | Favor Opus | Favor Haiku |
|-------------|------------|-------------|
| Well-specified tasks | Judgment / discretion | High volume, structured I/O |
| High volume / parallel | Novel connections needed | Mechanical transforms |
| Should follow spec exactly | Evaluating other agents | Classification / tagging |
| Concise output preferred | Rich, nuanced output | Cost-sensitive at scale |

## Agent Types

### 1. Implementer
**When:** Clear spec — write code, build script, refactor module. The WHAT is defined.

```
<task>[What to build — specific deliverable]</task>
<context>[Code, conventions, schema, constraints]</context>
<rules>
1. Implement exactly what is described. No extras.
2. If spec is ambiguous → NEEDS_CONTEXT with specific questions.
3. BLOCKED > wrong.
4. Your output will be reviewed by a separate agent.
</rules>
<report-format>
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: [2-3 sentences]
Concerns: [Or "None"]
Files changed: [List with one-line descriptions]
</report-format>
```

### 2. Researcher
**When:** Investigate a question. Returns findings — never makes changes.

```
<task>[What to investigate — frame as questions]</task>
<focal-questions>[3-5 specific things to look for]</focal-questions>
<rules>
1. Research only. Do not create/edit/delete files.
2. Distinguish found (evidence) from inferred (interpretation).
3. Stop when you have enough. Exhaustive ≠ better.
</rules>
<report-format>
Status: DONE | BLOCKED | NEEDS_CONTEXT
Findings: [With source/evidence]
Interpretation: [Labeled as inference]
Gaps: [What you couldn't determine]
</report-format>
```

### 3. Reviewer
**When:** QA from fresh context. Reviewer should NOT share implementer's context.

```
<task>[What to review — files, diff, output]</task>
<context>[Success criteria. Do NOT include implementer's reasoning.]</context>
<rules>
1. Review only. Report issues, don't fix them.
2. Verify claims by reading actual code/output.
3. Categorize: BLOCKER | CONCERN | NIT
4. Don't manufacture issues to justify the review.
</rules>
<report-format>
Status: PASS | PASS_WITH_CONCERNS | NEEDS_WORK
Issues: [BLOCKER/CONCERN/NIT] [file:line] [description]
Strengths: [Specific]
Assessment: [1-2 sentence judgment]
</report-format>
```

### 4. Batch Worker
**When:** Same operation on many inputs. Categorize, describe, transform, tag.

```
<task>Process [N] items. For each, [operation].</task>
<items>[JSON array, CSV, or numbered list]</items>
<rules>
1. Process every item. No skipping or summarizing.
2. Valid JSON output matching format below.
3. Ambiguous → best judgment + "confidence": "low".
</rules>
<output-format>
[{"id": "...", "result": "...", "confidence": "high|medium|low"}]
</output-format>
```

### 5. Explorer
**When:** Understand a codebase, system, or domain. Builds mental model, not file listing.

```
<task>[What to understand — subsystem, pattern, data flow]</task>
<starting-points>[Known entry points, what's already known]</starting-points>
<rules>
1. Explore only. No file changes.
2. Mental model > file listing. Explain connections.
3. Note surprises — unexpected = high-signal.
4. Depth > breadth. One subsystem well > five skimmed.
5. MUST include all 4 report sections.
</rules>
<report-format>
Status: DONE | NEEDS_MORE_EXPLORATION
Mental model: [How system works — structure, data flow, abstractions]
Key files: [3-7 most important and why]
Surprises: [Unexpected findings]
Open questions: [What needs deeper investigation]
</report-format>
```

### 6. Creative
**When:** Generate novel content — ideas, prose, names, framings.

```
<task>[What to create — deliverable, tone, audience, constraints]</task>
<context>[Background, prior ideas, what's been rejected]</context>
<rules>
1. Explore freely. Surprise is a feature.
2. Complete deliverable, not outline.
3. Bold choices over clarification requests.
4. Don't self-censor unconventional ideas.
</rules>
<report-format>
Status: DONE | DONE_WITH_ALTERNATIVES
Deliverable: [Primary output]
Alternatives: [Other directions worth preserving]
</report-format>
```

### 7. Session Reviewer
**When:** End-of-session evaluation from clean context.

```
<task>Review session summary. Evaluate effectiveness.</task>
<session-notes>[What was accomplished, decisions, concerns]</session-notes>
<project-context>[PLAN.md current state, MEMORY.md relevant entries]</project-context>
<rules>
1. Do not defer to the orchestrator's self-assessment.
2. Evaluate against stated goals, not perfection.
3. Identify patterns — recurring > one-off.
</rules>
<report-format>
Accomplished: [Delivered vs. planned]
Quality: [Evidence-based assessment]
Missed: [Overlooked or done poorly]
Patterns: [Recurring issues]
Suggestions: [1-3 actionable improvements]
</report-format>
```

## Orchestrator Checklist

**Before dispatching:**
- [ ] Task description is self-contained (no conversation history needed)
- [ ] Context is pasted, not referenced ("read X" → paste relevant sections)
- [ ] Model matches task type (Sonnet=execution, Opus=judgment, Haiku=volume)
- [ ] Report format included in prompt

**After receiving result:**
- [ ] All report sections present (especially Surprises, Gaps, Open Questions)
- [ ] Push back on missing sections — they're usually highest-value
