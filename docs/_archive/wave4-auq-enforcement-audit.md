# Wave 4-B: AskUserQuestion Enforcement Audit

**Date:** 2026-04-26
**Scope:** All 47 plugin skills in `commander/cowork-plugin/skills/`
**Wave:** 4-B (AUQ Click-First Enforcement)

## Summary

| Classification | Count | Skills |
|---|---|---|
| GREEN — full AUQ | 20 | ccc, ccc-browse, ccc-build, ccc-cheatsheet, ccc-connect, ccc-design, ccc-e2e, ccc-fleet, ccc-learn, ccc-linear, ccc-more, ccc-plan, ccc-review, ccc-ship, ccc-start, ccc-suggest, ccc-xray, domains, infra, settings |
| YELLOW — partial AUQ (fixed) | 4 | build, content, linear-board, research |
| RED — no AUQ (fixed) | 0 | — |
| N/A — no prompts / auto-runs | 23 | ccc-agent-writing, ccc-data, ccc-devops, ccc-makeover, ccc-marketing, ccc-memory, ccc-mobile, ccc-recall, ccc-research, ccc-saas, ccc-security, ccc-seo, ccc-systematic-debugging, ccc-tasks, ccc-testing, code-review, deploy-check, fleet, knowledge, night-mode, resume-session, save-session, session, standup |

**Before:** 4 skills with free-text prompts where AUQ was appropriate
**After:** 0 skills with unaddressed free-text prompts

## Skills Edited (4)

### 1. `build/SKILL.md`
**Issue:** Quick Mode 3 questions were listed as A/B/C text bullets with no AUQ instruction.
**Fix:** Converted all 3 questions to explicit `AskUserQuestion` chip definitions with `question`, `options`, `label`, `description` fields.

### 2. `content/SKILL.md`
**Issue:** Q1 (content type) and Q3 (audience) were A/B/C/D text lists with no AUQ instruction. Q2 (topic) is legitimately free-text.
**Fix:** Q1 → AUQ with 4 chips (blog / social / email / something else). Q3 → AUQ with 4 chips (developers / founders / consumers / internal). Q2 retained as free-text with explicit comment noting it is open-ended.

### 3. `linear-board/SKILL.md`
**Issue:** Post-board-render action was offered as `[P] Pick [C] Create [R] Refresh` keyboard-menu text, not AUQ.
**Fix:** Replaced with explicit `AskUserQuestion` chip picker for Pick / Create / Refresh actions.

### 4. `research/SKILL.md`
**Issue:** Q2 (research type: A/B/C/D/E text) was not an AUQ call. Q1 (what to research) is legitimately free-text.
**Fix:** Q2 → AUQ with 4 chips (competitive / market / code audit / SEO). Q1 retained as free-text with explicit annotation.

## Skills Flagged But Not Auto-Fixed

These skills have free-text interactions that are **intentionally** free-text — AUQ would break UX:

| Skill | Free-text prompt | Why not converted |
|---|---|---|
| `fleet` | "Describe the task" | Open-ended task description — no finite option set |
| `ccc-fleet` | Post-picker task description | Same — fan-out/pipeline/background tasks are open-ended |
| `night-mode` | 10-question spec interview | All 10 questions need long-form answers |
| `standup` | "What did you work on?" | Open-ended activity log — can't enumerate options |
| `knowledge` | Search topic | Full-text search query — can't enumerate |
| `session` | Resume protocol confirm | Simple yes/no in chat — AUQ would be overkill |
| `ccc-linear` (create issue) | Title prompt | Title is free-text by design; skill already uses AUQ for type picker |

## Test Results

```
node --test commander/tests/plugin-schema-validation.test.js
tests 32 / pass 32 / fail 0
```

All schema validation tests pass after edits.
