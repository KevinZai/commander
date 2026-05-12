/**
 * Generate CC Commander press kit — 18 logo variants.
 *
 * Output: site/public/press/
 *   chevron-{light,dark}-{256,512,1024}.png   (6 files)
 *   wordmark-{light,dark}-{256,512,1024}.png  (6 files)
 *   lockup-{light,dark}-{256,512,1024}.png    (6 files)
 *   README.md                                  (1 file)
 *
 * Brand tokens:
 *   dark bg:  #0F0F0F   light bg: #F5F5F0   accent: #FF6B47
 *
 * Run: node scripts/generate-press-kit.js
 * Idempotent.
 *
 * CHANGELOG
 *   2026-05-12  Initial (CC-667)
 */

const fs   = require("fs");
const path = require("path");

const sharp = require(
  path.join(__dirname, "..", "site", "node_modules", ".pnpm", "sharp@0.34.5", "node_modules", "sharp")
);

const ROOT    = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "site", "public", "press");

const C = {
  bg:      "#0F0F0F",
  bgLight: "#F5F5F0",
  fg:      "#F5F5F0",
  fgDark:  "#0F0F0F",
  accent:  "#FF6B47",
};

const MONO = "'JetBrains Mono','Fira Code','SF Mono',Menlo,Consolas,monospace";
const SANS = "Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

// ── SVG builders ─────────────────────────────────────────────────────────────

function chevronSvg(size, dark) {
  const bg     = dark ? C.bg : C.bgLight;
  const stroke = C.accent;
  const r      = Math.round(size * 0.156); // 40px at 256
  const sw     = Math.round(size * 0.094); // 24px at 256 — scaled stroke
  // chevron tip x, chevron start x, underscore x1/x2
  const cx1 = Math.round(size * 0.281);
  const cx2 = Math.round(size * 0.500);
  const cy1 = Math.round(size * 0.344);
  const cym = Math.round(size * 0.500);
  const cy2 = Math.round(size * 0.656);
  const ux1  = Math.round(size * 0.563);
  const ux2  = Math.round(size * 0.781);
  const uy   = Math.round(size * 0.656);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>
  <path d="M${cx1} ${cy1}l${cx2 - cx1} ${cym - cy1}-${cx2 - cx1} ${cy2 - cym}"
        stroke="${stroke}" stroke-width="${sw}" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="${ux1}" y1="${uy}" x2="${ux2}" y2="${uy}"
        stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
</svg>`;
}

function wordmarkSvg(size, dark) {
  const bg    = dark ? C.bg : C.bgLight;
  const fg    = dark ? C.fg : C.fgDark;
  const r     = Math.round(size * 0.156);
  const fs1   = Math.round(size * 0.094); // "CC Commander"
  const fs2   = Math.round(size * 0.047); // tagline
  const y1    = Math.round(size * 0.453);
  const y2    = Math.round(size * 0.578);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>
  <text x="${size / 2}" y="${y1}" text-anchor="middle"
        font-family="${MONO}" font-size="${fs1}" font-weight="700"
        fill="${fg}" letter-spacing="0.04em">CC Commander</text>
  <text x="${size / 2}" y="${y2}" text-anchor="middle"
        font-family="${MONO}" font-size="${fs2}" font-weight="400"
        fill="${C.accent}" letter-spacing="0.08em">commanderplugin.com</text>
</svg>`;
}

