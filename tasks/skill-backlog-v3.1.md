# CCC v3.1 Skill Backlog

Candidate skills for the next minor release, inspired by the broader Claude skill ecosystem audit (polydao thread, Matt Pocock's skills repo, ComposioHQ, skillsmp.com).

All candidates are green-lit: MIT-compatible sources, no trademark conflicts.

---

## 1. `/ccc:glossary` — Ubiquitous Language Extractor

**Inspired by:** [mattpocock/skills/ubiquitous-language](https://github.com/mattpocock/skills/tree/main/ubiquitous-language)

**Triggers:**
- "extract glossary"
- "build a ubiquitous language"
- "what terms matter in this codebase"
- "domain vocabulary"

**Tools:** Read, Glob, Grep, Agent

**Flow (Quick Mode):**
1. Scan codebase for nouns appearing 3+ times
2. Group by frequency + co-occurrence
3. Propose a 10-20 term glossary
4. Ask user to confirm / rename / prune
5. Write to `docs/GLOSSARY.md` or append to CLAUDE.md

**Flow (Power Mode):**
- DDD-style bounded-context grouping
- Multi-repo scanning
- Vocabulary drift detection vs prior glossary

**Value:** Every team has private words ("order", "event", "user") that mean different things. Agents hallucinate less when the glossary is loaded.

---

## 2. `/ccc:grill` — Relentless Clarifying Questions

**Inspired by:** [mattpocock/skills/grill-me](https://github.com/mattpocock/skills/tree/main/grill-me)

**Triggers:**
- "grill me on this"
- "what am I missing"
- "interrogate the plan"
- "poke holes"

**Tools:** AskUserQuestion, Read, Glob, Grep

**Flow:**
1. One question at a time (no batching)
2. Branches until every decision tree node is resolved
3. Covers: data models, edge cases, failure modes, existing systems
4. Final output: structured plan with no undefined terms

**Contrast with `/ccc:build` Spec Flow:**
- Spec Flow asks 3 questions and moves on (fast path)
- Grill keeps going until the plan survives adversarial review
- Use Grill for **risky migrations**, complex refactors, first-time architectures

**Can be invoked as flag:** `/ccc:build --grill`

---

## 3. `/ccc:github-triage` — GitHub Issue Backlog Sweep

**Inspired by:** [mattpocock/skills/github-triage](https://github.com/mattpocock/skills/tree/main/github-triage)

**Triggers:**
- "triage github issues"
- "sweep the backlog"
- "clean up GitHub issues"
- "what's stale"

**Tools:** Bash (gh), Read, Agent, AskUserQuestion

**Flow:**
- Pull all open issues via `gh issue list`
- Classify by: priority (P0-P3), age (fresh/stale/zombie), type (bug/feature/docs)
- Propose labels, assignees, milestone moves
- Batch-apply with user confirmation

**Relationship to `/ccc:linear-board`:**
- Linear skill is source-of-truth board management
- GitHub triage is for open-source projects or teams on GitHub Projects
- Can run both in parallel via `/ccc:fleet`

---

## 4. `/ccc:prd` — Formal PRD → Plan → Issues Pipeline

**Inspired by:** [mattpocock/skills/write-a-prd](https://github.com/mattpocock/skills/tree/main/write-a-prd) + `prd-to-plan` + `prd-to-issues`

**Triggers:**
- "write a PRD"
- "formal spec"
- "product requirements doc"
- "PRD for this feature"

**Tools:** AskUserQuestion, Write, Edit, Bash (gh), Agent

**Three-phase pipeline:**

1. **PRD writing** (interview + codebase exploration + module design)
   - Goals, non-goals, user stories
   - Success metrics, constraints
   - Links to existing systems
   - File as `docs/prd/YYYY-MM-DD-<slug>.md`

2. **PRD → Plan** (tracer-bullet vertical slices)
   - Ordered, staged implementation
   - Integration risk reduction upfront
   - File as `docs/plans/YYYY-MM-DD-<slug>.md`

3. **PRD → Issues** (independently-grabbable)
   - Break into GitHub/Linear issues with blocker relationships
   - Group by epic
   - Batch-create via `gh issue create` / Linear MCP

**Contrast with `/ccc:build` Spec Flow:**
- Spec Flow = 3 questions, 5 minutes, direct to code
- PRD = 30 minutes, formal doc, issue tracker rollout
- Use PRD for **1-week+ features**, cross-team work, external stakeholders

---

## 5. `/ccc:article-edit` — Prose Restructuring

**Inspired by:** [mattpocock/skills/edit-article](https://github.com/mattpocock/skills/tree/main/edit-article)

**Triggers:**
- "edit this article"
- "improve this blog post"
- "restructure the prose"
- "tighten this writing"

**Tools:** Read, Write, Edit, AskUserQuestion

**Flow:**
- Analyze article structure (sections, paragraphs, sentences)
- Identify: filler, repetition, weak openings/closings, buried leads
- Propose structural changes (reorder sections, split/merge paragraphs)
- Apply edits with user confirmation per section
- NOT grammar cleanup — that's a different tool

**Relationship to `/ccc:content`:**
- `/ccc:content` = create new content from scratch
- `/ccc:article-edit` = improve existing content
- Can chain: `/ccc:content` to draft → `/ccc:article-edit` to polish

---

## Prioritization

| Skill | Effort | Value | Priority |
|-------|--------|-------|----------|
| `/ccc:glossary` | Medium | High — reduces agent hallucinations across all skills | **P0** |
| `/ccc:grill` | Low — mostly prompt design | High — competitive moat | **P0** |
| `/ccc:prd` | High — 3-phase pipeline | Medium — enterprise-friendly | P1 |
| `/ccc:github-triage` | Low | Medium — open-source users only | P1 |
| `/ccc:article-edit` | Low | Low — niche | P2 |

**Target release:** v3.1.0 with `/ccc:glossary` + `/ccc:grill` (P0 pair).

## Attribution plan

Each new skill will cite its inspiration in the SKILL.md header:

```markdown
## Attribution
Inspired by [mattpocock/skills/grill-me](https://github.com/mattpocock/skills/tree/main/grill-me) (MIT).
Adapted for CCC's /ccc:* prefix and dual-mode pattern.
```

Also vendor `mattpocock/skills` as git submodule (done — `vendor/mattpocock-skills/`).

## Out of scope for v3.1

- Image generation skills (Nano Banana, etc.) — not our lane
- Obsidian vault skill — too narrow, user-specific
- Remotion / video skills — too narrow
- Excel/PDF/DOCX skills — already in official Anthropic plugins; defer to those
