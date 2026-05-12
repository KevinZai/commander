/**
 * Generate CC Commander brand PNG variants from canonical SVGs.
 *
 * Canonical source: marketing/CC-Commander-from-ClaudeDesign/index.html
 * Run from site/:
 *   node scripts/generate-brand-assets.js
 *
 * Outputs to site/public/:
 *   - icon.png              512x512  (general app icon)
 *   - apple-touch-icon.png  180x180  (iOS home screen)
 *   - favicon-32.png        32x32    (legacy browsers)
 *   - og-image.png          1200x630 (Open Graph + Twitter card)
 *   - x-profile.png         400x400  (X / Twitter avatar)
 *   - x-banner.png          1500x500 (X / Twitter header)
 */

const fs = require("fs");
const path = require("path");
const sharp = require("../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp");

const PUBLIC = path.join(__dirname, "..", "public");
const COLORS = {
  bg: "#0F0F0F",
  fg: "#F5F5F0",
  fgDim: "#A8A8A0",
  fgFaint: "#6E6E68",
  accent: "#FF6B47",
  accent2: "#D4A574",
  line: "rgba(245,245,240,0.08)",
};

// Canonical favicon mark (boxed, 32x32 viewport)
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${COLORS.bg}"/>
  <path d="M9 11l5 5-5 5M16 22h8" stroke="${COLORS.accent}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Larger boxed mark (512x512) with proportionally heavier stroke
