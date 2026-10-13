---
name: responsive-audit
category: design
skills: [frontend-design, screenshots, accessibility-compliance]
mode: plan
estimated_tokens: 500
---

# Responsive Design Audit

## When to Use
Use to verify that a page or set of components works across device sizes. Run it before launch or after major layout changes.

## Template

```
Audit the responsive design of the following pages or components. Find layout breaks, overflow issues and touch-target problems.

**Target:**
{{URLs_or_file_paths}}

**Breakpoints to test:**
- 320px (small phone)
- 375px (standard phone)
- 768px (tablet portrait)
- 1024px (small desktop / tablet landscape)
- 1440px (standard desktop)
- 1920px (large desktop)

**Step 1: Read the code**
- Use Glob to find layout-related files (layouts, pages, grid components).
- Read the CSS/Tailwind classes and look for:
  - Fixed widths that do not flex (`w-[800px]` instead of `max-w-`)
  - Missing responsive prefixes (`md:`, `lg:`)
  - Absolute positioning that breaks on resize
  - Text that can overflow its container
  - Images without `max-w-full` or responsive sizing

**Step 2: Static analysis**
Use Grep to scan for common responsive issues:
- `overflow-x: hidden` on body (often hides horizontal-scroll bugs)
- Fixed pixel widths (search `width:.*px` in CSS)
- A missing viewport meta tag
- Touch targets under 44x44px (buttons, links)
- Font sizes under 16px on mobile inputs (triggers iOS zoom on focus)

**Step 3: Per-breakpoint check**
For each breakpoint, verify:
- [ ] No horizontal scroll
- [ ] All text is readable without zooming
- [ ] Navigation is reachable (collapsed menu on mobile)
- [ ] Images fit their containers
- [ ] Tables have a mobile strategy (scroll, stack, or hide columns)
- [ ] Modals and dialogs fit the viewport
- [ ] Touch targets are at least 44x44px
- [ ] Spacing is neither cramped nor empty

When a browser tool is exposed in the session, load each URL at each breakpoint and record what you observed; otherwise label the per-breakpoint results as code-inferred.

**Step 4: Report**
| Issue | Breakpoint | Location | Severity | Fix |
|---|---|---|---|---|
| Horizontal overflow | 320px | Hero section | high | Add `overflow-hidden` + `max-w-full` on image |
| ... | ... | ... | ... | ... |

**Step 5: Fix**
Fix issues with the Edit tool, highest severity first. After each fix, re-check the other breakpoints and report the result.
```

## Tips
- The `browse` skill (headless browser) checks responsive layouts and takes screenshots; a Playwright tool works the same way when the session exposes one.
- The `screenshots` skill captures visual evidence at each breakpoint.
- Test real content lengths, not lorem ipsum; long titles and names break layouts.

## Example

```
Audit the responsive design of the following pages or components.

**Target:**
src/app/page.tsx, src/app/dashboard/page.tsx, src/app/pricing/page.tsx
```
