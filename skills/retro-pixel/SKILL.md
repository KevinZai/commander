---
name: retro-pixel
description: "Create retro and pixel art visual effects as React components for shadcn/ui projects. CRT scanlines, dithering, 8-bit aesthetics, VHS glitch, pixel art rendering, chiptune, ASCII art, demoscene effects, and nostalgic computing vibes. Use when: user wants retro effects, CRT look, pixel art, glitch effects, VHS aesthetic, or vintage computing style."
---

# Retro Pixel Skill

Create retro/pixel art effect components for **Next.js + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- Styled with Tailwind + shadcn CSS variables
- Composable with shadcn/ui components
- SSR-safe with `"use client"` where needed
- Providing fallback for `prefers-reduced-motion`

## Effect Recipes

### 1. CRT Monitor Effect
```tsx
"use client"
import { cn } from "@/lib/utils"

export function CRTScreen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {children}
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px)",
          backgroundSize: "100% 2px",
        }}
      />
      {/* Screen curvature */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)",
          borderRadius: "inherit",
        }}
      />
      {/* Phosphor flicker */}
      <div className="pointer-events-none absolute inset-0 z-10 animate-[crt-flicker_0.15s_infinite]" />
    </div>
  )
}

// tailwind.config.ts keyframe:
// "crt-flicker": { "0%,100%": { opacity: "0.98" }, "50%": { opacity: "1" } }
```

### 2. VHS / Tape Effect
```tsx
// Canvas-based post-processing:
// 1. Render content to offscreen canvas
// 2. Apply effects:
const applyVHS = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // Color bleed: shift red channel horizontally
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 3; x++) {
      const i = (y * width + x) * 4
      data[i] = data[i + 12] // shift red 3px right
    }
  }

  // Tracking lines: random horizontal displacement
  const trackingY = Math.floor(Math.random() * height)
  const offset = Math.floor(Math.random() * 10) - 5
  // Shift entire row by offset pixels

  // Static noise: random white pixels
  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() < 0.005) {
      data[i] = data[i+1] = data[i+2] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // Timestamp overlay
  ctx.font = "14px monospace"
  ctx.fillStyle = "#fff"
  ctx.fillText("PLAY ▶ 00:03:42", 20, height - 20)
}
```

### 3. Pixel Art Rendering
```tsx
// Force nearest-neighbor scaling for crisp pixels
export function PixelArt({ src, scale = 4, className }: { src: string; scale?: number; className?: string }) {
  return (
    <img
      src={src}
      className={cn("block", className)}
      style={{
        imageRendering: "pixelated",
        width: `${scale * 100}%`,
        height: "auto",
      }}
    />
  )
}

// CSS pixel art with box-shadow (no image needed):
// Each "pixel" is a box-shadow offset
// Generate from grid: shadows.push(`${x}px ${y}px 0 ${color}`)
// Apply to 1x1px element with no background
```

### 4. Dithering Effect
```tsx
// Floyd-Steinberg dithering on canvas ImageData
const dither = (ctx: CanvasRenderingContext2D, w: number, h: number, palette: number[][]) => {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const old = [d[i], d[i+1], d[i+2]]
      const nearest = findNearest(old, palette) // closest palette color
      d[i] = nearest[0]; d[i+1] = nearest[1]; d[i+2] = nearest[2]
      const err = [old[0]-nearest[0], old[1]-nearest[1], old[2]-nearest[2]]
      // Distribute error to neighbors (Floyd-Steinberg weights: 7/16, 3/16, 5/16, 1/16)
      distributeError(d, w, x+1, y, err, 7/16)
      distributeError(d, w, x-1, y+1, err, 3/16)
      distributeError(d, w, x, y+1, err, 5/16)
      distributeError(d, w, x+1, y+1, err, 1/16)
    }
  }
  ctx.putImageData(img, 0, 0)
}

// Ordered (Bayer) dithering — faster, grid pattern
// Use 4x4 or 8x8 threshold matrix
```

### 5. Retro Color Palettes
```tsx
const PALETTES = {
  gameboy: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
  nes: ["#000000", "#fcfcfc", "#f83800", "#7c7c7c", "#0058f8", "#00a800", "#fca044", "#d800cc"],
  c64: ["#000000", "#ffffff", "#880000", "#aaffee", "#cc44cc", "#00cc55", "#0000aa", "#eeee77",
        "#dd8855", "#664400", "#ff7777", "#333333", "#777777", "#aaff66", "#0088ff", "#bbbbbb"],
  cga: ["#000000", "#0000aa", "#00aa00", "#00aaaa", "#aa0000", "#aa00aa", "#aa5500", "#aaaaaa",
        "#555555", "#5555ff", "#55ff55", "#55ffff", "#ff5555", "#ff55ff", "#ffff55", "#ffffff"],
  vapor: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff", "#fffb96"],
}
```

