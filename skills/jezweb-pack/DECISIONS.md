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
- `assets/ci-cd-example.yml` (unpinned action and global CLI install; the SKILL.md keeps a rewritten, manually triggered inline example)

## Edits to upstream content

Every copied file is byte-identical to upstream except for: added lines starting "CCC safety:", the appended Next step and Source sections, the elevenlabs-agents pointer edits for the omitted files, and the upstream lines replaced or removed in "Changed upstream examples" below. Each replaced or removed example has a "CCC safety:" line beside it saying what changed and why.

- All four: `## Next step` (pack convention, as on every other pack sub-skill) and `## Source` sections appended.
- `google-apps-script`: "CCC safety:" lines at Step 3 (step 3 erases editor code: only after the user approves, otherwise add a new file), at Step 4 (the "Advanced > Go to (unsafe) > Allow" click-through only for a script the user or their organisation wrote and read), before the trigger recipes (copy first, user says go), before Email from Sheets (covers the PDF export below it too), at PDF Export (confirmed recipient), at External API Calls (confirm endpoint and data), at Auto-Archive (rewritten, below) and before the Batch Email Sender (test on a copy, user confirms recipients).
- `favicon-gen`: "CCC safety:" lines after the ImageMagick install hint (ask before `brew` or `apt`) and the favicon.io fallback (no upload without the user's say-so); in `references/format-guide.md` above the online converters, after the file-placement list (WordPress upload: confirm site and destination) and at Validation Tools; in `references/extraction-methods.md` above SVGO (both the global install and `npx` download code: ask first; install line pinned to `svgo@4.1.0`), at Technical Tests and at Tools Reference (online services only with the user's say-so).
- `elevenlabs-agents`: "CCC safety:" lines above the package installs (rewritten, below), after the client tools (`navigate` same-origin only), after the MCP server sample (`cors({ origin: '*' })`), at Step 4 (knowledge-base uploads), at every rewritten or removed example below, and on each write call in `references/api-reference.md` (top of file, delete agent, upload, RAG index, tool creation, testing). Step 5 no longer points at the omitted boilerplates and widget template; "Optional References" drops `compliance-guide.md`; "Asset Files" drops the six omitted assets.
- `icon-set-generator`: no change beyond the two appended sections.

### Changed upstream examples (2026-11-19, after the Codex review of #301)

Facts were checked against the npm packages pinned in the skill, read from their tarballs and not executed: `@elevenlabs/cli` 1.12.2 (README), `@elevenlabs/elevenlabs-js` 2.79.0, `@elevenlabs/react` 1.23.1 and `@elevenlabs/client` 1.37.1 (sources and type definitions). The ElevenLabs docs site was not reachable from the session (proxy 403), so the webhook header name and anything not in those packages is marked unverified where it is used.

