# KZ Mega-Design — Architecture

This CCC domain contains 35+ design specialist skills organized into 5 tiers.

## Skill Map

### Foundation
- `design-router/` — Central routing (start here)
- `design-context/` — Brand + design state capture

### Animation & Motion
- `animate/` — CSS/JS animations
- `motion-design/` — Framer Motion, parallax
- `framer-motion-patterns/` — Deep Framer Motion patterns
- `gsap-patterns/` — GSAP + ScrollTrigger mastery
- `svg-animation/` — SVG-specific animation

### Visual Effects
- `interactive-visuals/` — User-driven effects
- `particle-systems/` — Particle effects
- `generative-backgrounds/` — Procedural backgrounds
- `webgl-shader/` — 3D and shaders
- `retro-pixel/` — Retro/glitch aesthetics
- `canvas-design/` — 2D canvas art

### Design Systems & Pages
- `frontend-design/` — Anti-slop clean UI
- `landing-page-builder/` — Landing page structures
- `interactive-landing/` — Animated landing pages
- `design-consultation/` — Design system proposals
- `colorize/` — Color strategy
- `theme-factory/` — Themed output

### Polish (Impeccable Suite)
- `critique/` → `bolder/` or `quieter/` → `clarify/` → `polish/`
- Full suite: adapt, arrange, audit, bolder, clarify, critique, delight, distill, extract, harden, normalize, onboard, optimize, overdrive, polish, quieter, typeset

### Output
- `screenshots/` — Product screenshots
- `frontend-slides/` — Presentations
- `web-artifacts-builder/` — Standalone HTML

## Usage Flow
1. Run `design-context` to capture brand state (first session only)
2. Route via the Routing Matrix in SKILL.md
3. For polish work: critique → fix → polish pipeline
4. Performance budget: always check `optimize` before shipping animations

## Anti-Patterns
- Don't add animations without purpose (motion should communicate, not decorate)
- Don't skip design-context — consistency requires knowing the brand
- Don't combine bolder + quieter on same elements
- Don't use WebGL when CSS animations suffice (performance)
