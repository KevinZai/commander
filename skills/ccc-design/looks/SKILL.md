---
name: looks
description: Look-book router over 25 named aesthetic directions (full design-system specs) — clean-minimal, dark-glass, skeuomorphic, mesh-gradient, editorial-tech, and more. Use when the user wants a named "vibe" or visual direction applied to a landing page, component system, or UI, not a specific animation technique.
user-invocable: true
args:
  - name: look
    description: The named look to apply (optional — omit to browse the table)
    required: false
---

# ccc-design / looks — Named aesthetic look-book

> Adapted from [MengTo/Skills](https://github.com/MengTo/Skills) — MIT licensed. This is a **routing table**, not a port — the 2 (of 71) plugin skills. All ~25 skills stay in `vendor/mengto-skills/`; each row below points at the full spec.

A "look" is a complete, opinionated design-system direction — typography, color, surfaces, framing, and mood — described in a single vendor `SKILL.md`. Use this when the user asks for a named vibe ("give me a dark-glass agency look", "make it feel skeuomorphic") rather than a specific animation/technique (route those to `gsap-patterns`, `webgl-shader`, `svg-animation`, etc. instead — this router excludes pure-technique dirs like gsap, threejs, matterjs, globe-gl, tailwindcss, cobejs, vantajs, which CCC already covers natively).

## How to apply a look

1. Pick the closest row below (or ask the user to choose via `AskUserQuestion` if ambiguous).
2. Read the full spec: `vendor/mengto-skills/agent-skills/web-design/<name>/SKILL.md`.
3. Apply it as the binding design-system direction for the whole surface (not just one component) — typography, color tokens, surfaces/framing, and motion mood should all follow the spec.
4. If a `Design.md` already exists for the project (see the plugin router's Sub-flow B), reconcile the look against it rather than overwriting the project's established soul — ask first.
5. Pair with `colorize` (palette check) and `typeset` (type scale) for a full pass; finish with `polish`.

## Look-book

| Look | Vibe | When to use |
|------|------|-------------|
| `agency-grid-layout-minimal` | Disciplined editorial grid, oversized type, quiet uppercase labels | Minimal design agency / portfolio |
| `blue-cloudy-clean-modern` | Luminous blue-sky atmosphere, soft drifting light, serene premium type | Calm modern SaaS with an airy hero |
| `blue-laser-clean-glass-layout` | Dark glass, thin blue laser atmosphere, frosted premium shells | Dashboard-style dark product UI |
| `book-serif-index` | Archival serif pages, mono index nav, aged paper, margin notes | Editorial/docs site with a literary feel |
| `bright-green-tech-system-webgl` | Bright-green technical system, hard-framed dark surfaces, WebGL zone | Dev-tool / infra product with a hero visualization |
| `clean-minimal-beige-light-mode` | Warm neutral shells, quiet process grids, low-contrast structure | Calm, trustworthy light-mode SaaS |
| `dark-blue-contrasting-clean` | Dark-blue high contrast, cobalt gradient feature blocks | Bold fintech/enterprise dark theme |
| `dark-glass-clean-layout` | Frosted glass shells, floating data cards, atmospheric depth | Premium dark dashboard/app |
| `editorial-tech` | Magazine composition + precision product-tech detailing | Tech company blog / product marketing |
| `framed-grid-layout` | Thin boundary lines, L-shaped corner brackets, strict alignment | Neutral, structured, technical layout |
| `framed-tech-dark-border-gradient` | Border-gradient shells, asymmetrical panels, monochrome atmosphere | Dark technical product with restrained glow |
| `funky-purple-container-tech` | Fuchsia-purple accents, rounded shells, playful futuristic objects | Consumer tech with personality |
| `glass-dark-mode-clock` | Frosted shells, beam grids, sci-fi instrument dials | Precision/monitoring dark-mode tool |
| `high-contrast-skeuomorphic-clean` | Molded dark surfaces, tactile inset depth, restrained signal accents | Tactile, premium hardware-adjacent UI |
| `image-first-grid-layout` | Full-bleed photography, structural guide lines, anchored blocks | Photography/portfolio-led landing page |
| `light-mode-paper-technical` | Warm paper surfaces, dark outer framing, bracketed geometry | Light-mode technical/spec-sheet feel |
| `mesh-gradient-dark-blue-clean` | Near-black navy, procedural mesh gradient, floating nodes | Futuristic premium dark-blue product |
| `nested-container-clean-agency` | Outer editorial shell, inset dark feature blocks, rounded cards | Clean agency site with layered structure |
| `nested-container-frames` | Container-in-container with visible boundaries + corner markers | Structured dashboard/app shell |
| `orange-clean-paper-saas` | Warm neutrals, orange accent signals, rounded premium forms | Friendly light-mode SaaS |
| `skeuomorphic-ui` | Layered gradients, stacked shadows, embossed/pressed detail | Tactile, realistic, soft-plastic/metal UI |
| `solar-duotone-bold` | Iconify Solar Duotone Bold icon set | Bold duotone icon system (pairs with any look) |
| `split-layout-technical` | Dual-panel split screen, fine frame lines, mono metadata | Technical product with side-by-side content |
| `tech-green-dark-mode-modern` | Matte-black surfaces, emerald signal accents, mono labeling | Modern dark-mode dev/infra tool |
| `technical-wireframe-info-layout` | Monochrome wireframe, exploded 3D structure, connector annotations | Diagnostic/technical info-dense layout |

## Anti-patterns — DO NOT
- ❌ Port a look's full CSS/spec into this file — always read the vendor `SKILL.md` at apply-time
- ❌ Confuse a "look" with a "technique" — gsap/threejs/matterjs/globe-gl/tailwindcss/cobejs/vantajs belong to `gsap-patterns`, `webgl-shader`, `svg-animation`, `interactive-visuals`
- ❌ Apply a look without checking for an existing `Design.md` soul first