| File and section | Upstream | Now | Why |
|---|---|---|---|
| `google-apps-script/SKILL.md`, Auto-Archive Completed Rows | `appendRow(values)` then `deleteRow`, row by row, no prompt | Lists matching rows, previews them in a YES/NO alert, copies whole rows with `copyTo` (values, formulas, formats), then deletes bottom-up | Upstream lost formulas and formatting and deleted with no confirmation |
| `elevenlabs-agents/SKILL.md`, Step 1 CLI block | `agents push --env dev` | `agents push --agent <agent_id> --dry-run`, then the same target without `--dry-run`; comment that `agents add` uploads | 1.12.2 has no `--env`; `add` writes remotely; push without `--agent` overwrites every registered agent |
| `elevenlabs-agents/SKILL.md`, Step 4 | `POST /v1/convai/knowledge-base/upload` | `POST /v1/convai/knowledge-base/file` | The path the SDK calls |
| `elevenlabs-agents/SKILL.md`, Step 5 React | `useConversation({ agentId, signedUrl: '/api/elevenlabs/auth', ... })` returning `startConversation`/`stopConversation` | `useConversation` inside `ConversationProvider`; fetch the signed URL from the authenticated route; `startSession({ signedUrl })` | The hook returns `startSession`/`endSession`; `agentId` and `signedUrl` are mutually exclusive; `signedUrl` must be the URL itself |
| `elevenlabs-agents/SKILL.md`, Step 6 CLI tests | `agents test "Support Agent"` | `agents test <agent_id>`, with approval before `tests add` (uploads) and test runs | 1.12.2 takes the agent id |
| `elevenlabs-agents/SKILL.md`, Step 6 API simulation | `client.agents.simulate({...})` | Removed; points to `agents test` | No such method; `simulateConversation` is deprecated with removal on 31 Oct 2026 |
| `elevenlabs-agents/SKILL.md`, Step 6 CI | `on: [push, pull_request]`, `actions/checkout@v3`, `npm install -g @elevenlabs/cli`, agent by name | `workflow_dispatch` with an `agent_id` input passed through `env`, checkout pinned to the SHA Commander's `ci.yml` uses, `@elevenlabs/cli@1.12.2`, `permissions: contents: read` | Upstream wrote to and ran metered tests on the workspace on every push and pull request |
| `elevenlabs-agents/SKILL.md`, Step 7 | `push --env prod --dry-run` / `push --env prod`, plus a dev/staging/prod block | `push --agent <agent_id> --branch <branch> --dry-run`, then the same target; environment block removed | No `--env` in 1.12.2; dry run and deploy must name the same target. Which branch serves live traffic was not verified |
| `elevenlabs-agents/SKILL.md`, Signed URLs | Unauthenticated route; `POST` with a JSON body; no response check | `requireUser` plus an agent-access check; server-chosen agent; `GET ...get-signed-url?agent_id=`; 502 on upstream failure; returns `signedUrl` only, `no-store` | Anyone could mint signed URLs; the SDK calls this endpoint as `GET` with a query parameter |
| `elevenlabs-agents/SKILL.md`, Post-Call Webhook and `references/api-reference.md`, Verification | HMAC of `JSON.stringify(body)`, `!==`, rejection left as a comment | Express raw body, `elevenlabs.webhooks.constructEvent(raw, header, secret)`, 401 before processing | The SDK helper verifies `t=...,v0=...` over `timestamp.rawBody` with a 30-minute window. It still compares with `!==` (logged below). Header name `elevenlabs-signature` is upstream's, unverified |
| `elevenlabs-agents/SKILL.md`, CLI Quick Reference | `auth login`, `--env` pushes, `agents widget "Name"`, `tools add-webhook`, `agents test "Name"` | The 1.12.2 commands from its README, with remote writes marked | Those upstream commands are not in the 1.12.2 README's command list |
| `references/api-reference.md`, Authentication | `curl -H "xi-api-key: YOUR_API_KEY" ...` | Server-side `fetch` with the key from the environment | A key on a command line leaks through shell history and the process list |
| `references/api-reference.md`, Upload Document | `POST /knowledge-base/upload` | `POST /knowledge-base/file` | The path the SDK calls; the response example is upstream's, unverified |
| `elevenlabs-agents/SKILL.md`, Packages | Unpinned SDK installs; `npm install -g @elevenlabs/agents-cli` | Exact versions with `--save-exact`; `@elevenlabs/cli@1.12.2` as a dev dependency | Unpinned installs, and the CLI package was deprecated and installs a different command |
| `favicon-gen/references/extraction-methods.md`, SVGO | `npm install -g svgo` | `npm install -g svgo@4.1.0` | Unpinned global install |
| `references/api-reference.md`, Simulate Conversation | Full section (`POST /agents/:agent_id/simulate`) | Removed; a CCC safety line points to agent tests | Wrong path, and the real endpoint is deprecated for removal on 31 Oct 2026; it could not be made accurate with a small edit |

`references/api-reference.md` keeps upstream's `POST /tools/webhook` with a CCC safety line: the SDK uses `POST /tools` with a `tool_config` body, and the flat upstream body was not checked against it.

