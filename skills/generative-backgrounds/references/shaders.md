# Full GLSL Shader Reference

Complete, copy-paste-ready shaders for generative backgrounds. Each shader is a standalone
fragment shader that works with the WebGL boilerplate from SKILL.md.

## Table of Contents
1. [Flowing Noise Field](#flowing-noise-field)
2. [Gradient Mesh (Stripe Style)](#gradient-mesh)
3. [Voronoi Cells](#voronoi-cells)
4. [Voronoi Edges (Wireframe)](#voronoi-edges)
5. [Reaction-Diffusion Display](#reaction-diffusion-display)
6. [Aurora / Northern Lights](#aurora)
7. [Plasma](#plasma)
8. [Metaballs](#metaballs)
9. [Fractal Warp (Domain Warping)](#fractal-warp)
10. [Starfield / Parallax Stars](#starfield)

---

## Flowing Noise Field

A smooth, slowly-evolving color field driven by layered simplex noise. The "default"
generative background — works well for almost any context.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

// --- Simplex noise (Ashima Arts) ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
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

float fbm(vec2 p) {
  float val = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++) {
    val += amp * snoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return val;
}
// --- End noise ---

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time;

  float n = fbm(uv * 3.0 + t * 0.1);
  float n2 = fbm(uv * 4.0 + vec2(t * -0.08, t * 0.12) + 50.0);

  float blend = n * 0.5 + 0.5;
  vec3 col = palette(blend + n2 * 0.3,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 0.7, 0.4),
    vec3(0.0, 0.15, 0.2)
  );

  // Slight vignette
  float vig = 1.0 - 0.3 * length(uv - 0.5);
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
```

**Customization points:**
- `uv * 3.0` — noise scale (lower = larger blobs, higher = more detail)
- `t * 0.1` — animation speed
- `palette(...)` parameters — change the color scheme (see IQ palette section in SKILL.md)
- `fbm` octave count — more = more detail, fewer = smoother

---

## Gradient Mesh

Soft, overlapping color blobs that drift slowly. Mimics the Apple/Stripe gradient effect.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.3;

  // 5 moving gaussian blobs
  vec3 col = vec3(0.02, 0.02, 0.06); // dark base

  // Blob 1: pink
  vec2 p1 = vec2(0.3 + sin(t * 0.7) * 0.2, 0.5 + cos(t * 0.5) * 0.3);
  float d1 = exp(-3.0 * length(uv - p1));
  col += vec3(0.9, 0.2, 0.5) * d1 * 0.8;

  // Blob 2: blue
  vec2 p2 = vec2(0.7 + cos(t * 0.6) * 0.25, 0.3 + sin(t * 0.8) * 0.2);
  float d2 = exp(-2.5 * length(uv - p2));
  col += vec3(0.1, 0.3, 0.9) * d2 * 0.7;

  // Blob 3: teal
  vec2 p3 = vec2(0.5 + sin(t * 0.4 + 2.0) * 0.3, 0.7 + cos(t * 0.3) * 0.2);
  float d3 = exp(-3.5 * length(uv - p3));
  col += vec3(0.0, 0.8, 0.7) * d3 * 0.6;

  // Blob 4: purple
  vec2 p4 = vec2(0.2 + cos(t * 0.5 + 1.0) * 0.15, 0.2 + sin(t * 0.6 + 3.0) * 0.25);
  float d4 = exp(-2.8 * length(uv - p4));
  col += vec3(0.5, 0.1, 0.8) * d4 * 0.5;

  // Blob 5: orange
  vec2 p5 = vec2(0.8 + sin(t * 0.3 + 4.0) * 0.1, 0.6 + cos(t * 0.7 + 1.0) * 0.15);
  float d5 = exp(-3.2 * length(uv - p5));
  col += vec3(1.0, 0.5, 0.1) * d5 * 0.4;

  gl_FragColor = vec4(col, 1.0);
}
```

**Customization:**
- Change blob colors by modifying the `vec3(r, g, b)` values
- `exp(-N * ...)` controls blob softness: lower N = bigger/softer, higher N = tighter
- Add/remove blobs as needed
- Adjust `t * speed` per blob for varied movement

---

## Voronoi Cells

Organic cell pattern with animated seed points. Colors mapped per cell.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv *= 8.0; // cell density

  vec2 i = floor(uv);
  vec2 f = fract(uv);

  float minDist = 1.0;
  vec2 minPoint = vec2(0.0);
  vec2 minCell = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cellId = i + neighbor;
      vec2 point = hash2(cellId);
      point = 0.5 + 0.5 * sin(u_time * 0.5 + 6.2831 * point);
      float d = length(neighbor + point - f);
      if (d < minDist) {
        minDist = d;
        minPoint = point;
        minCell = cellId;
      }
    }
  }

  // Color by cell identity
  float cellHash = fract(sin(dot(minCell, vec2(127.1, 311.7))) * 43758.5453);
  vec3 col = palette(cellHash + u_time * 0.05);

  // Darken edges
  col *= smoothstep(0.0, 0.05, minDist);

  gl_FragColor = vec4(col, 1.0);
}
```

---

## Voronoi Edges

Wireframe-style voronoi using the distance to the second-nearest cell.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv *= 6.0;

  vec2 i = floor(uv);
  vec2 f = fract(uv);

  float d1 = 1.0, d2 = 1.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(i + neighbor);
      point = 0.5 + 0.5 * sin(u_time * 0.4 + 6.28318 * point);
      float d = length(neighbor + point - f);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }

  float edge = d2 - d1;
  float line = 1.0 - smoothstep(0.0, 0.05, edge);

  vec3 bgColor = vec3(0.03, 0.03, 0.08);
  vec3 lineColor = vec3(0.2, 0.6, 1.0);

  vec3 col = mix(bgColor, lineColor, line * 0.8);
  // Add glow
  col += lineColor * smoothstep(0.15, 0.0, edge) * 0.3;

  gl_FragColor = vec4(col, 1.0);
}
```

---

## Aurora

Northern lights effect using layered, warped noise bands.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

// Include snoise function from Flowing Noise Field shader above

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.15;

  // Vertical gradient (dark at bottom, slightly lighter at top)
  vec3 col = mix(vec3(0.0, 0.02, 0.05), vec3(0.02, 0.05, 0.1), uv.y);

  // Aurora bands — noise-warped horizontal bands
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float yCenter = 0.5 + fi * 0.15;
    float warp = snoise(vec2(uv.x * 2.0 + t + fi * 10.0, t * 0.5)) * 0.15;
    float band = exp(-20.0 * pow(uv.y - yCenter - warp, 2.0));

    float intensity = snoise(vec2(uv.x * 3.0 + t * 0.8 + fi * 5.0, fi)) * 0.5 + 0.5;
    band *= intensity;

    vec3 auroraColor;
    if (i == 0) auroraColor = vec3(0.1, 0.9, 0.3);      // green
    else if (i == 1) auroraColor = vec3(0.2, 0.5, 0.9);  // blue
    else auroraColor = vec3(0.6, 0.1, 0.8);              // purple

    col += auroraColor * band * 0.6;
  }

  // Stars
  vec2 starUv = uv * 50.0;
  vec2 starId = floor(starUv);
  float starRand = fract(sin(dot(starId, vec2(12.9898, 78.233))) * 43758.5453);
  if (starRand > 0.97) {
    float brightness = sin(u_time * 2.0 + starRand * 100.0) * 0.3 + 0.7;
    col += vec3(brightness * 0.5) * (1.0 - uv.y); // more stars at top
  }

  gl_FragColor = vec4(col, 1.0);
}
```

---

## Plasma

Classic plasma effect using overlapping sine waves. Retro/vaporwave aesthetic.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time;

  float v = 0.0;
  v += sin(uv.x * 10.0 + t);
  v += sin((uv.y * 10.0 + t) * 0.5);
  v += sin((uv.x * 10.0 + uv.y * 10.0 + t) * 0.3);

  vec2 c = uv * 10.0 - vec2(5.0);
  v += sin(length(c) - t * 2.0);

  v *= 0.5;

  vec3 col = vec3(
    sin(v * 3.14159) * 0.5 + 0.5,
    sin(v * 3.14159 + 2.094) * 0.5 + 0.5,
    sin(v * 3.14159 + 4.189) * 0.5 + 0.5
  );

  gl_FragColor = vec4(col, 1.0);
}
```

---

## Metaballs

Organic blobs that merge when close. Good for lava lamp / liquid effects.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y; // aspect correction
  float t = u_time;

  float field = 0.0;

  // 6 metaballs with different orbits
  vec2 balls[6];
  balls[0] = vec2(0.5 + sin(t * 0.7) * 0.3, 0.5 + cos(t * 0.5) * 0.3);
  balls[1] = vec2(0.5 + cos(t * 0.8) * 0.25, 0.5 + sin(t * 0.6) * 0.25);
  balls[2] = vec2(0.5 + sin(t * 0.5 + 2.0) * 0.35, 0.5 + cos(t * 0.4 + 1.0) * 0.2);
  balls[3] = vec2(0.5 + cos(t * 0.3 + 3.0) * 0.2, 0.5 + sin(t * 0.9) * 0.3);
  balls[4] = vec2(0.5 + sin(t * 0.6 + 4.0) * 0.15, 0.5 + cos(t * 0.7 + 2.0) * 0.35);
  balls[5] = vec2(0.5 + cos(t * 0.4 + 5.0) * 0.3, 0.5 + sin(t * 0.5 + 3.0) * 0.15);

  for (int i = 0; i < 6; i++) {
    float d = length(uv - balls[i]);
    field += 0.01 / (d * d);
  }

  // Threshold and color
  vec3 col = vec3(0.02, 0.02, 0.06);
  if (field > 4.0) {
    float val = smoothstep(4.0, 8.0, field);
    col = mix(vec3(0.1, 0.2, 0.8), vec3(0.9, 0.3, 0.5), val);
  }

  gl_FragColor = vec4(col, 1.0);
}
```

---

## Fractal Warp (Domain Warping)

Uses noise to warp the input coordinates of more noise, creating organic, smoke-like patterns.
This is one of the most visually rich techniques.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

// Include snoise and fbm from Flowing Noise Field shader

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.1;

  // First warp layer
  vec2 q = vec2(fbm(uv + t * 0.3), fbm(uv + vec2(5.2, 1.3)));

  // Second warp layer (warp the warp)
  vec2 r = vec2(
    fbm(uv + 4.0 * q + vec2(1.7, 9.2) + t * 0.15),
    fbm(uv + 4.0 * q + vec2(8.3, 2.8) + t * 0.12)
  );

  float n = fbm(uv + 4.0 * r);

  // Map to color
  vec3 col = mix(vec3(0.1, 0.1, 0.3), vec3(0.2, 0.5, 0.8), smoothstep(-1.0, 1.0, n));
  col = mix(col, vec3(0.9, 0.4, 0.2), smoothstep(0.0, 0.8, length(q)));
  col = mix(col, vec3(0.9, 0.9, 0.9), smoothstep(0.2, 0.8, r.x));

  // Contrast boost
  col = pow(col, vec3(1.2));

  gl_FragColor = vec4(col, 1.0);
}
```

---

## Starfield

Parallax star layers scrolling at different speeds. Good for space/tech themes.

```glsl
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

float starLayer(vec2 uv, float speed, float density) {
  uv.y += u_time * speed;
  vec2 id = floor(uv * density);
  vec2 f = fract(uv * density);

  float rand = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);

  float star = 0.0;
  if (rand > 0.95) {
    vec2 center = vec2(
      fract(sin(dot(id, vec2(41.23, 67.89))) * 12345.6789),
      fract(sin(dot(id, vec2(93.12, 18.67))) * 67890.1234)
    );
    float d = length(f - center);
    float twinkle = sin(u_time * 3.0 + rand * 100.0) * 0.3 + 0.7;
    star = smoothstep(0.05, 0.0, d) * twinkle;
  }
  return star;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Dark space gradient
  vec3 col = mix(vec3(0.0, 0.0, 0.02), vec3(0.02, 0.01, 0.05), uv.y);

  // Three parallax star layers
  col += vec3(0.8, 0.8, 1.0) * starLayer(uv, 0.02, 20.0) * 0.4;  // far
  col += vec3(0.9, 0.9, 1.0) * starLayer(uv, 0.05, 15.0) * 0.6;  // mid
  col += vec3(1.0, 1.0, 1.0) * starLayer(uv, 0.1, 10.0) * 0.8;   // near

  gl_FragColor = vec4(col, 1.0);
}
```
