---
name: particle-systems
description: "Create Canvas and WebGL particle effects as React components for shadcn/ui projects. Confetti, starfields, pixel trails, fire, smoke, snow, matrix rain, aurora, interactive particle swarms, and constellation networks. Use when: user wants particle effects, confetti, starfields, digital rain, connected dots, or any particle-based visual."
---

# Particle Systems Skill

Create particle effect components for **Next.js + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- Canvas/WebGL wrapped in shadcn-compatible containers
- Using shadcn CSS variables for particle colors
- Handling resize, visibility, and cleanup properly
- Providing static fallback for `prefers-reduced-motion`

## Core Canvas Particle Engine

```tsx
"use client"
import { useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  size: number; color: string
}

interface ParticleFieldProps {
  className?: string
  count?: number
  color?: string
}

export function ParticleField({ className, count = 100, color }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)

  const createParticle = useCallback((width: number, height: number): Particle => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    life: Math.random() * 100,
    maxLife: 100 + Math.random() * 100,
    size: 1 + Math.random() * 2,
    color: color ?? "hsl(var(--primary))",
  }), [color])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = canvas.getContext("2d")!
    const resize = () => {
      canvas.width = canvas.clientWidth * Math.min(devicePixelRatio, 2)
      canvas.height = canvas.clientHeight * Math.min(devicePixelRatio, 2)
      ctx.scale(Math.min(devicePixelRatio, 2), Math.min(devicePixelRatio, 2))
    }
    resize()
    window.addEventListener("resize", resize)

    particlesRef.current = Array.from({ length: count }, () => createParticle(canvas.clientWidth, canvas.clientHeight))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy; p.life++
        if (p.life > p.maxLife) Object.assign(p, createParticle(canvas.clientWidth, canvas.clientHeight))
        const alpha = 1 - p.life / p.maxLife
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [count, createParticle])

  return <canvas ref={canvasRef} className={cn("absolute inset-0 -z-10 h-full w-full", className)} />
}
```

## Effect Recipes

### Connected Particles (Constellation)
```tsx
// After drawing particles, connect nearby ones:
for (let i = 0; i < particles.length; i++) {
  for (let j = i + 1; j < particles.length; j++) {
    const dx = particles[i].x - particles[j].x
    const dy = particles[i].y - particles[j].y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 120) {
      ctx.strokeStyle = `rgba(255,255,255,${1 - dist / 120})`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(particles[i].x, particles[i].y)
      ctx.lineTo(particles[j].x, particles[j].y)
      ctx.stroke()
    }
  }
}
// Optimize with spatial grid for >200 particles
```

### Mouse-Interactive Swarm
```tsx
const mouseRef = useRef({ x: 0, y: 0 })
// In particle update:
const dx = mouseRef.current.x - p.x
const dy = mouseRef.current.y - p.y
const dist = Math.sqrt(dx * dx + dy * dy)
if (dist < 150) {
  // Attract: p.vx += dx / dist * 0.2
  // Repel: p.vx -= dx / dist * 0.5
}
```

### Matrix Rain
```tsx
interface RainDrop { x: number; y: number; speed: number; chars: string[] }
// Grid of columns, each dropping characters
// Use monospace font, green color palette
// Random katakana: String.fromCharCode(0x30A0 + Math.random() * 96)
// Trail: draw with decreasing opacity for each char above
```

### Starfield / Warp Speed
```tsx
interface Star { x: number; y: number; z: number }
// Project 3D to 2D: screenX = (star.x / star.z) * centerX + centerX
// Decrease z each frame for warp effect
// Draw streak: line from current to previous position
// Streak length proportional to speed (1/z)
```

### Confetti Burst
```tsx
// On trigger: spawn N particles at point with high initial velocity
// Add gravity: p.vy += 0.1
// Add rotation: p.angle += p.rotationSpeed
// Draw rectangles with rotation for confetti shape
// Various colors from shadcn palette
```

### Snow / Rain
```tsx
// Snow: slow fall, lateral drift with sin(time), small circles
// Rain: fast fall, slight angle, streaks (lines not circles)
// Both: recycle particles at bottom -> top
p.y += p.speed
p.x += Math.sin(p.life * 0.01) * 0.3 // snow drift
if (p.y > height) { p.y = -10; p.x = Math.random() * width }
```

### Fire / Sparks
```tsx
// Emit from bottom center, upward velocity with spread
// Color gradient: white -> yellow -> orange -> red -> transparent
// Particles shrink as they age
// Add turbulence: p.vx += (Math.random() - 0.5) * 0.3
const t = p.life / p.maxLife
const color = t < 0.2 ? "#fff" : t < 0.5 ? "#ffa500" : "#ff4500"
```

### Pixel Dissolution
```tsx
// Sample image pixels into particle positions
// On trigger: add random velocity to each particle
// Reverse: particles lerp back to original positions
// Use imageData.data to get pixel colors
```

## Performance Optimization

### Object Pooling
```tsx
class ParticlePool {
  private pool: Particle[] = []
  acquire(): Particle { return this.pool.pop() ?? createDefault() }
  release(p: Particle) { this.pool.push(p) }
}
```

### Spatial Grid
```tsx
const CELL = 100
const grid = new Map<string, Particle[]>()
const key = (p: Particle) => `${Math.floor(p.x/CELL)},${Math.floor(p.y/CELL)}`
```

### WebGL Instanced (10k+)
```tsx
// THREE.InstancedMesh or raw WebGL instancing
// Pass particle data via InstancedBufferAttribute
```

## Performance Rules

1. Object pool particles — never `new` in the animation loop
2. Use `ctx.clearRect` not `canvas.width = canvas.width`
3. Batch draw calls: single `beginPath` + multiple `arc` + single `fill`
4. Spatial partitioning for O(n) proximity checks instead of O(n^2)
5. Skip frames on low-end: check `performance.now()` delta
6. Pause when `document.hidden === true`
7. Cap particle count on mobile (`navigator.hardwareConcurrency`)
8. Use OffscreenCanvas + Web Worker for >5000 particles

## Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| (none required) | Canvas 2D is built-in | — |
| three | WebGL instancing for 10k+ | `npm i three @types/three` |
| @tsparticles/react | Pre-built configs | `npm i @tsparticles/react tsparticles` |

**Version:** 1.0.0
**Last Updated:** 2026-03-17
