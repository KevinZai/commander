---
name: component-design
category: design
skills: [shadcn-ui, frontend-patterns, frontend-design]
mode: code
estimated_tokens: 600
---

# Component Design

## When to Use
Use when building a reusable UI component that must handle variants, states and accessibility. Skip it for a trivial one-off element.

## Template

```
Design and implement a reusable {{component_name}} component with variants, states and accessibility.

**Component:**
{{component_name}} — {{what_it_does}}

**Framework:**
{{React|Vue|Svelte — or detect from project}}

**Styling:**
{{Tailwind|CSS Modules|styled-components|shadcn/ui variant system}}

**Step 1: API design**
Define the props interface before writing any markup:
- Required props (data the component cannot function without)
- Optional props with sensible defaults
- Variant props (size, color, style variations)
- Event handler props (onClick, onChange, onSubmit)
- Composition props (children, slots, render props)
- Accessibility props (aria-label, role, id)

Output it as a TypeScript interface.

**Step 2: State analysis**
Enumerate every visual state:
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
- Build the component with every variant and state.
- Manage variants with `cva` (class-variance-authority) or the project's equivalent.
- Implement keyboard navigation (Tab, Enter, Escape, arrow keys as needed).
- Add ARIA attributes for screen readers.
- Export the TypeScript types alongside the component.

**Step 5: Verify**
- Render every variant x state combination.
- Test keyboard navigation end to end.
- Check color contrast ratios against WCAG AA.
- Confirm the component works in light and dark mode.
- Add a Storybook story or visual test if the project uses them, and run the project's test command.
- Report each check and its actual result.
```

## Tips
- Use the `shadcn-ui` skill to check whether shadcn already ships a similar component.
- The `frontend-patterns` skill covers compound-component and composition patterns.
- Start with the TypeScript interface; it forces API decisions before visual ones.

## Example

```
Design and implement a reusable DataTable component with variants, states and accessibility.

**Component:**
DataTable — a sortable, filterable, paginated table for structured data

**Framework:** React (Next.js app router)
**Styling:** Tailwind + shadcn/ui variant system (using cva)
```
