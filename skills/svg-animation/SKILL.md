---
name: svg-animation
description: "Create stunning animated SVGs as React components for shadcn/ui projects. GSAP, Lottie, SVG SMIL, morphing paths, line drawing effects, animated filters, and clip-path animations. Use when: user wants animated SVGs, morphing shapes, line drawings, animated icons, or SVG-based visual effects."
---

# SVG Animation Skill

Create animated SVG components for **Next.js + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- Styled with Tailwind CSS classes and shadcn/ui CSS variables (e.g. `hsl(var(--primary))`)
- Composable with shadcn/ui components via `cn()` utility
- Using `forwardRef` when wrapping interactive elements
- Respecting `prefers-reduced-motion` media query

## Core Techniques

### 1. GSAP SVG Animation
```tsx
"use client"
import { useRef, useEffect } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)
```

**GSAP patterns:**
- `gsap.timeline()` for sequenced SVG animations
- `ScrollTrigger` for scroll-driven SVG reveals
- `MotionPathPlugin` for element-along-path animation
- `MorphSVGPlugin` for path morphing (paid) — or use `flubber` (free)
- Stagger animations on SVG groups: `gsap.to(".svg-group > *", { stagger: 0.1 })`

### 2. Line Drawing Animation
```tsx
// Stroke dasharray/dashoffset technique
const pathRef = useRef<SVGPathElement>(null)
useEffect(() => {
  const path = pathRef.current
  if (!path) return
  const length = path.getTotalLength()
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
  gsap.to(path, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" })
}, [])
```

### 3. SVG Morphing (Free approach with flubber)
```tsx
import { interpolate } from "flubber"
// Create interpolator between two SVG path strings
const morpher = interpolate(pathA, pathB, { maxSegmentLength: 2 })
// Animate with GSAP or requestAnimationFrame
gsap.to({ t: 0 }, { t: 1, onUpdate() { pathRef.current?.setAttribute("d", morpher(this.targets()[0].t)) }})
```

### 4. SVG SMIL (No JS needed)
```xml
<animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
<animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite" />
<animateMotion path="M0,0 C50,0 50,100 100,100" dur="4s" repeatCount="indefinite" />
```

### 5. SVG Filter Animations
```xml
<filter id="turbulence">
  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="1">
    <animate attributeName="baseFrequency" values="0.02;0.05;0.02" dur="5s" repeatCount="indefinite" />
  </feTurbulence>
  <feDisplacementMap in="SourceGraphic" scale="20" />
</filter>
```

**Key filter combos:**
- `feTurbulence` + `feDisplacementMap` = organic distortion
- `feGaussianBlur` + `feColorMatrix` = glow effects
- `feMorphology` = erode/dilate for bold/thin transitions
- `feConvolveMatrix` = emboss, sharpen, edge detection

### 6. Animated Gradients
```xml
<linearGradient id="animated-grad">
  <stop offset="0%" stop-color="hsl(var(--primary))">
    <animate attributeName="stop-color" values="hsl(var(--primary));hsl(var(--accent));hsl(var(--primary))" dur="4s" repeatCount="indefinite" />
  </stop>
</linearGradient>
```

### 7. Clip-Path & Mask Animations
- Animate `clip-path` via CSS: `clip-path: circle(0%) → circle(100%)`
- SVG `<clipPath>` with animated child shapes
- `<mask>` with animated gradient for reveal effects

## Component Pattern

```tsx
"use client"
import { useRef, useEffect, type ComponentProps } from "react"
import { cn } from "@/lib/utils"

interface AnimatedSvgProps extends ComponentProps<"div"> {
  duration?: number
  delay?: number
  paused?: boolean
}

export function AnimatedSvg({ className, duration = 2, delay = 0, paused = false, ...props }: AnimatedSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion.current || paused) return
    // Animation logic here
  }, [duration, delay, paused])

  return (
    <div className={cn("relative", className)} {...props}>
      <svg ref={svgRef} viewBox="0 0 100 100" className="w-full h-full" />
    </div>
  )
}
```

## Performance Rules

1. Use `transform` and `opacity` only — avoid animating `d`, `width`, `height` when possible
2. Add `will-change: transform` to animated SVG elements
3. Use `requestAnimationFrame` for JS-driven animation loops
4. Prefer CSS/SMIL for simple animations, GSAP for complex choreography
5. Lazy-load Lottie animations with `dynamic(() => import("lottie-react"))`
6. Set `shape-rendering="optimizeSpeed"` for complex animated SVGs
7. Use `<svg>` inline (not `<img>`) when animating internal elements

## Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| gsap | Timeline animations, ScrollTrigger | `npm i gsap` |
| @lottiefiles/react-lottie-player | Lottie playback | `npm i @lottiefiles/react-lottie-player` |
| flubber | Path morphing (free) | `npm i flubber` |
| framer-motion | SVG variants (if already in project) | `npm i framer-motion` |

**Version:** 1.0.0
**Last Updated:** 2026-03-17
