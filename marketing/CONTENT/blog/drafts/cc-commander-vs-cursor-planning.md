---
title: "Why CC Commander beats Cursor for planning"
status: DRAFT - not published
author: Kevin Z
date: TBD
---

## EDITOR NOTES

Internal review copy. The headline is a working editorial thesis, not a measured result. Source review occurred on 2026-10-22; no hands-on comparison was run.

| Claim / detail | Evidence and required verification before publishing |
| --- | --- |
| "Beats Cursor," the proposed workflow preference, and any implied time or quality advantage | **UNVERIFIED COMPARATIVE CLAIM.** No controlled comparison supports a winner. Kevin must approve the personal preference. Before publishing, either substantiate the headline with a fair comparison or retitle it "CC Commander and Cursor: choosing a planning workflow." |
| Commander packages a prescribed planning process for Claude Code | Source-supported by [the planning skill](../../../../commander/cowork-plugin/skills/ccc-plan/SKILL.md). **UNVERIFIED RUNTIME:** source instructions establish intended behavior, not consistent execution. Run a representative planning session before presenting it as demonstrated behavior. |
| Cursor Plan Mode explores the codebase, asks questions, and produces an editable plan before implementation | Documented in Cursor's [Plan Mode announcement](https://cursor.com/blog/plan-mode), reviewed during drafting. **UNVERIFIED HANDS-ON:** confirm behavior in the current Cursor release and record the tested version. |
| Cursor supports shaping planning workflows through Agent Skills | Documented in Cursor's [planning design article](https://cursor.com/blog/dynamic-planning-agents), reviewed during drafting. **UNVERIFIED HANDS-ON:** check current support and configuration; do not imply that Cursor lacks structured planning. |
| Commander's feature interview covers the user problem, audience, scope, completion criteria, and biggest risk | Source-supported by [interview.md](../../../../commander/cowork-plugin/skills/ccc-plan/references/interview.md). Confirm the current feature-planning path asks or infers these inputs. |
| Commander's plan template includes success checks, failure cases, phases, risks, an independent checker, and a next command | Source-supported by [plan-template.md](../../../../commander/cowork-plugin/skills/ccc-plan/references/plan-template.md). Confirm actual output follows the template; independent review is prescribed, not a guarantee. |
| Commander planning pauses for approval and can preserve a project copy | Source-supported by the planning skill's Plan pane handoff and optional project-copy steps. **UNVERIFIED RUNTIME:** verify the approval flow and explicitly requested repository copy in the target Claude Code surface. |
| Relative setup effort, workflow parity, or suitability versus an existing Cursor setup | **UNVERIFIED COMPARATIVE CLAIMS.** The article offers selection criteria, not measured superiority. Test both defaults and a reasonably configured Cursor workflow before asserting that either takes less effort or produces better plans. |
| Versions and skill / agent totals | No version or count appears in the article. If added, read [package.json](../../../../package.json), check [commander/contract.json](../../../../commander/contract.json) against [plugin skills](../../../../commander/cowork-plugin/skills/) and [agents](../../../../commander/cowork-plugin/agents/), and record the verification date. Use Cursor's current official sources for any Cursor version or feature claim. |
| Title, byline, and date | Kevin must approve the framing and author voice. Keep the date `TBD` until a separate publication decision. |

Source boundaries: [why-ccc.mdx](../../../../mintlify-docs/why-ccc.mdx), [the comparison page](../../../../site/app/compare/page.tsx), and [README.md](../../../../README.md) supplied positioning context. They do not prove Cursor limitations or a planning advantage. No performance percentages, pricing comparison, model ranking, integration parity, or claim that Cursor lacks planning, skills, memory, or agents is carried forward.

Publication gate: resolve the blog surface, the separate founder-story post in PR #180, and the claims above. This draft authorizes no publication or changes to those surfaces.

## DRAFT

# Why CC Commander beats Cursor for planning

I want a plan that makes the user problem clear, defines a result I can check, and leaves the next person enough context to build it. CC Commander packages that approach in its `/ccc-plan` workflow.

For someone who wants a prescribed planning process in Claude Code, that's the case I'd make for Commander. **The comparative headline remains unverified:** this is a proposed workflow preference, pending a side-by-side test.

### Give Cursor its due

Cursor has Plan Mode. Its official description covers codebase research, clarifying questions, and a plan you can edit before implementation. Those are substantial planning capabilities. [Source: Cursor's Plan Mode announcement](https://cursor.com/blog/plan-mode).

Cursor also describes using Agent Skills to shape a team's planning process. A fair comparison has to include that flexibility. [Source: Cursor's planning design article](https://cursor.com/blog/dynamic-planning-agents).

The choice is how much of the process you want selected for you, and how well it fits the way you already work.

### What Commander puts in the plan

Commander's feature-planning interview asks about the user problem, who has it, the scope, what completion looks like, and the biggest risk. That is the brief the planner is instructed to work from.

Its plan template then asks for these concrete outputs:

| Planning need | What the Commander template asks for |
| --- | --- |
| A result you can verify | Success criteria with checks, plus explicit failure cases |
| Work that can be handed off | Phased steps and recommended agents |
| A review responsibility | A checker independent of the worker for each phase |
| A decision about risk | Risks and mitigations |
| A clear continuation | The next command to run |

This is the part I value: the structure is already written down and available to inspect. I can review the proposed checks before implementation begins, then decide whether they cover the actual problem.

The planning workflow calls for an approval step and offers a project copy of the plan. When I want the plan alongside the code, that copy is something I can explicitly request. These are the workflow's instructions; a real planning session still needs review.

### Choose based on the plan you need

If you want this interview and plan structure as a starting point in Claude Code, Commander is worth evaluating. The proposed advantage is having that process packaged for you. Whether it saves setup effort is still unverified.

If you already have a Cursor planning workflow that captures your requirements and review checks, assess it against the same criteria before changing tools. Cursor's documented planning and customization capabilities deserve that comparison. Equivalent output and relative effort remain unverified here.

### Put the headline to a test

Give both workflows the same task, repository context, and acceptance criteria. Record the versions, models, configuration, and prompting used, and let each workflow ask its clarifying questions. Review the plans for missed requirements, useful failure cases, testable completion criteria, and how much editing they need before a builder can act.

That comparison would give this headline evidence. For now, the concrete next step is to inspect [Commander's planning workflow](https://github.com/KevinZai/commander/blob/main/commander/cowork-plugin/skills/ccc-plan/SKILL.md) and decide whether its prescribed structure matches the plan you want to review.
