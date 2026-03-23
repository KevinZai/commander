---
name: interactive-visuals
description: "Create mouse-reactive and input-driven visual effects as React components for shadcn/ui projects. Cursor trails, hover distortions, magnetic buttons, physics simulations, elastic elements, liquid effects, tilt cards, and text scramble. Use when: user wants interactive effects, cursor trails, magnetic elements, hover distortions, or input-reactive visuals."
---

# Interactive Visuals Skill

Create interactive effect components for **Next.js + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- Composable with shadcn/ui components
- Using Tailwind + shadcn CSS variables
- Touch-friendly (pointer events, not just mouse)
- Respecting `prefers-reduced-motion`
- SSR-safe

## Effect Recipes

### 1. Custom Cursor
```tsx
"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function CustomCursor({ className }: { className?: string }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY })
    const over = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      setHovering(!!target.closest("a, button, [data-cursor-hover]"))
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerover", over)
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerover", over) }
  }, [])

  return (
    <motion.div
      className={cn("pointer-events-none fixed z-[9999] rounded-full bg-primary mix-blend-difference", className)}
      animate={{ x: pos.x - 16, y: pos.y - 16, scale: hovering ? 2.5 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
      style={{ width: 32, height: 32 }}
    />
  )
}
```

### 2. Cursor Trail
```tsx
// Track last N positions with timestamps
// Draw fading circles/lines between positions
// Use canvas overlay or multiple motion.divs
const trail = useRef<{ x: number; y: number; t: number }[]>([])
// In pointermove: trail.current.push({ x, y, t: Date.now() })
// In animation loop: draw trail with decreasing opacity, remove old points
```

### 3. Magnetic Button
```tsx
"use client"
import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

export function MagneticButton({ children, strength = 0.3, ...props }: ButtonProps & { strength?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setOffset({
      x: (e.clientX - rect.left - rect.width / 2) * strength,
      y: (e.clientY - rect.top - rect.height / 2) * strength,
    })
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Button {...props}>{children}</Button>
    </motion.div>
  )
}
```

### 4. 3D Tilt Card
```tsx
export function TiltCard({ children, className, intensity = 15 }: { children: React.ReactNode; className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState("")

  const handleMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientY - rect.top - rect.height / 2) / rect.height
    const y = -(e.clientX - rect.left - rect.width / 2) / rect.width
    setTransform(`perspective(1000px) rotateX(${x * intensity}deg) rotateY(${y * intensity}deg)`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={() => setTransform("")}
      className={cn("transition-transform duration-200 ease-out", className)}
      style={{ transform }}
    >
      {children}
    </div>
  )
}
```

### 5. Mouse Ripple Background
```tsx
// On click/move: spawn expanding circle at pointer position
// Circle grows and fades out
interface Ripple { x: number; y: number; radius: number; opacity: number }
// Each frame: ripple.radius += 2; ripple.opacity -= 0.02
```

### 6. Text Scramble
```tsx
export function useTextScramble(target: string, duration = 1000) {
  const [text, setText] = useState(target)
  const chars = "!<>-_\\/[]{}—=+*^?#________"

  const scramble = useCallback(() => {
    let frame = 0
    const totalFrames = duration / 16
    const update = () => {
      const progress = frame / totalFrames
      const result = target.split("").map((char, i) => {
        if (i < Math.floor(progress * target.length)) return char
        return chars[Math.floor(Math.random() * chars.length)]
      }).join("")
      setText(result)
      if (frame < totalFrames) { frame++; requestAnimationFrame(update) }
      else setText(target)
    }
    update()
  }, [target, duration])

  return { text, scramble }
}
```

### 7. Image Pixel Scatter
```tsx
// Load image to canvas, read pixel data
// Create particle for each pixel (or every Nth pixel)
// On trigger: particles fly to random positions
// On reset: particles lerp back to original grid positions
```

### 8. Hover Image Distortion (WebGL)
```tsx
// Display image as Three.js plane with ShaderMaterial
// On hover: pass mouse position as uniform
// Fragment shader displaces UV based on distance to mouse
// vec2 distortedUV = uv + direction * strength * (1.0 - smoothstep(0.0, radius, dist));
```

### 9. Elastic / Rubber Band Elements
```tsx
<motion.div
  whileHover={{ scale: 1.1 }}
  transition={{ type: "spring", stiffness: 200, damping: 5 }} // low damping = more bounce
/>
```

### 10. Spotlight / Flashlight Effect
```tsx
<div
  className="relative overflow-hidden"
  style={{
    maskImage: `radial-gradient(circle 200px at ${pos.x}px ${pos.y}px, black 0%, transparent 100%)`,
    WebkitMaskImage: `radial-gradient(circle 200px at ${pos.x}px ${pos.y}px, black 0%, transparent 100%)`,
  }}
>
  {children}
</div>
```

### 11. Gyroscope / Device Orientation (Mobile)
```tsx
useEffect(() => {
  const handle = (e: DeviceOrientationEvent) => {
    const x = (e.gamma ?? 0) / 45
    const y = (e.beta ?? 0) / 45
    setTilt({ x, y })
  }
  window.addEventListener("deviceorientation", handle)
  return () => window.removeEventListener("deviceorientation", handle)
}, [])
```

## Performance Rules

1. Use `pointer` events (not `mouse`) for touch+mouse support
2. Throttle pointer move handlers to 60fps max via `requestAnimationFrame` guard
3. Use passive event listeners where possible
4. Avoid layout-triggering properties (use `transform`, `opacity` only)
5. Clean up all event listeners in useEffect return
6. Skip interactive effects on touch-only devices where cursor effects don't apply

## Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| framer-motion | Spring animations, variants | `npm i framer-motion` |
| three | WebGL hover distortion | `npm i three @types/three` |

**Version:** 1.0.0
**Last Updated:** 2026-03-17
