---
name: tailwind-v4
description: "Tailwind CSS v4 — major breaking change from v3. No tailwind.config.js, CSS-based configuration with @theme directive, @import 'tailwindcss', container queries, new utilities. Use when: Tailwind v4, CSS config, @theme, container queries, migration from v3, dark mode variants, custom utilities."
---

# Tailwind CSS v4 — Complete Reference

> **BREAKING CHANGE:** Tailwind v4 eliminates `tailwind.config.js`. All config lives in your CSS file. `@tailwind` directives are gone. Auto content detection replaces the `content` array.

## 1. Migration from v3

### Install
```bash
npm install tailwindcss@latest @tailwindcss/vite  # or @tailwindcss/postcss
# Remove old deps
npm uninstall tailwindcss-animate @tailwindcss/forms @tailwindcss/typography
# Reinstall as v4 plugins
npm install @tailwindcss/typography
```

### CSS Entry Point

```css
/* v3 — OLD, do not use */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 — NEW */
@import "tailwindcss";
```

That single import replaces all three `@tailwind` directives.

### Vite config (Next.js + Vite projects)

```typescript
// vite.config.ts or next.config.ts
import tailwindcss from "@tailwindcss/vite"

export default {
  plugins: [tailwindcss()],
}
```

For Next.js with PostCSS:
```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

### Delete These Files
```bash
rm tailwind.config.js  # or tailwind.config.ts
# No longer needed — v4 reads your source files automatically
```

## 2. CSS-Based Configuration with @theme

Everything that was in `tailwind.config.js` `theme` now goes in `@theme`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Colors — generates bg-*, text-*, border-*, etc. */
  --color-brand: oklch(0.65 0.25 270);
  --color-brand-50: oklch(0.97 0.05 270);
  --color-brand-100: oklch(0.94 0.08 270);
  --color-brand-500: oklch(0.65 0.25 270);
  --color-brand-900: oklch(0.25 0.15 270);

  /* Typography */
  --font-sans: "Inter Variable", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --font-display: "Cal Sans", serif;

  /* Font sizes */
  --text-2xs: 0.625rem;
  --text-2xs--line-height: 0.875rem;

  /* Spacing — extends the default scale */
  --spacing-18: 4.5rem;
  --spacing-128: 32rem;

  /* Border radius */
  --radius-4xl: 2rem;

  /* Shadows */
  --shadow-glow: 0 0 20px oklch(0.65 0.25 270 / 0.3);

  /* Breakpoints */
  --breakpoint-3xl: 1920px;

  /* Animations */
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-slide-up: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Keyframes for custom animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

**Theme tokens generate utilities automatically:**
- `--color-brand-500` → `bg-brand-500`, `text-brand-500`, `border-brand-500`
- `--spacing-18` → `p-18`, `m-18`, `w-18`, `h-18`
- `--animate-fade-in` → `animate-fade-in`

### Remove theme defaults

```css
@theme {
  /* Reset ALL colors before defining your palette */
  --color-*: initial;
  --color-white: #fff;
  --color-black: #000;
  --color-primary: oklch(0.65 0.25 270);
}
```

## 3. Container Queries

No more `@tailwindcss/container-queries` plugin — built in.

```html
<!-- Mark a container -->
<div class="@container">
  <!-- Style based on container width, not viewport -->
  <div class="@sm:grid-cols-2 @lg:grid-cols-4 grid gap-4">
    ...
  </div>
</div>

<!-- Named containers for nested queries -->
<div class="@container/sidebar">
  <nav class="@sidebar/lg:flex-col flex-row flex">...</nav>
</div>
```

```css
/* Container breakpoints (same scale as responsive) */
/* @xs: 20rem | @sm: 24rem | @md: 28rem | @lg: 32rem | @xl: 36rem | @2xl: 42rem */

/* Range queries */
.card {
  @apply @[200px]:text-sm @[400px]:text-base;
}
```

```tsx
// In TSX
<div className="@container">
  <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-4 gap-6">
    {items.map(item => <Card key={item.id} {...item} />)}
  </div>
</div>
```

## 4. New Utilities in v4

```html
<!-- Text wrapping -->
<h2 class="text-wrap-balance">Perfectly balanced headlines without orphans</h2>
<p class="text-wrap-pretty">Better paragraph wrapping that avoids single orphan words</p>

<!-- Field sizing (textarea grows with content) -->
<textarea class="field-sizing-content resize-none" />

<!-- 3D Transforms -->
<div class="transform-3d perspective-500">
  <div class="rotate-x-12 rotate-y-6 translate-z-4">3D card</div>
</div>

<!-- Color mix (uses CSS color-mix()) -->
<div class="bg-blue-500/50">Semi-transparent blue via color-mix</div>

<!-- Inert -->
<div class="inert:opacity-50" inert>Disabled section</div>

<!-- Starting style (entry animations without JS) -->
<div class="starting:opacity-0 starting:translate-y-2 transition-all">Animates on mount</div>

<!-- not-* variant -->
<div class="not-hover:opacity-70">Dimmed when NOT hovered</div>

<!-- in-* variant (matches inside a parent selector) -->
<li class="in-[.active-list]:font-bold">Bold when inside .active-list</li>

<!-- nth-* variants -->
<li class="nth-[2n]:bg-muted">Even rows</li>
<li class="nth-last-[3]:text-primary">3rd from last</li>
```

## 5. CSS Variables as Values

Reference CSS variables directly in utility classes using `(--var)` syntax:

```html
<!-- Reference any CSS variable as a value -->
<div class="bg-(--brand-color)">Uses --brand-color CSS variable</div>
<div class="text-(--heading-size)">Dynamic text size</div>
<div class="w-(--sidebar-width) h-(--content-height)">Dynamic dimensions</div>
```

```tsx
// Dynamic colors from data or theme
const statusColors = {
  active: "bg-(--color-green-500)",
  paused: "bg-(--color-yellow-500)",
  archived: "bg-(--color-slate-400)",
}

