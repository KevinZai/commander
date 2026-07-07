---
name: ccc-design
context: fork
description: "click-first picker over 41 design skills. Landing pages, component systems, polish suite, Figma→code, named aesthetic looks, design capture. Use when the user types /ccc-design, asks to 'design a landing…"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - TodoWrite
argument-hint: "[intent: landing | components | polish | figma]"
---

# /ccc-design — Design domain hub

Click-first picker over the design domain (41 sub-skills). User picks an intent in one click — we route to the right sub-skill or agent. No text menus, no numbered lists.

## Response shape (EVERY time)

### 1. Brand header (one line)

```
**CC Commander · Design** · 41 skills · [frontend-design](https://commanderplugin.com/design)
```

### 2. Context strip (one line)

Run these in ONE parallel Bash call, cheap + silent on failure:
- `test -f package.json && jq -r '.dependencies | keys[]' package.json 2>/dev/null | grep -E '^(next|react|vue|svelte|astro|@tailwindcss|tailwindcss)$'` — detect framework
- `ls src/components 2>/dev/null | wc -l` — component count
- `test -f tailwind.config.* && echo tw` — tailwind presence
- `git rev-parse --abbrev-ref HEAD 2>/dev/null` — branch

Render a one-liner:
> 🎨 Stack: `<Next.js | React | HTML | Vue | unknown>` · <N> components · <Tailwind | plain CSS> · branch `<name>`

If no project detected: "🎨 No project yet — I'll scaffold one after you pick a direction."

### 3. The picker — `AskUserQuestion` with 4 options

Read `${CLAUDE_PLUGIN_ROOT}/menus/ccc-design.json` once. Use its `choices` array to drive the question. **Max 4 options** — take the 4 non-back choices (landing / components / polish / figma). Back-to-main is not an AUQ option; users invoke `/ccc` directly.

```
question: "What design work?"
header: "CC Commander · Design"
multiSelect: false
options:
  - label: "🚀 Landing page"
    description: "High-converting marketing page — hero, social proof, CTA stack."
    preview: "Spawns frontend-design agent in background. Returns production React + Tailwind."
  - label: "🧩 Component system"
    description: "shadcn-style component library with tokens + variants."
    preview: "Routes to frontend-design + design-consultation + colorize + typeset."
  - label: "✨ Polish pass"
    description: "Audit spacing, contrast, motion, a11y — the Impeccable suite."
    preview: "Runs critique → clarify → (bolder | distill) → polish pipeline."
  - label: "🎨 Figma → code"
    description: "Paste a Figma URL, get production React + Tailwind."
    preview: "Needs figma MCP connected. Otherwise prompts /ccc-connect figma first."
```

**Recommendation logic** (prepend ⭐ to ONE option):
- No `src/components` or fewer than 3 components → ⭐ "Component system"
- Recent landing-page-ish files touched OR empty-ish repo → ⭐ "Landing page"
- `git diff --stat` shows CSS/JSX churn on current branch → ⭐ "Polish pass"
- figma MCP present in `claude mcp list` → keep "Figma → code" available; otherwise add `⚠️ needs connect` to its description

### 4. Handle the selection

Dispatch immediately — do NOT re-prompt. Map:

- **Landing page** → spawn `frontend-design` agent in background with payload `{ type: "landing-page", stack: <detected>, brand_context: "ask if missing" }`. Report back when agent completes. Fallback (if agent unavailable): invoke the domain routing sub-skills below — `design-context` → `landing-page-builder` → `interactive-landing` → `framer-motion-patterns` → `polish`.
- **Component system** → invoke sub-skills: `frontend-design` + `design-consultation` + `colorize` + `typeset` + `normalize`.
- **Polish pass** → invoke the Impeccable Suite pipeline: `critique` → `clarify` → (`bolder` or `distill` based on user's next answer) → `arrange` → `typeset` → `adapt` → `polish`.
- **Figma → code** → check `claude mcp list` for `figma`. If missing, suggest `/ccc-connect figma` first. If present, ask for the Figma URL, then route to `frontend-design` + `adapt`.

If the user passes an argument (`/ccc-design landing`), skip the picker and dispatch directly.

---

## Sub-flow A — Chat UI (shadcn chat-interface)

Trigger when the user asks for a chat UI, AI assistant interface, messaging panel, support widget, or "chat like ChatGPT/Claude". Offer it as a 5th option only when intent is clearly chat-related — otherwise reach it via the routing matrix below.

1. **Pull real components** — prefer the shadcn MCP if connected. Use `mcp__Shadcn_UI__list_blocks` / `mcp__Shadcn_UI__get_block` and `mcp__Shadcn_UI__get_component` to fetch the canonical `chat-interface` building blocks: message list, message bubble (user vs assistant), composer/input with send, streaming/typing indicator, scroll-to-bottom, and the optional sidebar/thread list. If the MCP is absent, suggest `/ccc-connect shadcn`, then fall back to scaffolding the same primitives by hand.
2. **Compose, don't reinvent** — assemble fetched blocks into `ChatPanel` + `MessageList` + `Composer`. Keep streaming, auto-scroll, and empty-state as first-class.
3. **Apply the design soul** — if a `Design.md` exists (Sub-flow B), apply its tokens before final styling so the chat matches the product's voice.
4. **Polish** — run the Impeccable Suite `polish` pass on spacing, contrast, and motion of the bubbles + composer.

> Reference: shadcn `chat-interface` blocks are the source of truth for chat scaffolding — don't hand-roll bubbles/composers when the block exists.

## Sub-flow B — Design.md (capture + apply a design's "soul")

A `Design.md` file at repo root is the portable, human-readable soul of a product's look — its typography, color, and spacing decisions. This sub-flow has two directions; ask which via `AskUserQuestion`:

```
question: "Design.md — capture or apply?"
header: "Design soul"
multiSelect: false
options:
  - label: "📥 Capture (generate)"
    description: "Read the current UI/tokens and distill them into a Design.md."
    preview: "Scans tailwind.config, CSS vars, fonts → writes Design.md."
  - label: "📤 Apply (consume)"
    description: "Read an existing Design.md and apply its soul to new/edited UI."
    preview: "Loads tokens from Design.md → uses them on every component."
```

- **Capture (generate)** — inspect `tailwind.config.*`, global CSS custom properties, font imports, and a few representative components. Distill into a `Design.md` with these sections: **Typography** (families, scale, weights, line-height), **Color** (named tokens + hex + semantic roles: bg/fg/primary/accent/border/muted), **Spacing** (base unit + scale + radius + shadow), **Voice/Mood** (one paragraph — the feeling). Write it with `Write` to repo root. Confirm before overwriting an existing `Design.md`.
- **Apply (consume)** — read `Design.md`, load its tokens into working memory, and use them as the binding constraint for every subsequent component/edit in this session (and pass them in the `brand_context` payload to any spawned `frontend-design` agent). If no `Design.md` exists, offer Capture first.

> `Design.md` is the single source of truth for a project's soul — capture once, apply everywhere, so chat UIs (Sub-flow A) and screenshot-derived UIs (Sub-flow C) stay on-brand.

## Sub-flow C — Screenshot → interactive UI + onboarding video

Trigger when the user pastes/attaches a screenshot (or mockup image) and wants it turned into working UI, optionally with an onboarding/demo video.

1. **Read the image** — use `Read` on the screenshot path to see the layout, then describe structure: regions, components, type scale, color, spacing rhythm.
2. **Apply the soul** — if a `Design.md` exists (Sub-flow B), reconcile observed styles against its tokens so the rebuild is on-brand rather than a pixel-trace.
3. **Build interactive UI** — spawn the `frontend-design` agent (background) with payload `{ type: "screenshot-to-ui", stack: <detected>, brand_context: <Design.md tokens or "ask"> }`. Produce production React + Tailwind with real interactivity (hover/focus/active states, responsive breakpoints), not a static clone.
4. **Onboarding video (pair with remotion)** — ask via `AskUserQuestion` whether to also produce a short onboarding/demo video. If yes, load the `remotion` skill and generate a programmatic walkthrough: scripted scenes that highlight the rebuilt UI's key flows (intro → feature beats → CTA), captioned, exported to MP4. Keep the video tokens (fonts/colors) sourced from `Design.md` for consistency.

> Pairing note: UI build = `frontend-design` agent; video = `remotion` skill. They share the `Design.md` soul so the product and its onboarding film feel like one thing.

---

## Anti-patterns — DO NOT

- ❌ Render a numbered list of 41 skills and ask the user to type one
- ❌ Show a table of 35+ options in `AskUserQuestion` (max 4)
- ❌ Spawn multiple agents in parallel for Landing — one at a time
- ❌ Skip the context strip — we need to tailor the preview field
- ❌ Ignore the recommendation logic — ⭐ is the whole point
- ❌ Hand-roll chat bubbles/composers when the shadcn `chat-interface` block exists (Sub-flow A)
- ❌ Overwrite an existing `Design.md` without confirming (Sub-flow B)
- ❌ Pixel-trace a screenshot into a static clone — rebuild interactive + on-brand (Sub-flow C)
- ❌ Generate the onboarding video without sourcing tokens from `Design.md`

---

## Domain reference — the 41 sub-skills

Below is the full routing matrix for agents that drill deeper after an initial pick (e.g., during the Polish pass pipeline). **This content is reference material, not shown to the user via AUQ.**

### What's inside

| Category | Skills |
|----------|--------|
| Animation & Motion | animate, svg-animation, motion-design, framer-motion-patterns, gsap-patterns |
| Visual Effects | interactive-visuals, particle-systems, generative-backgrounds, webgl-shader, retro-pixel, canvas-design |
| Design Systems & Pages | frontend-design, landing-page-builder, interactive-landing, design-consultation, colorize, theme-factory |
| Presentation & Output | screenshots, frontend-slides, web-artifacts-builder |
| Routing & Context | design-router, design-context |
| Impeccable Polish Suite | adapt, arrange, audit, bolder, clarify, critique, delight, distill, extract, harden, normalize, onboard, optimize, overdrive, polish, quieter, typeset |
| Look-Book & Capture (v6.5.0, MengTo/Skills) | looks, capture |

**Note:** Aligned with Anthropic's `frontend-design` plugin — ccc-design absorbs and extends its methodology.

### Routing matrix

| Your intent | Route to |
|-------------|----------|
| "Add animations" / "Make it move" | `animate` + `motion-design` |
| "Framer Motion animations" | `framer-motion-patterns` |
| "GSAP / ScrollTrigger" | `gsap-patterns` |
| "SVG animation" / "Lottie" | `svg-animation` |
| "Interactive effects" / "Cursor trails" | `interactive-visuals` |
| "Particles" / "Confetti" / "Snow" | `particle-systems` |
| "Background effects" / "Noise gradients" | `generative-backgrounds` |
| "3D" / "WebGL" / "Shaders" | `webgl-shader` |
| "Retro" / "Pixel art" / "Glitch" | `retro-pixel` |
| "Landing page" / "Hero section" | `landing-page-builder` + `interactive-landing` |
| "Design system" / "Clean UI" | `frontend-design` + `design-consultation` |
| "Chat UI" / "AI assistant interface" | Sub-flow A → shadcn `chat-interface` blocks |
| "Capture / apply our design soul" | Sub-flow B → `Design.md` generate/consume |
| "Turn this screenshot into UI" / "+ onboarding video" | Sub-flow C → `frontend-design` + `remotion` |
| "Polish this" / "Make it better" | Impeccable Suite → `critique` then `polish` |
| "Make it bolder" / "More impact" | `bolder` + `overdrive` |
| "Tone it down" / "Too much" | `quieter` + `distill` |
| "Color palette" / "Colors" | `colorize` |
| "Presentation" / "Slides" | `frontend-slides` + `theme-factory` |
| "Product screenshots" | `screenshots` |
| "Give it a [named vibe]" / "dark-glass look" / "skeuomorphic" | Look-book → `looks` |
| "Turn this video/HTML/site into a prompt" | Design capture → `capture` |

### Campaign templates

**Stunning landing page**
1. `design-context` → capture brand, colors, fonts, mood
2. `landing-page-builder` → structure and layout
3. `interactive-landing` → hero animations, scroll narrative
4. `framer-motion-patterns` → component transitions
5. `particle-systems` or `generative-backgrounds` → ambient effects
6. `colorize` → color harmony check
7. `polish` → final quality pass

**Design system setup**
1. `design-context` → capture existing brand assets
2. `frontend-design` → anti-slop methodology
3. `design-consultation` → system proposal
4. `colorize` → palette and tokens
5. `typeset` → typography scale
6. `normalize` → consistency pass

**Design polish pipeline**
1. `critique` → identify issues
2. Use AskUserQuestion with header "Direction", options: **Bolder Impact** (`bolder`/`overdrive`) / **Quieter Distill** (`quieter`/`distill`). Never write "Reply A/B" — always present as clickable chips.
3. `clarify` → improve readability
4. `arrange` → fix layout issues
5. `typeset` → typography refinement
6. `adapt` → responsive check
7. `polish` → final pass

### When to invoke this skill

- user: add smooth entrance animations to my landing page hero
- assistant: Loads ccc-design, picker surfaces Landing + Polish. On Polish → routes to `animate` + `framer-motion-patterns`.

- user: audit my UI and make it look more professional
- assistant: Loads ccc-design, user picks Polish → runs Impeccable Suite pipeline: `critique` → `clarify` → `bolder` or `distill` → `polish`.

- user: build a design system with dark mode support
- assistant: Loads ccc-design, user picks Component system → routes to `frontend-design` + `design-consultation` + `colorize` + `typeset`.

---

**Bottom line:** header → context → 4-option picker → dispatch to sub-skill or agent. One click, never typing.

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`
