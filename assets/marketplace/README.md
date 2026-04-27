# CC Commander — Marketplace Assets

Assets for the Codex Desktop plugin marketplace listing (v4.2 target).

## Asset manifest

| File | Manifest field | Dimensions | Format | Status |
|---|---|---|---|---|
| `composer-icon.svg` | `interface.composerIcon` | 64×64 | SVG (single-color glyph) | Ready (SVG); PNG export needed |
| `logo.svg` | `interface.logo` | 256×256 | SVG (full logo) | Ready (SVG); PNG export needed |
| `PRIVACY.md` | `interface.privacyPolicyURL` | — | Markdown → hosted at `/privacy` | Stub ready |
| screenshots (6) | `interface.screenshots[]` | 1280×720 px | PNG | See `docs/marketing/screenshots/` |

## Screenshot source files

Six screenshots are already captured in `docs/marketing/screenshots/`:

| File | Marketplace slot | Content |
|---|---|---|
| `codex-1-hero.png` | `screenshots[0]` | Hero / main workflow view |
| `codex-2-architecture-diagram.png` | `screenshots[1]` | Brain+hands architecture diagram |
| `codex-3-spec-convergence-timeline.png` | `screenshots[2]` | Spec convergence timeline |
| `codex-4-fleet-orchestration.png` | `screenshots[3]` | Fleet orchestration dispatch |
| `codex-5-before-after.png` | `screenshots[4]` | Before/after productivity comparison |
| `codex-6-cross-platform-marketplace.png` | (optional 6th) | Cross-platform marketplace view |

Codex Desktop marketplace accepts up to 5 screenshots. Use slots 0–4 (drop slot 5 or use as
alternate). Run `node scripts/marketplace-screenshot-capture.js` to verify dimensions and
copy processed PNGs here.

## Plugin manifest wiring

Add these fields to `commander/cowork-plugin-codex/manifest.template.json` under `interface`:

```json
"composerIcon": "./assets/marketplace/composer-icon.png",
"logo":         "./assets/marketplace/logo.png",
"screenshots": [
  "./assets/marketplace/screenshot-1.png",
  "./assets/marketplace/screenshot-2.png",
  "./assets/marketplace/screenshot-3.png",
  "./assets/marketplace/screenshot-4.png",
  "./assets/marketplace/screenshot-5.png"
],
"privacyPolicyURL":   "https://cc-commander.com/privacy",
"termsOfServiceURL":  "https://cc-commander.com/terms"
```

Note: Codex Desktop marketplace resolves paths relative to the plugin root. The build script
(`scripts/build-codex.js`) must copy `assets/marketplace/` into
`commander/cowork-plugin-codex/assets/marketplace/` during the build step.

## SVG → PNG export (required before submission)

Codex Desktop marketplace likely requires PNG, not SVG, for `composerIcon` and `logo`.
Export with any of:

```sh
# Using Inkscape (CLI)
inkscape --export-type=png --export-width=64  assets/marketplace/composer-icon.svg -o assets/marketplace/composer-icon.png
inkscape --export-type=png --export-width=256 assets/marketplace/logo.svg           -o assets/marketplace/logo.png

# Using rsvg-convert (brew install librsvg)
rsvg-convert -w 64  assets/marketplace/composer-icon.svg -o assets/marketplace/composer-icon.png
rsvg-convert -w 256 assets/marketplace/logo.svg           -o assets/marketplace/logo.png

# Using sharp (Node)
node -e "const sharp=require('sharp'); sharp('assets/marketplace/composer-icon.svg').resize(64).png().toFile('assets/marketplace/composer-icon.png')"
```

## Privacy policy hosting

`PRIVACY.md` is the canonical source. Before marketplace submission, publish it at
`https://cc-commander.com/privacy` (static HTML or markdown render). The `privacyPolicyURL`
field in the manifest points there.

## What still needs Kevin

- [ ] SVG → PNG export (any method above)
- [ ] Run `node scripts/marketplace-screenshot-capture.js` to verify + resize screenshots
- [ ] Publish `PRIVACY.md` content at `https://cc-commander.com/privacy`
- [ ] Update `manifest.template.json` with fields above (or merge Wave 5 CDX-3 PR)
- [ ] Community marketplace submission: `npx codex-marketplace add KevinZai/commander --plugins`
- [ ] OpenAI dev-rel contact for official Featured consideration
