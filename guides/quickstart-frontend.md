# Quickstart Guide: Frontend Developer

> Build beautiful, interactive UIs with the Bible. Design mode, mega-design skills, and framework-specific tips.

---

## Design Mode Setup

Switch to design mode for any frontend/UI work:

```
/cc mode design
```

Design mode changes Claude's behavior:
- **Visual-first** — prioritizes design quality and user experience
- **Critique loop** — automatically reviews design output before finishing
- **Animation-aware** — considers motion, transitions, and micro-interactions
- **Accessibility** — checks contrast, keyboard navigation, screen readers

### One-Time Setup

For the best frontend experience, also run:

```
/init
```

When the decision tree asks about your build type, select your frontend framework. The Bible configures stack-specific rules in your project's `CLAUDE.md`.

---

## Key Mega-Design Skills

Load the entire design domain with one command:

```
use mega-design skill
```

This gives you access to **35+ design skills** through a single router. You never need to load individual skills — the router dispatches to the right specialist.

### What is Inside Mega-Design

| Category | Skills | What They Do |
|----------|--------|-------------|
| **Animation** | animate, motion-design, framer-motion-patterns, gsap-patterns, svg-animation | CSS/JS animations, Framer Motion, GSAP ScrollTrigger, SVG morphing |
| **Visual Effects** | interactive-visuals, particle-systems, generative-backgrounds, webgl-shader, retro-pixel | Cursor trails, confetti, gradient backgrounds, 3D scenes, retro effects |
| **Design Systems** | frontend-design, colorize, theme-factory, design-consultation | Anti-slop UI, color strategy, themed output, design system audits |
| **Pages** | landing-page-builder, interactive-landing, web-artifacts-builder | High-converting landing pages, scroll-driven narratives, standalone HTML |
| **Polish** | critique, bolder, quieter, polish, delight, optimize | Design feedback loop, visual adjustments, final polish pass |

### The Design Workflow

```
Step 1: "use mega-design skill"
Step 2: Describe what you want to build
Step 3: Review the output
Step 4: "use critique skill" — get structured design feedback
Step 5: Apply feedback or "use polish skill" for final refinement
Step 6: /verify — check accessibility, performance, responsiveness
```

---

## Prompt Templates for Frontend

### Landing Page

```
Build a landing page for [product name].

Sections: hero with gradient animation, features grid (3 columns),
testimonials carousel, pricing table (3 tiers), and CTA section.

Requirements:
- Responsive (mobile-first)
- Dark mode support
- Subtle scroll-triggered animations
- Accessible (WCAG 2.1 AA)
- Performance budget: <3s LCP
```

### Component Library

```
Create a component library with:
- Button (primary, secondary, ghost, destructive variants + sizes)
- Input (text, email, password, with validation states)
- Card (with header, body, footer slots)
- Modal (with overlay, close on escape, focus trap)
- Toast notifications (success, error, warning, info)

Use shadcn/ui patterns. Tailwind CSS v4. TypeScript.
```

### Animation

```
Add entrance animations to the features section:
- Cards fade in and slide up as they enter the viewport
- Stagger each card by 100ms
- Use Framer Motion (not CSS-only)
- Respect prefers-reduced-motion
- Duration: 500ms, easing: ease-out
```

### Design System Audit

```
use design-consultation skill

Audit the current UI for:
1. Color consistency (are we using design tokens?)
2. Typography scale (is the hierarchy clear?)
3. Spacing system (consistent padding/margin?)
4. Component patterns (reusable or one-off?)
5. Dark mode (proper token switching?)

Provide specific fixes with code examples.
```

---

## Framework-Specific Tips

### React / Next.js

```bash
# Initialize a Next.js project with the Bible
mkdir my-app && cd my-app
npx create-next-app@latest . --typescript --tailwind --app
claude
/init   # Select Next.js when asked
```

