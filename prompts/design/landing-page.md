---
name: landing-page
category: design
skills: [landing-page-builder, frontend-design, shadcn-ui]
mode: code
estimated_tokens: 800
---

# Landing Page Design

## When to Use
Use when building a landing page from scratch or redesigning one. The template covers design decisions and implementation and ends with a working page.

## Template

```
Design and build a landing page for the following product or feature. The page converts visitors into {{desired_action}}.

**Product:**
{{what_the_product_does_in_one_sentence}}

**Target audience:**
{{who_visits_this_page — developers, marketers, founders, etc.}}

**Desired action:**
{{CTA — sign up, download, book demo, join waitlist}}

**Tone:**
{{professional|playful|technical|minimal|bold — pick one or describe}}

**Design system:**
{{Tailwind + shadcn/ui|custom CSS|other — or say "recommend one"}}

**Step 1: Content structure**
Plan the sections, top to bottom:
1. **Hero** — headline, subheadline, CTA, hero image/demo
2. **Social proof** — logos, testimonials, stats (real ones only; leave a marked placeholder when none exist)
3. **Problem** — the pain point the product solves
4. **Solution** — how the product solves it (features, screenshots)
5. **How it works** — three-step process or visual walkthrough
6. **Features** — feature grid with icons
7. **Pricing** — if applicable
8. **FAQ** — address objections
9. **Final CTA** — repeat the main call to action
10. **Footer** — links, legal, social

Write the copy for each section before coding.

**Step 2: Visual design decisions**
- Color palette (primary, secondary, accent, neutrals)
- Typography (heading font, body font, sizes)
- Spacing system (consistent padding/margin scale)
- Animation approach (subtle entrances, scroll-triggered, or static)
- Mobile-first responsive breakpoints

**Step 3: Build**
- Create the page component(s).
- Implement responsive layouts for mobile, tablet and desktop.
- Add micro-interactions (hover states, scroll animations).
- Optimize images (lazy loading, modern formats).
- Ensure accessibility (semantic HTML, color contrast, keyboard navigation).

**Step 4: Verify**
- Check the page at 375px, 768px and 1440px viewports.
- Run Lighthouse (for example `npx lighthouse <url> --view`) and target a performance score of 90 or higher.
- Click every link and CTA and confirm each resolves.
- Report each check and its actual result.
```

## Tips
- Use the `landing-page-builder` skill for scaffold generation.
- The `shadcn-ui` skill has pre-built blocks (hero sections, feature grids, pricing tables).
- The `frontend-design` skill handles responsive layout patterns.

## Example

```
Design and build a landing page for the following product or feature.

**Product:** An AI-powered code review tool that catches bugs before your teammates do.
**Target audience:** Software engineering team leads and senior developers
**Desired action:** Sign up for the free tier
**Tone:** Technical but approachable — like a smart colleague, not a sales pitch
**Design system:** Tailwind + shadcn/ui
```
