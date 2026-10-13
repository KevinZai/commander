---
name: brainstorming
description: Clarify ambiguous or substantial product and design requests, compare meaningful approaches, and produce a scoped design before implementation when material decisions remain.
---

# Brainstorming Ideas Into Designs

Help turn an unclear idea into a design with explicit requirements, tradeoffs, and observable success criteria. Use a conversational process scaled to the decision.

## Decide how much design is needed

Read the relevant project instructions and enough existing structure to understand the requested change. For a focused fix, small configuration change, or already-approved design with clear requirements, state the approach briefly and continue the authorized work. Do not introduce another approval gate merely because this skill was loaded.

For substantial work with unresolved scope or architectural decisions, clarify those decisions before dependent implementation. A request to explore ideas or prepare a design authorizes design work, not automatic implementation or external publication. Existing user instructions and authorization remain authoritative within platform system/developer constraints.

## Design workflow

- Establish the intended users, problem, constraints, and observable outcome. Separate verified facts from assumptions.
- Ask only questions whose answers materially change the design. Prefer one focused question or a small coherent set; offer choices when real alternatives exist.
- Compare viable approaches when the tradeoff matters. Recommend one and explain its complexity, risks, and reversibility. Do not manufacture multiple options for an obvious implementation.
- Keep the scope small. For a request containing independent subsystems, identify dependencies and sequence the work into useful deliverables.
- Describe responsibilities, interfaces, data flow, error handling, and proportionate validation. Reuse existing repository patterns unless a concrete requirement justifies change.
- Present the unresolved decision clearly. Request approval only for work or consequential choices that the conversation has not already authorized.

## Record and review when useful

For a substantial design or durable handoff, write a concise spec in the user's requested location, or `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` when no location is specified. Include the chosen design, acceptance criteria, risks, unresolved assumptions, and next step. Do not commit, publish, or create external tracker records as an incidental effect of writing a design.

An independent design review is useful when complexity or risk warrants it and delegation is available. Give the reviewer only the relevant spec and source context; [spec-document-reviewer-prompt.md](spec-document-reviewer-prompt.md) is an optional template. Fix substantive findings, stop when they are resolved, and return an unresolved decision to the user after at most three review iterations. Do not run review loops for a routine edit.

If implementation is authorized and the design is sufficiently resolved, proceed with the next concrete step. Use a planning skill only when a phased implementation plan adds value. If the user requested design only, deliver the design and identify the decision needed before implementation.

## Optional visual companion

Use visuals for mockups, layout alternatives, diagrams, and comparisons that are clearer to see than to read. A UI-related question is not automatically visual. Text is sufficient for constraints and conceptual choices.

Use an already available visual surface when it fits the task. Starting this skill's browser companion is optional; explain its local-server/browser requirements and obtain any authorization still needed before starting it. Do not block independent design work while waiting for that optional choice. When the companion is chosen, read [visual-companion.md](visual-companion.md) before using its scripts and follow the project's port and access constraints.
