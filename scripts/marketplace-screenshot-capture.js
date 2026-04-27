#!/usr/bin/env node
/**
 * marketplace-screenshot-capture.js
 *
 * Verifies and prepares CC Commander marketplace screenshots for Codex Desktop submission.
 *
 * Source:  docs/marketing/screenshots/  (6 PNG files, captured by Wave 4-W3)
 * Output:  assets/marketplace/screenshot-{1..5}.png  (resized to 1280×720 if needed)
 *
 * Codex Desktop marketplace spec (from wave4-codex-desktop-gui-spec.md §3):
 *   - Format: PNG
 *   - Dimensions: 1200×800 px (spec) — this script targets 1280×720 (16:9, common standard)
 *   - Count: up to 5
 *
 * Usage:
 *   node scripts/marketplace-screenshot-capture.js [--dry-run] [--width N] [--height N]
 *
 * Options:
 *   --dry-run    Report dimension mismatches but do not write output files
 *   --width N    Target width in px (default: 1280)
 *   --height N   Target height in px (default: 720)
 *   --no-resize  Skip resize — copy as-is and warn on dimension mismatch
 */

import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCE_DIR = path.join(ROOT, 'docs', 'marketing', 'screenshots');
const OUTPUT_DIR = path.join(ROOT, 'assets', 'marketplace');

// Wave 4-W3 canonical screenshot order → marketplace slot mapping
const SCREENSHOT_MAP = [
  { source: 'codex-1-hero.png',                       slot: 1, description: 'Hero / main workflow' },
  { source: 'codex-2-architecture-diagram.png',        slot: 2, description: 'Brain+hands architecture' },
  { source: 'codex-3-spec-convergence-timeline.png',   slot: 3, description: 'Spec convergence timeline' },
  { source: 'codex-4-fleet-orchestration.png',         slot: 4, description: 'Fleet orchestration' },
  { source: 'codex-5-before-after.png',                slot: 5, description: 'Before/after comparison' },
  // codex-6-cross-platform-marketplace.png omitted — Codex Desktop allows max 5
];

const DEFAULT_WIDTH  = 1280;
const DEFAULT_HEIGHT = 720;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    dryRun:   argv.includes('--dry-run'),
    noResize: argv.includes('--no-resize'),
    width:    DEFAULT_WIDTH,
    height:   DEFAULT_HEIGHT,
  };

  const wi = argv.indexOf('--width');
  if (wi !== -1 && argv[wi + 1]) args.width = parseInt(argv[wi + 1], 10);

  const hi = argv.indexOf('--height');
  if (hi !== -1 && argv[hi + 1]) args.height = parseInt(argv[hi + 1], 10);

  return args;
}

/**
 * Naively reads PNG dimensions from the IHDR chunk.
 * Does not require sharp or canvas — pure Node built-ins.
 * Returns { width, height } or null if the file is not a valid PNG.
 */
async function readPngDimensions(filePath) {
  let buf;
  try {
    buf = await readFile(filePath);
  } catch {
    return null;
  }

  // PNG magic: 8 bytes, IHDR chunk starts at byte 8
  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.slice(0, 8).equals(PNG_MAGIC)) return null;

  // IHDR: 4 bytes length, 4 bytes "IHDR", 4 bytes width, 4 bytes height
  const width  = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

/**
 * Attempts to resize a PNG using sharp (if installed) or reports a manual step.
 * Returns true if resized, false if sharp is unavailable.
 */
async function tryResizeWithSharp(srcPath, destPath, targetWidth, targetHeight) {
  try {
    const { default: sharp } = await import('sharp');
    await sharp(srcPath)
      .resize(targetWidth, targetHeight, { fit: 'cover', position: 'center' })
      .png({ compressionLevel: 8 })
      .toFile(destPath);
    return true;
  } catch {
    // sharp not installed — that is fine, we fall back to copy + warn
    return false;
  }
}

async function run() {
  const args = parseArgs();

  console.log('CC Commander — marketplace screenshot preparation');
  console.log(`Source:  ${SOURCE_DIR}`);
  console.log(`Output:  ${OUTPUT_DIR}`);
  console.log(`Target:  ${args.width}×${args.height} px`);
  if (args.dryRun)   console.log('Mode:    DRY RUN (no files written)');
  if (args.noResize) console.log('Mode:    NO RESIZE (copy as-is)');
  console.log('');

  if (!args.dryRun) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  let allOk = true;

  for (const { source, slot, description } of SCREENSHOT_MAP) {
    const srcPath  = path.join(SOURCE_DIR, source);
    const destName = `screenshot-${slot}.png`;
    const destPath = path.join(OUTPUT_DIR, destName);

    // Check source exists
    let srcStat;
    try {
      srcStat = await stat(srcPath);
    } catch {
      console.error(`  [MISSING] ${source} — not found in ${SOURCE_DIR}`);
      allOk = false;
      continue;
    }

    const dims = await readPngDimensions(srcPath);
    const sizeKB = Math.round(srcStat.size / 1024);

    const dimStr = dims ? `${dims.width}×${dims.height}` : 'unknown';
    const needsResize = dims && (dims.width !== args.width || dims.height !== args.height);

    let action = 'copy';
    if (needsResize && !args.noResize) action = 'resize+copy';
    if (args.dryRun) action = `[dry-run] would ${action}`;

    console.log(`  [slot ${slot}] ${description}`);
    console.log(`           src:  ${source} (${dimStr}, ${sizeKB} KB)`);
    console.log(`           dest: ${destName}`);
    console.log(`           action: ${action}`);

    if (needsResize && !args.noResize) {
      console.log(`           ! dimensions differ — resizing to ${args.width}×${args.height}`);
    }

    if (!args.dryRun) {
      if (needsResize && !args.noResize) {
        const resized = await tryResizeWithSharp(srcPath, destPath, args.width, args.height);
        if (!resized) {
          console.log(`           ! sharp not available — copying as-is. Install with: npm i -g sharp`);
          console.log(`             Then re-run this script to auto-resize.`);
          await copyFile(srcPath, destPath);
        }
      } else {
        await copyFile(srcPath, destPath);
      }
    }

    console.log('');
  }

  // Summary
  if (allOk) {
    console.log('All 5 screenshots prepared.');
    if (!args.dryRun) {
      console.log(`\nNext steps:`);
      console.log(`  1. Verify PNGs in ${OUTPUT_DIR}`);
      console.log(`  2. Export SVG assets to PNG:`);
      console.log(`     rsvg-convert -w 64  assets/marketplace/composer-icon.svg -o assets/marketplace/composer-icon.png`);
      console.log(`     rsvg-convert -w 256 assets/marketplace/logo.svg           -o assets/marketplace/logo.png`);
      console.log(`  3. Update manifest.template.json with screenshot paths (see assets/marketplace/README.md)`);
      console.log(`  4. Submit: npx codex-marketplace add KevinZai/commander --plugins`);
    }
  } else {
    console.error('\nSome screenshots are missing. Check docs/marketing/screenshots/.');
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exitCode = 1;
});
