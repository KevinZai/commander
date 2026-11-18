# threejs-pack: decisions and upstream notes

Upstream: [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) at `0e181866f095b5f06d005133876e926515390d95`, MIT (see [LICENSE.txt](LICENSE.txt)). All 13 upstream skills were taken; none overlaps a Commander skill closely enough to skip. The router (`SKILL.md`) is Commander's own and is reached from `skills/ccc-design`.

## Commander changes

| Skill | Change | Why |
|---|---|---|
| threejs-asset-pipeline | CLIs pinned (`@gltf-transform/cli@4.5.1`, `gltfjsx@6.5.3`), installed once as exact dev dependencies and run with `npx --no-install` | A cold `npx` fetches whatever the registry serves, with no lockfile. `--no-install` stops instead of downloading |
| threejs-asset-pipeline | KTX-Software is checked with `ktx --version`, never downloaded from the session | Upstream said "install 4.4.0 or newer" with no source or verification |
| threejs-interaction | Selection coordinates normalized to the canvas; box selection listens on the canvas and runs only after a drag that started there | Upstream used window coordinates and selected on every document pointer-up |
| threejs-loaders | `revokeObjectURL` moved into `finally` | Upstream leaked the blob URL when decoding failed |
| router | `ccc-design` is read only if it exists beside the pack | A standalone pack install may not have it |

Each child keeps its upstream text otherwise, a `LICENSE.txt`, and a Source section naming its upstream path.

## Install-safety sweep (2026-11-18)

Every added command was checked for unpinned `npx`, package installs without exact versions, `:latest` images, download-and-execute, moving manifest URLs, dotenv loading and secrets in argv. The only hits were the asset-pipeline CLIs and KTX-Software above.

## Upstream notes

Not changed here; report upstream if they matter.

- The examples target three.js r186. Code for older releases may need changes, especially the WebGPU and TSL sections.
