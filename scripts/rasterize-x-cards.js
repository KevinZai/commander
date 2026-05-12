/**
 * Rasterize x-card SVGs to PNG for Twitter/X upload.
 *
 * Input:  docs/assets/x-cards/*.svg  (6 files)
 * Output: docs/assets/x-cards/png/*.png  (2400×1350, 2× retina)
 *
 * Twitter doesn't render SVG in tweet attachments — PNG required.
 * Output is 2× (2400×1350) so retina displays stay crisp.
 *
 * Run: node scripts/rasterize-x-cards.js
 * Idempotent — overwrites prior output safely.
 *
 * CHANGELOG
 *   2026-05-12  Initial
 */

const fs = require("fs");
const path = require("path");

const sharp = require(
  path.join(__dirname, "..", "site", "node_modules", ".pnpm", "sharp@0.34.5", "node_modules", "sharp")
);

const ROOT    = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "docs", "assets", "x-cards");
const OUT_DIR = path.join(SRC_DIR, "png");

const W = 2400;
const H = 1350;

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const svgs = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".svg"));

  if (svgs.length === 0) {
    console.error("No SVG files found in", SRC_DIR);
    process.exit(1);
  }

  console.log(`CC Commander — x-card rasterizer  (${W}×${H} 2× retina)`);
  console.log("━".repeat(60));

  let ok = 0;
  for (const svg of svgs) {
    const srcPath = path.join(SRC_DIR, svg);
    const outName = svg.replace(/\.svg$/, ".png");
    const outPath = path.join(OUT_DIR, outName);

    const svgBuf = fs.readFileSync(srcPath);

    await sharp(svgBuf, { density: 300 })
      .resize(W, H, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    const { size } = fs.statSync(outPath);
    console.log(`  ✔ ${outName.padEnd(36)} ${(size / 1024).toFixed(1)}KB`);
    ok++;
  }

  console.log(`\n  ${ok}/${svgs.length} x-cards rasterized → ${path.relative(ROOT, OUT_DIR)}`);
  console.log("  Upload *.png files directly to Twitter — SVG not supported there.");
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
