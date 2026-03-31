---
name: visual-verify
description: |
  Chrome extension screenshot verification loop. Write UI code, open Chrome,
  navigate to page, take screenshot, analyze for visual issues, fix, re-screenshot,
  repeat until clean. Integrates with /verify command and Playwright MCP.
triggers:
  - /visual-verify
  - screenshot verify
  - visual check
  - UI verification
  - chrome screenshot loop
disable-model-invocation: true
---

# Visual Verify

Automated screenshot-driven UI verification loop. Write code, see it rendered, fix issues, verify the fix -- all without leaving Claude Code.

## How It Works

```
Write UI code
     |
     v
Open Chrome / Browser Preview
     |
     v
Navigate to target page
     |
     v
Take screenshot --------+
     |                   |
     v                   |
Analyze screenshot       |
     |                   |
     v                   |
Issues found? --Yes--> Fix code
     |                   |
     No                  |
     |                   |
     v                   |
     DONE <--------------+
        (max 5 iterations)
```

## Prerequisites

- **Playwright MCP** installed and configured (preferred)
- OR **Claude Code Chrome extension** with browser access
- Dev server running locally (Vite, Next.js, Express, etc.)
- Target URL accessible from localhost

## Usage

### With Playwright MCP (Recommended)

```
Use /visual-verify to check the dashboard page.

1. Navigate to http://localhost:3000/dashboard
2. Take a full-page screenshot
3. Check for: layout breaks, overflow, missing elements, color contrast
4. Fix any issues found
5. Re-screenshot to confirm
```

### With Chrome Extension

```
Use the Chrome extension to verify the signup flow:

1. Open Chrome to http://localhost:3000/signup
2. Screenshot the initial state
3. Fill in form fields and screenshot each step
4. Check for: form alignment, error states, mobile responsiveness
5. Fix issues and re-verify
```

### Quick Command

```bash
/visual-verify http://localhost:3000/dashboard
```

## Verification Checklist

The visual verify loop checks for these categories:

### Layout
- [ ] No horizontal overflow (content within viewport)
- [ ] Elements properly aligned (grid/flex not broken)
- [ ] Correct spacing between sections
- [ ] Footer at bottom of page (not floating mid-page)
- [ ] No overlapping elements

### Typography
- [ ] Text is readable (sufficient size, contrast)
- [ ] Headings follow hierarchy (h1 > h2 > h3)
- [ ] No text truncation where not intended
- [ ] Line height appropriate for readability
- [ ] No orphaned words in headings

### Visual
- [ ] Images load correctly (no broken image icons)
- [ ] Icons render at correct size
- [ ] Colors match design system
- [ ] No visual artifacts (rendering glitches)
- [ ] Dark mode / light mode renders correctly

### Interactive
- [ ] Buttons look clickable (proper styling)
- [ ] Links are distinguishable from text
- [ ] Form inputs have visible borders/outlines
- [ ] Hover/focus states visible (where applicable in screenshot)
- [ ] Loading states render correctly

### Responsive
- [ ] Desktop (1920x1080) -- full layout
- [ ] Tablet (768x1024) -- responsive breakpoint
- [ ] Mobile (375x667) -- mobile layout

## Multi-Viewport Verification

Check responsive design across breakpoints:

```
Run /visual-verify across viewports:

Desktop (1440x900):
  Screenshot http://localhost:3000/
  Check: sidebar visible, 3-column grid, full navigation

Tablet (768x1024):
  Screenshot http://localhost:3000/
  Check: sidebar collapsed, 2-column grid, hamburger menu

Mobile (375x812):
  Screenshot http://localhost:3000/
  Check: single column, bottom nav, touch targets 44px+
```

## Integration with /verify

Visual verify is one step in the broader `/verify` command:

```
/verify
  1. TypeScript check (npx tsc --noEmit)
  2. Lint check (npm run lint)
  3. Test check (npm test)
  4. Visual check ← /visual-verify
  5. Accessibility check (axe-core)
  6. Performance check (Lighthouse)
```

## Safety Guards

| Guard | Value |
|---|---|
| Max iterations | 5 (prevents infinite fix loops) |
| Timeout per screenshot | 30 seconds |
| Cost ceiling | $2.00 per verification session |
| Escalation | After 3 failed fixes for the same issue, stop and report |
| Destructive actions | Never deletes files; only modifies source code |

## Example Session

```
[visual-verify] Starting verification for http://localhost:3000/dashboard

[Iteration 1] Screenshot captured (1440x900)
  Issues found: 2
    1. Sidebar overlaps main content at 1440px (CSS grid issue)
    2. Chart legend text truncated

  Fixing issue 1: Updated grid-template-columns in dashboard.css
  Fixing issue 2: Added text-overflow: ellipsis with title attribute

[Iteration 2] Screenshot captured (1440x900)
  Issues found: 1
    1. Chart legend now wraps instead of truncating (follow-up from fix 2)

  Fixing issue 1: Set white-space: nowrap on legend items, increased container width

[Iteration 3] Screenshot captured (1440x900)
  Issues found: 0

[visual-verify] PASSED -- all checks clean after 3 iterations
  Total fixes: 3
  Cost: $0.62
```

## Viewport Presets

| Name | Width | Height | Use Case |
|---|---|---|---|
| `mobile-sm` | 320 | 568 | iPhone SE |
| `mobile` | 375 | 812 | iPhone 13 |
| `mobile-lg` | 428 | 926 | iPhone 14 Pro Max |
| `tablet` | 768 | 1024 | iPad |
| `tablet-lg` | 1024 | 1366 | iPad Pro |
| `desktop` | 1440 | 900 | Standard desktop |
| `desktop-lg` | 1920 | 1080 | Full HD |
| `ultrawide` | 2560 | 1080 | Ultrawide monitor |

## Tips

- Start with desktop viewport, then check mobile -- desktop bugs are easier to diagnose
- Use Playwright MCP over Chrome extension when possible -- it's faster and more reliable
- Take screenshots of specific components, not just full pages, to catch subtle issues
- Compare before/after screenshots when fixing layout bugs
- Run visual verify after every significant CSS or layout change, not just at the end
