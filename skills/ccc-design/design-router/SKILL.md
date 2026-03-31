---
name: Design Router
description: "Routes design tasks to the correct specialist skill within Mega-Design."
version: 1.0.0
category: routing
parent: ccc-design
---

# Design Router

Central routing specialist for KZ Mega-Design. Analyzes the user's design intent and dispatches to the correct sub-skill(s).

## How It Works

1. Parse the user's request for design signals
2. Match against the intent taxonomy below
3. Recommend 1-3 skills in execution order
4. If ambiguous, ask one clarifying question before routing

## Intent Taxonomy

### Animation & Motion
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| animate, transition, entrance, exit, fade, slide, bounce | `animate` | High |
| framer, framer motion, AnimatePresence, layout animation, useScroll | `framer-motion-patterns` | High |
| gsap, scrolltrigger, timeline, tween, pin, scrub | `gsap-patterns` | High |
| svg, lottie, path morph, line draw, stroke animation | `svg-animation` | High |
| motion, parallax, scroll animation, kinetic | `motion-design` | Medium |
| move, dynamic, alive | `motion-design` | Low — clarify |

### Visual Effects
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| particle, confetti, snow, fire, sparkle, aurora | `particle-systems` | High |
| background, gradient, noise, voronoi, flow field, generative | `generative-backgrounds` | High |
| cursor, hover, mouse, interactive, drag, physics | `interactive-visuals` | High |
| 3d, webgl, three.js, shader, glsl, post-processing | `webgl-shader` | High |
| retro, pixel, crt, glitch, vhs, scanline, ascii | `retro-pixel` | High |
| canvas, draw, paint, 2d art | `canvas-design` | High |

### Design Systems & Pages
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| landing page, hero, conversion, cta, pricing | `landing-page-builder` + `interactive-landing` | High |
| design system, components, tokens, consistency | `frontend-design` + `design-consultation` | High |
| color, palette, contrast, scheme, harmony | `colorize` | High |
| theme, brand, identity, style guide | `theme-factory` | High |
| screenshot, device frame, mockup, product shot | `screenshots` | High |
| slides, presentation, deck, keynote | `frontend-slides` | High |
| html page, artifact, standalone, single-file | `web-artifacts-builder` | High |

### Polish (Impeccable Suite)
| Signal Words | Route To | Confidence |
|-------------|----------|------------|
| polish, refine, improve, better | `critique` → `polish` | High |
| bold, impact, punch, stronger, louder | `bolder` + `overdrive` | High |
| subtle, quiet, calm, tone down, less | `quieter` + `distill` | High |
| readable, clear, legible, scannable | `clarify` | High |
| layout, spacing, alignment, grid | `arrange` | High |
| typography, font, type scale, leading | `typeset` | High |
| responsive, mobile, tablet, adapt | `adapt` | High |
| robust, edge case, error state | `harden` | High |
| consistent, normalize, standardize | `normalize` | High |
| onboarding, first-run, empty state | `onboard` | High |
| delight, micro-interaction, surprise | `delight` | High |
| performance, speed, bundle, optimize | `optimize` | High |
| audit, review, checklist, score | `audit` | High |
| pattern, extract, document | `extract` | High |

## Multi-Skill Combinations

When a task spans multiple domains, recommend skills in this priority order:

1. **Context first** — always `design-context` if brand/palette unknown
2. **Structure** — layout and content placement
3. **Motion** — animations and transitions
4. **Effects** — particles, backgrounds, shaders
5. **Polish** — critique → fix → final pass

## Disambiguation Rules

- "Make it pop" → ask: "Do you want bolder colors, more animation, or stronger contrast?"
- "Interactive" alone → ask: "Interactive hover effects, or a full interactive experience?"
- "Modern" → default to `frontend-design` anti-slop methodology
- "Cool animation" → ask: "Scroll-triggered, hover-triggered, or on-load?"
- "Fix the design" → start with `critique` to diagnose before prescribing

## Response Format

When routing, respond with:

```
Route: [skill-name]
Reason: [one sentence why this skill matches]
Sequence: [if multi-skill, the execution order]
```
