/**
 * Generate canonical CC Commander marketplace brand assets.
 *
 * Outputs:
 *   assets/marketplace/logo.svg          — 256×256 chevron `> _` mark, #FF6B47 on #0F0F0F
 *   assets/marketplace/brand-dark.png    — 512×512 ASCII CLAUDE/CODE/COMMANDER on #0F0F0F
 *   assets/marketplace/brand-light.png   — 512×512 same on #F5F5F0 bg, #0F0F0F text
 *   assets/marketplace/brand-holographic.png — 512×512 fire/cyber/aurora gradient variant
 *
 * Brand tokens:
 *   bg:      #0F0F0F   fg:      #F5F5F0   accent:  #FF6B47
 *   accent2: #D4A574   mono:    JetBrains Mono
 *
 * Run: node scripts/generate-marketplace-brand.js
 * Idempotent — safe to re-run at any time.
 *
 * CHANGELOG
 *   2026-05-12  Initial — replaces stale matrix-green palette with canonical #FF6B47
 */

const fs = require("fs");
const path = require("path");

const sharp = require(
  path.join(__dirname, "..", "site", "node_modules", ".pnpm", "sharp@0.34.5", "node_modules", "sharp")
);

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "marketplace");

const C = {
  bg:      "#0F0F0F",
  bgLight: "#F5F5F0",
  fg:      "#F5F5F0",
  fgDark:  "#0F0F0F",
  fgDim:   "#A8A8A0",
  accent:  "#FF6B47",
  accent2: "#D4A574",
  line:    "rgba(245,245,240,0.08)",
};

const MONO = "'JetBrains Mono','Fira Code','SF Mono',Menlo,Consolas,monospace";

// ── Chevron logo SVG (256×256) ──────────────────────────────────────────────
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="40" fill="${C.bg}"/>
  <!-- chevron > -->
  <path d="M72 88l56 40-56 40" stroke="${C.accent}" stroke-width="20" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
  <!-- underscore _ -->
  <line x1="144" y1="168" x2="200" y2="168" stroke="${C.accent}" stroke-width="20"
        stroke-linecap="round"/>
</svg>`;

// ── ASCII brand rows (shared with generate-canonical-og.js) ─────────────────
const ASCII_CLAUDE = [
  " ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗",
  "██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝",
  "██║     ██║     ███████║██║   ██║██║  ██║█████╗  ",
  "██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  ",
  "╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗",
  " ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝",
];
const ASCII_CODE = [
  " ██████╗ ██████╗ ██████╗ ███████╗",
  "██╔════╝██╔═══██╗██╔══██╗██╔════╝",
  "██║     ██║   ██║██║  ██║█████╗  ",
  "██║     ██║   ██║██║  ██║██╔══╝  ",
  "╚██████╗╚██████╔╝██████╔╝███████╗",
  " ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
];
const ASCII_COMMANDER = [
  " ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗ ███████╗██████╗ ",
  "██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝██╔══██╗",
  "██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║█████╗  ██████╔╝",
  "██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗",
  "╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝███████╗██║  ██║",
  " ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝",
];

const esc = (s) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

function asciiRows({ x, y, lines, lineHeight, fontSize, fill }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" font-family="${MONO}" font-size="${fontSize}" font-weight="700" fill="${fill}" xml:space="preserve">${esc(line)}</text>`
    )
    .join("\n  ");
}

