---
name: component-design
category: design
skills: [shadcn-ui, frontend-patterns, frontend-design]
mode: code
estimated_tokens: 600
---

# Component Design

## When to Use
When building a reusable UI component that needs to handle multiple variants, states, and accessibility requirements. Use this for anything beyond a trivial one-off element.

## Template

```
Design and implement a reusable {{component_name}} component with proper variants, states, and accessibility.

**Component:**
{{component_name}} — {{what_it_does}}

**Framework:**
{{React|Vue|Svelte — or detect from project}}

**Styling:**
{{Tailwind|CSS Modules|styled-components|shadcn/ui variant system}}

**Step 1: API design**
Define the component's props interface before writing any JSX:
- Required props (data the component cannot function without)
- Optional props with sensible defaults
- Variant props (size, color, style variations)
- Event handler props (onClick, onChange, onSubmit)
- Composition props (children, slots, render props)
- Accessibility props (aria-label, role, id)

Output as a TypeScript interface.

**Step 2: State analysis**
Enumerate all visual states:
- **Default** — resting state
- **Hover** — mouse over
- **Focus** — keyboard focus (visible focus ring)
- **Active** — being clicked/pressed
- **Disabled** — not interactive
- **Loading** — async operation in progress
- **Error** — validation or operation failed
- **Empty** — no data to display

**Step 3: Variants**
Define the variant matrix:
| Variant | Values | Visual difference |
|---|---|---|
| Size | sm, md, lg | padding, font-size, icon-size |
| Color | default, primary, destructive | background, text, border colors |
| Style | solid, outline, ghost | fill vs border vs transparent |

**Step 4: Implementation**
- Build the component with all variants and states
- Use `cva` (class-variance-authority) or equivalent for variant management
- Implement keyboard navigation (Tab, Enter, Escape, Arrow keys as needed)
- Add ARIA attributes for screen readers
- Export TypeScript types alongside the component

**Step 5: Verify**
- Render every combination of variant x state
- Test keyboard navigation
- Check color contrast ratios (WCAG AA minimum)
- Verify the component works in both light and dark mode
- Write a Storybook story or visual test if the project uses them
```

## Tips
- Use the `shadcn-ui` skill to check if a similar component already exists in shadcn
- The `frontend-patterns` skill provides compound component and composition patterns
- Always start with the TypeScript interface — it forces you to think about the API before the visuals

## Example

```
Design and implement a reusable DataTable component with proper variants, states, and accessibility.

**Component:**
DataTable — a sortable, filterable, paginated table for displaying structured data

**Framework:** React (Next.js app router)
**Styling:** Tailwind + shadcn/ui variant system (using cva)
```
