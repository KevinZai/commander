---
name: design-system
category: design
skills: [shadcn-ui, brand-guidelines, frontend-patterns]
mode: plan
estimated_tokens: 700
---

# Design System Setup

## When to Use
When starting a new project that needs consistent design, or when an existing project has inconsistent styling and needs a formal design system. This establishes tokens, components, and patterns from scratch.

## Template

```
Set up a design system for this project. Define tokens, build primitives, and establish patterns that ensure visual consistency across the entire application.

**Project:**
{{project_path_or_description}}

**Framework:**
{{React + Tailwind|Vue + CSS|other}}

**Existing brand:**
{{brand_colors_and_fonts_if_any — or say "create from scratch"}}

**Step 1: Design tokens**
Define the foundational values:

**Colors:**
- Primary (brand color + shades: 50-950)
- Secondary (complementary + shades)
- Neutral (gray scale for text, borders, backgrounds)
- Semantic: success (green), warning (amber), error (red), info (blue)
- Each color needs: foreground (text on that background) paired

**Typography:**
- Font families: heading, body, mono
- Size scale: xs, sm, base, lg, xl, 2xl, 3xl, 4xl
- Weight scale: normal (400), medium (500), semibold (600), bold (700)
- Line height: tight (1.25), normal (1.5), relaxed (1.75)

**Spacing:**
- Scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24 (in 4px increments)
- Use consistently for padding, margin, gap

**Border radius:**
- none, sm, md, lg, xl, full

**Shadows:**
- sm, md, lg, xl (for elevation hierarchy)

**Step 2: Implement tokens**
- If Tailwind: extend `tailwind.config.ts` with custom theme values
- If CSS: create CSS custom properties in a `tokens.css` file
- Create a `theme.ts` file that exports all tokens as typed constants
- Support dark mode (define both light and dark token values)

**Step 3: Primitive components**
Build the base components every project needs:
1. **Button** — primary, secondary, outline, ghost, destructive + sizes
2. **Input** — text, email, password, number + error state
3. **Typography** — h1-h6, p, span, small, code
4. **Card** — container with header, body, footer slots
5. **Badge** — status indicators with semantic colors
6. **Avatar** — image with fallback initials

Each primitive should:
- Accept a `className` prop for extension
- Use `cva` or equivalent for variant management
- Export TypeScript props interface
- Include proper ARIA attributes

**Step 4: Layout components**
- **Container** — max-width wrapper with responsive padding
- **Stack** — vertical spacing (gap control)
- **Row** — horizontal layout with alignment options
- **Grid** — responsive grid with column control

**Step 5: Documentation**
Create a style guide page or Storybook that shows:
- All color swatches (light + dark)
- Typography scale
- All component variants
- Spacing examples
```

## Tips
- Use the `shadcn-ui` skill to bootstrap with shadcn's component library as a foundation
- The `brand-guidelines` skill can generate a full brand guide from minimal input
- Start with tokens + 3 primitives, then add components as needed — don't build a full library upfront

## Example

```
Set up a design system for this project.

**Project:** /Users/me/projects/my-saas (new Next.js 14 project)
**Framework:** React + Tailwind 4 + shadcn/ui
**Existing brand:** Primary blue (#2563EB), Inter font for body, Cal Sans for headings. No other assets yet.
```
