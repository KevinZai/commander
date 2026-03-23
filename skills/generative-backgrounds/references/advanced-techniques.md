# Advanced Techniques Reference

In-depth implementation guides for the more complex generative background techniques.

## Table of Contents
1. [Reaction-Diffusion System](#reaction-diffusion-system)
2. [WebGL Ping-Pong Framebuffers](#ping-pong-framebuffers)
3. [Particle System Backgrounds](#particle-systems)
4. [Seamless Tiling Deep Dive](#seamless-tiling)
5. [Advanced Voronoi Techniques](#advanced-voronoi)
6. [Mouse/Scroll Interactivity](#interactivity)
7. [Combining Multiple Effects](#layering-effects)
8. [Framework Integration Recipes](#framework-recipes)

---

## Reaction-Diffusion System

A complete Gray-Scott reaction-diffusion implementation requires WebGL ping-pong rendering.
The system simulates two chemicals (A and B) that diffuse and react.

### Full Implementation

```typescript
interface ReactionDiffusionConfig {
  feed: number;        // 0.01 - 0.08
  kill: number;        // 0.04 - 0.07
  diffuseA: number;    // typically 1.0
  diffuseB: number;    // typically 0.5
  stepsPerFrame: number; // 4-16
  colorA: [number, number, number];
  colorB: [number, number, number];
}

const PRESETS: Record<string, Pick<ReactionDiffusionConfig, 'feed' | 'kill'>> = {
  mitosis:      { feed: 0.0367, kill: 0.0649 },
  coral:        { feed: 0.0545, kill: 0.062 },
  fingerprints: { feed: 0.029,  kill: 0.057 },
  spots:        { feed: 0.026,  kill: 0.051 },
  worms:        { feed: 0.078,  kill: 0.061 },
  solitons:     { feed: 0.03,   kill: 0.06 },
  maze:         { feed: 0.029,  kill: 0.057 },
  holes:        { feed: 0.039,  kill: 0.058 },
};

function createReactionDiffusion(
  canvas: HTMLCanvasElement,
  config: ReactionDiffusionConfig
): () => void {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })!;
  const ext = gl.getExtension('OES_texture_float');
  if (!ext) {
    console.warn('WebGL float textures not supported, falling back to half-float');
    gl.getExtension('OES_texture_half_float');
  }

  const simWidth = Math.min(canvas.width, 512);
  const simHeight = Math.min(canvas.height, 512);

  // Create two framebuffers for ping-pong
  const fbos = [createFBO(gl, simWidth, simHeight), createFBO(gl, simWidth, simHeight)];

  // Initialize with chemical A = 1.0 everywhere, B = 0.0 with some seed spots
  initializeState(gl, fbos[0], simWidth, simHeight);

  const updateProgram = createProgram(gl, fullscreenVert, reactionDiffusionFrag);
  const displayProgram = createProgram(gl, fullscreenVert, displayFrag);

  const updateUniforms = {
    u_state: gl.getUniformLocation(updateProgram, 'u_state'),
    u_texel: gl.getUniformLocation(updateProgram, 'u_texel'),
    u_feed: gl.getUniformLocation(updateProgram, 'u_feed'),
    u_kill: gl.getUniformLocation(updateProgram, 'u_kill'),
    u_da: gl.getUniformLocation(updateProgram, 'u_da'),
    u_db: gl.getUniformLocation(updateProgram, 'u_db'),
  };

  let currentFBO = 0;
  let animId: number;

  function simulate() {
    gl.useProgram(updateProgram);
    gl.uniform2f(updateUniforms.u_texel, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1f(updateUniforms.u_feed, config.feed);
    gl.uniform1f(updateUniforms.u_kill, config.kill);
    gl.uniform1f(updateUniforms.u_da, config.diffuseA);
    gl.uniform1f(updateUniforms.u_db, config.diffuseB);

    for (let i = 0; i < config.stepsPerFrame; i++) {
      const readFBO = fbos[currentFBO];
      const writeFBO = fbos[1 - currentFBO];

      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO.framebuffer);
      gl.viewport(0, 0, simWidth, simHeight);
      gl.bindTexture(gl.TEXTURE_2D, readFBO.texture);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      currentFBO = 1 - currentFBO;
    }
  }

  function display() {
    gl.useProgram(displayProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, fbos[currentFBO].texture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function loop() {
    simulate();
    display();
    animId = requestAnimationFrame(loop);
  }

  setupFullscreenQuad(gl);
  animId = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(animId);
}
```

### Seeding the Simulation

The initial state needs "seeds" of chemical B to start the reaction. Without them, the
system stays at equilibrium (all A, no B) and nothing happens.

```typescript
function initializeState(
  gl: WebGLRenderingContext,
  fbo: FBO,
  width: number,
  height: number
) {
  const data = new Float32Array(width * height * 4);

  // Fill with A=1.0, B=0.0
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 1.0;     // A
    data[i * 4 + 1] = 0.0; // B
  }

  // Add random seed spots of chemical B
  const seedCount = 20;
  for (let s = 0; s < seedCount; s++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const radius = 3 + Math.floor(Math.random() * 5);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const x = (cx + dx + width) % width;
          const y = (cy + dy + height) % height;
          const idx = (y * width + x) * 4;
          data[idx + 1] = 1.0; // Set B to 1.0
        }
      }
    }
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
  gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, data);
}
```

---

## Ping-Pong Framebuffers

Many simulation effects (reaction-diffusion, cellular automata, fluid simulation) need to
read from one state and write to another. This "ping-pong" pattern uses two framebuffer
objects that swap roles each step.

```typescript
interface FBO {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
}

function createFBO(gl: WebGLRenderingContext, width: number, height: number): FBO {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  return { framebuffer, texture };
}

const fullscreenVert = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

function setupFullscreenQuad(gl: WebGLRenderingContext) {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const posLoc = 0; // bind to location 0
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  function compile(type: number, src: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${log}`);
    }
    return shader;
  }

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSrc));
  gl.bindAttribLocation(program, 0, 'a_position');
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}
```

---

## Particle Systems

Lightweight particle backgrounds (floating dust, fireflies, connections/constellations).

```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

function createParticleBackground(
  canvas: HTMLCanvasElement,
  count = 100,
  connectDistance = 120,
  drawConnections = true
): () => void {
  const ctx = canvas.getContext('2d')!;
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.4,
      hue: 200 + Math.random() * 40,
    });
  }

  let animId: number;

  function update() {
    const w = canvas.width;
    const h = canvas.height;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < 0) p.x += w;
      if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h;
      if (p.y > h) p.y -= h;
    }
  }

  function draw() {
    ctx.fillStyle = 'rgba(10, 10, 30, 0.15)'; // trail fade
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    if (drawConnections) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDistance) {
            const alpha = (1 - dist / connectDistance) * 0.15;
            ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // Draw particles
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
      ctx.fill();
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  animId = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(animId);
}
```

**Performance note:** For connection-drawing, limit `count` to ~150 on desktop and ~60 on
mobile. The N^2 distance check is the bottleneck. For more particles without connections,
you can go much higher (1000+).

---

## Seamless Tiling

### Method 1: Toroidal Noise (Best for GLSL)

Map 2D UV coordinates onto a 4D torus to get seamless wrapping in both directions.
Requires a 4D noise function.

```glsl
// 4D simplex noise (simplified — for production use the full Ashima 4D version)
float snoise4D(vec4 v);

