---
name: motion-design
description: "Create fluid web animations using Framer Motion, CSS keyframes, scroll-triggered animations, parallax, page transitions, and micro-interactions for shadcn/ui projects. Use when: user wants page animations, scroll effects, parallax, transitions, hover effects, stagger reveals, or choreographed motion."
---

# Motion Design Skill

Create animation components for **Next.js + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- Using Tailwind CSS + shadcn/ui CSS variables
- Composable with shadcn/ui components
- Respecting `prefers-reduced-motion`
- SSR-safe (`"use client"` where needed)

## Framer Motion Patterns

### Basic Reveal
```tsx
"use client"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
```

### Stagger Children
```tsx
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function StaggerList({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {React.Children.map(children, child => (
        <motion.div variants={item}>{child}</motion.div>
      ))}
    </motion.div>
  )
}
```

### AnimatePresence (Page/Route Transitions)
```tsx
import { AnimatePresence, motion } from "framer-motion"

export function PageTransition({ children, key }: { children: React.ReactNode; key: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Layout Animations
```tsx
<motion.div layout layoutId="shared-element" className="rounded-lg bg-card" />
// Shared layout animation between components — great for tabs, cards, modals
```

### Spring Physics
```tsx
transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
// Bouncy: stiffness: 400, damping: 10
// Smooth: stiffness: 200, damping: 30
// Snappy: stiffness: 500, damping: 40
```

## Scroll-Driven Animations

### Intersection Observer (Lightweight)
```tsx
"use client"
import { useRef, useEffect, useState } from "react"

export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}
```

### Framer Motion useScroll
```tsx
import { useScroll, useTransform, motion } from "framer-motion"

export function ParallaxSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [100, -100])
  return (
    <div ref={ref} className="relative overflow-hidden">
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
```

### GSAP ScrollTrigger
```tsx
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
gsap.registerPlugin(ScrollTrigger)

useEffect(() => {
  gsap.from(ref.current, {
    scrollTrigger: { trigger: ref.current, start: "top 80%", end: "top 20%", scrub: true },
    y: 100, opacity: 0,
  })
}, [])
```

## CSS-Only Animations

### Tailwind Keyframes (extend in tailwind.config.ts)
```ts
// tailwind.config.ts
theme: {
  extend: {
    keyframes: {
      "fade-up": { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      "slide-in-right": { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(0)" } },
      shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
    },
    animation: {
      "fade-up": "fade-up 0.5s ease-out",
      "slide-in-right": "slide-in-right 0.3s ease-out",
      shimmer: "shimmer 2s linear infinite",
    },
  },
}
```

### CSS Scroll-Driven (Modern browsers)
```css
@keyframes reveal { from { opacity: 0; transform: translateY(20px); } }
.scroll-reveal {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 50%;
}
```

## Parallax Patterns

### Multi-Layer Depth
```tsx
const layers = [
  { speed: 0.1, content: <Background /> },
  { speed: 0.3, content: <MidGround /> },
  { speed: 0.6, content: <ForeGround /> },
]
// Each layer gets useTransform with different speed multiplier
```

### Horizontal Scroll
```tsx
const { scrollYProgress } = useScroll()
const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"])
// Wrap horizontal content in motion.div with style={{ x }}
```

## Micro-Interactions

```tsx
// Magnetic button
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} />

// Hover glow
<div className="group relative">
  <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary to-accent opacity-0 blur transition group-hover:opacity-75" />
  <Button className="relative">Content</Button>
</div>

// Text reveal letter-by-letter
const text = "Hello World"
{text.split("").map((char, i) => (
  <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
    {char}
  </motion.span>
))}
```

## Reduced Motion

```tsx
import { useReducedMotion } from "framer-motion"

export function SafeAnimation({ children }: { children: React.ReactNode }) {
  const shouldReduce = useReducedMotion()
  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduce ? { duration: 0 } : { duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}
```

## Performance Rules

1. Only animate `transform` and `opacity` (compositor-only properties)
2. Use `will-change` sparingly — only on actively animating elements
3. Prefer Framer Motion `layout` over manual FLIP calculations
4. Debounce scroll handlers, use passive listeners
5. Use `AnimatePresence mode="wait"` to prevent layout thrash
6. Lazy-load heavy animation libraries

## Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| framer-motion | React animation | `npm i framer-motion` |
| gsap | Complex timelines, ScrollTrigger | `npm i gsap` |

**Version:** 1.0.0
**Last Updated:** 2026-03-17
