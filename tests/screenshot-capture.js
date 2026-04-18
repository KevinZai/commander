#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ─── Terminal width/height override ──────────────────────────────────────────

process.stdout.columns = 120;
process.stdout.rows = 40;

// ─── ANSI to HTML Converter ───────────────────────────────────────────────────

// 256-color lookup table (6x6x6 color cube + grayscale ramp)
function color256ToRgb(n) {
  if (n < 16) {
    // Standard 16 colors
    const std = [
      [0,0,0],[128,0,0],[0,128,0],[128,128,0],
      [0,0,128],[128,0,128],[0,128,128],[192,192,192],
      [128,128,128],[255,0,0],[0,255,0],[255,255,0],
      [0,0,255],[255,0,255],[0,255,255],[255,255,255],
    ];
    return std[n] || [128,128,128];
  }
  if (n < 232) {
    // 6x6x6 color cube
    const idx = n - 16;
    const b = idx % 6;
    const g = Math.floor(idx / 6) % 6;
    const r = Math.floor(idx / 36);
    const toV = (v) => v === 0 ? 0 : 55 + v * 40;
    return [toV(r), toV(g), toV(b)];
  }
  // Grayscale ramp
  const v = 8 + (n - 232) * 10;
  return [v, v, v];
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ansiToHtml(ansi) {
  // State
  let fg = null;
  let bg = null;
  let bold = false;
  let dim = false;
  let italic = false;
  let underline = false;
  let spanOpen = false;
  let html = '';

  function openSpan() {
    const styles = [];
    if (fg) styles.push('color:' + fg);
    if (bg) styles.push('background-color:' + bg);
    if (bold) styles.push('font-weight:bold');
    if (dim) styles.push('opacity:0.6');
    if (italic) styles.push('font-style:italic');
    if (underline) styles.push('text-decoration:underline');
    if (styles.length > 0) {
      html += '<span style="' + styles.join(';') + '">';
      spanOpen = true;
    }
  }

  function closeSpan() {
    if (spanOpen) {
      html += '</span>';
      spanOpen = false;
    }
  }

  function resetAll() {
    closeSpan();
    fg = null;
    bg = null;
    bold = false;
    dim = false;
    italic = false;
    underline = false;
  }

  // Parse the ANSI string character by character
  let i = 0;
  while (i < ansi.length) {
    // Check for ESC sequence
    if (ansi[i] === '\x1b' && ansi[i + 1] === '[') {
      // Find the end of the sequence (letter terminator)
      let j = i + 2;
      while (j < ansi.length && !/[A-Za-z]/.test(ansi[j])) j++;
      const terminator = ansi[j];
      const params = ansi.slice(i + 2, j);

      if (terminator === 'm') {
        // SGR sequence — close current span before applying new styles
        closeSpan();

        if (params === '' || params === '0') {
          resetAll();
        } else {
          const codes = params.split(';').map(Number);
          let ci = 0;
          while (ci < codes.length) {
            const code = codes[ci];
            if (code === 0) {
              resetAll();
            } else if (code === 1) {
              bold = true;
            } else if (code === 2) {
              dim = true;
            } else if (code === 3) {
              italic = true;
            } else if (code === 4) {
              underline = true;
            } else if (code === 22) {
              bold = false; dim = false;
            } else if (code === 23) {
              italic = false;
            } else if (code === 24) {
              underline = false;
            } else if (code === 38) {
              if (codes[ci + 1] === 2 && ci + 4 < codes.length + 1) {
                // RGB fg: 38;2;r;g;b
                const r = codes[ci + 2], g = codes[ci + 3], b = codes[ci + 4];
                fg = 'rgb(' + r + ',' + g + ',' + b + ')';
                ci += 4;
              } else if (codes[ci + 1] === 5 && ci + 2 < codes.length + 1) {
                // 256-color fg: 38;5;n
                const [r, g, b] = color256ToRgb(codes[ci + 2]);
                fg = 'rgb(' + r + ',' + g + ',' + b + ')';
                ci += 2;
              }
            } else if (code === 48) {
              if (codes[ci + 1] === 2 && ci + 4 < codes.length + 1) {
                // RGB bg: 48;2;r;g;b
                const r = codes[ci + 2], g = codes[ci + 3], b = codes[ci + 4];
                bg = 'rgb(' + r + ',' + g + ',' + b + ')';
                ci += 4;
              } else if (codes[ci + 1] === 5 && ci + 2 < codes.length + 1) {
                // 256-color bg: 48;5;n
                const [r, g, b] = color256ToRgb(codes[ci + 2]);
                bg = 'rgb(' + r + ',' + g + ',' + b + ')';
                ci += 2;
              }
            } else if (code >= 30 && code <= 37) {
              // Standard fg colors
              const stdFg = [[0,0,0],[128,0,0],[0,128,0],[128,128,0],[0,0,128],[128,0,128],[0,128,128],[192,192,192]];
              const [r,g,b] = stdFg[code - 30];
              fg = 'rgb(' + r + ',' + g + ',' + b + ')';
            } else if (code === 39) {
              fg = null;
            } else if (code >= 40 && code <= 47) {
              const stdBg = [[0,0,0],[128,0,0],[0,128,0],[128,128,0],[0,0,128],[128,0,128],[0,128,128],[192,192,192]];
              const [r,g,b] = stdBg[code - 40];
              bg = 'rgb(' + r + ',' + g + ',' + b + ')';
            } else if (code === 49) {
              bg = null;
            } else if (code >= 90 && code <= 97) {
              // Bright standard fg
              const brightFg = [[128,128,128],[255,0,0],[0,255,0],[255,255,0],[0,0,255],[255,0,255],[0,255,255],[255,255,255]];
              const [r,g,b] = brightFg[code - 90];
              fg = 'rgb(' + r + ',' + g + ',' + b + ')';
            } else if (code >= 100 && code <= 107) {
              // Bright standard bg
              const brightBg = [[128,128,128],[255,0,0],[0,255,0],[255,255,0],[0,0,255],[255,0,255],[0,255,255],[255,255,255]];
              const [r,g,b] = brightBg[code - 100];
              bg = 'rgb(' + r + ',' + g + ',' + b + ')';
            }
            ci++;
          }
        }
        // Open a new span for the accumulated style state
        openSpan();
      }
      // Skip all other escape sequences (cursor movement, screen control, etc.)
      i = j + 1;
    } else if (ansi[i] === '\n') {
      closeSpan();
      html += '\n';
      if (fg || bg || bold || dim || italic || underline) openSpan();
      i++;
    } else if (ansi[i] === '\r') {
      // Carriage return — skip (we don't support in-place rewriting for static capture)
      i++;
      // Skip any content until the next newline (overwrite behavior)
      while (i < ansi.length && ansi[i] !== '\n') i++;
    } else {
      html += escapeHtml(ansi[i]);
      i++;
    }
  }

  closeSpan();
  return html;
}

function wrapHtml(title, bodyAnsi) {
  const body = ansiToHtml(bodyAnsi);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — CC Commander</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0a0a0f;
    font-family: 'JetBrains Mono', monospace;
    padding: 16px;
    margin: 0;
  }
  .terminal {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 28px 32px;
    max-width: 100%;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
  }
  .title-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #21262d;
  }
  .dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot-red { background: #ff5f56; }
  .dot-yellow { background: #ffbd2e; }
  .dot-green { background: #27c93f; }
  .title-text {
    color: #8b949e;
    font-size: 12px;
    margin-left: 8px;
    font-family: 'JetBrains Mono', monospace;
  }
  .content {
    font-size: 14px;
    line-height: 1.0;
    color: #c9d1d9;
    white-space: pre;
    font-family: 'JetBrains Mono', monospace;
  }
</style>
</head>
<body>
<div class="terminal">
  <div class="title-bar">
    <div class="dot dot-red"></div>
    <div class="dot dot-yellow"></div>
    <div class="dot dot-green"></div>
    <span class="title-text">${escapeHtml(title)}</span>
  </div>
  <div class="content">${body}</div>
</div>
</body>
</html>`;
}

// ─── Stdout capture helper ────────────────────────────────────────────────────

function capture(fn) {
  const chunks = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = function(chunk) {
    chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
    return true;
  };
  try {
    fn();
  } catch (err) {
    process.stdout.write = originalWrite;
    throw err;
  }
  process.stdout.write = originalWrite;
  return chunks.join('');
}

// ─── Import modules ───────────────────────────────────────────────────────────

const tui = require('../commander/tui');
const cockpit = require('../commander/cockpit');

// ─── Output directory ─────────────────────────────────────────────────────────

const OUT = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

let count = 0;
const errors = [];

function save(name, ansiContent) {
  try {
    // Strip cursor-movement / screen-control sequences for cleaner capture
    // Keep only printable content + SGR (color) sequences
    const cleaned = ansiContent
      .replace(/\x1b\[\?[0-9;]*[hl]/g, '')   // mode set/reset
      .replace(/\x1b\[[0-9]*[ABCDEFGJKST]/g, '') // cursor movement
      .replace(/\x1b\[[0-9;]*[Hf]/g, '')      // cursor position
      .replace(/\x1b\[[su]/g, '')             // save/restore cursor
      .replace(/\x1b\[[0-9]*[JK]/g, '');      // erase

    fs.writeFileSync(path.join(OUT, name + '.ansi'), ansiContent);
    fs.writeFileSync(path.join(OUT, name + '.html'), wrapHtml(name, cleaned));
    count++;
    console.log('  ✓ ' + name);
  } catch (err) {
    errors.push({ name, err });
    console.error('  ✗ ' + name + ': ' + err.message);
  }
}

function tryCapture(name, fn) {
  try {
    // fn() can either return a string or write to stdout
    const result = fn();
    if (typeof result === 'string' && result.length > 0) {
      save(name, result);
    } else {
      // fn wrote to stdout — but since we're not in capture mode, it won't be captured
      // Wrap in capture instead
      const out = capture(fn);
      save(name, out);
    }
  } catch (err) {
    errors.push({ name, err });
    console.error('  ✗ ' + name + ': ' + err.message);
  }
}

function tryReturn(name, fn) {
  try {
    const result = fn();
    if (typeof result === 'string') {
      save(name, result);
    } else {
      console.error('  ✗ ' + name + ': function returned non-string');
      errors.push({ name, err: new Error('non-string return') });
    }
  } catch (err) {
    errors.push({ name, err });
    console.error('  ✗ ' + name + ': ' + err.message);
  }
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const COCKPIT_DATA = {
  model: 'claude-opus-4-6',
  cost: 2.47,
  inputTokens: 145200,
  outputTokens: 12800,
  duration: '1h 23m',
  contextPct: 67,
  ratePct: 42,
  sessionMinutes: 180,
  sevenDayPercent: 35,
  linearTicket: 'CC-229',
  skillCount: 37,
  vendorCount: 19,
  activeSkill: 'tdd-guide',
  cwd: '~/projects/cc-commander',
  thinking: true,
  weekCost: 17.50,
  weekBudget: 50,
  totalMinutes: 180,
};

const DASHBOARD_DATA = {
  streak: 7,
  dailyCosts: [0.50, 1.20, 0.80, 2.10, 1.50, 0.90, 2.47],
  dailySessions: [3, 5, 2, 7, 4, 1, 6],
  level: 'power',
  levelProgress: 75,
  sessions: 142,
  achievements: 12,
  cost: 23.50,
};

// ─── 1. Cockpit status panel ─────────────────────────────────────────────────

console.log('\n[1] Cockpit status panel');
tui.setTheme('cyberpunk');
tryReturn('cockpit-status', function() {
  return cockpit.renderCockpitStatus(COCKPIT_DATA);
});

// ─── 2. Cockpit footer ────────────────────────────────────────────────────────

console.log('\n[2] Cockpit footer');
tryReturn('cockpit-footer', function() {
  return cockpit.renderCockpitFooter(COCKPIT_DATA);
});

// ─── 3. Progress bars ─────────────────────────────────────────────────────────

console.log('\n[3] Progress bars');
tryReturn('progress-bars', function() {
  const pcts = [0, 25, 50, 75, 100];
  const lines = pcts.map(function(pct) {
    const label = tui.dimText(String(pct).padStart(3) + '% ');
    return '  ' + label + tui.progressBar(pct, 100, 40);
  });
  return '\n' + tui.divider('Progress Bars') + '\n\n' + lines.join('\n') + '\n';
});

// ─── 4. Stats card ────────────────────────────────────────────────────────────

console.log('\n[4] Stats card');
tryReturn('stats-card', function() {
  return '\n' + tui.statsCard({
    Sessions: '142',
    Streak: '🔥 7 days',
    Level: 'Power User',
    'Total Cost': '$23.50',
    Skills: '37 installed',
  }) + '\n';
});

// ─── 5. Dashboard ─────────────────────────────────────────────────────────────

console.log('\n[5] Dashboard');
tryReturn('dashboard', function() {
  return tui.renderDashboard(DASHBOARD_DATA);
});

// ─── 6. Menu mock ─────────────────────────────────────────────────────────────

console.log('\n[6] Main menu');
tryReturn('main-menu', function() {
  const t = tui.getTheme();
  const items = [
    { label: 'Build something new',     desc: 'Code, websites, APIs, CLI tools',           active: true  },
    { label: 'Create content',           desc: 'Marketing, social media, writing',           active: false },
    { label: 'Research & analyze',       desc: 'Competitive analysis, reports, audits',      active: false },
    { label: 'Review what I built',      desc: 'Recent sessions and results',                active: false },
    { label: 'Learn a new skill',        desc: 'Browse 450+ skills and guides',              active: false },
    { label: 'Check my stats',           desc: 'Dashboard, streaks, achievements',           active: false },
    { label: 'Night Mode',              desc: '8-hour autonomous build',                    active: false },
    { label: 'Settings',                desc: 'Name, level, cost, theme',                   active: false },
    { label: 'Infrastructure & Fleet',   desc: 'Fleet Commander, Synapse, Cost tracking',    active: false },
  ];
  const S = tui.S;
  const bar = tui.colorText(S.BAR, t.dim);

  let out = '\n';
  out += bar + '\n';
  out += tui.colorText(S.STEP_ACTIVE + '  ', t.primary) + tui.boldText('What would you like to do?', t.text) + '\n';

  items.forEach(function(item) {
    out += bar + '  ';
    if (item.active) {
      out += tui.colorText(S.RADIO_ON + ' ', t.primary) + tui.boldText(item.label, t.primary);
    } else {
      out += tui.colorText(S.RADIO_OFF + ' ', t.dim) + tui.colorText(item.label, t.text);
    }
    out += '\n';
    if (item.desc) {
      out += bar + '     ';
      if (item.active) {
        out += tui.colorText(item.desc, t.primary);
      } else {
        out += tui.dimText(item.desc);
      }
      out += '\n';
    }
  });

  out += bar + '\n';
  out += bar + '  ' + tui.colorText('[↑↓] navigate  [enter] select  [q] quit  [?] help', t.dim) + '\n';
  return out;
});

// ─── 7. ASCII meters ─────────────────────────────────────────────────────────

console.log('\n[7] ASCII meters');
tryReturn('meters', function() {
  const t = tui.getTheme();
  const ctx = cockpit.asciiMeter(67, 100, 20, 'CTX', [139, 92, 246]);
  const rate = cockpit.asciiMeter(42, 100, 20, 'RATE', [52, 211, 153]);
  const mini = cockpit.miniMeter(75, [255, 176, 0], '2h30m');
  return '\n' + tui.divider('Meters') + '\n\n'
    + '  ' + ctx + '\n\n'
    + '  ' + rate + '\n\n'
    + '  ' + tui.dimText('Mini: ') + mini + '\n';
});

// ─── 8. Gallery page ─────────────────────────────────────────────────────────

console.log('\n[8] Gallery');
function buildGallery() {
  // Collect all HTML file names (excluding gallery itself)
  const files = fs.readdirSync(OUT)
    .filter(function(f) { return f.endsWith('.html') && f !== 'gallery.html'; })
    .sort();

  const cards = files.map(function(f) {
    const label = f.replace('.html', '');
    return `    <div class="card">
      <div class="card-title">${escapeHtml(label)}</div>
      <iframe src="${escapeHtml(f)}" loading="lazy" scrolling="no"></iframe>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CC Commander — Visual Gallery</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #020209;
    font-family: 'JetBrains Mono', monospace;
    color: #c9d1d9;
    padding: 40px 32px;
  }
  header {
    text-align: center;
    margin-bottom: 48px;
  }
  header h1 {
    font-size: 28px;
    background: linear-gradient(90deg, #00ffff, #ff0080, #8000ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }
  header p {
    color: #6e7681;
    font-size: 13px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .card {
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .card:hover {
    border-color: #388bfd;
  }
  .card-title {
    padding: 10px 16px;
    font-size: 11px;
    color: #8b949e;
    border-bottom: 1px solid #21262d;
    background: #161b22;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  iframe {
    width: 100%;
    height: 360px;
    border: none;
    display: block;
    background: #0d1117;
  }
  footer {
    text-align: center;
    margin-top: 48px;
    color: #484f58;
    font-size: 12px;
  }
  footer a { color: #388bfd; text-decoration: none; }
</style>
</head>
<body>
<header>
  <h1>CC Commander — Visual Gallery</h1>
  <p>All ${files.length} UI components rendered • Generated ${new Date().toISOString().slice(0, 10)}</p>
</header>
<div class="grid">
${cards}
</div>
<footer>
  <p>CC Commander v2.3.0 — <a href="https://github.com/KevinZai/commander">github.com/KevinZai/commander</a></p>
</footer>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, 'gallery.html'), html);
  count++;
  console.log('  ✓ gallery');
}

try {
  buildGallery();
} catch (err) {
  errors.push({ name: 'gallery', err });
  console.error('  ✗ gallery: ' + err.message);
}

// ─── PNG generation via Playwright ───────────────────────────────────────────

async function generatePngs() {
  const wantPng = process.argv.includes('--png');
  if (!wantPng) return;

  console.log('\n[16] Generating PNGs via Playwright');

  let playwright;
  try {
    playwright = require('playwright');
  } catch (_) {
    console.log('  ⚠ playwright not installed — run: npm i -D playwright');
    console.log('  Skipping PNG generation.');
    return;
  }

  const pngDir = path.join(OUT, 'png');
  fs.mkdirSync(pngDir, { recursive: true });

  const htmlFiles = fs.readdirSync(OUT)
    .filter(function(f) { return f.endsWith('.html') && f !== 'gallery.html'; })
    .sort();

  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });

  let pngCount = 0;
  for (const file of htmlFiles) {
    const name = file.replace('.html', '');
    try {
      const page = await ctx.newPage();
      await page.goto('file://' + path.join(OUT, file));
      await page.waitForTimeout(300);

      const terminal = await page.$('.terminal');
      if (terminal) {
        await terminal.screenshot({ path: path.join(pngDir, name + '.png') });
      } else {
        await page.screenshot({ path: path.join(pngDir, name + '.png') });
      }
      await page.close();
      pngCount++;
      console.log('  ✓ ' + name + '.png');
    } catch (err) {
      console.error('  ✗ ' + name + '.png: ' + err.message);
    }
  }

  await browser.close();
  console.log('  ' + pngCount + ' PNGs saved to screenshots/png/');

  // Generate image-based gallery
  const imgCards = htmlFiles.map(function(f) {
    const name = f.replace('.html', '');
    return '    <div class="card">\n' +
      '      <div class="card-title">' + escapeHtml(name) + '</div>\n' +
      '      <img src="png/' + escapeHtml(name) + '.png" alt="' + escapeHtml(name) + '" loading="lazy">\n' +
      '    </div>';
  }).join('\n');

  const galleryHtml = '<!DOCTYPE html>\n' +
    '<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>CC Commander — Screenshot Gallery</title>\n' +
    '<style>\n' +
    '  * { box-sizing: border-box; margin: 0; padding: 0; }\n' +
    '  body {\n' +
    '    background: #020209;\n' +
    '    font-family: -apple-system, BlinkMacSystemFont, sans-serif;\n' +
    '    color: #c9d1d9;\n' +
    '    padding: 40px 32px;\n' +
    '  }\n' +
    '  header { text-align: center; margin-bottom: 48px; }\n' +
    '  header h1 {\n' +
    '    font-size: 28px;\n' +
    '    background: linear-gradient(90deg, #00ffff, #ff0080, #8000ff);\n' +
    '    -webkit-background-clip: text;\n' +
    '    -webkit-text-fill-color: transparent;\n' +
    '    background-clip: text;\n' +
    '    margin-bottom: 8px;\n' +
    '  }\n' +
    '  header p { color: #6e7681; font-size: 13px; }\n' +
    '  .grid {\n' +
    '    display: grid;\n' +
    '    grid-template-columns: repeat(2, 1fr);\n' +
    '    gap: 24px;\n' +
    '    max-width: 1400px;\n' +
    '    margin: 0 auto;\n' +
    '  }\n' +
    '  .card {\n' +
    '    background: #0d1117;\n' +
    '    border: 1px solid #21262d;\n' +
    '    border-radius: 12px;\n' +
    '    overflow: hidden;\n' +
    '    transition: border-color 0.2s;\n' +
    '  }\n' +
    '  .card:hover { border-color: #388bfd; }\n' +
    '  .card-title {\n' +
    '    padding: 10px 16px;\n' +
    '    font-size: 11px;\n' +
    '    color: #8b949e;\n' +
    '    border-bottom: 1px solid #21262d;\n' +
    '    background: #161b22;\n' +
    '    letter-spacing: 0.05em;\n' +
    '    text-transform: uppercase;\n' +
    '    font-family: monospace;\n' +
    '  }\n' +
    '  .card img {\n' +
    '    width: 100%;\n' +
    '    display: block;\n' +
    '    background: #0d1117;\n' +
    '  }\n' +
    '  footer {\n' +
    '    text-align: center;\n' +
    '    margin-top: 48px;\n' +
    '    color: #484f58;\n' +
    '    font-size: 12px;\n' +
    '  }\n' +
    '  footer a { color: #388bfd; text-decoration: none; }\n' +
    '</style>\n</head>\n<body>\n' +
    '<header>\n' +
    '  <h1>CC Commander — Screenshot Gallery</h1>\n' +
    '  <p>' + htmlFiles.length + ' screenshots • Generated ' + new Date().toISOString().slice(0, 10) + '</p>\n' +
    '</header>\n' +
    '<div class="grid">\n' + imgCards + '\n</div>\n' +
    '<footer>\n' +
    '  <p>CC Commander v2.3.0</p>\n' +
    '</footer>\n</body>\n</html>';

  fs.writeFileSync(path.join(OUT, 'gallery.html'), galleryHtml);
  console.log('  ✓ gallery.html (image-based)');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

generatePngs().then(function() {
  console.log('\n' + '─'.repeat(50));
  console.log('✅ ' + count + ' screenshots saved to screenshots/');
  if (errors.length > 0) {
    console.log('⚠️  ' + errors.length + ' errors:');
    errors.forEach(function(e) {
      console.log('   - ' + e.name + ': ' + e.err.message);
    });
  }
  console.log('📁 ' + OUT);
}).catch(function(err) {
  console.error('PNG generation failed:', err.message);
  process.exit(1);
});
