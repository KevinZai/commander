---
name: threejs-pack
description: "Optional pack of 13 MIT-licensed Three.js skills: scene setup, geometry, materials, lighting, textures, loaders, animation, shaders, post-processing, interaction, performance, asset pipeline and React Three Fiber. Use when building 3D web experiences, WebGL or WebGPU scenes, Three.js code, React Three Fiber apps, or custom shaders."
---

# threejs-pack — Three.js skills, routed

**CC Commander** · threejs-pack · optional pack from CloudAI-X/threejs-skills (MIT, see LICENSE.txt). Load only the sub-skill the task needs; each lives in its own folder here.

## Sub-skills

| Sub-skill | Use when |
|---|---|
| `threejs-fundamentals/` | Starting a scene: scene, camera, renderer, tone mapping, animation loop, transforms, cleanup |
| `threejs-geometry/` | Building shapes, 3D text, buffer attributes, instancing, batching, points and lines |
| `threejs-materials/` | Choosing PBR, toon, unlit or node materials; blending, stencil, environment response |
| `threejs-lighting/` | Adding or tuning lights, shadows, HDR environments, light probes |
| `threejs-textures/` | Image maps, color spaces, UVs, render targets, texture memory |
| `threejs-loaders/` | Loading glTF, textures, HDR and EXR; caching, cloning, disposal |
| `threejs-animation/` | Keyframe, skeletal and morph animation, clip mixing, procedural motion |
| `threejs-shaders/` | Custom GLSL, shader chunks, extending materials, TSL node materials |
| `threejs-postprocessing/` | Bloom, depth of field, ambient occlusion, custom screen effects |
| `threejs-interaction/` | Raycasting, picking, camera controls, gizmos, drag and selection |
| `threejs-performance/` | Frame-rate and memory work: draw calls, LOD, fill rate, shader stalls |
| `threejs-asset-pipeline/` | Shrinking glTF assets with gltf-transform, Draco, meshopt, KTX2 |
| `threejs-react-three-fiber/` | React Three Fiber and drei: JSX scene graph, hooks, pointer events |

## How to use

1. Identify the task from the table; read that sub-skill's `SKILL.md` and follow its examples.
2. Chain neighbours when needed: loaders then asset-pipeline for heavy models, materials then lighting then textures for look work, any visual feature then performance before shipping.
3. For page-level design, motion or polish around the 3D canvas, route through `${CLAUDE_SKILL_DIR}/../ccc-design/SKILL.md` if that file exists. A standalone pack install may not have it: then say `ccc-design` is not installed and keep to the 3D sub-skills.

## Next step

- 🟢 Fundamentals: sets up the scene, renderer and loop with the matching sub-skill
- Pick a sub-skill: shows the table above and asks which one to load
- Performance check: runs `threejs-performance` on an existing scene
- Done: you continue manually
