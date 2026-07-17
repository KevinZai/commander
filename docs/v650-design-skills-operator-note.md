# v6.5.0 Design Skills Operator Note

Status: operator note
Scope: CC Commander design routing, `/ccc-design`, `/ccc-spike`, `/ccc-spike-confirm`
Last updated: 2026-07-07

## Summary

v6.5.0 design work should produce visual evidence by default. A design skill that only returns prose, palette notes, ASCII wireframes, or implementation instructions has not completed the design loop unless the user explicitly asked to skip visuals.

For CC Commander operators, route design requests through `/ccc-design` first. Use `/ccc-spike` only for bounded exploration, and use `/ccc-spike-confirm` only after the spike result has a concrete user or board confirmation path.

## Operating Rule

When a user asks for design work:

1. Capture the project context before selecting a sub-skill.
2. Prefer `/ccc-design` so the design domain router can choose the right path.
3. Generate or attach a visual artifact by default when the work changes the visual direction of a product.
4. Keep exploration artifacts temporary until the user chooses a direction.
5. Save only approved final design artifacts into the repo, normally under `docs/designs/`.
6. Convert the approved visual direction into inspectable implementation guidance before coding.

The key behavior change is the default: visual mockups are expected unless the user says to skip them.

## `/ccc-design` Routing Implications

`/ccc-design` is the design-domain hub. It should stay click-first and small at the top level, then route to deeper skill chains after the initial intent is known.

Use these defaults:

- Landing page: route through `frontend-design`, `landing-page-builder`, `interactive-landing`, then a polish pass.
- Component system: route through `frontend-design`, `design-consultation`, `colorize`, `typeset`, and `normalize`.
- Polish pass: route through `critique`, `clarify`, direction choice, `arrange`, `typeset`, `adapt`, and `polish`.
- Figma to code: verify the Figma connector first, then route to `frontend-design` and `adapt`.
- Screenshot to UI: apply `Design.md` when present, then rebuild interactive UI rather than a static pixel trace.

Do not replace the picker with a long text menu. The operator experience is a short choice, then immediate dispatch.

## Visual Artifact Standard

A valid design-skill result should include one of:

- A generated mockup image.
- A comparison board with variants and feedback capture.
- A screenshot-backed before/after review.
- A committed approved design artifact under `docs/designs/`.
- An implemented UI that has been visually verified with screenshots.

Prose can explain the decision, but prose is not the design artifact.

For exploratory variants, keep generated files in a temporary directory. Commit only the user-approved final artifact. If the design toolchain provides a quality check, use it to catch unreadable text, missing requested elements, and broken layout before presenting the result.

## `Design.md` Boundary

`Design.md` is the portable design-soul file for a project. Use it to capture or apply typography, color, spacing, and mood decisions.

When generating a new UI:

- Read an existing `Design.md` before choosing colors, type, spacing, or motion.
- If no `Design.md` exists and the project has a visible UI, offer capture before large visual work.
- Pass the distilled design context to spawned design agents.
- Do not overwrite an existing `Design.md` without confirmation.

## `/ccc-spike` Boundary

Use `/ccc-spike` for timeboxed unknowns, not for normal design execution. A spike is appropriate when the team needs to compare toolchains, validate feasibility, inspect a migration path, or answer a narrow technical/design uncertainty before committing to implementation.

The delegate skill is intentionally thin: it forwards to `/commander:ccc-spike` with the original arguments. Operators should not add behavior in the delegate wrapper.

A spike should end with one of:

- A recommendation.
- A blocked finding with a named missing input.
- A request for confirmation.
- A follow-up implementation issue.

It should not end with an open-ended plan.

## `/ccc-spike-confirm` Boundary

Use `/ccc-spike-confirm` to close the loop after a spike has a selected direction. It forwards to `/commander:ccc-spike-confirm` with the original arguments and should not reinterpret the spike.

Before confirmation:

- The spike result must identify the candidate direction.
- The user, board, or owning issue must have a real confirmation path.
- Any implementation subtasks should wait until confirmation is accepted.

After confirmation:

- Create implementation work from the confirmed direction.
- Preserve the selected design evidence.
- Record the decision in the owning issue or document.

## Anti-Patterns

- Returning only a prose design spec when a visual artifact is expected.
- Showing users a long numbered catalog of design skills.
- Treating `/ccc-spike` as a substitute for `/ccc-design`.
- Committing every generated variant instead of only approved finals.
- Pixel-tracing screenshots into static UI without interaction, responsive states, or brand context.
- Creating implementation subtasks before a required plan or spike confirmation is accepted.

## Source Pointers

- `commander/cowork-plugin/skills/ccc-design/SKILL.md`
- `commander/cowork-plugin-codex/skills/ccc-design/SKILL.md`
- `/Users/ai/.agents/skills/source-command-ccc-spike/SKILL.md`
- `/Users/ai/.agents/skills/source-command-ccc-spike-confirm/SKILL.md`
- `vendor/gstack/docs/designs/DESIGN_TOOLS_V1.md`
