---
name: animation-polish
category: design
skills: [animate, motion-design, delight]
mode: code
estimated_tokens: 500
---

# Animation Polish

## When to Use
Use when a feature works but feels flat. The template adds micro-interactions, transitions and motion that make the UI feel responsive. Skip it for UI that is still changing shape.

## Template

```
Add animation polish to the following UI. Keep motion subtle and purposeful: every animation serves a UX purpose, none is decoration.

**Target:**
{{file_paths_or_component_names}}

**Animation library:**
{{Framer Motion|CSS transitions|GSAP|none yet — recommend one}}

**UX principles for motion:**
- **Feedback** — user actions get an immediate visual response
- **Orientation** — motion shows where things come from and go to
- **Focus** — animation draws attention to what matters
- **Continuity** — transitions connect related states smoothly

**Step 1: Audit current interactions**
Read the target files and list every interaction point:
- Page/route transitions
- Component mount/unmount
- Button clicks and form submissions
- Data loading states
- Error/success states
- Hover and focus states
- Scroll-triggered reveals
- List item additions/removals

**Step 2: Design motion**
For each interaction, define:
| Interaction | Animation | Duration | Easing | Purpose |
|---|---|---|---|---|
| Page enter | Fade + slide up | 300ms | ease-out | Orientation |
| Button click | Scale 0.97 → 1.0 | 150ms | ease-in-out | Feedback |
| List item add | Slide in + fade | 200ms | ease-out | Continuity |
| ... | ... | ... | ... | ... |

**Step 3: Implement**
- Add animations with the Edit tool: surgical additions, not rewrites.
- Keep durations under 400ms; longer feels sluggish.
- Use `ease-out` for entrances and `ease-in` for exits.
- Respect `prefers-reduced-motion`: wrap animations in a media query check.
- Stagger list animations by 50ms per item.

**Step 4: Verify**
- Emulate `prefers-reduced-motion: reduce` and confirm motion degrades gracefully.
- Confirm animations cause no layout shift (CLS).
- Confirm animations hold 60fps (no jank) in a performance trace.
- On a mobile viewport, confirm animations are simpler or shorter.
- Report what you checked and the actual result for each item.
```

## Tips
- The `animate` skill covers common patterns (fade, slide, scale, stagger); `motion-design` covers timing and choreography.
- The `delight` skill focuses on micro-interactions.
- When in doubt, make the animation shorter and subtler.

## Example

```
Add animation polish to the following UI. Keep motion subtle and purposeful: every animation serves a UX purpose, none is decoration.

**Target:**
src/components/Dashboard/*, src/components/Sidebar/*

**Animation library:**
Framer Motion (already installed)
```
