# jezweb-pack decisions

Three workflow skills cherry-picked from one MIT catalog, from the 2026-11-19 skill-hub scan (`docs/addons/skill-hub-scan-2026-11-19.md`). Gaps were checked by name and by content across `skills/` and `commander/cowork-plugin/` before each pick.

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

## Skipped

| Candidate | Reason |
|---|---|
| vite-flare-starter | Wraps the author's own template: clones it unpinned, runs `pnpm install`, creates Cloudflare resources, sets secrets and deploys; it also cites a `setup.sh` the skill does not ship. |
| mcp-builder | Overlaps `skills/engineering-pack/mcp-server-builder` and `skills/mcp-server-patterns`; its examples load `.env` with `load_dotenv` and install unpinned pip packages. |
| gws-setup | Unpinned `npm -g` install; `npx skills add --all` installs every skill from a third-party catalog (90+); requests the full OAuth scope set; asks for secrets in chat; `gws auth export` prints the refresh token. |
| gws-install | A thin subset of gws-setup with the same problems. |
| elevenlabs-agents | Copied in the first version of this pack, then removed. Its upstream examples needed rewrites across CLI targeting (the current `@elevenlabs/cli` has no `--env`, and `agents add` and `tests add` write to the workspace at once), CI (writes and metered test runs on every push), the signed-URL route (unauthenticated, wrong HTTP method), webhook verification (re-serialised body, no timestamp check, no rejection) and SDK shapes (hook API, client tools, a removed simulation method). After two Codex review rounds on #301 still found High findings, it was dropped rather than shipped half-fixed. Revisit if upstream fixes these. |
| color-palette | Overlaps `skills/product-pack/ui-design-system`, `skills/ccc-saas/tailwind-v4` and `skills/ccc-saas/shadcn-ui`. |

## Edits to upstream content

Every copied file is byte-identical to upstream except for: added lines starting "CCC safety:", the appended Next step and Source sections, and the upstream lines replaced in "Changed upstream examples" below. Each replaced example has a "CCC safety:" line beside it saying what changed and why.

- All three: `## Next step` (pack convention, as on every other pack sub-skill) and `## Source` sections appended.
- `google-apps-script`: "CCC safety:" lines at Step 3 (step 3 erases editor code: only after the user approves, otherwise add a new file), at Step 4 (the "Advanced > Go to (unsafe) > Allow" click-through only for a script the user or their organisation wrote and read), before the trigger recipes (copy first, user says go), before Email from Sheets (covers the PDF export below it too), at PDF Export (confirmed recipient), at External API Calls (confirm endpoint and data), at Auto-Archive (rewritten, below; plus a line asking that nobody else edits the sheets mid-run), at Error Handling (confirm endpoint, key in Script Properties) and before the Batch Email Sender (test on a copy, user confirms recipients).
- `favicon-gen`: "CCC safety:" lines after the ImageMagick install hint (ask before `brew` or `apt`) and the favicon.io fallback (no upload without the user's say-so); in `references/format-guide.md` above the online converters, after the file-placement list (WordPress upload: confirm site and destination) and at Validation Tools; in `references/extraction-methods.md` above SVGO (both the global install and `npx` download code: ask first; install line pinned to `svgo@4.1.0`), at Technical Tests and at Tools Reference (online services only with the user's say-so).
- `icon-set-generator`: no change beyond the two appended sections.

### Changed upstream examples (2026-11-19, after the Codex review of #301)

| File and section | Upstream | Now | Why |
|---|---|---|---|
| `google-apps-script/SKILL.md`, Auto-Archive Completed Rows | "Move rows" description; `appendRow(values)` then `deleteRow`, row by row, no prompt | "Copy rows" description; copies whole rows with `copyTo` (values, formulas, formats), deletes nothing, holds a document lock, writes each run to a new `Archive <timestamp>` sheet, re-checks each source row against the snapshot before copying (skipping and reporting changed rows), and ends with a toast telling the user to remove the archived rows by hand | Upstream lost formulas and formatting and deleted with no confirmation. A confirm-then-delete version was also unsafe: Codex reproduced rows moving while the dialog was open, so the stored row numbers pointed at other rows. A later Codex pass showed the copy-only version could still copy a moved row or overwrite a concurrent Archive append, hence the re-check and the per-run output sheet (reserving blank rows in a shared Archive did not stop an append landing on them) |
| `favicon-gen/references/extraction-methods.md`, SVGO | `npm install -g svgo` | `npm install -g svgo@4.1.0` | Unpinned global install |

## Install-safety sweep (2026-11-19)

The install-safety sweep used for the MIT add-on batches (`install-sweep.py`, kept with the batch review notes outside this repository; it flags unpinned `npx`, package installs without exact versions, `latest` and undigested images, download-and-execute, moving manifest URLs, remote `kubectl apply` and `helm plugin install`, dotenv loading, secrets in argv) was run over every copied file. A wider grep added `brew`, `apt`, online converters and uploads. These results cover the three skills that remain.

| Hit | File | Handling |
|---|---|---|
| `npm install -g svgo` | `favicon-gen/references/extraction-methods.md` | Pinned in place to `svgo@4.1.0`; the CCC safety line gates both it and `npx` on the user's go-ahead |
| `brew install imagemagick` / `apt install imagemagick` | `favicon-gen/SKILL.md` | CCC safety line: ask before installing |
| favicon.io, realfavicongenerator.net, cloudconvert.com uploads | `favicon-gen/SKILL.md`, `references/format-guide.md` | CCC safety lines: no upload without the user's say-so. The tools table in `extraction-methods.md` has its own CCC safety line at Tools Reference |

No other hits: no `latest` tags, images, download-and-execute, `.env` loading or remote manifests in the three remaining skills.

## Upstream notes (logged, not fixed)

- `favicon-gen`: the commands use ImageMagick 6 `convert`; ImageMagick 7 uses `magick` and warns that `convert` is deprecated.

## Not changed

`skills/_tiers.json` is untouched: the pack is opt-in, installed by the full tier or `ccc --skills install jezweb-pack`. `commander/scripts/copied-content.json` is unchanged, as for the other packs: it lists single copied files, and pack licenses are tracked here and in NOTICE.md.
