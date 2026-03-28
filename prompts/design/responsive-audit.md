---
name: responsive-audit
category: design
skills: [frontend-design, screenshots, accessibility-compliance]
mode: plan
estimated_tokens: 500
---

# Responsive Design Audit

## When to Use
When you need to verify that a page or set of components works across all device sizes. Run this before launch or after major layout changes.

## Template

```
Audit the responsive design of the following pages/components. Find layout breaks, overflow issues, and touch-target problems.

**Target:**
{{URLs_or_file_paths}}

**Breakpoints to test:**
- 320px (small mobile — iPhone SE)
- 375px (standard mobile — iPhone 14)
- 768px (tablet — iPad)
- 1024px (small desktop / landscape tablet)
- 1440px (standard desktop)
- 1920px (large desktop)

**Step 1: Read the code**
- Use Glob to find all layout-related files (layouts, pages, grid components)
- Read the CSS/Tailwind classes — look for:
  - Fixed widths that don't flex (`w-[800px]` instead of `max-w-`)
  - Missing responsive prefixes (`md:`, `lg:`)
  - Absolute positioning that could break on resize
  - Text that could overflow containers
  - Images without `max-w-full` or responsive sizing

**Step 2: Static analysis**
Use Grep to scan for common responsive issues:
- `overflow-x: hidden` on body (often hides horizontal scroll bugs)
- Fixed pixel values for widths (search for `width:.*px` in CSS)
- Missing viewport meta tag
- Touch targets under 44x44px (buttons, links)
- Font sizes under 16px on mobile (causes iOS zoom on input focus)

**Step 3: Per-breakpoint check**
For each breakpoint, verify:
- [ ] No horizontal scroll
- [ ] All text is readable without zooming
- [ ] Navigation is accessible (hamburger menu on mobile?)
- [ ] Images fit their containers
- [ ] Tables have a mobile strategy (scroll, stack, or hide columns)
- [ ] Modals/dialogs fit the viewport
- [ ] Touch targets are at least 44x44px
- [ ] Spacing feels appropriate (not too cramped, not too empty)

**Step 4: Report**
| Issue | Breakpoint | Location | Severity | Fix |
|---|---|---|---|---|
| Horizontal overflow | 320px | Hero section | HIGH | Add `overflow-hidden` + `max-w-full` on image |
| ... | ... | ... | ... | ... |

**Step 5: Fix**
Implement fixes using the Edit tool, starting with HIGH severity issues.
After each fix, verify it doesn't break other breakpoints.
```

## Tips
- Use the `screenshots` skill to capture visual evidence at each breakpoint
- The Playwright MCP can automate viewport testing with actual screenshots
- Test real content lengths, not lorem ipsum — long titles and names break layouts

## Example

```
Audit the responsive design of the following pages/components.

**Target:**
src/app/page.tsx, src/app/dashboard/page.tsx, src/app/pricing/page.tsx
```