Key skills for React/Next.js:
- `nextjs-app-router` — Server Components, Server Actions, streaming, metadata
- `shadcn-ui` — Component library with theming and composition
- `tailwind-v4` — CSS-first config, @theme, container queries
- `framer-motion-patterns` — Layout animations, gestures, scroll-triggered

```
use mega-saas skill. I need a Next.js 15 app with:
- App Router with route groups for (marketing) and (dashboard)
- shadcn/ui v4 components with dark mode
- Tailwind v4 with custom design tokens
```

### Vue / Nuxt

```bash
npx nuxi init my-app
cd my-app
claude
/init   # Select Vue/Nuxt when asked
```

Key skill: `vue-nuxt` — Nuxt 3 patterns, composables, auto-imports, server routes.

```
use vue-nuxt skill. Build a Nuxt 3 dashboard with:
- Auto-imported composables for data fetching
- Server routes for API endpoints
- Pinia store for state management
- NuxtUI components
```

### Svelte / SvelteKit

```bash
npx sv create my-app
cd my-app
claude
/init   # Select Svelte when asked
```

The Bible's general frontend skills work well with Svelte. Focus on:
- `frontend-design` — clean UI patterns applicable to any framework
- `animate` — CSS animations that work natively in Svelte transitions
- `tailwind-v4` — Tailwind works identically in Svelte

```
Build a SvelteKit app with:
- Form actions for server-side form handling
- Load functions for SSR data fetching
- Svelte transitions for page changes
- Tailwind v4 for styling
```

### Astro

```bash
npm create astro@latest
cd my-project
claude
/init   # Select Astro when asked
```

Astro is ideal for content-heavy sites. Combine with:
- `mega-seo` — SEO optimization, structured data, sitemap
- `landing-page-builder` — high-converting page structures
- `mega-marketing` — content strategy, CRO

```
Build an Astro blog with:
- MDX content collections
- Dynamic OG images
- RSS feed
- SEO optimization (structured data, sitemap, robots.txt)
- View transitions between pages
```

---

## Workflow: Design Mode in Practice

Here is the complete workflow for building a frontend feature, from idea to shipped:

### 1. Enter Design Mode

```
/cc mode design
```

### 2. Load the Design Stack

```
use mega-design skill
```

### 3. Describe Your Vision

Be specific about layout, colors, animations, and user interactions. The more detail you provide, the better the output.

### 4. Iterate with the Critique Loop

```
use critique skill on the current page
```

Critique provides structured feedback across:
- Visual hierarchy and balance
- Color contrast and accessibility
- Animation purpose and performance
- Responsive behavior
- Typography and spacing

### 5. Polish and Refine

```
use polish skill — final refinement pass
```

Polish handles micro-details: hover states, focus rings, transition timing, loading states, empty states.

### 6. Verify

```
/verify
```

Checks: no TypeScript errors, responsive on mobile/tablet/desktop, accessible, performant, no console errors.

### 7. Commit

```
/checkpoint
```

---

## Power Tips

1. **Use `critique` before `polish`** — critique identifies what to fix, polish executes the fixes. Running polish first skips the diagnosis step.

2. **Load `mega-design` once per session** — the router remembers context. You do not need to reload it for each request.

3. **Combine design + saas modes** — if you are building a SaaS frontend, switch between modes as needed: `design` for UI work, `saas` for data fetching and auth.

4. **Performance budgets matter** — always specify your LCP target. Without a budget, animations tend to get heavy.

5. **Mobile-first** — always say "mobile-first" or "responsive" in your prompt. Claude defaults to desktop layouts unless told otherwise.

6. **Accessibility is not optional** — design mode checks WCAG automatically, but explicitly mention accessibility requirements for edge cases (color blindness, screen readers, keyboard-only navigation).

7. **Use the Impeccable Suite for final polish** — the sequence is: `critique` (find issues) then `bolder` or `quieter` (adjust intensity) then `clarify` (improve clarity) then `polish` (final pass).