function bigMarkSvg(size, radius = 96) {
  const stroke = Math.round(size * 0.075); // ~38 at 512
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${COLORS.bg}"/>
    <g stroke="${COLORS.accent}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M${size * 0.28} ${size * 0.34} L${size * 0.5} ${size * 0.5} L${size * 0.28} ${size * 0.66}"/>
      <path d="M${size * 0.5} ${size * 0.68} L${size * 0.75} ${size * 0.68}"/>
    </g>
  </svg>`;
}

// Full OG card 1200x630
const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="0.18" cy="0.32" r="0.7">
      <stop offset="0" stop-color="#FF6B47" stop-opacity="0.18"/>
      <stop offset="0.55" stop-color="#FF6B47" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#FF6B47" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="${COLORS.line}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="${COLORS.bg}"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Header line: meta -->
  <g font-family="JetBrains Mono, ui-monospace, Menlo, monospace" font-size="20" letter-spacing="0.04em">
    <text x="72" y="84" fill="${COLORS.fgDim}">CC-COMMANDER</text>
    <text x="312" y="84" fill="${COLORS.fgFaint}">·  v4.1  ·  MIT  ·  commanderplugin.com</text>
  </g>

  <!-- Big boxed mark -->
  <g transform="translate(72, 130)">
    <rect width="160" height="160" rx="28" fill="${COLORS.bg}" stroke="rgba(255,107,71,0.25)" stroke-width="1.5"/>
    <g stroke="${COLORS.accent}" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,0)">
      <path d="M44 54 L80 80 L44 106"/>
      <path d="M80 110 L120 110"/>
    </g>
  </g>

  <!-- Headline -->
  <g font-family="Inter, ui-sans-serif, system-ui, sans-serif">
    <text x="72" y="360" font-size="76" font-weight="700" letter-spacing="-0.02em" fill="${COLORS.fg}">Master Claude Code</text>
    <text x="72" y="436" font-size="76" font-weight="700" font-style="italic" letter-spacing="-0.02em" fill="${COLORS.accent}">instantly.</text>
  </g>

  <!-- Stats row -->
  <g font-family="JetBrains Mono, ui-monospace, Menlo, monospace" font-size="22" letter-spacing="0.02em" fill="${COLORS.fgDim}">
    <text x="72" y="498">60 skills  ·  22 agents  ·  9 hooks  ·  18 MCPs  ·  one install</text>
  </g>

  <!-- Install command -->
  <g transform="translate(72, 540)">
    <rect width="640" height="50" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="22" y="33" font-family="JetBrains Mono, ui-monospace, Menlo, monospace" font-size="22" fill="${COLORS.accent}">$</text>
    <text x="46" y="33" font-family="JetBrains Mono, ui-monospace, Menlo, monospace" font-size="22" fill="${COLORS.fg}">/plugin install commander</text>
  </g>

  <!-- Bottom-right handle pill -->
  <g transform="translate(960, 552)">
    <rect width="170" height="36" rx="18" fill="rgba(255,107,71,0.12)" stroke="rgba(255,107,71,0.35)" stroke-width="1"/>
    <text x="22" y="24" font-family="JetBrains Mono, ui-monospace, Menlo, monospace" font-size="16" fill="${COLORS.accent}">@commanderplugin</text>
  </g>
</svg>`;

// X profile 400x400 — square, mark-forward
const X_PROFILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="g" cx="0.5" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#FF6B47" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FF6B47" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="${COLORS.bg}"/>
  <rect width="400" height="400" fill="url(#g)"/>

  <!-- Centered boxed mark -->
  <g transform="translate(110, 80)">
    <rect width="180" height="180" rx="32" fill="rgba(255,255,255,0.02)" stroke="rgba(255,107,71,0.35)" stroke-width="1.5"/>
    <g stroke="${COLORS.accent}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 60 L90 90 L50 120"/>
      <path d="M90 124 L134 124"/>
    </g>
  </g>

  <!-- Wordmark -->
  <g font-family="JetBrains Mono, ui-monospace, Menlo, monospace" font-size="22" font-weight="600" letter-spacing="0.06em" text-anchor="middle">
    <text x="200" y="312" fill="${COLORS.fg}">commander <tspan fill="${COLORS.accent}">/</tspan> <tspan fill="${COLORS.fgDim}">cc</tspan></text>
  </g>
  <g font-family="Inter, sans-serif" font-size="14" letter-spacing="0.08em" text-anchor="middle">
    <text x="200" y="346" fill="${COLORS.fgFaint}">CC COMMANDER</text>
  </g>
</svg>`;

// X banner 1500x500 — wide, lockup left, tagline right
const X_BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 500">
  <defs>
    <radialGradient id="g" cx="0.18" cy="0.5" r="0.6">
      <stop offset="0" stop-color="#FF6B47" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#FF6B47" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0H0V60" fill="none" stroke="${COLORS.line}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1500" height="500" fill="${COLORS.bg}"/>
  <rect width="1500" height="500" fill="url(#grid)"/>
  <rect width="1500" height="500" fill="url(#g)"/>

  <!-- Vertical accent line center -->
  <line x1="700" y1="120" x2="700" y2="380" stroke="rgba(255,107,71,0.25)" stroke-width="1"/>

  <!-- Left: boxed mark + wordmark -->
  <g transform="translate(140, 170)">
    <rect width="160" height="160" rx="28" fill="${COLORS.bg}" stroke="rgba(255,107,71,0.35)" stroke-width="1.5"/>
    <g stroke="${COLORS.accent}" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M44 54 L80 80 L44 106"/>
      <path d="M80 110 L120 110"/>
    </g>
  </g>
  <g transform="translate(330, 218)" font-family="JetBrains Mono, ui-monospace, Menlo, monospace" font-weight="600" letter-spacing="-0.01em">
    <text font-size="56" fill="${COLORS.fg}">commander <tspan fill="${COLORS.accent}">/</tspan> <tspan fill="${COLORS.fgDim}">cc</tspan></text>
    <text y="40" font-size="20" letter-spacing="0.08em" fill="${COLORS.fgFaint}">CC COMMANDER · v4.1 · MIT</text>
  </g>

  <!-- Right: tagline + stats -->
  <g transform="translate(760, 200)" font-family="Inter, sans-serif">
    <text font-size="42" font-weight="700" letter-spacing="-0.02em" fill="${COLORS.fg}">The guided AI PM</text>
    <text y="56" font-size="42" font-weight="700" font-style="italic" letter-spacing="-0.02em" fill="${COLORS.accent}">for Claude Code.</text>
  </g>
  <g transform="translate(760, 320)" font-family="JetBrains Mono, ui-monospace, Menlo, monospace" font-size="18" letter-spacing="0.04em" fill="${COLORS.fgDim}">
    <text>60 skills · 22 agents · 9 hooks · 18 MCPs</text>
    <text y="32" fill="${COLORS.accent}">@commanderplugin  ·  commanderplugin.com</text>
  </g>
</svg>`;

async function rasterize(name, svg, size, opts = {}) {
  const out = path.join(PUBLIC, name);
  let pipeline = sharp(Buffer.from(svg), { density: 384 });
  if (Array.isArray(size)) {
    pipeline = pipeline.resize(size[0], size[1], { fit: "fill" });
  } else if (size) {
    pipeline = pipeline.resize(size, size, { fit: "fill" });
  }
  await pipeline.png({ compressionLevel: 9 }).toFile(out);
  const { size: bytes } = fs.statSync(out);
  console.log(`✔ ${name.padEnd(28)} ${(bytes / 1024).toFixed(1)}KB`);
}

(async () => {
  await rasterize("favicon-32.png", FAVICON_SVG, 32);
  await rasterize("apple-touch-icon.png", bigMarkSvg(512, 96), 180);
  await rasterize("icon.png", bigMarkSvg(512, 96), 512);
  await rasterize("og-image.png", OG_SVG, [1200, 630]);
  await rasterize("x-profile.png", X_PROFILE_SVG, 400);
  await rasterize("x-banner.png", X_BANNER_SVG, [1500, 500]);
  console.log("\nAll brand assets written to site/public/");
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
