---
name: Design Context
description: "Captures brand colors, fonts, animation preferences, and performance budget for consistent design output."
version: 1.0.0
category: foundation
parent: ccc-design
---

# Design Context

Captures and persists the design state so every other Mega-Design skill produces consistent output. Run this once per project, refresh when brand evolves.

## Context Capture Checklist

When invoked, gather these dimensions. Ask for what's missing, infer what you can from existing code.

### 1. Brand Identity
```yaml
brand:
  name: ""                    # Company/project name
  tagline: ""                 # One-line value prop
  personality: []             # e.g., [professional, playful, minimal]
  industry: ""                # Helps calibrate visual tone
  competitors: []             # Visual positioning context
```

### 2. Color System
```yaml
colors:
  primary: ""                 # Main brand color (hex)
  secondary: ""               # Supporting color
  accent: ""                  # Call-to-action / highlight
  neutral:
    50: ""                    # Lightest
    100: ""
    200: ""
    300: ""
    400: ""
    500: ""                   # Mid
    600: ""
    700: ""
    800: ""
    900: ""                   # Darkest
    950: ""
  semantic:
    success: ""
    warning: ""
    error: ""
    info: ""
  dark_mode: true/false       # Does the brand support dark mode?
  dark_mode_strategy: ""      # "invert", "shift-hue", "separate-palette"
```

### 3. Typography
```yaml
typography:
  heading_font: ""            # e.g., "Inter", "Cal Sans"
  body_font: ""               # e.g., "Inter", "system-ui"
  mono_font: ""               # e.g., "JetBrains Mono", "Fira Code"
  base_size: "16px"           # Root font size
  scale_ratio: 1.25           # Type scale (1.125 minor second, 1.25 major third, 1.333 perfect fourth)
  line_height: 1.5            # Body text line height
  heading_weight: 700         # Default heading weight
  font_source: ""             # "google-fonts", "local", "fontsource", "adobe"
```

### 4. Spacing & Layout
```yaml
layout:
  max_width: "1280px"         # Content max-width
  grid: "12-column"           # Grid system
  spacing_unit: "4px"         # Base spacing unit (multiplied: 4, 8, 12, 16, 24, 32, 48, 64)
  border_radius: "8px"        # Default border radius
  container_padding: "24px"   # Horizontal page padding
  section_gap: "96px"         # Vertical space between page sections
```

### 5. Animation Preferences
```yaml
animation:
  philosophy: ""              # "minimal", "moderate", "expressive"
  default_duration: "300ms"   # Standard transition duration
  default_easing: ""          # "ease-out", "cubic-bezier(0.16, 1, 0.3, 1)"
  entrance_style: ""          # "fade-up", "fade-in", "slide-in", "scale-in"
  hover_style: ""             # "lift", "glow", "scale", "color-shift"
  scroll_animations: true     # Enable scroll-triggered animations
  reduce_motion: true         # Respect prefers-reduced-motion
  library: ""                 # "framer-motion", "gsap", "css-only", "anime.js"
  page_transitions: true      # Animate between page navigations
```

### 6. Performance Budget
```yaml
performance:
  target_lcp: "2.5s"          # Largest Contentful Paint target
  target_fid: "100ms"         # First Input Delay target
  target_cls: "0.1"           # Cumulative Layout Shift target
  js_budget: "200KB"          # Max JavaScript bundle for animations
  animation_fps: 60           # Target framerate
  webgl_allowed: true         # Can we use WebGL/3D?
  particle_limit: 500         # Max concurrent particles
  intersection_observer: true # Use IO for lazy animation triggers
```

### 7. Design Inspiration
```yaml
inspiration:
  reference_sites: []         # URLs of sites with desired aesthetic
  mood: []                    # e.g., ["clean", "futuristic", "warm"]
  avoid: []                   # e.g., ["corporate", "clipart", "stock-photo"]
  frameworks: []              # e.g., ["shadcn/ui", "radix", "tailwind"]
  icon_set: ""                # "lucide", "heroicons", "phosphor"
```

## Auto-Detection

When a codebase exists, scan for context automatically:

1. **tailwind.config** — extract colors, fonts, spacing, border-radius
2. **CSS variables** — parse `--color-*`, `--font-*`, `--radius-*`
3. **package.json** — detect framer-motion, gsap, three.js, anime.js
4. **globals.css** — font imports, base styles
5. **next.config / vite.config** — framework and build constraints
6. **existing components** — infer design patterns from Button, Card, etc.

## Output Format

After capture, produce a `design-context.yaml` summary and keep it available for all subsequent Mega-Design skill invocations. Reference it as the source of truth for:

- Color choices in `colorize`
- Font selections in `typeset`
- Animation durations in `animate`, `motion-design`, `framer-motion-patterns`
- Performance constraints in `optimize`, `particle-systems`, `webgl-shader`
- Layout values in `arrange`, `landing-page-builder`

## When to Re-Capture

- Brand refresh or rebrand
- New project with different visual identity
- Switching animation libraries
- Major performance budget change
- Adding dark mode support
