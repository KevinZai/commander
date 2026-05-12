/**
 * Regenerate the canonical CC Commander OG card at docs/og.png.
 *
 * Live deploy source: docs/index.html (referenced by <meta og:image
 * content="https://cc-commander.com/og.png">). This script overwrites
 * docs/og.png in place, preserving the URL contract.
 *
 * Aesthetic matches the original: dark bg, 3 large orange "C" arc glyphs,
 * "Master Claude Code instantly." headline, stats row, install command,
 * @commanderplugin pill bottom-right. Counts are SOURCED FROM
 * commander/contract.json — no hardcoded drift.
 *
 * Run from repo root:
 *   node scripts/generate-canonical-og.js
 */

const fs = require("fs");
const path = require("path");
const sharp = require(path.join(
  __dirname,
  "..",
  "site",
  "node_modules",
  ".pnpm",
  "sharp@0.34.5",
  "node_modules",
  "sharp",
));

const ROOT = path.resolve(__dirname, "..");
const CONTRACT = JSON.parse(fs.readFileSync(path.join(ROOT, "commander/contract.json"), "utf8"));
const OUT = path.join(ROOT, "docs/og.png");

const C = {
  bg: "#0F0F0F",
  fg: "#F5F5F0",
  fgDim: "#A8A8A0",
  fgFaint: "#6E6E68",
  accent: "#FF6B47",
  accent2: "#D4A574",
  line: "rgba(245,245,240,0.08)",
};

// Draw one "C" glyph centered at (cx,cy) with radius r.
// Arc opens 90deg to the right (gap from -45deg to 45deg).
function cGlyph(cx, cy, r, stroke) {
  const open = 45; // half-angle of mouth opening in degrees
  const toRad = (d) => (d * Math.PI) / 180;
  const startA = toRad(open);
  const endA = toRad(360 - open);
  const x1 = cx + r * Math.cos(startA);
  const y1 = cy + r * Math.sin(startA);
  const x2 = cx + r * Math.cos(endA);
  const y2 = cy + r * Math.sin(endA);
  // large-arc-flag = 1 because the arc covers > 180deg (270deg of sweep)
  // sweep-flag = 0 to go counter-clockwise from start to end (passes through 180°/left)
  return `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 1 0 ${x2.toFixed(2)} ${y2.toFixed(2)}"
    fill="none" stroke="${C.accent}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const VERSION = CONTRACT.version.split("-")[0].replace(/^4\./, "v4."); // "4.1.0" -> "v4.1"
const STATS = `${CONTRACT.plugin_skills} skills  ·  ${CONTRACT.specialist_agents} agents  ·  ${CONTRACT.lifecycle_hooks} hooks  ·  one install`;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="0.22" cy="0.28" r="0.65">
      <stop offset="0" stop-color="#FF6B47" stop-opacity="0.22"/>
      <stop offset="0.6" stop-color="#FF6B47" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#FF6B47" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="${C.line}" stroke-width="1"/>
    </pattern>
    <linearGradient id="ccCol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF8A6B"/>
      <stop offset="1" stop-color="#FF6B47"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="${C.bg}"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Top meta strip -->
  <g font-family="ui-monospace, Menlo, Consolas, monospace" font-size="20" letter-spacing="0.08em">
    <text x="72" y="74" fill="${C.fgDim}" font-weight="700">CC-COMMANDER</text>
    <text x="320" y="74" fill="${C.fgFaint}">·  ${VERSION}  ·  MIT  ·  cc-commander.com</text>
  </g>
  <line x1="72" y1="92" x2="1128" y2="92" stroke="${C.line}" stroke-width="1"/>

  <!-- Three large C glyphs -->
  <g transform="translate(72, 170)" stroke="url(#ccCol)">
    ${cGlyph(110, 110, 95, 38)}
    ${cGlyph(310, 110, 95, 38)}
    ${cGlyph(510, 110, 95, 38)}
  </g>

  <!-- Headline -->
  <g font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <text x="72" y="430" font-size="60" font-weight="800" letter-spacing="-0.02em" fill="${C.fg}">Master Claude Code <tspan font-style="italic" fill="${C.accent}">instantly.</tspan></text>
  </g>

  <!-- Stats row -->
  <g font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" letter-spacing="0.02em">
    <text x="72" y="488" fill="${C.fgDim}">${STATS}</text>
  </g>

  <!-- Install command box -->
  <g transform="translate(72, 528)">
    <rect width="560" height="58" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>
    <text x="22" y="38" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="${C.accent}">$</text>
    <text x="48" y="38" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="${C.fg}">/plugin install commander</text>
  </g>

  <!-- @commanderplugin pill bottom-right -->
  <g transform="translate(948, 540)">
    <rect width="180" height="36" rx="18" fill="rgba(255,107,71,0.12)" stroke="rgba(255,107,71,0.40)" stroke-width="1"/>
    <text x="22" y="24" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="16" fill="${C.accent}">@commanderplugin</text>
  </g>
</svg>`;

(async () => {
  await sharp(Buffer.from(SVG), { density: 384 })
    .resize(1200, 630, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(OUT);
  const { size } = fs.statSync(OUT);
  console.log(`✔ ${path.relative(ROOT, OUT)}  ${(size / 1024).toFixed(1)}KB`);
  console.log(`  Counts from contract.json: ${CONTRACT.plugin_skills}/${CONTRACT.specialist_agents}/${CONTRACT.lifecycle_hooks}`);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