float seamlessNoise(vec2 uv, float scale, float time) {
  float s = uv.x * scale;
  float t = uv.y * scale;
  float r = 0.3; // torus radius

  return snoise4D(vec4(
    r * cos(s * 6.28318),
    r * sin(s * 6.28318),
    r * cos(t * 6.28318),
    r * sin(t * 6.28318)
  ) + time * 0.1);
}
```

### Method 2: Crossfade Tiling (Best for Canvas 2D)

Generate a texture larger than needed, then crossfade the edges.

```typescript
function makeTileable(imageData: ImageData, blendWidth: number): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  const rd = result.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < blendWidth; x++) {
      const t = x / blendWidth;
      const leftIdx = (y * width + x) * 4;
      const rightIdx = (y * width + (width - blendWidth + x)) * 4;

      for (let c = 0; c < 4; c++) {
        const blended = data[leftIdx + c] * t + data[rightIdx + c] * (1 - t);
        rd[leftIdx + c] = blended;
        rd[rightIdx + c] = blended;
      }
    }
  }

  // Same for vertical edges
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < blendWidth; y++) {
      const t = y / blendWidth;
      const topIdx = (y * width + x) * 4;
      const botIdx = ((height - blendWidth + y) * width + x) * 4;

      for (let c = 0; c < 4; c++) {
        const blended = rd[topIdx + c] * t + rd[botIdx + c] * (1 - t);
        rd[topIdx + c] = blended;
        rd[botIdx + c] = blended;
      }
    }
  }

  return result;
}
```

### Method 3: CSS Background Repeat

For simple patterns, generate a small tile and let CSS repeat it:

```typescript
function createRepeatingTile(size: number, drawFn: (ctx: CanvasRenderingContext2D) => void): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx);
  return canvas.toDataURL();
}

