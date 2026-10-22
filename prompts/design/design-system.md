---
name: design-system
category: design
skills: [shadcn-ui, brand-guidelines, frontend-patterns]
mode: plan
estimated_tokens: 700
---

# Design System Setup

## When to Use
Use when a new project needs consistent design, or when an existing project has inconsistent styling and needs a formal system. The template establishes tokens, primitives and patterns from scratch.

## Template

```
Set up a design system for this project. Define tokens, build primitives and establish patterns that keep the application visually consistent.

**Project:**
{{project_path_or_description}}

**Framework:**
{{React + Tailwind|Vue + CSS|other}}

**Existing brand:**
{{brand_colors_and_fonts_if_any — or say "create from scratch"}}

**Step 1: Design tokens**
Define the foundational values:

**Colors:**
- Primary (brand color + shades 50–950)
- Secondary (complementary + shades)
- Neutral (gray scale for text, borders, backgrounds)
- Semantic: success (green), warning (amber), error (red), info (blue)
- Pair each color with its foreground (text on that background)

**Typography:**
- Font families: heading, body, mono
- Size scale: xs, sm, base, lg, xl, 2xl, 3xl, 4xl
- Weight scale: normal (400), medium (500), semibold (600), bold (700)
- Line height: tight (1.25), normal (1.5), relaxed (1.75)

**Spacing:**
- Scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24 (4px increments)
- Use it consistently for padding, margin and gap

**Border radius:**
- none, sm, md, lg, xl, full

**Shadows:**
- sm, md, lg, xl (elevation hierarchy)

**Step 2: Implement tokens**
- Tailwind: extend the theme in the project's Tailwind config (or its CSS `@theme` block, whichever the installed version uses).
- Plain CSS: create custom properties in a `tokens.css` file.
- Create a `theme.ts` that exports every token as a typed constant.
- Define light and dark values for every token.

**Step 3: Primitive components**
Build the base components every project needs:
1. **Button** — primary, secondary, outline, ghost, destructive + sizes
2. **Input** — text, email, password, number + error state
3. **Typography** — h1–h6, p, span, small, code
4. **Card** — container with header, body, footer slots
5. **Badge** — status indicators with semantic colors
6. **Avatar** — image with fallback initials

Each primitive:
- Accepts a `className` prop for extension
- Manages variants with `cva` or equivalent
- Exports its TypeScript props interface
- Includes the correct ARIA attributes

**Step 4: Layout components**
- **Container** — max-width wrapper with responsive padding
- **Stack** — vertical spacing (gap control)
- **Row** — horizontal layout with alignment options
- **Grid** — responsive grid with column control

**Step 5: Documentation**
Create a style guide page or Storybook that shows:
- Every color swatch (light + dark)
- The typography scale
- Every component variant
- Spacing examples

**Step 6: Verify**
Run the project's build and type-check commands, open the style guide in light and dark mode, and report each result.
```

## Tips
- Use the `shadcn-ui` skill to bootstrap from shadcn's component library.
- The `brand-guidelines` skill generates a brand guide from minimal input.
- Start with tokens plus three primitives, then add components as needed; do not build a full library upfront.

## Example

```
Set up a design system for this project.

**Project:** apps/my-saas (new Next.js project)
**Framework:** React + Tailwind + shadcn/ui
**Existing brand:** Primary blue (#2563EB), Inter for body, Cal Sans for headings. No other assets yet.
```
