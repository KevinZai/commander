# Most-starred skills chart: license check (2026-11-18)

Linear: CC-2133 (parent). Kevin shared a chart of the 15 most-starred Claude skill repositories. Ten were already handled by the X scan (`docs/addons/x-scan-2026-11-18.md`, on the batch E branch) or are vendored. This file covers the five that were new. Each license was read from the repository's own LICENSE file and its git history on 2026-11-18.

## Taken (batch F)

| Repository | License | What Commander took | Where |
|---|---|---|---|
| cloudflare/security-audit-skill | MIT, Copyright (c) 2025-2026 Cloudflare, Inc. | The single `security-audit` skill with its references, JSON schema and validators, renamed `cloudflare-security-audit`; body unchanged | `skills/ccc-security/cloudflare-security-audit/`, routed from `/ccc-security` as the deep source-first audit |
| Egonex-AI/Understand-Anything | MIT, Copyright (c) 2026 Yuxiang Lin | A mention only; it overlaps codebase-memory-mcp and graphify | `/ccc-suggest` third-party list, Code map row |

## Already in Commander

| Repository | Finding | Action |
|---|---|---|
| JuliusBrussee/caveman | Commander's `skills/caveman` derives from the MIT-era upstream. Upstream was MIT from `af5375d` (2026-04-04) and was relicensed to Apache-2.0 by `921eab8` on 2026-09-24. | Closest source is upstream `af5375d` (about a fifth of lines match; the rest is Commander's own). Added the MIT text as `skills/caveman/LICENSE.txt` and a NOTICE section pinning that commit. The skill is not synced to the Apache-2.0 text; doing that needs an Apache NOTICE section first, which is Kevin's call. |
| Graphify-Labs/graphify | The repository formerly at safishamsi/graphify. Commander's pinned commit `a9860f7` exists there. License is Apache-2.0, already covered by NOTICE. | The submodule URL update belongs to the upstream sync work, not this batch. |

## Refused

| Repository | Reason |
|---|---|
| tt-a1i/archify | Apache-2.0. Not MIT, and it overlaps `diagram-design` and `/ccc-xray`. Nothing taken. |
| Understand-Anything source | Not vendored: it is a full plugin with its own dashboard and build, and Commander already has two code-graph options. |