// Usage:
// element.style.backgroundImage = `url(${createRepeatingTile(64, drawMyPattern)})`;
// element.style.backgroundRepeat = 'repeat';
```

---

## Advanced Voronoi

### Crackle Pattern

Use the difference between second and first distance for a cracked earth look:

```glsl
float crackle = smoothstep(0.0, 0.02, secondDist - firstDist);
// crackle = 0 at edges, 1 in cell interiors
```

### Weighted / Organic Voronoi

Use non-euclidean distance metrics for different looks:

```glsl
// Manhattan distance: more angular, grid-like cells
float d = abs(delta.x) + abs(delta.y);

// Chebyshev distance: diamond-shaped cells
float d = max(abs(delta.x), abs(delta.y));

// Minkowski (p=0.5): star-shaped cells
float d = pow(pow(abs(delta.x), 0.5) + pow(abs(delta.y), 0.5), 2.0);
```

### 3D Voronoi Cross-Section

Animate by moving through a 3D voronoi field:

```glsl
// Use time as the z-coordinate
float d = length(vec3(neighbor + point - f, sin(u_time * 0.1 + hash(cellId))));
```

---

## Interactivity

### Mouse Tracking

```typescript
function addMouseInteraction(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  program: WebGLProgram
) {
  const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
  let mouseX = 0.5, mouseY = 0.5;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / rect.width;
    mouseY = 1.0 - (e.clientY - rect.top) / rect.height; // flip Y for GL
  });

  // Call in render loop:
  return () => gl.uniform2f(mouseLoc, mouseX, mouseY);
}
```

### Scroll-Linked Animation

```typescript
function addScrollLink(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, program: WebGLProgram) {
  const scrollLoc = gl.getUniformLocation(program, 'u_scroll');

  function updateScroll() {
    const scrollFraction = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    gl.useProgram(program);
    gl.uniform1f(scrollLoc, scrollFraction);
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  return () => window.removeEventListener('scroll', updateScroll);
}
```

### GLSL Mouse/Scroll Effects

```glsl
uniform vec2 u_mouse;  // 0-1 range
uniform float u_scroll; // 0-1 range

// Ripple from mouse position
float mouseDist = length(uv - u_mouse);
float ripple = sin(mouseDist * 30.0 - u_time * 5.0) * exp(-mouseDist * 5.0);

// Shift noise with scroll
float n = fbm(uv * 3.0 + vec2(u_scroll * 2.0, 0.0) + u_time * 0.1);
```

---

## Layering Effects

Combine multiple techniques by rendering each to a separate canvas or compositing in a
single shader.

### Multi-Canvas Layering

```typescript
function createLayeredBackground(container: HTMLElement, layers: LayerConfig[]): () => void {
  const cleanups: (() => void)[] = [];

  for (const layer of layers) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      opacity: String(layer.opacity ?? 1),
      mixBlendMode: layer.blendMode ?? 'normal',
    });
    container.appendChild(canvas);

    const cleanup = layer.init(canvas);
    cleanups.push(() => { cleanup(); canvas.remove(); });
  }

  return () => cleanups.forEach(fn => fn());
}

