# jezweb-pack decisions

Four workflow skills cherry-picked from one MIT catalog, from the 2026-11-19 skill-hub scan (`docs/addons/skill-hub-scan-2026-11-19.md`). Gaps were checked by name and by content across `skills/` and `commander/cowork-plugin/` before each pick.

## Source (pinned)

| Source | Commit | License copy |
|---|---|---|
| [jezweb/claude-skills](https://github.com/jezweb/claude-skills) | `1260fa7439b36b18dbf16648ccc7fb44783f6c23` | `licenses/jezweb_claude-skills-LICENSE.txt` and `LICENSE.txt` in each sub-skill folder |

License check: the repository LICENSE is MIT, Copyright (c) 2025 Jeremy Dawes (Jezweb), checked against the clone at the pinned commit; the copies here are byte-identical. The plugin manifests (`plugins/integrations`, `plugins/design-assets`) and the skills' frontmatter declare no other license, so the repository license covers them.

## Added

| Skill | Upstream path | Why it is new |
|---|---|---|
| google-apps-script | `plugins/integrations/skills/google-apps-script/` | No Apps Script or Google Sheets automation skill; Workspace is only a connector in `/ccc-connect`. |
| favicon-gen | `plugins/design-assets/skills/favicon-gen/` | No favicon or web-manifest skill; `ccc-design` covers pages, systems and motion, not icon packages. |
| icon-set-generator | `plugins/design-assets/skills/icon-set-generator/` | No custom SVG icon-set skill; design skills reach for icon libraries. |
| elevenlabs-agents | `plugins/integrations/skills/elevenlabs-agents/` | No voice-agent or ElevenLabs skill. |

## Skipped

| Candidate | Reason |
|---|---|
| vite-flare-starter | Wraps the author's own template: clones it unpinned, runs `pnpm install`, creates Cloudflare resources, sets secrets and deploys; it also cites a `setup.sh` the skill does not ship. |
| mcp-builder | Overlaps `skills/engineering-pack/mcp-server-builder` and `skills/mcp-server-patterns`; its examples load `.env` with `load_dotenv` and install unpinned pip packages. |
| gws-setup | Unpinned `npm -g` install; `npx skills add --all` installs every skill from a third-party catalog (90+); requests the full OAuth scope set; asks for secrets in chat; `gws auth export` prints the refresh token. |
| gws-install | A thin subset of gws-setup with the same problems. |
| color-palette | Overlaps `skills/product-pack/ui-design-system`, `skills/ccc-saas/tailwind-v4` and `skills/ccc-saas/shadcn-ui`. |

## Omitted files

From `elevenlabs-agents`, seven upstream files are not copied:

- `references/compliance-guide.md` (GDPR, HIPAA, PCI DSS and data-residency settings presented as compliance; Commander has not verified them and does not ship them as assurance)
- `assets/javascript-sdk-boilerplate.js`, `assets/react-sdk-boilerplate.tsx`, `assets/react-native-boilerplate.tsx`, `assets/swift-sdk-boilerplate.swift` (SDK boilerplates that drift with each SDK release; the SKILL.md keeps the minimal React hook example)
- `assets/widget-embed-template.html` (loads an unversioned remote widget script, `https://elevenlabs.io/convai-widget/index.js`, into a page)
- `assets/ci-cd-example.yml` (unpinned action and global CLI install; the SKILL.md keeps its inline example behind a CCC safety line)

## Edits to upstream content

- All four: `## Next step` (pack convention, as on every other pack sub-skill) and `## Source` sections appended.
- `google-apps-script`: "CCC safety:" lines at Step 4 (the "Advanced > Go to (unsafe) > Allow" click-through only for a script the user or their organisation wrote and read), before the trigger recipes (copy first, user says go), before Email from Sheets (covers the PDF export below it too) before the Batch Email Sender (test on a copy, user confirms recipients), before the install steps (replacing editor code discards it), at PDF Export (confirmed recipient) and at External API Calls (confirm endpoint and data).
- `favicon-gen`: "CCC safety:" lines after the ImageMagick install hint (ask before `brew` or `apt`) and the favicon.io fallback (no upload without the user's say-so); in `references/format-guide.md` above the online converters; in `references/format-guide.md` at Validation Tools; in `references/extraction-methods.md` above the global SVGO install (ask first, pinned `svgo@4.1.0`), at Technical Tests and at Tools Reference (online services only with the user's say-so).
- `elevenlabs-agents`: "CCC safety:" lines above the package installs (ask first, exact versions; names `@elevenlabs/cli` as the current CLI), after the client tools (`navigate` same-origin only), after the MCP server sample (`cors({ origin: '*' })`), above the inline CI YAML (unpinned upstream example) at Step 7, the multi-environment block and the CLI Quick Reference (prod push only after a dry run is shown and the user says go), at Step 4 (knowledge-base uploads), and at the top of `references/api-reference.md` (write and delete calls need the user's go-ahead). Step 5 no longer points at the omitted boilerplates and widget template; "Optional References" drops `compliance-guide.md`; "Asset Files" drops the six omitted assets. No other line changed.
- `icon-set-generator`: no change beyond the two appended sections.

CLI package check (npm registry, 2026-11-19): `@elevenlabs/agents-cli` 0.6.1 is deprecated ("migrate to ElevenLabs CLI") and installs an `agents` binary; `@elevenlabs/cli` 1.12.2 installs the `elevenlabs` binary that every command in the skill uses. The upstream install lines are kept as written and corrected by the CCC safety line above them.

## Install-safety sweep (2026-11-19)

The install-safety sweep used for the MIT add-on batches (`install-sweep.py`, kept with the batch review notes outside this repository; it flags unpinned `npx`, package installs without exact versions, `latest` and undigested images, download-and-execute, moving manifest URLs, remote `kubectl apply` and `helm plugin install`, dotenv loading, secrets in argv) was run over every copied file. A wider grep added non-global `npm install`, `brew`, `apt`, online converters, uploads, CORS and redirects.

| Hit | File | Handling |
|---|---|---|
| `npm install -g @elevenlabs/agents-cli` (unpinned, deprecated) | `elevenlabs-agents/SKILL.md` | CCC safety line above the block: ask first, `@elevenlabs/cli@1.12.2` as a project dev dependency |
| `npm install @elevenlabs/react` and three more SDKs (no versions) | `elevenlabs-agents/SKILL.md` | Same line: exact versions named |
| `npm install -g @elevenlabs/cli` in CI YAML | `elevenlabs-agents/SKILL.md` | CCC safety line above the YAML: upstream example, pin action SHA and CLI version |
| `npm install -g svgo` | `favicon-gen/references/extraction-methods.md` | CCC safety line: ask first, `svgo@4.1.0` |
| `brew install imagemagick` / `apt install imagemagick` | `favicon-gen/SKILL.md` | CCC safety line: ask before installing |
| favicon.io, realfavicongenerator.net, cloudconvert.com uploads | `favicon-gen/SKILL.md`, `references/format-guide.md` | CCC safety lines: no upload without the user's say-so. The tools table in `extraction-methods.md` only names the services and is covered by the router rule |
| `curl -H "xi-api-key: YOUR_API_KEY"` | `elevenlabs-agents/references/api-reference.md` | Placeholder, no secret; left as is, covered by the router rule (never print keys) |
| `{{secret__...}}` webhook headers, `process.env.ELEVENLABS_API_KEY`, `${{ secrets.ELEVENLABS_API_KEY }}` | `elevenlabs-agents` | Secrets stay out of code and argv; no change |

No `latest` tags, images, download-and-execute, dotenv loading or remote manifests were found.

## Upstream notes (logged, not fixed)

- `elevenlabs-agents/SKILL.md` (Post-Call Webhook) and `references/api-reference.md` (Verification): the HMAC example signs `JSON.stringify(request.body)`, a re-serialisation of the parsed body rather than the raw bytes received, so a valid signature can fail; it compares with `!==` instead of a constant-time comparison (`crypto.timingSafeEqual`). Verify against the raw body and the header format ElevenLabs documents.
- `favicon-gen`: the commands use ImageMagick 6 `convert`; ImageMagick 7 uses `magick` and warns that `convert` is deprecated.
- The deprecated `@elevenlabs/agents-cli` install line (see above) should become `@elevenlabs/cli` upstream.

## Not changed

`skills/_tiers.json` is untouched: the pack is opt-in, installed by the full tier or `ccc --skills install jezweb-pack`. `commander/scripts/copied-content.json` is unchanged, as for the other packs: it lists single copied files, and pack licenses are tracked here and in NOTICE.md.
