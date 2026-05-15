#!/usr/bin/env node
// scripts/build-bible-pdf.mjs
// Convert docs/bible.html → docs/bible.pdf
// Requires: playwright (already in devDeps). No other deps.
// Run:      node scripts/build-bible-pdf.mjs

import { chromium } from 'playwright';
import { stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ─── paths ───────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const SRC_HTML   = path.join(ROOT, 'docs/bible.html');
const OUT_PDF    = path.join(ROOT, 'docs/bible.pdf');

// ─── log helper ──────────────────────────────────────────────────────
const t0 = Date.now();
const elapsed = () => ((Date.now() - t0) / 1000).toFixed(2) + 's';
const log = (msg) => console.log(`[build-bible-pdf ${elapsed()}] ${msg}`);
const warn = (msg) => console.warn(`[build-bible-pdf ${elapsed()}] ⚠  ${msg}`);

// ─── inject script (runs in page) ────────────────────────────────────
// Prepends a full-bleed cover page that matches the HTML hero, then
// adds CSS to bind the active chapter name into the running page header
// via CSS string-set / string() — Chromium supports this in print mode.
function injectPrintEnhancements() {
  // 1. Build cover page DOM
  const cover = document.createElement('section');
  cover.id = '__pdf_cover';
  cover.setAttribute('aria-hidden', 'true');
  cover.innerHTML = `
    <div class="__cover-inner">
      <div class="__cover-eyebrow">— The Complete Guide —</div>
      <pre class="__cover-banner" aria-label="CCC Commander">
 ██████╗ ██████╗ ██████╗
██╔════╝██╔════╝██╔════╝
██║     ██║     ██║
██║     ██║     ██║
╚██████╗╚██████╗╚██████╗
 ╚═════╝ ╚═════╝ ╚═════╝<small>C O M M A N D E R</small></pre>
      <h1 class="__cover-title">
        Kevin Z's<br>
        Claude Code <span class="__accent">Bible</span>
      </h1>
      <p class="__cover-tag">
        200+ best practices distilled into one reference.<br>
        7 chapters. The map for solo devs, indie hackers, and AI-first teams who want to ship.
      </p>
      <div class="__cover-meta">
        <span>v4.1.0-beta.2</span>
        <span class="__sep">·</span>
        <span>~30 min read</span>
        <span class="__sep">·</span>
        <span>Updated 2026-05-15</span>
        <span class="__sep">·</span>
        <span>Free forever</span>
      </div>
      <div class="__cover-foot">
        <span>CC COMMANDER</span>
        <span class="__sep">·</span>
        <span>commanderplugin.com/bible</span>
      </div>
    </div>
  `;
  document.body.insertBefore(cover, document.body.firstChild);

  // 2. Inject PDF-only CSS
  const style = document.createElement('style');
  style.id = '__pdf_styles';
  style.textContent = `
    /* Cover page — only visible in print */
    #__pdf_cover { display: none; }
    @media print {
      #__pdf_cover {
        display: block !important;
        position: relative;
        width: 100%;
        min-height: 9in;
        background:
          radial-gradient(60% 60% at 20% 10%, rgba(255,107,71,0.18), transparent 60%),
          radial-gradient(45% 35% at 80% 95%, rgba(212,165,116,0.08), transparent 70%),
          #0F0F0F !important;
        color: #F5F5F0 !important;
        padding: 1.2in 0.6in 1in !important;
        page-break-after: always;
        box-sizing: border-box;
      }
      #__pdf_cover .__cover-inner { max-width: 6.5in; }
      #__pdf_cover .__cover-eyebrow {
        font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
        font-size: 11pt;
        letter-spacing: .22em;
        text-transform: uppercase;
        color: #A8A8A0 !important;
        margin-bottom: 0.45in;
      }
      #__pdf_cover .__cover-banner {
        font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
        font-weight: 700;
        font-size: 17pt;
        line-height: 1.05;
        white-space: pre;
        color: #FF6B47 !important;
        margin: 0 0 0.5in 0;
        background: linear-gradient(180deg, #FF8B5C 0%, #FF6B47 45%, #C24E32 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      #__pdf_cover .__cover-banner small {
        display: block;
        font-size: .45em;
        margin-top: .4em;
        letter-spacing: .04em;
        background: linear-gradient(180deg, #D4A574, #8C6E48);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      #__pdf_cover .__cover-title {
        font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
        font-weight: 700;
        font-size: 42pt;
        line-height: 1.05;
        letter-spacing: -0.025em;
        color: #F5F5F0 !important;
        margin: 0 0 0.35in;
      }
      #__pdf_cover .__cover-title .__accent { color: #FF6B47 !important; }
      #__pdf_cover .__cover-tag {
        font-family: "Inter", system-ui, sans-serif;
        font-size: 14pt;
        line-height: 1.55;
        color: #A8A8A0 !important;
        margin: 0 0 0.5in;
      }
      #__pdf_cover .__cover-meta {
        font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
        font-size: 10pt;
        color: #A8A8A0 !important;
        display: block;
        margin-bottom: 1.2in;
      }
      #__pdf_cover .__cover-meta .__sep { opacity: 0.5; margin: 0 8px; }
      #__pdf_cover .__cover-foot {
        font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
        font-size: 10pt;
        color: #FF6B47 !important;
        letter-spacing: .12em;
        position: absolute;
        bottom: 0.9in;
        left: 0.6in;
      }
      #__pdf_cover .__cover-foot .__sep { color: #6E6E68 !important; margin: 0 8px; }

      /* Running chapter name in @top-right via string-set on H2s */
      .content h2 {
        string-set: chapter content(text);
      }
      @page {
        /* margin boxes — Chromium ignores some but string() is honored */
        @top-right {
          content: string(chapter, first);
          font-family: "JetBrains Mono", monospace;
          font-size: 9pt;
          color: #666;
        }
      }
      @page :first {
        /* Cover page — no header/footer */
        @top-right { content: ""; }
        @top-left { content: ""; }
        @bottom-left { content: ""; }
        @bottom-right { content: ""; }
        margin: 0 !important;
      }
      /* Ensure cover bleed reaches the edge */
      #__pdf_cover {
        margin: -1in -0.75in 0 !important;
        width: calc(100% + 1.5in) !important;
        padding-top: 1.6in !important;
        padding-left: 1.3in !important;
        padding-right: 1.3in !important;
      }
    }
  `;
  document.head.appendChild(style);

  // 3. Count rendered chapters so the build script can report
  return {
    h2Count: document.querySelectorAll('.content h2[id]').length,
    h3Count: document.querySelectorAll('.content h3[id]').length,
  };
}

// ─── playwright header/footer templates ──────────────────────────────
const headerTemplate = `
<div style="
  width: 100%;
  padding: 0 0.75in;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 8pt;
  color: #6e6e68;
  display: flex;
  justify-content: space-between;
  -webkit-print-color-adjust: exact;
">
  <span style="color: #6e6e68;">Kevin Z&apos;s Claude Code Bible</span>
  <span class="title" style="color: #6e6e68;"></span>
</div>
`;

const footerTemplate = `
<div style="
  width: 100%;
  padding: 0 0.75in;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 8pt;
  color: #6e6e68;
  display: flex;
  justify-content: space-between;
  -webkit-print-color-adjust: exact;
">
  <span style="color: #ff6b47;">commanderplugin.com/bible</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>
`;

// ─── main ────────────────────────────────────────────────────────────
async function main() {
  log('Starting build');
  log(`Source : ${path.relative(ROOT, SRC_HTML)}`);
  log(`Output : ${path.relative(ROOT, OUT_PDF)}`);

  // Verify source exists
  try {
    const s = await stat(SRC_HTML);
    if (!s.isFile()) throw new Error('not a file');
    log(`Found docs/bible.html (${(s.size / 1024).toFixed(1)} KB)`);
  } catch (e) {
    throw new Error(`docs/bible.html missing — run scripts/build-bible.mjs first (${e.message})`);
  }

  // Ensure output dir exists (it will, but idempotent)
  await mkdir(path.dirname(OUT_PDF), { recursive: true });

  // Boot chromium
  log('Launching Chromium…');
  const browser = await chromium.launch({
    args: [
      '--enable-blink-features=CSSPaintAPI',
      '--font-render-hinting=none',
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1720 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Surface in-page errors
  page.on('pageerror', (err) => warn(`page error: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') warn(`console error: ${msg.text()}`);
  });

  // Load HTML
  log('Loading HTML…');
  await page.goto(pathToFileURL(SRC_HTML).href, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Wait for marked.js to render content
  log('Waiting for content render…');
  try {
    await page.waitForFunction(
      () => !!document.querySelector('.content h2[id]') &&
            document.querySelectorAll('.content h2').length >= 4 &&
            !document.querySelector('.content .loading'),
      { timeout: 20000 }
    );
  } catch {
    warn('Content render timeout — proceeding anyway (HTML may be incomplete)');
  }

  // Let webfonts settle
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(500);

  // Inject cover page + print CSS
  log('Injecting cover page + chapter-string CSS…');
  const stats = await page.evaluate(injectPrintEnhancements);
  log(`Indexed ${stats.h2Count} chapters, ${stats.h3Count} sections`);

  // Switch to print media
  log('Switching to print media…');
  await page.emulateMedia({ media: 'print' });

  // Give the engine a tick to apply print styles
  await page.waitForTimeout(400);

  // Generate PDF
  log('Rendering PDF (this can take 15-45s for 100+ pages)…');
  const pdfOpts = {
    path: OUT_PDF,
    format: 'Letter',
    landscape: false,
    printBackground: true,
    preferCSSPageSize: false,
    margin: {
      top:    '1in',
      bottom: '1in',
      left:   '0.75in',
      right:  '0.75in',
    },
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    // Playwright ≥1.42 — emit a PDF outline from heading IDs
    outline: true,
    // Tag the PDF (Chromium feature; helps screen readers)
    tagged: true,
  };

  // Try with the modern outline/tagged options; fall back gracefully
  // for older Playwright versions.
  try {
    await page.pdf(pdfOpts);
  } catch (e) {
    if (/Unknown option|outline|tagged/.test(e.message)) {
      warn('Playwright < 1.42 detected — generating PDF without outline/tagged');
      delete pdfOpts.outline;
      delete pdfOpts.tagged;
      await page.pdf(pdfOpts);
    } else {
      throw e;
    }
  }

  await browser.close();
  log('Browser closed');

  // Report size
  const out = await stat(OUT_PDF);
  const mb = out.size / 1024 / 1024;
  log(`Wrote ${path.relative(ROOT, OUT_PDF)} (${mb.toFixed(2)} MB)`);

  if (mb > 2.0) {
    warn(`Size ${mb.toFixed(2)} MB exceeds 2 MB target.`);
    warn(`Try: reduce code-block syntax highlighting, or strip embedded fonts via Ghostscript:`);
    warn(`  gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dPDFSETTINGS=/printer \\`);
    warn(`     -dNOPAUSE -dQUIET -dBATCH -sOutputFile=docs/bible.compact.pdf docs/bible.pdf`);
  } else {
    log(`✓ Within size target (<2 MB)`);
  }

  log(`Done in ${elapsed()}`);
}

main().catch((err) => {
  console.error(`\n[build-bible-pdf] ✗ Failed: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
