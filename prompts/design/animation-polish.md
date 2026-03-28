---
name: animation-polish
category: design
skills: [animate, motion-design, delight]
mode: code
estimated_tokens: 500
---

# Animation Polish

## When to Use
When a feature is functionally complete but feels flat. This template adds micro-interactions, transitions, and motion design that make the UI feel polished and responsive.

## Template

```
Add animation polish to the following UI. The goal is subtle, purposeful motion — not decoration. Every animation must serve a UX purpose.

**Target:**
{{file_paths_or_component_names}}

**Animation library:**
{{Framer Motion|CSS transitions|GSAP|none yet — recommend one}}

**UX principles for motion:**
- **Feedback** — user actions should have immediate visual response
- **Orientation** — motion shows where things come from and go to
- **Focus** — animation draws attention to what matters
- **Continuity** — transitions connect related states smoothly

**Step 1: Audit current interactions**
Read the target files and identify every user interaction point:
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
- Add animations using the Edit tool (surgical additions, not rewrites)
- Keep durations under 400ms (anything longer feels sluggish)
- Use `ease-out` for entrances, `ease-in` for exits
- Respect `prefers-reduced-motion` — wrap animations in a media query check
- Stagger list animations (50ms delay between items)

**Step 4: Verify**
- Test with `prefers-reduced-motion: reduce` — should degrade gracefully
- Verify animations don't cause layout shift (CLS)
- Check performance — no janky animations (should run at 60fps)
- Test on mobile — animations should be simpler/faster on mobile
```

## Tips
- Use the `animate` skill for common animation patterns (fade, slide, scale, stagger)
- The `delight` skill focuses specifically on micro-interactions that spark joy
- Less is more — if in doubt, make the animation shorter and subtler

## Example

```
Add animation polish to the following UI. The goal is subtle, purposeful motion — not decoration.

**Target:**
src/components/Dashboard/*, src/components/Sidebar/*

**Animation library:**
Framer Motion (already installed)
```
