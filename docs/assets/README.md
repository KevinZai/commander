---
description: CC Commander docs/assets — generated graphics, OG images, and static files for the landing page and GitHub social preview.
---

# docs/assets

Static assets for the CC Commander landing page and distribution surfaces.

## OG / Social Preview

| File | Purpose | Status |
|------|---------|--------|
| `og-image-v4.svg` | v4.0.0 social preview source (SVG) | Active — current |
| `og-image-v4.png` | Rasterized 1200×630 for GitHub social preview | Generate with `scripts/convert-og-image.sh` |
| `og-image.svg` | Legacy v3 source | Keep for diff history |
| `og-image.png` | Legacy v3 rasterized | Superseded by v4 |

### Generating the PNG

```bash
bash scripts/convert-og-image.sh
```

Requires `rsvg-convert` — install with `brew install librsvg`.

### Uploading to GitHub

After generating `og-image-v4.png`:

1. Go to https://github.com/KevinZai/commander/settings
2. Scroll to **Social preview**
3. Upload `docs/assets/og-image-v4.png`

Or run `bash scripts/update-github-repo-metadata.sh` to update repo description, homepage, and topics (social preview upload remains manual per GitHub API limitations).

## Landing Page Assets

SVG diagrams and section illustrations are co-located here and referenced by `docs/index.html`. Do not rename or move files without updating the HTML.

Key files:
- `ccc-architecture.svg` — sub-agent architecture diagram (README + mintlify)
- `ccc-hero.svg` / `ccc-hero.png` — hero illustration
- `hero.gif` / `hero.mp4` — animated hero demo
- `main.js` — landing page JS bundle

## Screenshots

Real Desktop screenshots live in `docs/screenshots/` — see the README there for naming convention and the 7 needed shots.
