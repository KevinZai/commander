---
name: GSAP Patterns
description: "GSAP mastery — ScrollTrigger, timeline sequencing, SVG morphing, text animation, MotionPath, performance optimization."
version: 1.0.0
category: animation
parent: ccc-design
---

# GSAP Patterns

Production-ready GSAP patterns for scroll-driven animations, timeline orchestration, SVG morphing, and text effects. Covers free core + premium plugins.

## Core Principles

- Register plugins once at app level, not per-component
- Always clean up animations in React `useEffect` return / Vue `onUnmounted`
- Use `gsap.context()` for scoped cleanup in React components
- Prefer `gsap.to()` over `gsap.from()` — "to" is more predictable
- ScrollTrigger: always call `ScrollTrigger.refresh()` after layout changes

## Setup

```tsx
// lib/gsap.ts — register once, import everywhere
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(ScrollTrigger, TextPlugin);

export { gsap, ScrollTrigger };
```

## Pattern Library

### 1. ScrollTrigger — Reveal on Scroll

```tsx
function ScrollRevealSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reveal-item", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef}>
      <h2 className="reveal-item">Title</h2>
      <p className="reveal-item">Description</p>
      <div className="reveal-item">Content</div>
    </section>
  );
}
```

### 2. ScrollTrigger — Pinned Section with Scrub

```tsx
function PinnedHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=200%",
          pin: true,
          scrub: 1,
          snap: { snapTo: 1 / 3, duration: 0.3, ease: "power2.inOut" },
        },
      });

      tl.to(".hero-title", { scale: 0.8, opacity: 0, duration: 1 })
        .to(".hero-subtitle", { y: -100, opacity: 1, duration: 1 }, "-=0.5")
        .to(".hero-cta", { scale: 1, opacity: 1, duration: 1 }, "-=0.3");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="h-screen relative overflow-hidden">
      <h1 className="hero-title">Welcome</h1>
      <p className="hero-subtitle opacity-0">Build something great</p>
      <button className="hero-cta opacity-0 scale-75">Get Started</button>
    </div>
  );
}
```

### 3. Timeline Sequencing

```tsx
function AnimatedEntrance() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.6 } });

      tl.from(".logo", { scale: 0, rotation: -180, duration: 0.8 })
        .from(".nav-item", { y: -30, opacity: 0, stagger: 0.1 }, "-=0.4")
        .from(".hero-heading", { x: -60, opacity: 0 }, "-=0.3")
        .from(".hero-body", { x: -40, opacity: 0 }, "-=0.2")
        .from(".hero-button", { scale: 0.8, opacity: 0 }, "-=0.1")
        .from(".hero-image", { x: 60, opacity: 0, duration: 0.8 }, "-=0.4");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return <div ref={containerRef}>{/* ... */}</div>;
}
```

### 4. Horizontal Scroll Gallery

```tsx
function HorizontalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".panel");

      gsap.to(panels, {
        xPercent: -100 * (panels.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 1,
          snap: 1 / (panels.length - 1),
          end: () => "+=" + (panelsRef.current?.scrollWidth ?? 0),
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef}>
      <div ref={panelsRef} className="flex">
        {/* .panel elements */}
      </div>
    </div>
  );
}
```

### 5. SVG Path Drawing

```tsx
function DrawSVGOnScroll() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const path = svgRef.current?.querySelector("path");
      if (!path) return;

      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

      gsap.to(path, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: svgRef.current,
          start: "top center",
          end: "bottom center",
          scrub: 1,
        },
      });
    }, svgRef);

    return () => ctx.revert();
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 800 400">
      <path d="M10 200 Q200 10 400 200 Q600 390 790 200" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
```

### 6. Text Split Animation

```tsx
function SplitTextReveal({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const chars = gsap.utils.toArray<HTMLElement>(".char");

      gsap.from(chars, {
        y: 40,
        opacity: 0,
        rotationX: -90,
        stagger: 0.02,
        duration: 0.6,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef}>
      {text.split("").map((char, i) => (
        <span key={i} className="char inline-block">
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </div>
  );
}
```

## ScrollTrigger Configuration Reference

| Property | Values | Use Case |
|----------|--------|----------|
| `start` | `"top center"`, `"top 80%"`, `"top top"` | When trigger enters viewport |
| `end` | `"bottom center"`, `"+=200%"`, `"bottom top"` | When trigger exits viewport |
| `scrub` | `true`, `1` (smooth), `0.5` (snappier) | Link animation to scroll position |
| `pin` | `true`, element | Pin trigger element during animation |
| `snap` | `1/3`, `{ snapTo: "labels" }` | Snap to positions on scroll release |
| `toggleActions` | `"play pause resume reverse"` | Enter, leave, enter-back, leave-back |
| `markers` | `true` | Debug only — shows trigger positions |

## Easing Reference

| Ease | Character | Best For |
|------|-----------|----------|
| `"power2.out"` | Smooth deceleration | General UI transitions |
| `"power3.out"` | Confident stop | Hero entrances, reveals |
| `"power4.inOut"` | Dramatic in/out | Page transitions, modals |
| `"back.out(1.7)"` | Slight overshoot | Playful entrances, badges |
| `"elastic.out(1, 0.3)"` | Bouncy spring | Attention-grabbing elements |
| `"none"` | Linear | Scroll-scrubbed animations |

## Performance

- Use `will-change: transform` only during animation (GSAP handles this)
- Prefer `transform` and `opacity` — avoid animating layout properties
- Use `gsap.ticker` for frame-synced custom logic instead of `requestAnimationFrame`
- Call `ScrollTrigger.refresh()` after dynamic content loads or layout shifts
- Use `fastScrollEnd: true` on ScrollTrigger for mobile performance
- Set `anticipatePin: 1` to prevent pin jump flicker

## Cleanup Pattern (React)

```tsx
// Always use gsap.context for React components
useEffect(() => {
  const ctx = gsap.context(() => {
    // All GSAP code here — automatically scoped to ref
  }, containerRef);

  // Single cleanup call reverts everything
  return () => ctx.revert();
}, []);
```