interface LayerConfig {
  init: (canvas: HTMLCanvasElement) => () => void;
  opacity?: number;
  blendMode?: string;
}
```

### Single-Shader Compositing

More efficient — combine effects in one fragment shader:

```glsl
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Layer 1: base gradient
  vec3 col = mix(vec3(0.05, 0.0, 0.15), vec3(0.0, 0.1, 0.2), uv.y);

  // Layer 2: noise flow (additive)
  float n = fbm(uv * 3.0 + u_time * 0.1);
  col += vec3(0.1, 0.2, 0.3) * smoothstep(-0.2, 0.5, n) * 0.4;

  // Layer 3: voronoi edges (screen blend)
  float edge = voronoiEdge(uv * 6.0, u_time);
  vec3 edgeColor = vec3(0.2, 0.5, 1.0) * edge * 0.3;
  col = col + edgeColor - col * edgeColor; // screen blend

  // Layer 4: grain overlay
  float grain = (fract(sin(dot(uv * u_resolution, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.03;
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}
```

---

## Framework Recipes

### React + TypeScript

```tsx
import { useEffect, useRef, useCallback } from 'react';

interface BackgroundProps {
  type: 'noise' | 'voronoi' | 'mesh' | 'automata';
  colors?: string[];
  speed?: number;
  className?: string;
}

export function GenerativeBackground({ type, colors, speed = 1, className }: BackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Choose renderer based on type
    switch (type) {
      case 'noise':
        return initWebGLBackground(canvas, noiseShader(colors));
      case 'voronoi':
        return initWebGLBackground(canvas, voronoiShader(colors));
      case 'mesh':
        return createGradientMesh(canvas.parentElement!, { colors: colors ?? defaultColors, count: 5, blurPx: 100, speed: 20 / speed });
      case 'automata':
        return initCanvasAutomata(canvas);
    }
  }, [type, colors, speed]);

  useEffect(() => {
    const cleanup = init();
    return () => cleanup?.();
  }, [init]);

  return <canvas ref={canvasRef} className={`fixed inset-0 -z-10 w-full h-full ${className ?? ''}`} />;
}
```

### Next.js (App Router)

```tsx
'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Canvas/WebGL
const GenerativeBackground = dynamic(
  () => import('@/components/GenerativeBackground').then(m => m.GenerativeBackground),
  { ssr: false }
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GenerativeBackground type="noise" />
      <main className="relative z-10">{children}</main>
    </>
  );
}
```

### Svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let fragmentShader: string;

  let canvas: HTMLCanvasElement;
  let cleanup: (() => void) | undefined;

  onMount(() => {
    cleanup = initWebGLBackground(canvas, fragmentShader);
  });

  onDestroy(() => cleanup?.());
</script>

<canvas bind:this={canvas} class="fixed inset-0 -z-10 w-full h-full" />
```

### Vue 3

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ fragmentShader: string }>();
const canvas = ref<HTMLCanvasElement>();
let cleanup: (() => void) | undefined;

onMounted(() => {
  if (canvas.value) {
    cleanup = initWebGLBackground(canvas.value, props.fragmentShader);
  }
});

onUnmounted(() => cleanup?.());
</script>

<template>
  <canvas ref="canvas" class="fixed inset-0 -z-10 w-full h-full" />
</template>
```

### Astro

```astro
---
// No JS in frontmatter — this is a static island
---
<canvas id="bg-canvas" class="fixed inset-0 -z-10 w-full h-full"></canvas>

<script>
  import { initWebGLBackground } from '../lib/background';
  import { noiseFragmentShader } from '../lib/shaders';

  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  initWebGLBackground(canvas, noiseFragmentShader);
</script>
```
