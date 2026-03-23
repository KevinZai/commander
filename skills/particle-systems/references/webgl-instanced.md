# WebGL Instanced Particle Renderer

Complete, copy-paste-ready setup for rendering 10,000+ particles with WebGL2 instanced drawing.

## Vertex Shader

```glsl
#version 300 es
// Per-vertex (the quad)
in vec2 a_position;

// Per-instance (one per particle)
in vec2 a_offset;    // particle world position
in float a_size;     // particle radius
in float a_alpha;    // particle opacity
in vec4 a_color;     // particle RGBA

out float v_alpha;
out vec4 v_color;
out vec2 v_uv;

uniform vec2 u_resolution;

void main() {
  // Scale quad by particle size, translate to particle position
  vec2 worldPos = a_offset + a_position * a_size;

  // Convert to clip space (-1..1)
  vec2 clipPos = (worldPos / u_resolution) * 2.0 - 1.0;
  clipPos.y = -clipPos.y; // flip Y to match Canvas convention

  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_alpha = a_alpha;
  v_color = a_color;
  v_uv = a_position * 0.5 + 0.5; // 0..1 for circle SDF
}
```

## Fragment Shader

```glsl
#version 300 es
precision mediump float;

in float v_alpha;
in vec4 v_color;
in vec2 v_uv;

out vec4 fragColor;

void main() {
  // Soft circle via signed distance field
  float dist = length(v_uv - 0.5) * 2.0;
  float circle = 1.0 - smoothstep(0.8, 1.0, dist);

  fragColor = vec4(v_color.rgb, v_color.a * v_alpha * circle);
}
```

## JavaScript Setup

```typescript
const MAX_PARTICLES = 50000;

// Bytes per instance: x(4) + y(4) + size(4) + alpha(4) + r(4) + g(4) + b(4) + a(4) = 32 bytes
const FLOATS_PER_INSTANCE = 8;
const instanceData = new Float32Array(MAX_PARTICLES * FLOATS_PER_INSTANCE);

function initWebGLParticles(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false, // not needed for particles
  });
  if (!gl) throw new Error('WebGL2 not supported');

  // Enable blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  // For additive blending (fire, sparks): gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  // Compile shaders (use the GLSL above)
  const program = createProgram(gl, vertexSource, fragmentSource);
  gl.useProgram(program);

  // --- Quad geometry (a unit square from -1 to 1) ---
  const quadVerts = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);
  const quadBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // --- Instance buffer ---
  const instanceBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, instanceData.byteLength, gl.DYNAMIC_DRAW);

  const stride = FLOATS_PER_INSTANCE * 4; // 32 bytes

  // a_offset (vec2) at offset 0
  const aOffset = gl.getAttribLocation(program, 'a_offset');
  gl.enableVertexAttribArray(aOffset);
  gl.vertexAttribPointer(aOffset, 2, gl.FLOAT, false, stride, 0);
  gl.vertexAttribDivisor(aOffset, 1); // per instance

  // a_size (float) at offset 8
  const aSize = gl.getAttribLocation(program, 'a_size');
  gl.enableVertexAttribArray(aSize);
  gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, stride, 8);
  gl.vertexAttribDivisor(aSize, 1);

  // a_alpha (float) at offset 12
  const aAlpha = gl.getAttribLocation(program, 'a_alpha');
  gl.enableVertexAttribArray(aAlpha);
  gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, stride, 12);
  gl.vertexAttribDivisor(aAlpha, 1);

  // a_color (vec4) at offset 16
  const aColor = gl.getAttribLocation(program, 'a_color');
  gl.enableVertexAttribArray(aColor);
  gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, stride, 16);
  gl.vertexAttribDivisor(aColor, 1);

  // Resolution uniform
  const uResolution = gl.getUniformLocation(program, 'u_resolution');

  return {
    gl,
    program,
    instanceBuffer,
    uResolution,
    render(pool: Particle[], width: number, height: number) {
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Fill instance buffer
      let count = 0;
      for (const p of pool) {
        if (!p.active) continue;
        const base = count * FLOATS_PER_INSTANCE;
        instanceData[base]     = p.x;
        instanceData[base + 1] = p.y;
        instanceData[base + 2] = p.size;
        instanceData[base + 3] = p.alpha;
        // Color: if stored as [r,g,b,a] normalized 0..1
        const c = p.color as [number, number, number, number];
        instanceData[base + 4] = c[0];
        instanceData[base + 5] = c[1];
        instanceData[base + 6] = c[2];
        instanceData[base + 7] = c[3];
        count++;
        if (count >= MAX_PARTICLES) break;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceData.subarray(0, count * FLOATS_PER_INSTANCE));

      // Draw all particles in one call
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    },
    destroy() {
      gl.deleteBuffer(quadBuffer);
      gl.deleteBuffer(instanceBuffer);
      gl.deleteProgram(program);
    },
  };
}
```

## Shader Compilation Helper

```typescript
function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  // Shaders can be deleted after linking
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}
```

## Additive Blending for Fire/Glow Effects

Replace the standard blend function with:
```typescript
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
```

This causes overlapping bright particles to intensify rather than occlude, creating the characteristic glow of fire, sparks, and energy effects. Switch back to `ONE_MINUS_SRC_ALPHA` for standard transparency.

## Texture Atlas for Custom Shapes

For particles beyond circles (stars, snowflakes, sprites), use a texture atlas:

1. Load a sprite sheet texture with multiple particle shapes arranged in a grid
2. Add a `a_texIndex` per-instance attribute that selects which sprite to use
3. In the fragment shader, compute UV coordinates into the atlas based on the index
4. Sample the texture instead of using the SDF circle

```glsl
// Fragment shader with texture atlas
uniform sampler2D u_atlas;
uniform float u_atlasSize; // e.g., 4.0 for a 4x4 grid

in float v_texIndex;
in vec2 v_uv;

void main() {
  float col = mod(v_texIndex, u_atlasSize);
  float row = floor(v_texIndex / u_atlasSize);
  vec2 atlasUV = (vec2(col, row) + v_uv) / u_atlasSize;
  vec4 texColor = texture(u_atlas, atlasUV);
  fragColor = texColor * v_color * vec4(1.0, 1.0, 1.0, v_alpha);
}
```

## Performance Notes

- **50,000 particles** at 60fps is achievable on most desktop GPUs with this setup
- **Mobile GPUs**: Target 10,000-20,000 particles. Reduce MAX_PARTICLES based on device capability
- **Buffer upload** (`bufferSubData`) is the main CPU-side bottleneck. Using `subarray` to upload only the active portion helps
- **VAO** (Vertex Array Object): Wrap the attribute setup in a VAO to avoid re-binding every frame. WebGL2 supports VAOs natively
- **Double buffering**: For very high particle counts, use two instance buffers and alternate — fill one while the GPU reads the other. This is only needed at 100k+ particles
