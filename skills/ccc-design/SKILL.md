---
name: ccc-design
description: "Route design and animation work to the right sub-skill: landing pages, design systems, motion, visual effects, named looks, slides, screenshots and the Impeccable polish suite. Use when the user wants to design, restyle, polish, animate or capture the look of a UI."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[polish | build | motion | look | slides | screenshots | capture]"
model: inherit
effort: medium
---

# /ccc-design — design work, routed

**CC Commander** · ccc-design · one router that loads the design sub-skill, or short chain of them, the job needs.

Each sub-skill lives in its own directory beside this file. Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` (on Codex, the same path relative to this file) and follow it. The user's selected model is preserved.

Codex: ask each picker as a plain-text question with the same options.

## Sub-skills

| Group | Sub-skills |
|---|---|
| Routing and context | `design-router` (intent routing), `design-context` (brand, palette, fonts, motion preferences, performance budget) |
| Animation and motion | `animate`, `motion-design`, `framer-motion-patterns`, `gsap-patterns`, `svg-animation` |
| Visual effects | `interactive-visuals`, `particle-systems`, `generative-backgrounds`, `webgl-shader`, `retro-pixel`, `canvas-design` |
| Pages and systems | `frontend-design`, `landing-page-builder`, `interactive-landing`, `design-consultation`, `colorize`, `theme-factory` |
| Output | `frontend-slides`, `screenshots`, `web-artifacts-builder` |
| Look-book and capture | `looks` (named aesthetic directions), `capture` (video, HTML or live page into a reusable design prompt) |
| Impeccable polish suite | `adapt`, `arrange`, `audit`, `bolder`, `clarify`, `critique`, `delight`, `distill`, `extract`, `harden`, `normalize`, `onboard`, `optimize`, `overdrive`, `polish`, `quieter`, `typeset` |

Per-intent routing, "don't confuse with" pairs and the campaign chains: [references/routing.md](references/routing.md).

## When to use / when not to

- Use for new UI, a visual refresh, motion and effects, a design system, a named look, slides, marketing screenshots, or a polish pass before shipping.
- Use `ccc-makeover` for a whole-project health overhaul, `ccc-mobile` for native mobile UI, `ccc-marketing` for copy and conversion work on a page.

## What happens

1. **Read the project.** Run in one Bash call, silent on failure:

   ```bash
   test -f package.json && grep -oE '"(next|react|vue|svelte|astro|tailwindcss|framer-motion|gsap|three)"' package.json | sort -u
   ls tailwind.config.* DESIGN.md Design.md 2>/dev/null
   git diff --stat HEAD 2>/dev/null | tail -1
   ```

   Report one line: `🎨 Stack: <frameworks | none> · design doc <yes | no> · <diff summary | clean>`.

2. **Capture context once.** If no design doc exists and the task produces new UI, run `design-context` first so later sub-skills share one brand, palette and performance budget.

3. **Route.** An argument or a clear intent picks the sub-skill or chain from [references/routing.md](references/routing.md). Otherwise ask with AskUserQuestion (header "Design"), recommended first. Recommend Polish when step 1 shows CSS/JSX/TSX churn or an existing UI; recommend Build when the repo has no UI yet:

   - 🟢 Polish an existing UI — `critique`, then the Impeccable chain ending in `polish`
   - Build a page or system — `landing-page-builder` + `interactive-landing`, or `frontend-design` + `design-consultation`
   - Motion and effects — `animate`, `framer-motion-patterns`, `gsap-patterns`, `particle-systems`, `webgl-shader` and the rest of those groups
   - Something else — a follow-up picker with looks, slides, screenshots and capture

4. **Pick a direction when polishing.** After `critique`, ask with AskUserQuestion (header "Direction"): 🟢 the direction the critique supports (more impact: `bolder` + `overdrive`, or calmer: `quieter` + `distill`) · the other direction · neither, fix the findings only. Never apply `bolder` and `quieter` to the same elements.

5. **Load and run.** Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` for each step of the chain and follow it. For `looks`, the sub-skill reads the full look spec from `vendor/mengto-skills/` at apply time.

6. **Check performance before shipping motion.** Run `optimize` on any change that adds animation, WebGL or particles; prefer CSS when it achieves the same effect.

7. **Verify.** Run the project's build or typecheck (`npm run build`, or `npx tsc --noEmit` when there is no build script) and `git status --short`. On failure, fix and re-run before reporting.

## Done when

- Code changed: the build or typecheck exited 0 in this turn and `git status --short` lists only the files the task meant to touch.
- Polish pass: every `critique` finding is reported as fixed or not fixed.
- A design doc or asset was written: `test -s <file> && echo ok` printed `ok`.

## Guardrails

- Never add motion without a purpose; motion communicates state, it does not decorate.
- Never overwrite an existing design doc without asking first with a picker.
- Never port a look's full spec into the project's docs; apply it from the vendor file.
- Never deploy or publish the result from this skill; deployment and publishing need authorization in this conversation and belong to the deploy workflow.

## See also

- `ccc-makeover` — whole-project audit, fix and re-score
- `ccc-mobile` — native mobile UI
- `ccc-marketing` — copy, CRO and launch work around the design