CLI package check (npm registry, 2026-11-19): `@elevenlabs/agents-cli` 0.6.1 is deprecated ("migrate to ElevenLabs CLI") and installs an `agents` binary; `@elevenlabs/cli` 1.12.2 installs the `elevenlabs` binary that every command in the skill uses. The upstream install lines are replaced with exact-version installs of the current packages (Packages row in the table above).

## Install-safety sweep (2026-11-19)

The install-safety sweep used for the MIT add-on batches (`install-sweep.py`, kept with the batch review notes outside this repository; it flags unpinned `npx`, package installs without exact versions, `latest` and undigested images, download-and-execute, moving manifest URLs, remote `kubectl apply` and `helm plugin install`, dotenv loading, secrets in argv) was run over every copied file. A wider grep added non-global `npm install`, `brew`, `apt`, online converters, uploads, CORS and redirects.

| Hit | File | Handling |
|---|---|---|
| `npm install -g @elevenlabs/agents-cli` (unpinned, deprecated) | `elevenlabs-agents/SKILL.md` | Replaced by `npm install --save-dev --save-exact @elevenlabs/cli@1.12.2`; ask first |
| `npm install @elevenlabs/react` and three more SDKs (no versions) | `elevenlabs-agents/SKILL.md` | Pinned in place with `--save-exact` to the versions current on 2026-11-19; ask first |
| `npm install -g @elevenlabs/cli` in CI YAML | `elevenlabs-agents/SKILL.md` | YAML rewritten: manual trigger, `@elevenlabs/cli@1.12.2`, checkout pinned by SHA |
| `npm install -g svgo` | `favicon-gen/references/extraction-methods.md` | Pinned in place to `svgo@4.1.0`; the CCC safety line gates both it and `npx` on the user's go-ahead |
| `brew install imagemagick` / `apt install imagemagick` | `favicon-gen/SKILL.md` | CCC safety line: ask before installing |
| favicon.io, realfavicongenerator.net, cloudconvert.com uploads | `favicon-gen/SKILL.md`, `references/format-guide.md` | CCC safety lines: no upload without the user's say-so. The tools table in `extraction-methods.md` only names the services and is covered by the router rule |
| `curl -H "xi-api-key: YOUR_API_KEY"` | `elevenlabs-agents/references/api-reference.md` | Rewritten as server-side code reading the key from the environment (key on a command line leaks via history and argv) |
| `{{secret__...}}` webhook headers, `process.env.ELEVENLABS_API_KEY`, `${{ secrets.ELEVENLABS_API_KEY }}` | `elevenlabs-agents` | Secrets stay out of code and argv; no change |

No `latest` tags, images, download-and-execute, dotenv loading or remote manifests were found.

## Upstream notes (logged, not fixed)

- The webhook examples now use the SDK's `webhooks.constructEvent`, which compares the hash with `!==` rather than in constant time and checks only that the timestamp is not older than 30 minutes (no future bound). Report upstream to ElevenLabs if that matters; the manual alternative is `crypto.timingSafeEqual` over the HMAC of `timestamp.rawBody`.
- `elevenlabs-agents` Step 3: the client tools use a `{ description, parameters, handler }` shape, but `@elevenlabs/react` 1.23.1 types `clientTools` as plain functions keyed by tool name, with the description and parameters configured on the agent. Not rewritten here.
- `favicon-gen`: the commands use ImageMagick 6 `convert`; ImageMagick 7 uses `magick` and warns that `convert` is deprecated.
- The deprecated `@elevenlabs/agents-cli` install line (see above) should become `@elevenlabs/cli` upstream.

## Not changed

`skills/_tiers.json` is untouched: the pack is opt-in, installed by the full tier or `ccc --skills install jezweb-pack`. `commander/scripts/copied-content.json` is unchanged, as for the other packs: it lists single copied files, and pack licenses are tracked here and in NOTICE.md.