// Arbitrary values still work
<div className="bg-[var(--my-color)]" />  // v3 syntax still works
<div className="bg-(--my-color)" />        // v4 shorthand
```

## 6. Dark Mode

```css
/* In globals.css — define dark theme variables */
@import "tailwindcss";

@theme {
  --color-background: #ffffff;
  --color-foreground: #0f172a;
}

/* Dark variant in CSS */
@variant dark {
  @theme {
    --color-background: #0f172a;
    --color-foreground: #f8fafc;
  }
}
```

```tsx
// dark: prefix still works in JSX exactly like v3
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
  Supports dark mode
</div>
```

Configure dark mode strategy:
```css
/* Class-based dark mode (default in v4) */
@import "tailwindcss";
@variant dark (&:where(.dark, .dark *));

/* System preference dark mode */
@variant dark (@media (prefers-color-scheme: dark));
```

```tsx
// Toggle dark mode — add/remove 'dark' class on <html>
"use client"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

## 7. Custom Variants with @variant

```css
/* Custom media query variants */
@variant pointer-coarse {
  @media (pointer: coarse) { @slot; }
}

@variant touch-device {
  @media (hover: none) and (pointer: coarse) { @slot; }
}

@variant print {
  @media print { @slot; }
}

/* Custom state variants */
@variant hocus {
  &:hover, &:focus { @slot; }
}

@variant group-hocus {
  :merge(.group):hover &, :merge(.group):focus & { @slot; }
}

@variant data-loading {
  &[data-loading] { @slot; }
}
```

```html
<!-- Usage in HTML -->
<button class="pointer-coarse:h-12 pointer-coarse:text-lg h-9 text-sm">
  Bigger tap target on touch devices
</button>

<div class="hocus:bg-accent hocus:text-accent-foreground">
  Hover or focus highlight
</div>

<div data-loading class="data-loading:opacity-50 data-loading:cursor-wait">
  Loading state via data attribute
</div>
```

## 8. Custom Utilities with @utility

Prefer `@utility` over `@apply` for reusable custom utilities. `@apply` still works but `@utility` creates proper utility classes that support variants.

```css
/* Custom utilities with @utility */
@utility container-narrow {
  max-width: 48rem;
  margin-inline: auto;
  padding-inline: 1.5rem;
}

@utility container-wide {
  max-width: 80rem;
  margin-inline: auto;
  padding-inline: 2rem;
}

@utility text-gradient {
  background-image: linear-gradient(135deg, var(--color-brand-500), var(--color-brand-300));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

@utility input-base {
  height: 2.25rem;
  width: 100%;
  rounded: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background);
  padding-inline: 0.75rem;
  font-size: 0.875rem;
}

/* @utility supports variants automatically */
@utility scrollbar-hide {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
```

```html
<!-- @utility classes support all variants -->
<div class="container-narrow hover:text-gradient dark:bg-muted/50">
  Custom utility with full variant support
</div>

<div class="md:container-wide container-narrow">
  Responsive custom utility
</div>
```

### @apply — still valid for component layers

```css
/* Still useful in @layer components for multi-property patterns */
@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90;
  }
}
```

## 9. Auto Content Detection

No more `content: []` array — v4 automatically scans all files:

```css
/* v3 — required content config */
/* tailwind.config.js: content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"] */

/* v4 — completely automatic, no config needed */
/* Detects all templates, components, pages automatically */
```

If you need to **exclude** a path or **add** a source:
```css
@import "tailwindcss";

/* Explicitly add a source if auto-detection misses it */
@source "../node_modules/@my-lib/components";

/* Exclude generated files */
@source not ".next/";
```

## 10. Import Syntax & Plugin Registration

```css
/* Complete globals.css for Next.js + shadcn/ui */
@import "tailwindcss";

/* Register v4 plugins */
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";

/* Theme configuration */
@theme {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --color-brand: oklch(0.60 0.24 270);
  --color-brand-foreground: oklch(0.98 0.01 270);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

/* shadcn/ui CSS variables (light theme) */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
    /* ... rest of shadcn tokens */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }

  * { border-color: hsl(var(--border)); }
  body { background-color: hsl(var(--background)); color: hsl(var(--foreground)); }
}

/* Custom variants */
@variant pointer-coarse {
  @media (pointer: coarse) { @slot; }
}

/* Custom utilities */
@utility text-balance {
  text-wrap: balance;
}
```

## Key Differences Summary

| Feature | v3 | v4 |
|---|---|---|
| Config file | `tailwind.config.js` | None (deleted) |
| CSS import | `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| Content paths | `content: ["./src/**"]` | Automatic |
| Custom colors | `theme.extend.colors` in JS | `--color-*` in `@theme {}` |
| Custom fonts | `theme.extend.fontFamily` in JS | `--font-*` in `@theme {}` |
| Custom spacing | `theme.extend.spacing` in JS | `--spacing-*` in `@theme {}` |
| Plugins | `plugins: [require(...)]` | `@plugin "..."` in CSS |
| Dark mode | `darkMode: "class"` in JS | `@variant dark` in CSS |
| Container queries | Separate plugin | Built in |
| Custom utilities | `@layer utilities { @apply }` | `@utility name { ... }` |

**Version:** 1.0.0
**Last Updated:** 2026-03-23
