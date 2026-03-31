---
name: Visual Regression Testing
description: "Visual regression testing patterns — screenshot comparison, Percy, Chromatic, baseline management, CI integration."
version: 1.0.0
category: testing
parent: ccc-testing
---

# Visual Regression Testing

> Catch unintended visual changes before they ship. Compare screenshots pixel-by-pixel against approved baselines.

## When to Use

- UI-heavy applications where visual consistency matters
- Design system component libraries
- After CSS refactors or dependency upgrades
- Before releases to catch layout regressions

## Playwright Screenshot Comparison

The simplest approach — built into Playwright, no third-party service needed.

### Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,  // Allow 1% pixel difference
      threshold: 0.2,           // Color difference threshold (0-1)
      animations: 'disabled',   // Freeze CSS animations
    },
  },
  use: {
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 667 } } },
  ],
});
```

### Writing Visual Tests

```typescript
// tests/visual/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard renders correctly', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('dashboard-full.png', {
    fullPage: true,
  });
});

test('navigation menu states', async ({ page }) => {
  await page.goto('/dashboard');

  // Default state
  await expect(page.locator('nav')).toHaveScreenshot('nav-default.png');

  // Hover state
  await page.locator('nav a').first().hover();
  await expect(page.locator('nav')).toHaveScreenshot('nav-hover.png');

  // Mobile menu open
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('[data-testid="menu-toggle"]').click();
  await expect(page.locator('nav')).toHaveScreenshot('nav-mobile-open.png');
});
```

### Handling Dynamic Content

Dynamic content (timestamps, avatars, ads) causes false positives. Strategies:

```typescript
// Strategy 1: Mask dynamic elements
await expect(page).toHaveScreenshot('page.png', {
  mask: [
    page.locator('.timestamp'),
    page.locator('.user-avatar'),
    page.locator('[data-testid="ad-slot"]'),
  ],
});

// Strategy 2: Replace dynamic content before screenshot
await page.evaluate(() => {
  document.querySelectorAll('.timestamp').forEach(el => {
    el.textContent = '2024-01-01 12:00:00';
  });
});
await expect(page).toHaveScreenshot('page-frozen.png');

// Strategy 3: Mock API responses for deterministic data
await page.route('**/api/users', route => {
  route.fulfill({
    json: [{ name: 'Test User', avatar: '/test-avatar.png' }],
  });
});

// Strategy 4: Freeze animations and transitions
await page.evaluate(() => {
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }
  `;
  document.head.appendChild(style);
});
```

### Updating Baselines

```bash
# Update all baselines (after intentional visual changes)
npx playwright test --update-snapshots

# Update specific test baselines
npx playwright test dashboard.spec.ts --update-snapshots

# Review changes before committing
git diff --stat tests/visual/*.png
```

## Percy Integration

Percy provides cloud-hosted visual review with team approval workflows.

```typescript
// Install: npm install -D @percy/cli @percy/playwright

import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('homepage visual review', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await percySnapshot(page, 'Homepage', {
    widths: [375, 768, 1280],     // Test multiple breakpoints
    minHeight: 1024,               // Minimum screenshot height
    percyCSS: `
      .ad-banner { display: none; }
      .timestamp { visibility: hidden; }
    `,
  });
});

// Run with: npx percy exec -- npx playwright test
// Requires PERCY_TOKEN environment variable
```

## Chromatic (Storybook)

For component libraries using Storybook, Chromatic provides per-component visual testing.

```bash
# Install
npm install -D chromatic

# Run visual tests against Storybook
npx chromatic --project-token=<token>

# In CI (GitHub Actions)
# - name: Visual Tests
#   run: npx chromatic --auto-accept-changes=main
#   env:
#     CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_TOKEN }}
```

### Storybook Stories as Visual Tests

```typescript
// Button.stories.tsx — each story becomes a visual test
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    chromatic: {
      viewports: [375, 1280],  // Test at these widths
      delay: 300,               // Wait for animations
    },
  },
};

export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: { variant: 'primary', children: 'Click me' },
};

export const Disabled: StoryObj<typeof Button> = {
  args: { variant: 'primary', children: 'Disabled', disabled: true },
};

export const Loading: StoryObj<typeof Button> = {
  args: { variant: 'primary', children: 'Loading', loading: true },
  parameters: {
    chromatic: { pauseAnimationAtEnd: true },
  },
};
```

## CI Integration (GitHub Actions)

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression

on: [pull_request]

jobs:
  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run visual tests
        run: npx playwright test tests/visual/

      - name: Upload diff artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: test-results/
          retention-days: 7
```

## Best Practices

1. **Commit baselines to git** — they are the source of truth for expected appearance
2. **Test at multiple viewports** — desktop, tablet, mobile at minimum
3. **Freeze dynamic content** — timestamps, avatars, randomized elements
4. **Use component-level screenshots** — full-page screenshots are brittle
5. **Set appropriate thresholds** — too tight = flaky, too loose = misses bugs
6. **Review diffs carefully** — don't blindly update baselines
7. **Separate visual tests from functional tests** — different concerns, different configs
8. **Run on consistent environments** — font rendering differs across OS; use CI as the canonical environment