function lockupSvg(size, dark) {
  const bg     = dark ? C.bg : C.bgLight;
  const fg     = dark ? C.fg : C.fgDark;
  const stroke = C.accent;
  const r      = Math.round(size * 0.156);

  // Chevron on left half, text on right half
  const sw   = Math.round(size * 0.094);
  const half = size / 2;

  // chevron coords (left half, vertically centred)
  const cx1 = Math.round(half * 0.20);
  const cx2 = Math.round(half * 0.55);
  const cy1 = Math.round(size * 0.344);
  const cym = Math.round(size * 0.500);
  const cy2 = Math.round(size * 0.656);
  const ux1  = Math.round(half * 0.62);
  const ux2  = Math.round(half * 0.90);
  const uy   = Math.round(size * 0.656);

  // text x = right half center
  const tx  = Math.round(half + half * 0.5);
  const fs1 = Math.round(size * 0.094);
  const fs2 = Math.round(size * 0.047);
  const ty1 = Math.round(size * 0.453);
  const ty2 = Math.round(size * 0.578);

  // separator
  const sepX = half - Math.round(size * 0.02);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>
  <!-- chevron -->
  <path d="M${cx1} ${cy1}l${cx2 - cx1} ${cym - cy1}-${cx2 - cx1} ${cy2 - cym}"
        stroke="${stroke}" stroke-width="${sw}" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="${ux1}" y1="${uy}" x2="${ux2}" y2="${uy}"
        stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
  <!-- separator -->
  <line x1="${sepX}" y1="${Math.round(size * 0.25)}" x2="${sepX}" y2="${Math.round(size * 0.75)}"
        stroke="${dark ? "rgba(245,245,240,0.12)" : "rgba(15,15,15,0.12)"}" stroke-width="1"/>
  <!-- wordmark -->
  <text x="${tx}" y="${ty1}" text-anchor="middle"
        font-family="${MONO}" font-size="${fs1}" font-weight="700"
        fill="${fg}" letter-spacing="0.04em">CC Commander</text>
  <text x="${tx}" y="${ty2}" text-anchor="middle"
        font-family="${MONO}" font-size="${fs2}" font-weight="400"
        fill="${C.accent}" letter-spacing="0.08em">commanderplugin.com</text>
</svg>`;
}

// ── rasterize helper ─────────────────────────────────────────────────────────

async function rasterize(svgStr, outPath, size) {
  await sharp(Buffer.from(svgStr), { density: 300 })
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const { size: bytes } = fs.statSync(outPath);
  console.log(`  ✔ ${path.relative(ROOT, outPath).padEnd(52)} ${(bytes / 1024).toFixed(1)}KB`);
}

// ── README ───────────────────────────────────────────────────────────────────

function buildReadme(files) {
  const base = "https://commanderplugin.com/press";
  const rows = files
    .map((f) => `| \`${f}\` | [Download](${base}/${f}) |`)
    .join("\n");

  return `# CC Commander Press Kit

Brand assets for editorial, partner, and community use.

## Usage Guidelines

- **Do** use these assets when writing about CC Commander.
- **Do** keep the aspect ratio. Do not stretch or skew.
- **Do not** recolor the accent (#FF6B47) or change the mark shape.
- **Do not** place the mark on busy backgrounds without sufficient contrast.
- For questions: hi@commanderplugin.com

## Variants

| File | Download |
|------|----------|
${rows}

## Brand Tokens

| Token | Value |
|-------|-------|
| Background dark | \`#0F0F0F\` |
| Background light | \`#F5F5F0\` |
| Accent (orange) | \`#FF6B47\` |
| Accent 2 (warm) | \`#D4A574\` |
| Mono font | JetBrains Mono |
| Sans font | Inter |

## Mark Types

- **chevron** — the \`> _\` mark only; use at small sizes or as an icon
- **wordmark** — "CC Commander" logotype only; use in text-rich contexts
- **lockup** — chevron + wordmark side-by-side; preferred for hero placements

Generated by \`scripts/generate-press-kit.js\`. Regenerate at any time — idempotent.
`;
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("CC Commander — press kit generator (18 variants)");
  console.log("━".repeat(60));

  const SIZES  = [256, 512, 1024];
  const THEMES = [
    { label: "light", dark: false },
    { label: "dark",  dark: true  },
  ];

  const fileList = [];

  for (const { label, dark } of THEMES) {
    for (const size of SIZES) {
      // chevron
      const cnFile = `chevron-${label}-${size}.png`;
      await rasterize(chevronSvg(size, dark), path.join(OUT_DIR, cnFile), size);
      fileList.push(cnFile);

      // wordmark
      const wmFile = `wordmark-${label}-${size}.png`;
      await rasterize(wordmarkSvg(size, dark), path.join(OUT_DIR, wmFile), size);
      fileList.push(wmFile);

      // lockup
      const lkFile = `lockup-${label}-${size}.png`;
      await rasterize(lockupSvg(size, dark), path.join(OUT_DIR, lkFile), size);
      fileList.push(lkFile);
    }
  }

  // README
  const readmePath = path.join(OUT_DIR, "README.md");
  fs.writeFileSync(readmePath, buildReadme(fileList));
  console.log(`  ✔ ${"site/public/press/README.md".padEnd(52)} (markdown)`);

  console.log(`\n  ${fileList.length}/18 variants + README → ${path.relative(ROOT, OUT_DIR)}`);
  console.log("  Idempotent — run again to regenerate.");
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
