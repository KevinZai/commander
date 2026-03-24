# Tailwind CSS v3 → v4 Migration Guide

## Quick Reference Table

| v3 | v4 | Notes |
|---|---|---|
| `@tailwind base;` | `@import "tailwindcss";` | Single import replaces all three |
| `@tailwind components;` | (removed) | Included in `@import "tailwindcss"` |
| `@tailwind utilities;` | (removed) | Included in `@import "tailwindcss"` |
| `tailwind.config.js` | Deleted | All config in CSS |
| `content: ["./src/**"]` | Automatic | No config needed |
| `theme.colors.brand` | `--color-brand` in `@theme {}` | CSS custom property |
| `theme.extend.colors` | `--color-*` in `@theme {}` | No `extend` needed |
| `theme.fontFamily.sans` | `--font-sans` in `@theme {}` | |
| `theme.spacing["18"]` | `--spacing-18` in `@theme {}` | |
| `theme.borderRadius.4xl` | `--radius-4xl` in `@theme {}` | |
| `theme.screens.3xl` | `--breakpoint-3xl` in `@theme {}` | |
| `plugins: [require(...)]` | `@plugin "..."` in CSS | |
| `darkMode: "class"` | `@variant dark (&:where(.dark, .dark *))` | |
| `darkMode: "media"` | `@variant dark (@media (prefers-color-scheme: dark))` | |
| `@layer utilities { .foo { @apply ... } }` | `@utility foo { ... }` | Preferred; supports variants |
| Container queries plugin | Built in | No plugin needed |
| `bg-[var(--color)]` | `bg-(--color)` | Shorter shorthand |

## Config File Migration

### v3 tailwind.config.ts
```typescript
// DELETE THIS FILE in v4
import type { Config } from "tailwindcss"

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          500: "#6366f1",
          900: "#1e1b4b",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      fontFamily: {
        sans: ["Inter Variable", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config
```

### v4 globals.css equivalent
```css
@import "tailwindcss";

/* Plugins */
@plugin "@tailwindcss/typography";
/* tailwindcss-animate → replaced by @starting-style and CSS animations */

/* Dark mode */
@variant dark (&:where(.dark, .dark *));

/* Theme */
@theme {
  --color-brand-50: #f0f5ff;
  --color-brand-500: #6366f1;
  --color-brand-900: #1e1b4b;

  --font-sans: "Inter Variable", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --animate-fade-in: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* shadcn CSS variables — unchanged from v3 */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... */
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
```

## PostCSS Config

### v3
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### v4
```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
// Note: autoprefixer no longer needed — v4 handles vendor prefixes
```

## Breaking Class Changes

| v3 class | v4 class | Reason |
|---|---|---|
| `shadow-sm` | `shadow-sm` | Unchanged |
| `ring-offset-*` | Use `outline-offset-*` | Ring offset API changed |
| `decoration-*` (shorthand) | Explicit `underline-offset-*` / `decoration-*` | |
| `overflow-ellipsis` | `text-ellipsis` | Renamed |
| `flex-shrink-0` | `shrink-0` | Shortened |
| `flex-grow` | `grow` | Shortened |
| `transform` (prefix) | Not needed | Transforms apply directly |
| `filter` (prefix) | Not needed | Filters apply directly |

## Utility Authoring

### v3 custom utility
```css
@layer utilities {
  .text-gradient {
    @apply bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent;
  }
}
/* Problem: doesn't support arbitrary variants like hover:text-gradient */
```

### v4 custom utility
```css
@utility text-gradient {
  background-image: linear-gradient(135deg, #a855f7, #ec4899);
  background-clip: text;
  color: transparent;
}
/* Now works: hover:text-gradient, dark:text-gradient, md:text-gradient */
```

## Package Changes

```bash
# Remove
npm uninstall tailwindcss autoprefixer tailwindcss-animate

# Install
npm install tailwindcss@latest @tailwindcss/postcss
# or with Vite:
npm install tailwindcss@latest @tailwindcss/vite

# Plugins still available
npm install @tailwindcss/typography @tailwindcss/forms
```

## Verify Migration

After migrating, check:
1. No `tailwind.config.js` file
2. `postcss.config.mjs` uses `@tailwindcss/postcss`
3. `globals.css` starts with `@import "tailwindcss"`
4. All `@tailwind` directives removed
5. Custom colors/fonts in `@theme {}` block
6. `dark:` variants still work in JSX (no changes needed)
7. All existing utility classes still work (backward compatible)