// ── brand-dark.svg (512×512 on #0F0F0F) ────────────────────────────────────
function makeBrandSvg({ bgColor, claudeFill, codeFill, commanderFill, taglineFill, borderColor }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="fire" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF6600"/>
      <stop offset="100%" stop-color="#FFCC00"/>
    </linearGradient>
    <linearGradient id="cyber" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF0080"/>
      <stop offset="100%" stop-color="#00FFFF"/>
    </linearGradient>
    <linearGradient id="aurora" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#50FF78"/>
      <stop offset="50%" stop-color="#00C8FF"/>
      <stop offset="100%" stop-color="#B464FF"/>
    </linearGradient>
    <filter id="gs" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="0.8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="512" height="512" rx="32" fill="${bgColor}"/>
  ${borderColor ? `<rect width="512" height="512" rx="32" fill="none" stroke="${borderColor}" stroke-width="1.5"/>` : ""}

  <!-- CLAUDE small, fire gradient -->
  ${asciiRows({ x: 14, y: 68, lines: ASCII_CLAUDE, lineHeight: 8.5, fontSize: 7.5, fill: claudeFill })}

  <!-- CODE small, cyber gradient -->
  ${asciiRows({ x: 14, y: 130, lines: ASCII_CODE, lineHeight: 8.5, fontSize: 7.5, fill: codeFill })}

  <!-- COMMANDER dominant, aurora gradient -->
  ${asciiRows({ x: 14, y: 200, lines: ASCII_COMMANDER, lineHeight: 12, fontSize: 11, fill: commanderFill })}

  <!-- tagline -->
  <text x="256" y="310" text-anchor="middle" font-family="${MONO}" font-size="11"
        fill="${taglineFill}" letter-spacing="0.05em">Master Claude Code instantly</text>
  <text x="256" y="326" text-anchor="middle" font-family="${MONO}" font-size="9"
        fill="${taglineFill}" opacity="0.6">commanderplugin.com</text>

  <!-- chevron mark bottom-right -->
  <g transform="translate(400,420)">
    <rect width="80" height="48" rx="8" fill="${C.accent}" opacity="0.12"/>
    <path d="M16 14l12 10-12 10" stroke="${C.accent}" stroke-width="3" fill="none"
          stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="34" y1="34" x2="54" y2="34" stroke="${C.accent}" stroke-width="3"
          stroke-linecap="round"/>
  </g>
</svg>`;
}

// ── brand-holographic.svg (512×512 gradient bg) ─────────────────────────────
const HOLO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgHolo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F0F0F"/>
      <stop offset="40%" stop-color="#1a0a1a"/>
      <stop offset="100%" stop-color="#0a0f1a"/>
    </linearGradient>
    <linearGradient id="fire" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF6600"/>
      <stop offset="100%" stop-color="#FFCC00"/>
    </linearGradient>
    <linearGradient id="cyber" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF0080"/>
      <stop offset="100%" stop-color="#00FFFF"/>
    </linearGradient>
    <linearGradient id="aurora" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#50FF78"/>
      <stop offset="50%" stop-color="#00C8FF"/>
      <stop offset="100%" stop-color="#B464FF"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.3" r="0.7">
      <stop offset="0" stop-color="#FF6B47" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FF6B47" stop-opacity="0"/>
    </radialGradient>
    <filter id="gs" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="0.8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="512" height="512" rx="32" fill="url(#bgHolo)"/>
  <rect width="512" height="512" rx="32" fill="url(#glow)"/>

  ${asciiRows({ x: 14, y: 68, lines: ASCII_CLAUDE, lineHeight: 8.5, fontSize: 7.5, fill: "url(#fire)" })}
  ${asciiRows({ x: 14, y: 130, lines: ASCII_CODE, lineHeight: 8.5, fontSize: 7.5, fill: "url(#cyber)" })}
  ${asciiRows({ x: 14, y: 200, lines: ASCII_COMMANDER, lineHeight: 12, fontSize: 11, fill: "url(#aurora)" })}

  <text x="256" y="310" text-anchor="middle" font-family="${MONO}" font-size="11"
        fill="${C.fg}" letter-spacing="0.05em">Master Claude Code instantly</text>
  <text x="256" y="326" text-anchor="middle" font-family="${MONO}" font-size="9"
        fill="${C.accent}" opacity="0.8">commanderplugin.com</text>

  <g transform="translate(400,420)">
    <rect width="80" height="48" rx="8" fill="${C.accent}" opacity="0.15"/>
    <path d="M16 14l12 10-12 10" stroke="${C.accent}" stroke-width="3" fill="none"
          stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="34" y1="34" x2="54" y2="34" stroke="${C.accent}" stroke-width="3"
          stroke-linecap="round"/>
  </g>
</svg>`;

async function rasterize(svgStr, outFile, w, h) {
  await sharp(Buffer.from(svgStr), { density: 300 })
    .resize(w, h, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(outFile);
  const { size } = fs.statSync(outFile);
  console.log(`  ✔ ${path.relative(ROOT, outFile).padEnd(48)} ${(size / 1024).toFixed(1)}KB`);
}

(async () => {
  console.log("CC Commander — marketplace brand asset generator");
  console.log("━".repeat(60));

  // Task 1a: logo.svg (pure SVG, no rasterize needed)
  const logoPath = path.join(OUT, "logo.svg");
  fs.writeFileSync(logoPath, LOGO_SVG);
  console.log(`  ✔ ${path.relative(ROOT, logoPath).padEnd(48)} (SVG)`);

  // Task 1b: brand-dark.png
  const darkSvg = makeBrandSvg({
    bgColor:        C.bg,
    claudeFill:     "url(#fire)",
    codeFill:       "url(#cyber)",
    commanderFill:  "url(#aurora)",
    taglineFill:    C.fgDim || "#A8A8A0",
    borderColor:    "rgba(255,107,71,0.20)",
  });
  await rasterize(darkSvg, path.join(OUT, "brand-dark.png"), 512, 512);

  // Task 1c: brand-light.png
  const lightSvg = makeBrandSvg({
    bgColor:        C.bgLight,
    claudeFill:     "#CC4400",
    codeFill:       "#0055AA",
    commanderFill:  "#1A1A1A",
    taglineFill:    "#555555",
    borderColor:    "rgba(15,15,15,0.12)",
  });
  await rasterize(lightSvg, path.join(OUT, "brand-light.png"), 512, 512);

  // Task 1d: brand-holographic.png
  await rasterize(HOLO_SVG, path.join(OUT, "brand-holographic.png"), 512, 512);

  console.log("\n  Brand tokens: bg=#0F0F0F  accent=#FF6B47  COMMANDER dominant");
  console.log("  Run again at any time — idempotent output.");
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
