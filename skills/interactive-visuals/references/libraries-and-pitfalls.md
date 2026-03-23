# Libraries & Common Pitfalls

## Recommended Libraries

### Animation & Motion
| Library | Best For | Size | Notes |
|---------|----------|------|-------|
| **GSAP** | Production motion, `quickTo()` for follow effects | ~30kb | `gsap.quickTo()` is ideal for magnetic/follow effects. ScrollTrigger plugin for scroll-linked effects. |
| **Framer Motion** | React spring animations, layout transitions | ~30kb | `useMotionValue` + `useTransform` for cursor-reactive props. `useSpring` for elastic effects. |
| **Lenis** | Smooth scroll with velocity access | ~5kb | Exposes `lenis.velocity` directly — pair with scroll-speed effects. |
| **@use-gesture** | React gesture handling (drag, pinch, scroll) | ~10kb | Unified gesture API. Returns velocity, direction, distance. Pairs perfectly with react-spring. |

### Physics
| Library | Best For | Size | Notes |
|---------|----------|------|-------|
| **Matter.js** | 2D physics with drag, collisions | ~80kb | Built-in mouse constraint. Good for interactive DOM physics. |
| **cannon-es** | 3D physics (Three.js scenes) | ~120kb | ES module fork of cannon.js. Pair with Three.js for 3D interactive scenes. |
| **p2.js** | Lightweight 2D physics | ~50kb | Simpler than Matter.js, good for basic bouncing/collision effects. |

### WebGL / Shaders
| Library | Best For | Size | Notes |
|---------|----------|------|-------|
| **PixiJS** | 2D WebGL (displacement, filters) | ~200kb | Displacement filter is perfect for image warping on hover. |
| **Three.js** | 3D scenes, custom shaders | ~600kb | `ShaderMaterial` for custom effects. `Raycaster` for hover on 3D objects. |
| **OGL** | Lightweight WebGL | ~30kb | Three.js alternative when you only need basics. Great for fluid/particle effects. |
| **Curtains.js** | Applying shaders to DOM elements | ~40kb | Maps DOM elements to WebGL planes. Great for hover distortions on images. |

### Specialty
| Library | Best For | Size | Notes |
|---------|----------|------|-------|
| **vanilla-tilt.js** | Quick 3D tilt cards | ~4kb | Drop-in solution. Use when custom tilt isn't needed. |
| **Splitting.js** | Per-character/word text effects | ~2kb | Splits text into spans for individual animation. Pair with text scramble. |
| **Baffle.js** | Text scramble/obfuscation | ~2kb | Ready-made text scramble. Limited customization vs custom implementation. |

### When to Use a Library vs Custom Code

**Use a library when:**
- The effect requires physics simulation (Matter.js, cannon-es)
- WebGL shaders are needed and you want cross-browser reliability (PixiJS, Three.js)
- The project already uses GSAP or Framer Motion
- Time-to-ship matters more than bundle size

**Write custom when:**
- The effect is purely CSS + a few lines of JS (tilt, glow, magnetic)
- Bundle size is critical
- The user needs fine-grained control over the feel
- The effect doesn't exist in any library

---

## Common Pitfalls

### 1. Layout Thrashing

**Problem**: Reading layout properties (like `getBoundingClientRect()`) inside a `pointermove` handler that fires 60+ times per second, interspersed with style writes.

**Solution**: Cache `getBoundingClientRect()` on `mouseenter` and update only on resize. Batch all reads before writes.

```javascript
// BAD: read-write-read-write per element per frame
elements.forEach(el => {
  const rect = el.getBoundingClientRect(); // read
  el.style.transform = `...`; // write
});

// GOOD: batch reads, then batch writes
const rects = elements.map(el => el.getBoundingClientRect()); // all reads
elements.forEach((el, i) => {
  el.style.transform = `translate3d(${compute(rects[i])})`; // all writes
});
```

### 2. Memory Leaks from Unbounded Creation

**Problem**: Creating new DOM elements (trail dots, particles) on every mouse move without removing old ones.

**Solution**: Object pooling. Create a fixed pool at init, cycle through it with an index.

### 3. Not Cleaning Up on Component Unmount

**Problem**: In SPAs (React, Vue), navigating away without removing event listeners and animation loops.

**Solution**: Return a cleanup function from every initialization. Call it on unmount.

```javascript
// React pattern
useEffect(() => {
  const cleanup = createCursorTrail();
  return cleanup;
}, []);
```

### 4. Ignoring Reduced Motion Preferences

**Problem**: Effects cause motion sickness for users with vestibular disorders.

**Solution**: Always check `prefers-reduced-motion` before initializing. Either skip the effect entirely or provide a non-motion alternative (e.g., opacity change instead of position animation).

### 5. Blocking Touch Scrolling

**Problem**: `pointermove` or `touchmove` handlers that call `preventDefault()`, breaking native scrolling on mobile.

**Solution**: Always use `{ passive: true }`. If you need to prevent scrolling for a drag interaction, only prevent it inside the specific drag zone, not globally.

### 6. Cursor Effects Breaking Click Targets

**Problem**: Custom cursor overlays intercept clicks on buttons and links beneath them.

**Solution**: Set `pointer-events: none` on all decorative overlays. Test by clicking through the effect to verify underlying elements remain interactive.

### 7. Canvas Resolution on Retina Displays

**Problem**: Canvas looks blurry on high-DPI screens.

**Solution**: Scale canvas dimensions by `devicePixelRatio` and use CSS to display at logical size:

```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = container.clientWidth * dpr;
canvas.height = container.clientHeight * dpr;
canvas.style.width = container.clientWidth + 'px';
canvas.style.height = container.clientHeight + 'px';
ctx.scale(dpr, dpr);
```

### 8. Scroll Listener Without Passive Flag

**Problem**: Adding scroll listeners without `{ passive: true }` causes the browser to wait for the handler to complete before scrolling, creating visible jank.

**Solution**: Always passive for scroll, touchmove, and wheel. If you need `preventDefault` for a specific interaction, use a non-passive listener only on the specific element, not the window.

### 9. Animating `filter` on Too Many Elements

**Problem**: CSS `filter: blur()` triggers paint for the entire subtree. Applying it to many elements or a large container causes frame drops.

**Solution**: Use `backdrop-filter` sparingly. For blur effects, prefer canvas-based blur or reduce the number of filtered elements. Test on low-end devices.

### 10. Not Debouncing Resize Handlers

**Problem**: Recalculating positions, resizing canvases, and rebuilding particle systems on every resize event (fires rapidly during drag-resize).

**Solution**: Debounce resize with a 150-250ms delay:

```javascript
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(handleResize, 200);
});
```
