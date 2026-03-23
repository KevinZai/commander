---
name: generative-backgrounds
description: "Create procedural, animated website backgrounds as React components for shadcn/ui projects. Noise gradients, gradient meshes, voronoi, cellular automata, reaction-diffusion, moving pixel art, dot grids, and dynamic color-shifting backgrounds. Use when: user wants animated backgrounds, gradient meshes, procedural patterns, or living textures."
---

# Generative Backgrounds Skill

Create procedural background components for **Next.js + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- Positioned as background layers (`absolute inset-0 -z-10`)
- Using shadcn CSS variables for color derivation
- SSR-safe, with `"use client"` directive
- Providing CSS fallback gradient for non-JS/reduced-motion
- Performant (60fps target, mobile-aware)

## Component Shell

```tsx
"use client"
import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface GenerativeBackgroundProps {
  className?: string
  speed?: number
  seed?: number
}

export function GenerativeBackground({ className, speed = 1, seed = 42 }: GenerativeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")!
    // ... setup and animation loop
    return () => { /* cleanup */ }
  }, [speed, seed])

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 -z-10 h-full w-full", className)}
      style={{ background: "linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted)))" }}
    />
  )
}
```

## Background Recipes

### 1. Flowing Noise Gradient (Apple/Stripe style)
```tsx
// Use simplex noise to create smooth flowing color fields
// Sample 3 noise layers at different frequencies for RGB channels
// Or: use noise to interpolate between 3-4 theme colors
const n = snoise(x * 0.005 + time, y * 0.005)
const color = lerpColors(palette, (n + 1) / 2)
// Draw pixel-by-pixel or use ImageData for performance
// At half resolution, then CSS scale up with image-rendering: auto
```

### 2. Animated Gradient Mesh
```tsx
// Define 4-8 control points with colors
// Each point orbits slowly (sin/cos with different frequencies)
interface MeshPoint { x: number; y: number; color: [number, number, number]; vx: number; vy: number }
// Move points: p.x += Math.sin(time * p.vx) * amplitude
// Blend: weight = 1 / (dist * dist); color += point.color * weight
// Use WebGL shader for real-time performance at full resolution
```

### 3. Voronoi Pattern
```tsx
// Place N seed points, optionally animated
// For each pixel, find nearest seed -> color by seed's color
// Or: color by distance to nearest seed (creates cell borders)
// Animate seeds with slow drift
```

### 4. Cellular Automata (Game of Life)
```tsx
// Grid of cells, each alive or dead
// Conway rules: survive with 2-3 neighbors, born with exactly 3
// Fade dead cells slowly for trail effect
// Use double-buffer: current grid + next grid
const nextGrid = grid.map((row, y) => row.map((cell, x) => {
  const neighbors = countNeighbors(grid, x, y)
  return cell ? (neighbors === 2 || neighbors === 3) : (neighbors === 3)
}))
```

### 5. Reaction-Diffusion (Gray-Scott)
```tsx
// Two chemicals A and B on a grid
// A feeds in, B kills A, both diffuse at different rates
// f=0.055 k=0.062 -> mitosis pattern
// f=0.035 k=0.065 -> coral pattern
// Use Laplacian for diffusion, Euler integration per frame
```

### 6. Moving Pixel Grid
```tsx
const cellSize = 6
for (let x = 0; x < cols; x++) {
  for (let y = 0; y < rows; y++) {
    const n = snoise(x * 0.1 + time, y * 0.1)
    ctx.fillStyle = `hsl(${220 + n * 40}, 70%, ${40 + n * 20}%)`
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
  }
}
```

### 7. Dot Grid with Wave
```tsx
const wave = Math.sin(dist * 0.05 - time * 2) * 0.5 + 0.5
ctx.globalAlpha = wave * 0.6
ctx.beginPath()
ctx.arc(x * spacing, y * spacing, baseRadius * wave, 0, Math.PI * 2)
ctx.fill()
```

### 8. CSS-Only Animated Gradient (Zero JS)
```tsx
export function CSSGradientBackground({ className }: { className?: string }) {
  return (
    <div className={cn(
      "absolute inset-0 -z-10",
      "bg-[length:400%_400%] animate-[gradient-shift_8s_ease_infinite]",
      "bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20",
      className
    )} />
  )
}
// tailwind.config.ts: "gradient-shift": { "0%,100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } }
```

### 9. Blob / Lava Lamp
```tsx
// Multiple large circles with gaussian blur
// Circles orbit and overlap
// CSS filter: blur(40px) contrast(20)
// Colors from shadcn palette
```

### 10. Noise Texture Overlay
```tsx
const imageData = ctx.createImageData(256, 256)
for (let i = 0; i < imageData.data.length; i += 4) {
  const v = Math.random() * 255
  imageData.data[i] = imageData.data[i+1] = imageData.data[i+2] = v
  imageData.data[i+3] = 15 // very subtle
}
```

## Color Integration with shadcn

```tsx
function getCSSColor(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}
const palette = [getCSSColor("--primary"), getCSSColor("--accent"), getCSSColor("--muted")]
```

## Performance Rules

1. Render at half resolution, scale up with CSS `image-rendering: auto`
2. Use `ImageData` direct pixel manipulation for noise
3. Pre-compute noise lookup tables for static patterns
4. Use WebGL shader for full-res real-time noise
5. Target 30fps for backgrounds (not 60)
6. Use `OffscreenCanvas` in Web Worker for heavy computation
7. Pause when not in viewport (IntersectionObserver)

## Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| simplex-noise | Fast noise generation | `npm i simplex-noise` |
| three | WebGL shader backgrounds | `npm i three @types/three` |

**Version:** 1.0.0
**Last Updated:** 2026-03-17
