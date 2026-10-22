# ccc-design — routing reference

Loaded by [../SKILL.md](../SKILL.md) after the first pick, or when a request names a specific technique. Not shown to the user as a menu.

## Routing matrix

| Intent | Route to | Don't confuse with |
|---|---|---|
| "Add animations" / "make it move" | `animate` + `motion-design` | `interactive-visuals` (user-driven) |
| "Framer Motion animations" | `framer-motion-patterns` | `motion-design` (general motion) |
| "GSAP" / "ScrollTrigger" | `gsap-patterns` | `svg-animation` (SVG-specific) |
| "SVG animation" / "Lottie" | `svg-animation` | `gsap-patterns` (broader GSAP) |
| "Interactive effects" / "cursor trails" | `interactive-visuals` | `animate` (non-interactive) |
| "Particles" / "confetti" / "snow" | `particle-systems` | `generative-backgrounds` (no discrete particles) |
| "Background effects" / "noise gradients" | `generative-backgrounds` | `particle-systems` (discrete particles) |
| "3D" / "WebGL" / "shaders" | `webgl-shader` | `canvas-design` (2D) |
| "Retro" / "pixel art" / "glitch" | `retro-pixel` | `generative-backgrounds` |
| "Poster" / "art piece" / PNG or PDF visual | `canvas-design` | `screenshots` (product captures) |
| "Landing page" / "hero section" | `landing-page-builder` + `interactive-landing` | `frontend-design` (system, not page) |
| "Design system" / "clean UI" / "create DESIGN.md" | `frontend-design` + `design-consultation` | `landing-page-builder` (single page) |
| "Polish this" / "make it better" | `critique`, then `polish` | |
| "Make it bolder" / "more impact" | `bolder` + `overdrive` | `quieter` (opposite) |
| "Tone it down" / "too much" | `quieter` + `distill` | `bolder` (opposite) |
| "Copy is unclear" / "error messages" / "microcopy" | `clarify` | `typeset` (type, not words) |
| "Layout feels off" / "spacing" | `arrange` | `normalize` (consistency) |
| "Doesn't match our system" / "inconsistent" | `normalize` + `extract` | `design-consultation` (new system) |
| "Breaks on mobile" / "other devices" | `adapt` | `harden` (edge cases) |
| "Long text breaks it" / "i18n" / "error states" | `harden` | `adapt` (screen sizes) |
| "Empty states" / "first-run experience" | `onboard` | `delight` (personality) |
| "Add personality" / "micro-interactions" | `delight` | `animate` (motion in general) |
| "It's slow" / "janky animation" / bundle size | `optimize` | `audit` (broad quality) |
| "Audit accessibility, theming, responsiveness" | `audit` | `critique` (UX judgment) |
| "Color palette" / "colors" | `colorize` | `theme-factory` (whole theme) |
| "Typography" / "fonts" | `typeset` | `colorize` |
| "Theme these slides/docs" | `theme-factory` | `colorize` |
| "Presentation" / "slides" | `frontend-slides` + `theme-factory` | `landing-page-builder` |
| "Product screenshots" | `screenshots` | `canvas-design` (art) |
| "Standalone HTML artifact" | `web-artifacts-builder` | `landing-page-builder` (framework page) |
| "Give it a dark-glass / skeuomorphic / named look" | `looks` | `frontend-design` (no named direction) |
| "Turn this video / HTML / site into a prompt" | `capture` | `screenshots` (marketing crops) |

When nothing matches, read `design-router/SKILL.md`; its intent taxonomy and disambiguation rules cover the long tail.

## Campaign chains

Run one sub-skill per step; verify the build between steps that change code.

**Landing page**

1. `design-context` — brand, colors, fonts, mood
2. `landing-page-builder` — structure and layout
3. `interactive-landing` — hero animation, scroll narrative
4. `framer-motion-patterns` — component transitions
5. `particle-systems` or `generative-backgrounds` — ambient effects
6. `colorize` — color harmony check
7. `polish` — final pass

**Design system**

1. `design-context` — existing brand assets
2. `frontend-design` — clean, production-grade UI method
3. `design-consultation` — system proposal and DESIGN.md
4. `colorize` — palette and tokens
5. `typeset` — type scale
6. `normalize` — consistency pass
7. `harden` — edge cases

**Visual effects showcase**

1. `design-context` — performance budget
2. `webgl-shader` or `particle-systems` — core effect
3. `interactive-visuals` — user interaction
4. `gsap-patterns` — scroll-triggered reveals
5. `optimize` — performance pass

**Polish pipeline**

1. `critique` — identify issues
2. Direction picker: `bolder` / `overdrive` or `quieter` / `distill`
3. `clarify` — copy and readability
4. `arrange` — layout
5. `typeset` — typography
6. `adapt` — responsive check
7. `polish` — final pass
