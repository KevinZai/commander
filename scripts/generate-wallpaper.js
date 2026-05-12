/**
 * Generate CC Commander desktop wallpaper / marketing banner.
 *
 * Outputs (committed to site/public/social/ so they survive .gitignore):
 *   site/public/social/wallpaper-2560x1440.png
 *   site/public/social/wallpaper-1920x1080.png
 *
 * Also writes to marketing/ASSETS/social/ (gitignored local copy) if the
 * directory exists.
 *
 * Composition:
 *   - #0F0F0F background with subtle grid
 *   - Full ASCII CLAUDE / CODE / COMMANDER stack with fire/cyber/aurora gradients
 *   - Footer: "Master Claude Code instantly · commanderplugin.com" in #D4A574
 *
 * Run: node scripts/generate-wallpaper.js
 * Idempotent.
 *
 * CHANGELOG
 *   2026-05-12  Initial
 */

const fs   = require("fs");
const path = require("path");

const sharp = require(
  path.join(__dirname, "..", "site", "node_modules", ".pnpm", "sharp@0.34.5", "node_modules", "sharp")
);

const ROOT = path.resolve(__dirname, "..");

const C = {
  bg:     "#0F0F0F",
  fg:     "#F5F5F0",
  fgDim:  "#A8A8A0",
  accent: "#FF6B47",
  warm:   "#D4A574",
  line:   "rgba(245,245,240,0.05)",
};

const MONO = "'JetBrains Mono','Fira Code','SF Mono',Menlo,Consolas,monospace";

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

function wallpaperSvg(w, h) {
  // Scale everything relative to 2560×1440 baseline
  const scale  = w / 2560;
  const pad    = Math.round(120 * scale);
  const gSize  = Math.round(80 * scale);

  // ASCII block sizes — COMMANDER dominant at 1.4×
  const fsSmall = Math.round(20 * scale);
  const lhSmall = Math.round(23 * scale);
  const fsBig   = Math.round(28 * scale);
  const lhBig   = Math.round(32 * scale);

  const yClau   = Math.round(h * 0.18);
  const yCode   = Math.round(h * 0.33);
  const yCmd    = Math.round(h * 0.50);
  const yFooter = Math.round(h * 0.88);
  const yHandle = Math.round(h * 0.93);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
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
    <radialGradient id="glow" cx="0.18" cy="0.22" r="0.55">
      <stop offset="0" stop-color="#FF6B47" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#FF6B47" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="${gSize}" height="${gSize}" patternUnits="userSpaceOnUse">
      <path d="M${gSize} 0H0V${gSize}" fill="none" stroke="${C.line}" stroke-width="1"/>
    </pattern>
    <filter id="gs" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="1.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="${C.bg}"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>

  <!-- CLAUDE small, fire gradient -->
  ${asciiRows({ x: pad, y: yClau, lines: ASCII_CLAUDE, lineHeight: lhSmall, fontSize: fsSmall, fill: "url(#fire)" })}

  <!-- CODE small, cyber gradient -->
  ${asciiRows({ x: pad, y: yCode, lines: ASCII_CODE, lineHeight: lhSmall, fontSize: fsSmall, fill: "url(#cyber)" })}

  <!-- COMMANDER dominant, aurora gradient -->
  ${asciiRows({ x: pad, y: yCmd, lines: ASCII_COMMANDER, lineHeight: lhBig, fontSize: fsBig, fill: "url(#aurora)" })}

  <!-- Footer tagline -->
  <text x="${pad}" y="${yFooter}" font-family="${MONO}" font-size="${Math.round(22 * scale)}"
        font-weight="500" fill="${C.warm}" letter-spacing="0.06em"
        >Master Claude Code instantly  ·  commanderplugin.com</text>

  <!-- Handle -->
  <text x="${pad}" y="${yHandle}" font-family="${MONO}" font-size="${Math.round(16 * scale)}"
        fill="${C.accent}" opacity="0.7" letter-spacing="0.04em"
        >@commanderplugin</text>
</svg>`;
}

async function rasterize(svgStr, outPath, w, h) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svgStr), { density: 300 })
    .resize(w, h, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const { size } = fs.statSync(outPath);
  console.log(`  ✔ ${path.relative(ROOT, outPath).padEnd(56)} ${(size / 1024).toFixed(1)}KB`);
}

(async () => {
  console.log("CC Commander — wallpaper generator");
  console.log("━".repeat(60));

  const variants = [
    { w: 2560, h: 1440 },
    { w: 1920, h: 1080 },
  ];

  for (const { w, h } of variants) {
    const svg = wallpaperSvg(w, h);
    const name = `wallpaper-${w}x${h}.png`;

    // Committed canonical copy
    await rasterize(svg, path.join(ROOT, "site", "public", "social", name), w, h);

    // Local marketing copy (gitignored — best-effort)
    const mktDir = path.join(ROOT, "marketing", "ASSETS", "social");
    if (fs.existsSync(path.dirname(mktDir)) || true) {
      try {
        await rasterize(svg, path.join(mktDir, name), w, h);
      } catch {
        // marketing/ may not exist — non-fatal
      }
    }
  }

  console.log("\n  Canonical: site/public/social/ (committed)");
  console.log("  Local:     marketing/ASSETS/social/ (gitignored, best-effort)");
  console.log("  Idempotent — run again to regenerate.");
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