### 6. Glitch Effect
```tsx
// RGB channel split
export function GlitchText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("relative inline-block", className)} data-text={children}>
      <span className="absolute left-[2px] top-0 text-[#ff0000] mix-blend-multiply animate-[glitch-1_2s_infinite]">{children}</span>
      <span className="absolute left-[-2px] top-0 text-[#00ffff] mix-blend-multiply animate-[glitch-2_2s_infinite]">{children}</span>
      {children}
    </span>
  )
}
// Keyframes: random clip-path rectangles that shift position
// "glitch-1": { "0%,100%": { clipPath: "inset(20% 0 60% 0)" }, "25%": { clipPath: "inset(60% 0 10% 0)" }, ... }
```

### 7. ASCII Art Renderer
```tsx
const ASCII_CHARS = " .:-=+*#%@"
export function AsciiRenderer({ src, cols = 80 }: { src: string; cols?: number }) {
  // 1. Draw image to hidden canvas at low resolution
  // 2. Read pixel brightness at each cell
  // 3. Map brightness to ASCII character
  // 4. Render in <pre> with monospace font
  const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1))
  // Optional: color each character with original pixel color for color ASCII art
}
```

### 8. LED / Dot Matrix Display
```tsx
// Grid of circles that light up to form text/patterns
// Each "LED" has on/off/dim state
// Use 5x7 bitmap font for characters
// Animate scrolling text like a real marquee
// Colors: classic red, amber, or green on dark background
```

### 9. Demoscene Effects

#### Plasma
```tsx
// Classic color cycling plasma
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const v = Math.sin(x * 0.05 + time)
      + Math.sin(y * 0.05 + time * 0.5)
      + Math.sin((x + y) * 0.03 + time * 0.3)
      + Math.sin(Math.sqrt(x*x + y*y) * 0.04)
    const color = hslToRgb((v + 4) / 8, 1, 0.5)
    // Set pixel
  }
}
```

#### Fire Effect
```tsx
// Bottom row: random white/yellow pixels
// Each frame: pixel = average of 3 below neighbors - decay
// Palette: black → dark red → red → orange → yellow → white
// Classic demoscene fire from the 90s
```

#### Tunnel / Rotozoom
```tsx
// For each pixel: convert to polar coordinates
// angle = atan2(y - cy, x - cx) + time
// distance = 1.0 / sqrt((x-cx)² + (y-cy)²)
// Use angle and distance as texture UV coordinates
// Animated time creates flying-through-tunnel effect
```

### 10. Retro UI Components
```tsx
// Window chrome (Windows 95 style)
export function RetroWindow({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border-2 border-[#dfdfdf] border-r-[#808080] border-b-[#808080] bg-[#c0c0c0]", className)}>
      <div className="flex items-center gap-1 bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 text-sm font-bold text-white">
        {title}
        <div className="ml-auto flex gap-0.5">
          <button className="h-4 w-4 border border-[#dfdfdf] border-r-[#808080] border-b-[#808080] bg-[#c0c0c0] text-[10px] leading-none">_</button>
          <button className="h-4 w-4 border border-[#dfdfdf] border-r-[#808080] border-b-[#808080] bg-[#c0c0c0] text-[10px] leading-none">□</button>
          <button className="h-4 w-4 border border-[#dfdfdf] border-r-[#808080] border-b-[#808080] bg-[#c0c0c0] text-[10px] leading-none">×</button>
        </div>
      </div>
      <div className="p-2">{children}</div>
    </div>
  )
}
```

### 11. Pixelation Shader
```glsl
// Post-process any content to look pixelated
uniform float uPixelSize;
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 pixelUV = floor(uv * uResolution / uPixelSize) * uPixelSize / uResolution;
  gl_FragColor = texture2D(uTexture, pixelUV);
}
```

## Performance Rules

1. Use `image-rendering: pixelated` for CSS-based pixel scaling (GPU accelerated)
2. Pre-render static effects to a cached canvas, animate only what changes
3. Dithering is expensive — do it once on load, not per frame
4. CRT scanlines via CSS `repeating-linear-gradient` (zero JS cost)
5. Limit canvas resolution for retro effects (that's the point!)
6. Use `createImageBitmap` for async image processing

## Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| (none required) | Most effects are Canvas2D + CSS | — |
| three | Shader-based post-processing | `npm i three @types/three` |

**Version:** 1.0.0
**Last Updated:** 2026-03-17
