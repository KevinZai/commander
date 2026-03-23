# Advanced Recipes

Detailed implementation patterns for complex interactive visual effects. Read this file when a user needs a full implementation of one of these advanced techniques.

## Table of Contents

1. [WebGL Fluid Simulation](#webgl-fluid-simulation)
2. [Matter.js Interactive Scene](#matterjs-interactive-scene)
3. [Full Cursor Trail System](#full-cursor-trail-system)
4. [Image Pixel Scatter with WebGL](#image-pixel-scatter-with-webgl)
5. [Magnetic Navigation Menu](#magnetic-navigation-menu)
6. [Multi-Input Tilt Card](#multi-input-tilt-card)
7. [Audio-Driven Particle Ring](#audio-driven-particle-ring)
8. [Scroll-Speed Distortion Layer](#scroll-speed-distortion-layer)

---

## WebGL Fluid Simulation

A GPU-accelerated 2D fluid simulation where the cursor injects velocity and dye. Based on Jos Stam's stable fluids method.

Key components:
- **Double-buffered framebuffers** for velocity and pressure fields
- **Fragment shaders** for advection, divergence, pressure solve (Jacobi iterations), and gradient subtraction
- **Cursor interaction**: on `pointermove`, inject velocity (proportional to cursor speed) and dye (color) at the cursor position

Architecture:
```
Advect velocity → Compute divergence → Jacobi pressure solve (20-40 iterations) →
Subtract pressure gradient → Advect dye → Render dye to screen
```

The simulation runs on textures (typically 256x256 or 512x512 regardless of canvas resolution) for performance. Each step is a fullscreen quad draw with a different shader.

Cursor injection: calculate `delta = currentPos - lastPos` each frame. Inject a gaussian splat of velocity at cursor position with magnitude proportional to `|delta|`. Inject a color splat at the same position.

Performance: 512x512 simulation with 30 Jacobi iterations runs at 60fps on most GPUs. Drop to 256x256 for mobile.

Libraries that wrap this: `fluid-gl`, `WebGL-Fluid-Simulation` (Pavel Dobryakov's implementation is the gold standard — study it for shader code).

---

## Matter.js Interactive Scene

Set up a physics world where DOM elements or canvas shapes respond to cursor interaction.

```javascript
import Matter from 'matter-js';

const { Engine, Render, World, Bodies, Mouse, MouseConstraint, Runner } = Matter;

function createPhysicsScene(container) {
  const engine = Engine.create();
  const render = Render.create({
    element: container,
    engine,
    options: {
      width: container.clientWidth,
      height: container.clientHeight,
      wireframes: false,
      background: 'transparent',
    },
  });

  // Walls
  const wallThickness = 50;
  const w = container.clientWidth;
  const h = container.clientHeight;
  World.add(engine.world, [
    Bodies.rectangle(w / 2, h + wallThickness / 2, w, wallThickness, { isStatic: true }),
    Bodies.rectangle(w / 2, -wallThickness / 2, w, wallThickness, { isStatic: true }),
    Bodies.rectangle(-wallThickness / 2, h / 2, wallThickness, h, { isStatic: true }),
    Bodies.rectangle(w + wallThickness / 2, h / 2, wallThickness, h, { isStatic: true }),
  ]);

  // Interactive bodies
  const bodies = Array.from({ length: 20 }, () =>
    Bodies.circle(
      Math.random() * w,
      Math.random() * h * 0.5,
      20 + Math.random() * 30,
      { restitution: 0.6, friction: 0.1 }
    )
  );
  World.add(engine.world, bodies);

  // Mouse constraint for drag interaction
  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });
  World.add(engine.world, mouseConstraint);
  render.mouse = mouse;

  Runner.run(Runner.create(), engine);
  Render.run(render);

  return { engine, render, bodies };
}
```

For DOM-synced physics: instead of using Matter's renderer, map each body's position/angle to a DOM element's `transform` in a rAF loop.

---

## Full Cursor Trail System

A production-ready cursor trail with object pooling, configurable appearance, and smooth fading.

```javascript
function createCursorTrail({
  count = 20,
  size = 8,
  color = '#ffffff',
  fadeSpeed = 0.05,
  followSpeed = 0.3,
} = {}) {
  const dots = Array.from({ length: count }, (_, i) => {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: color,
      pointerEvents: 'none',
      zIndex: '9999',
      opacity: '0',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 0.3s',
      willChange: 'transform, opacity',
    });
    document.body.appendChild(el);
    return { el, x: 0, y: 0, opacity: 0 };
  });

  let mouseX = 0, mouseY = 0, isMoving = false, fadeTimer = null;

  document.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    isMoving = true;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => { isMoving = false; }, 100);
  }, { passive: true });

  function animate() {
    let leaderX = mouseX, leaderY = mouseY;

    dots.forEach((dot, i) => {
      // Each dot follows the one ahead of it
      const speed = followSpeed * (1 - i / dots.length * 0.5);
      dot.x += (leaderX - dot.x) * speed;
      dot.y += (leaderY - dot.y) * speed;

      // Opacity based on position in chain and movement
      const targetOpacity = isMoving ? 1 - i / dots.length : 0;
      dot.opacity += (targetOpacity - dot.opacity) * fadeSpeed;

      dot.el.style.transform = `translate3d(${dot.x - size / 2}px, ${dot.y - size / 2}px, 0)`;
      dot.el.style.opacity = dot.opacity.toFixed(2);

      // Scale decreases along the chain
      const scale = 1 - i / dots.length * 0.7;
      dot.el.style.transform += ` scale(${scale})`;

      leaderX = dot.x;
      leaderY = dot.y;
    });

    requestAnimationFrame(animate);
  }

  animate();

  // Cleanup function
  return () => {
    dots.forEach(d => d.el.remove());
  };
}
```

---

## Image Pixel Scatter with WebGL

For high-performance pixel scatter using WebGL point sprites:

1. Draw the source image to an offscreen canvas
2. Read pixel data with `getImageData`
3. Sample pixels at regular intervals (e.g., every 4th pixel)
4. Create two position buffers: `gridPositions` (original) and `scatteredPositions` (random)
5. In the vertex shader, interpolate between the two based on a `uProgress` uniform
6. On interaction (hover, click), tween `uProgress` from 0 to 1

Vertex shader concept:
```glsl
attribute vec2 aGridPos;
attribute vec2 aScatterPos;
attribute vec4 aColor;
uniform float uProgress;
varying vec4 vColor;

void main() {
  vec2 pos = mix(aGridPos, aScatterPos, uProgress);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = mix(2.0, 4.0, uProgress);
  vColor = aColor;
}
```

This handles 100k+ pixels at 60fps because all position interpolation happens on the GPU.

---

## Magnetic Navigation Menu

A nav bar where each link pulls toward the cursor independently:

```javascript
function magneticNav(navSelector, {
  strength = 0.4,
  threshold = 100,
  textStrength = 0.6,
} = {}) {
  const links = document.querySelectorAll(`${navSelector} a`);

  document.addEventListener('pointermove', (e) => {
    links.forEach(link => {
      const rect = link.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < threshold) {
        const pull = (1 - dist / threshold) ** 2; // Quadratic falloff
        link.style.transform = `translate3d(${dx * pull * strength}px, ${dy * pull * strength}px, 0)`;
        // Inner text moves more for a layered effect
        const inner = link.querySelector('span');
        if (inner) {
          inner.style.transform = `translate3d(${dx * pull * textStrength}px, ${dy * pull * textStrength}px, 0)`;
        }
      } else {
        link.style.transform = '';
        const inner = link.querySelector('span');
        if (inner) inner.style.transform = '';
      }
    });
  }, { passive: true });
}
```

Add `transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)` to the links for smooth snap-back.

---

## Multi-Input Tilt Card

A card that responds to mouse on desktop and gyroscope on mobile, with specular highlight and depth layers:

```javascript
function tiltCard(cardEl, {
  maxAngle = 20,
  perspective = 1000,
  glareOpacity = 0.3,
  scale = 1.05,
} = {}) {
  // Create glare overlay
  const glare = document.createElement('div');
  Object.assign(glare.style, {
    position: 'absolute', inset: '0', borderRadius: 'inherit',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)',
    opacity: '0', transition: 'opacity 0.3s', pointerEvents: 'none',
  });
  cardEl.style.position = 'relative';
  cardEl.style.transformStyle = 'preserve-3d';
  cardEl.appendChild(glare);

  function applyTilt(nx, ny) {
    const rotateY = nx * maxAngle;
    const rotateX = -ny * maxAngle;
    cardEl.style.transform =
      `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
    // Glare follows tilt direction
    const glareAngle = Math.atan2(ny, nx) * (180 / Math.PI) + 135;
    glare.style.background =
      `linear-gradient(${glareAngle}deg, rgba(255,255,255,${glareOpacity * Math.hypot(nx, ny)}) 0%, transparent 80%)`;
    glare.style.opacity = '1';
  }

  function resetTilt() {
    cardEl.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    glare.style.opacity = '0';
  }

  // Desktop: mouse
  cardEl.addEventListener('pointermove', (e) => {
    const rect = cardEl.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    applyTilt(nx, ny);
  });
  cardEl.addEventListener('pointerleave', resetTilt);

  // Mobile: gyroscope
  function handleOrientation(e) {
    const nx = Math.max(-1, Math.min(1, e.gamma / 45));
    const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
    applyTilt(nx, ny);
  }

  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires permission
      cardEl.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission().then(p => {
          if (p === 'granted') window.addEventListener('deviceorientation', handleOrientation);
        });
      }, { once: true });
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }

  cardEl.style.transition = 'transform 0.15s ease-out';
}
```

---

## Audio-Driven Particle Ring

A ring of particles that pulse with audio frequency data:

```javascript
async function audioParticleRing(canvas, audioSource) {
  const ctx = canvas.getContext('2d');
  const audioCtx = new AudioContext();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;

  // Connect source
  if (audioSource instanceof HTMLMediaElement) {
    audioCtx.createMediaElementSource(audioSource).connect(analyser);
    analyser.connect(audioCtx.destination);
  } else {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx.createMediaStreamSource(stream).connect(analyser);
  }

  const freqData = new Uint8Array(analyser.frequencyBinCount);
  const particleCount = analyser.frequencyBinCount;

  function draw() {
    analyser.getByteFrequencyData(freqData);
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.3;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Trail fade
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const amplitude = freqData[i] / 255;
      const radius = baseRadius + amplitude * baseRadius * 0.8;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const size = 2 + amplitude * 6;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      const hue = (i / particleCount) * 360;
      ctx.fillStyle = `hsla(${hue}, 80%, ${50 + amplitude * 30}%, ${0.5 + amplitude * 0.5})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  draw();
  return audioCtx;
}
```

---

## Scroll-Speed Distortion Layer

An overlay that applies visual distortion proportional to scroll velocity:

```javascript
function scrollDistortion(targetSelector = 'body') {
  const target = document.querySelector(targetSelector);
  let scrollY = window.scrollY, velocity = 0;

  window.addEventListener('scroll', () => {
    velocity = window.scrollY - scrollY;
    scrollY = window.scrollY;
  }, { passive: true });

  function update() {
    // Decay velocity
    velocity *= 0.92;

    const absVel = Math.abs(velocity);
    const intensity = Math.min(absVel / 40, 1); // 0-1

    // Vertical stretch simulating motion blur
    const scaleY = 1 + intensity * 0.02;
    const skewX = velocity * 0.02;
    const blur = intensity * 1.5;

    target.style.transform = `scaleY(${scaleY}) skewX(${skewX}deg)`;
    target.style.filter = blur > 0.1 ? `blur(${blur}px)` : '';

    requestAnimationFrame(update);
  }

  update();
}
```

Combine with parallax by making some elements scroll faster than others based on a `data-speed` attribute:

```javascript
document.querySelectorAll('[data-scroll-speed]').forEach(el => {
  const speed = parseFloat(el.dataset.scrollSpeed);
  el.style.transform = `translateY(${scrollY * (1 - speed)}px)`;
});
```
