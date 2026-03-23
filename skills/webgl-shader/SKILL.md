---
name: webgl-shader
description: "Create WebGL and Three.js visual effects with custom GLSL shaders for shadcn/ui projects. Fragment/vertex shaders, noise functions, distortion, post-processing, and GPU-accelerated backgrounds. Use when: user wants shader effects, WebGL backgrounds, 3D visuals, noise textures, or GPU-powered visual effects."
---

# WebGL Shader Skill

Create WebGL/Three.js shader components for **Next.js + shadcn/ui + Tailwind CSS + TypeScript** projects.

All output MUST be:
- React functional components with TypeScript
- Wrapped in shadcn/ui compatible containers with Tailwind classes
- Using shadcn CSS variables for colors (convert `hsl(var(--primary))` to vec3 uniforms)
- Client-only (`"use client"`) with SSR-safe guards
- Handling WebGL context loss gracefully
- Providing CSS fallback backgrounds for non-WebGL browsers

## Core Setup Pattern

```tsx
"use client"
import { useRef, useEffect, useCallback } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

interface ShaderBackgroundProps {
  className?: string
  fallbackColor?: string
}

export function ShaderBackground({ className, fallbackColor = "hsl(var(--background))" }: ShaderBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    rendererRef.current = renderer
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Shader material setup...
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let animationId: number
    const animate = () => {
      material.uniforms.uTime.value += 0.01
      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 -z-10", className)}
      style={{ backgroundColor: fallbackColor }}
    />
  )
}
```

## GLSL Noise Functions

### Simplex 2D Noise
```glsl
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
```

### FBM (Fractional Brownian Motion)
```glsl
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
```

## Common Shader Effects

### Gradient Mesh (Apple/Stripe style)
```glsl
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float n1 = fbm(uv * 3.0 + uTime * 0.2);
  float n2 = fbm(uv * 2.0 - uTime * 0.15 + 100.0);
  vec3 col1 = vec3(0.4, 0.2, 0.8); // primary
  vec3 col2 = vec3(0.2, 0.6, 0.9); // secondary
  vec3 col3 = vec3(0.9, 0.3, 0.5); // accent
  vec3 color = mix(col1, col2, n1);
  color = mix(color, col3, n2 * 0.5 + 0.25);
  gl_FragColor = vec4(color, 1.0);
}
```

### Chromatic Aberration
```glsl
float r = texture2D(uTexture, uv + vec2(0.005, 0.0)).r;
float g = texture2D(uTexture, uv).g;
float b = texture2D(uTexture, uv - vec2(0.005, 0.0)).b;
gl_FragColor = vec4(r, g, b, 1.0);
```

### Distortion / Ripple
```glsl
vec2 distort = uv + vec2(
  sin(uv.y * 20.0 + uTime) * 0.01,
  cos(uv.x * 20.0 + uTime) * 0.01
);
```

### Metaballs
```glsl
float metaball(vec2 uv, vec2 center, float radius) {
  return radius / length(uv - center);
}
// Sum multiple metaballs and threshold
```

## Post-Processing with EffectComposer
```tsx
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass"
```

Effects: Bloom, Film Grain, Vignette, Glitch, Pixelation, RGB Shift

## Mouse/Scroll Interactivity

```tsx
const handleMouseMove = useCallback((e: MouseEvent) => {
  const rect = containerRef.current?.getBoundingClientRect()
  if (!rect) return
  material.uniforms.uMouse.value.set(
    (e.clientX - rect.left) / rect.width,
    1.0 - (e.clientY - rect.top) / rect.height
  )
}, [])
```

## Performance Rules

1. Cap `devicePixelRatio` at 2: `renderer.setPixelRatio(Math.min(dpr, 2))`
2. Use half-resolution for background shaders on mobile
3. Dispose all Three.js resources in cleanup
4. Handle `webglcontextlost` / `webglcontextrestored` events
5. Skip animation when tab not visible: `document.hidden` check
6. Provide CSS gradient fallback when WebGL unavailable
7. Lazy-load Three.js with `next/dynamic`

## Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| three | WebGL renderer | `npm i three @types/three` |

**Version:** 1.0.0
**Last Updated:** 2026-03-17
