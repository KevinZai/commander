# /ccc-design — sub-skill catalog and routing

Reference for the lead session and agents that drill deeper after the first pick (SKILL.md step 2–3). Not shown to the user as a menu.

Sub-skills ship with the Commander CLI toolkit (`skills/ccc-design/<name>/SKILL.md` in the repository). When a sub-skill is not available in the session, apply the one-line method in its row. The methodology is aligned with Anthropic's `frontend-design` plugin; this domain absorbs and extends it.

## Catalog

| Category | Sub-skills |
|---|---|
| Animation and motion | `animate`, `svg-animation`, `motion-design`, `framer-motion-patterns`, `gsap-patterns` |
| Visual effects | `interactive-visuals`, `particle-systems`, `generative-backgrounds`, `webgl-shader`, `retro-pixel`, `canvas-design` |
| Design systems and pages | `frontend-design`, `landing-page-builder`, `interactive-landing`, `design-consultation`, `colorize`, `theme-factory` |
| Presentation and output | `screenshots`, `frontend-slides`, `web-artifacts-builder` |
| Routing and context | `design-router`, `design-context` |
| Impeccable polish suite | `adapt`, `arrange`, `audit`, `bolder`, `clarify`, `critique`, `delight`, `distill`, `extract`, `harden`, `normalize`, `onboard`, `optimize`, `overdrive`, `polish`, `quieter`, `typeset` |
| Look-book and capture | `looks` (named visual looks), `capture` (turn a video, HTML page or site into a reusable design prompt) |

## Routing matrix

| Intent | Route to |
|---|---|
| "Add animations" / "make it move" | `animate` + `motion-design` |
| "Framer Motion animations" | `framer-motion-patterns` |
| "GSAP" / "ScrollTrigger" | `gsap-patterns` |
| "SVG animation" / "Lottie" | `svg-animation` |
| "Interactive effects" / "cursor trails" | `interactive-visuals` |
| "Particles" / "confetti" / "snow" | `particle-systems` |
| "Background effects" / "noise gradients" | `generative-backgrounds` |
| "3D" / "WebGL" / "shaders" | `webgl-shader` |
| "Retro" / "pixel art" / "glitch" | `retro-pixel` |
| "Landing page" / "hero section" | `landing-page-builder` + `interactive-landing` |
| "Design system" / "clean UI" | `frontend-design` + `design-consultation` |
| "Chat UI" / "AI assistant interface" | SKILL.md Sub-flow A (shadcn `chat-interface` blocks) |
| "Capture / apply our design soul" | SKILL.md Sub-flow B (`Design.md`) |
| "Turn this screenshot into UI" / "+ onboarding video" | SKILL.md Sub-flow C (`designer` agent + `remotion`) |
| "Polish this" / "make it better" | Impeccable suite: `critique` then `polish` |
| "Make it bolder" / "more impact" | `bolder` + `overdrive` |
| "Tone it down" / "too much" | `quieter` + `distill` |
| "Color palette" / "colors" | `colorize` |
| "Presentation" / "slides" | `frontend-slides` + `theme-factory` |
| "Product screenshots" | `screenshots` |
| "Give it a dark-glass look" / "skeuomorphic" / a named vibe | `looks` |
| "Turn this video/HTML/site into a prompt" | `capture` |

## Campaign templates

**Landing page**

1. `design-context` — capture brand, colors, fonts, mood
2. `landing-page-builder` — structure and layout
3. `interactive-landing` — hero animation, scroll narrative
4. `framer-motion-patterns` — component transitions
5. `particle-systems` or `generative-backgrounds` — ambient effects
6. `colorize` — color harmony check
7. `polish` — final quality pass

**Design system**

1. `design-context` — capture existing brand assets
2. `frontend-design` — anti-slop methodology
3. `design-consultation` — system proposal
4. `colorize` — palette and tokens
5. `typeset` — typography scale
6. `normalize` — consistency pass

**Polish pipeline**

1. `critique` — identify issues
2. Direction picker (SKILL.md step 3): bolder (`bolder`/`overdrive`) or quieter (`quieter`/`distill`)
3. `clarify` — readability
4. `arrange` — layout
5. `typeset` — typography
6. `adapt` — responsive check
7. `polish` — final pass

## Examples

- "Add smooth entrance animations to my landing page hero" → Polish pass, routed to `animate` + `framer-motion-patterns`.
- "Audit my UI and make it look more professional" → Polish pass: `critique` → direction → `clarify` … `polish`.
- "Build a design system with dark mode support" → Component system: `frontend-design` + `design-consultation` + `colorize` + `typeset`.
