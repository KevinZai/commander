---
name: Interactive Landing
description: "Interactive landing page system — animated heroes, scroll narratives, floating elements, product showcases, Core Web Vitals optimized."
version: 1.0.0
category: pages
parent: ccc-design
---

# Interactive Landing

Build landing pages that combine structure, motion, and interactivity into a cohesive scroll-driven experience. Optimized for conversion and Core Web Vitals.

## Architecture

A high-impact landing page is composed of these sections, each with its own animation strategy:

```
[Hero]           — Animated gradient / 3D / particles + headline + CTA
[Social Proof]   — Logo bar with subtle entrance animation
[Features]       — Scroll-triggered reveals, staggered cards
[Interactive]    — Product showcase / demo / interactive element
[Testimonials]   — Carousel or scroll-linked quotes
[Pricing]        — Clean grid with hover interactions
[CTA]            — Final conversion section with ambient effects
[Footer]         — Minimal, links + newsletter
```

## Hero Section Patterns

### Animated Gradient Hero

```tsx
function GradientHero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 animate-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed" />
      </div>

      <div className="max-w-6xl mx-auto px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl font-bold tracking-tight"
        >
          Your headline here
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Supporting copy that clarifies the value proposition.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex gap-4 justify-center"
        >
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">Learn More</Button>
        </motion.div>
      </div>
    </section>
  );
}
```

CSS for gradient animation:
```css
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.animate-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 8s ease infinite;
}
@keyframes float-slow {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -30px) scale(1.1); }
}
.animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
.animate-float-delayed { animation: float-slow 14s ease-in-out 3s infinite; }
```

### Particle Hero (Canvas)

```tsx
function ParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
      });
    }

    let animationId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99, 102, 241, 0.4)";
        ctx.fill();
      }
      // Draw connecting lines for nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(animationId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center">
      <canvas ref={canvasRef} className="absolute inset-0 -z-10" />
      {/* Content overlay */}
    </section>
  );
}
```

## Scroll Narrative Sections

### Feature Reveal with Stagger

```tsx
function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <ScrollReveal>
        <h2 className="text-4xl font-bold text-center mb-16">Features</h2>
      </ScrollReveal>

      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, i) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-6 rounded-xl border bg-card"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

### Sticky Product Showcase

```tsx
function ProductShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const activeSection = useTransform(scrollYProgress, [0, 0.33, 0.66, 1], [0, 1, 2, 3]);

  return (
    <div ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen flex items-center">
        <div className="grid md:grid-cols-2 gap-16 max-w-6xl mx-auto px-6">
          {/* Left: text that changes */}
          <div className="flex flex-col justify-center">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                style={{ opacity: useTransform(activeSection, (v) => Math.abs(v - i) < 0.5 ? 1 : 0.2) }}
                className="mb-12"
              >
                <h3 className="text-2xl font-bold mb-3">{section.title}</h3>
                <p className="text-muted-foreground">{section.description}</p>
              </motion.div>
            ))}
          </div>
          {/* Right: product visual */}
          <div className="flex items-center justify-center">
            <motion.div
              className="w-full aspect-video rounded-xl bg-muted border overflow-hidden"
              style={{ rotateY: useTransform(scrollYProgress, [0, 1], [0, 10]) }}
            >
              {/* Product screenshot / demo */}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Performance Optimization

### Lazy-Load Below-Fold Animations

```tsx
function LazySection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "200px" });

  return (
    <div ref={ref}>
      {isInView ? children : <div className="h-96" />}
    </div>
  );
}
```

### Performance Checklist

1. **LCP < 2.5s** — Hero text renders without waiting for animations. Use `font-display: swap`.
2. **CLS < 0.1** — Set explicit dimensions on animated elements. Never animate layout properties on load.
3. **FID < 100ms** — Defer heavy animation setup with `requestIdleCallback` or dynamic import.
4. **Bundle** — Dynamically import GSAP/Three.js only when the section scrolls into view.
5. **Mobile** — Reduce particle count, disable WebGL, simplify parallax on `(max-width: 768px)`.
6. **prefers-reduced-motion** — Replace all motion with instant opacity transitions.

```tsx
// Dynamic import pattern for heavy animation libs
const ParticleHero = dynamic(() => import("./ParticleHero"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-background" />,
});
```

## Section Timing Guide

| Section | Entrance Delay | Duration | Trigger |
|---------|---------------|----------|---------|
| Hero headline | 0ms | 800ms | On load |
| Hero subtext | 150ms | 800ms | On load |
| Hero CTA | 300ms | 800ms | On load |
| Nav items | 100ms + 80ms stagger | 500ms | On load |
| Feature cards | 0ms + 100ms stagger | 500ms | Scroll into view |
| Testimonials | 0ms | 600ms | Scroll into view |
| Pricing cards | 0ms + 80ms stagger | 500ms | Scroll into view |
| Final CTA | 0ms | 600ms | Scroll into view |

## Anti-Patterns

- Never auto-play video without user consent (kills LCP)
- Never animate hero text with JavaScript on initial render (use CSS for first paint)
- Never use `position: fixed` particles without `pointer-events: none`
- Never load Three.js/WebGL for a simple gradient effect
- Never block interaction with loading screens for animations
- Never animate more than 2 properties simultaneously on mobile
