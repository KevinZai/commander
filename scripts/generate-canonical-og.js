/**
 * Regenerate the canonical CC Commander OG card at docs/og.png.
 *
 * Live deploy source: docs/index.html (referenced by <meta og:image
 * content="https://commanderplugin.com/og.png">). This script overwrites
 * docs/og.png in place, preserving the URL contract.
 *
 * Brand mark used: full canonical ASCII stack from docs/assets/ccc-hero.svg —
 *   CLAUDE  (fire gradient   #FF6600 → #FFCC00)   smaller
 *   CODE    (cyber gradient  #FF0080 → #00FFFF)   smaller
 *   COMMANDER (aurora gradient #50FF78 → #00C8FF → #B464FF)   DOMINANT
 *
 * Per Kevin's brand spec: "just Commander, the claude code is a version of it".
 * COMMANDER renders at 1.4× the size of CLAUDE / CODE so the base brand
 * reads dominant. Stats sourced live from commander/contract.json.
 *
 * Also mirrors into site/public/og-image.png and site/public/x-banner.png
 * so the parallel Next.js project stays in sync.
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
const CONTRACT = JSON.parse(
  fs.readFileSync(path.join(ROOT, "commander/contract.json"), "utf8"),
);

const C = {
  bg: "#0F0F0F",
  fg: "#F5F5F0",
  fgDim: "#A8A8A0",
  fgFaint: "#6E6E68",
  accent: "#FF6B47",
  line: "rgba(245,245,240,0.08)",
};

// Canonical ASCII stack from docs/assets/ccc-hero.svg lines 20-37
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

const VERSION = (CONTRACT.version || "4.1.0").split("-")[0];
const STATS = `${CONTRACT.plugin_skills} skills  ·  ${CONTRACT.specialist_agents} agents  ·  ${CONTRACT.lifecycle_hooks} hooks  ·  one install`;

// xml-escape for ASCII (just < and >)
const esc = (s) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

function asciiRow({ x, y, lines, lineHeight, fontSize, fill }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" font-family="'JetBrains Mono','Fira Code','SF Mono',Menlo,Consolas,monospace" font-size="${fontSize}" font-weight="700" fill="${fill}" filter="url(#glow-soft)" xml:space="preserve">${esc(line)}</text>`,
    )
    .join("\n  ");
}

// ──────────────────────────────────────────────────────────────────────
// OG card 1200x630 — canonical CLAUDE/CODE/COMMANDER stacked ASCII
// ──────────────────────────────────────────────────────────────────────
const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
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
    <radialGradient id="glow" cx="0.22" cy="0.28" r="0.65">
      <stop offset="0" stop-color="#FF6B47" stop-opacity="0.18"/>
      <stop offset="0.6" stop-color="#FF6B47" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#FF6B47" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="${C.line}" stroke-width="1"/>
    </pattern>
    <filter id="glow-soft" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="1.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="${C.bg}"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Top meta strip -->
  <g font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace" font-size="18" letter-spacing="0.08em">
    <text x="72" y="60" fill="${C.fgDim}" font-weight="700">CC-COMMANDER</text>
    <text x="290" y="60" fill="${C.fgFaint}">·  v${VERSION}  ·  MIT  ·  commanderplugin.com</text>
  </g>
  <line x1="72" y1="78" x2="1128" y2="78" stroke="${C.line}" stroke-width="1"/>

  <!-- CLAUDE (small, fire gradient) — 49 chars wide -->
  ${asciiRow({
    x: 72,
    y: 116,
    lines: ASCII_CLAUDE,
    lineHeight: 16,
    fontSize: 14,
    fill: "url(#fire)",
  })}

  <!-- CODE (small, cyber gradient) — 33 chars wide, indented to align with COMMANDER start -->
  ${asciiRow({
    x: 72,
    y: 222,
    lines: ASCII_CODE,
    lineHeight: 16,
    fontSize: 14,
    fill: "url(#cyber)",
  })}

  <!-- COMMANDER (DOMINANT, aurora gradient) — 81 chars wide -->
  ${asciiRow({
    x: 72,
    y: 340,
    lines: ASCII_COMMANDER,
    lineHeight: 22,
    fontSize: 20,
    fill: "url(#aurora)",
  })}

  <!-- Headline -->
  <text x="72" y="510" font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" letter-spacing="-0.02em" fill="${C.fg}">Master Claude Code <tspan font-style="italic" fill="${C.accent}">instantly.</tspan></text>

  <!-- Stats row -->
  <text x="72" y="550" font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace" font-size="18" letter-spacing="0.02em" fill="${C.fgDim}">${STATS}</text>

  <!-- Install command box -->
  <g transform="translate(72, 568)">
    <rect width="520" height="42" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>
    <text x="20" y="28" font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace" font-size="17" fill="${C.accent}">$</text>
    <text x="42" y="28" font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace" font-size="17" fill="${C.fg}">/plugin install commander</text>
  </g>

  <!-- @commanderplugin pill bottom-right -->
  <g transform="translate(960, 572)">
    <rect width="170" height="34" rx="17" fill="rgba(255,107,71,0.12)" stroke="rgba(255,107,71,0.40)" stroke-width="1"/>
    <text x="20" y="22" font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace" font-size="15" fill="${C.accent}">@commanderplugin</text>
  </g>
</svg>`;

// ──────────────────────────────────────────────────────────────────────
// X banner 1500x500 — left: ASCII COMMANDER, right: tagline
// ──────────────────────────────────────────────────────────────────────
const X_BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 500">
  <defs>
    <linearGradient id="aurora" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#50FF78"/>
      <stop offset="50%" stop-color="#00C8FF"/>
      <stop offset="100%" stop-color="#B464FF"/>
    </linearGradient>
    <linearGradient id="fire" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF6600"/>
      <stop offset="100%" stop-color="#FFCC00"/>
    </linearGradient>
    <radialGradient id="g" cx="0.22" cy="0.5" r="0.6">
      <stop offset="0" stop-color="#FF6B47" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#FF6B47" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0H0V60" fill="none" stroke="${C.line}" stroke-width="1"/>
    </pattern>
    <filter id="glow-soft" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="1.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="1500" height="500" fill="${C.bg}"/>
  <rect width="1500" height="500" fill="url(#grid)"/>
  <rect width="1500" height="500" fill="url(#g)"/>

  <!-- "claude code" subtitle in fire gradient -->
  <text x="80" y="155" font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace" font-size="22" font-weight="700" letter-spacing="0.4em" fill="url(#fire)">CLAUDE CODE</text>

  <!-- COMMANDER ASCII (dominant, aurora) -->
  ${asciiRow({
    x: 80,
    y: 200,
    lines: ASCII_COMMANDER,
    lineHeight: 22,
    fontSize: 20,
    fill: "url(#aurora)",
  })}

  <!-- Tagline + handle below -->
  <text x="80" y="365" font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="600" letter-spacing="-0.02em" fill="${C.fg}">The guided AI PM for Claude Code.</text>
  <text x="80" y="402" font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace" font-size="16" letter-spacing="0.04em" fill="${C.fgDim}">${STATS}</text>
  <text x="80" y="428" font-family="'JetBrains Mono','SF Mono',Menlo,Consolas,monospace" font-size="16" letter-spacing="0.04em" fill="${C.accent}">@commanderplugin  ·  commanderplugin.com</text>
</svg>`;

async function rasterize(name, svg, w, h, outDir) {
  const out = path.join(outDir, name);
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(w, h, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const { size } = fs.statSync(out);
  console.log(`✔ ${path.relative(ROOT, out).padEnd(36)} ${(size / 1024).toFixed(1)}KB`);
}

(async () => {
  await rasterize("og.png", OG_SVG, 1200, 630, path.join(ROOT, "docs"));
  await rasterize("og-image.png", OG_SVG, 1200, 630, path.join(ROOT, "site", "public"));
  await rasterize("x-banner.png", X_BANNER_SVG, 1500, 500, path.join(ROOT, "site", "public"));
  console.log(`\n  Brand: canonical CLAUDE / CODE / COMMANDER ASCII stack (ccc-hero.svg)`);
  console.log(`  COMMANDER is dominant; "Claude Code" is the version qualifier above`);
  console.log(`  Counts: ${CONTRACT.plugin_skills}/${CONTRACT.specialist_agents}/${CONTRACT.lifecycle_hooks}`);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
