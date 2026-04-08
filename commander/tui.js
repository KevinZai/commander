'use strict';

var figlet = require('figlet');
var readline = require('readline');

// ─── Theme System ─────────────────────────────────────────────────

var THEMES = {
  cyberpunk: {
    name: 'Cyberpunk',
    logo: { font: 'ANSI Shadow', gradient: [[255, 0, 128], [0, 255, 255]] },
    primary: [0, 255, 255],
    secondary: [255, 0, 128],
    accent: [128, 0, 255],
    highlight: [25, 25, 30],
    dim: [80, 80, 120],
    text: [200, 200, 230],
    success: [0, 255, 128],
    error: [255, 50, 80],
    border: 'rounded',
  },
  fire: {
    name: 'Fire',
    logo: { font: 'ANSI Shadow', gradient: [[255, 200, 0], [255, 50, 0]] },
    primary: [255, 165, 0],
    secondary: [255, 80, 0],
    accent: [255, 220, 100],
    highlight: [30, 20, 15],
    dim: [140, 100, 60],
    text: [255, 230, 200],
    success: [100, 255, 100],
    error: [255, 50, 50],
    border: 'heavy',
  },
  graffiti: {
    name: 'Graffiti',
    logo: { font: 'Graffiti', gradient: [[255, 255, 0], [255, 0, 100], [0, 200, 255]] },
    primary: [255, 255, 0],
    secondary: [255, 0, 100],
    accent: [0, 200, 255],
    highlight: [25, 25, 20],
    dim: [120, 120, 80],
    text: [230, 230, 200],
    success: [0, 255, 0],
    error: [255, 0, 0],
    border: 'single',
  },
  futuristic: {
    name: 'Futuristic',
    logo: { font: 'Calvin S', gradient: [[120, 180, 255], [200, 140, 255]] },
    primary: [120, 180, 255],
    secondary: [200, 140, 255],
    accent: [100, 255, 200],
    highlight: [22, 25, 30],
    dim: [90, 100, 130],
    text: [210, 220, 240],
    success: [100, 255, 180],
    error: [255, 100, 120],
    border: 'rounded',
  },
};

// Load extended theme pack
try { var extra = require('./themes-extra'); Object.keys(extra).forEach(function(k) { THEMES[k] = extra[k]; }); } catch (_e) {}

var activeTheme = 'cyberpunk';

function setTheme(name) {
  if (THEMES[name]) activeTheme = name;
}

function getTheme() {
  return THEMES[activeTheme];
}

function getThemeNames() {
  return Object.keys(THEMES);
}

// ─── Clack-inspired symbol vocabulary ────────────────────────────

var S = {
  BAR: '\u2502', BAR_START: '\u250c', BAR_END: '\u2514',
  STEP_ACTIVE: '\u25c6', STEP_DONE: '\u25c7', STEP_CANCEL: '\u25a0', STEP_ERROR: '\u25b2',
  RADIO_ON: '\u25cf', RADIO_OFF: '\u25cb',
  CONNECTOR: '\u251c', CORNER: '\u2570',
};

// ─── ANSI Primitives ──────────────────────────────────────────────

var ESC = '\x1b[';
var RESET = ESC + '0m';

function rgb(r, g, b) { return ESC + '38;2;' + r + ';' + g + ';' + b + 'm'; }
function bgRgb(r, g, b) { return ESC + '48;2;' + r + ';' + g + ';' + b + 'm'; }
var BOLD = ESC + '1m';
var DIM = ESC + '2m';
var ITALIC = ESC + '3m';

function colorText(text, color) { return rgb(color[0], color[1], color[2]) + text + RESET; }
function boldText(text, color) { if (!text) return ''; if (!color) color = getTheme().text; return BOLD + rgb(color[0], color[1], color[2]) + text + RESET; }
function dimText(text) { var t = getTheme(); return rgb(t.dim[0], t.dim[1], t.dim[2]) + text + RESET; }

// ─── Gradient Engine ──────────────────────────────────────────────

function gradient(text, stops) {
  if (!text) return '';
  if (!stops || stops.length < 2) return text;
  var segs = stops.length - 1;
  var out = '';
  for (var i = 0; i < text.length; i++) {
    if (text[i] === ' ' || text[i] === '\n') { out += text[i]; continue; }
    var t = text.length <= 1 ? 0 : i / (text.length - 1);
    var sf = t * segs;
    var si = Math.min(Math.floor(sf), segs - 1);
    var st = sf - si;
    var r = Math.round(stops[si][0] + (stops[si + 1][0] - stops[si][0]) * st);
    var g = Math.round(stops[si][1] + (stops[si + 1][1] - stops[si][1]) * st);
    var b = Math.round(stops[si][2] + (stops[si + 1][2] - stops[si][2]) * st);
    out += rgb(r, g, b) + text[i];
  }
  return out + RESET;
}

// Full lolcat-style rainbow: red → yellow → green → cyan → blue → magenta
var RAINBOW_STOPS = [[255,0,0],[255,255,0],[0,255,0],[0,255,255],[0,0,255],[255,0,255]];
function rainbow(text) { return BOLD + gradient(text, RAINBOW_STOPS) + RESET; }

// Animated cycling rainbow — colors shift through text over time
// Returns { start(), stop() } controller. Renders in-place using cursor movement.
function animatedRainbow(text, opts) {
  opts = opts || {};
  var speed = opts.speed || 80;
  var duration = opts.duration || 2000;
  var lines = text.split('\n');
  var totalChars = text.replace(/\n/g, '').replace(/ /g, '').length;
  var phase = 0;
  var timer = null;
  var lineCount = lines.length;

  function renderFrame() {
    // Move cursor up to overwrite previous frame
    if (phase > 0) process.stdout.write('\x1b[' + lineCount + 'A');
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var out = BOLD;
      var charIdx = 0;
      for (var ci = 0; ci < line.length; ci++) {
        if (line[ci] === ' ') { out += ' '; continue; }
        var hue = ((charIdx + li * 3 + phase) % 360);
        var c = hslToRgb(hue / 360, 1.0, 0.55);
        out += rgb(c[0], c[1], c[2]) + line[ci];
        charIdx++;
      }
      process.stdout.write(out + RESET + '\n');
    }
    phase += 4;
  }

  return {
    start: function() {
      renderFrame();
      timer = setInterval(renderFrame, speed);
      if (duration > 0) {
        setTimeout(function() { if (timer) { clearInterval(timer); timer = null; } }, duration);
      }
    },
    stop: function() { if (timer) { clearInterval(timer); timer = null; } }
  };
}

// HSL to RGB helper for smooth animated hue cycling
function hslToRgb(h, s, l) {
  var r, g, b;
  if (s === 0) { r = g = b = l; } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function gradientLines(lines, topColor, bottomColor) {
  return lines.map(function(line, i) {
    var t = lines.length <= 1 ? 0 : i / (lines.length - 1);
    var r = Math.round(topColor[0] + (bottomColor[0] - topColor[0]) * t);
    var g = Math.round(topColor[1] + (bottomColor[1] - topColor[1]) * t);
    var b = Math.round(topColor[2] + (bottomColor[2] - topColor[2]) * t);
    return rgb(r, g, b) + line + RESET;
  });
}

// ─── Big ASCII Logo ───────────────────────────────────────────────

function renderLogo(text) {
  var t = getTheme();
  var art;
  try {
    art = figlet.textSync(text || 'CC COMMANDER', {
      font: t.logo.font,
      horizontalLayout: 'fitted',
    });
  } catch (_e) {
    art = figlet.textSync(text || 'CC COMMANDER', { font: 'Standard' });
  }
  // Rainbow-colored logo using HSL cycling (static frame — animated version via animateLogo)
  var lines = art.split('\n');
  var out = '\n';
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li];
    var colored = BOLD;
    var charIdx = 0;
    for (var ci = 0; ci < line.length; ci++) {
      if (line[ci] === ' ') { colored += ' '; continue; }
      var hue = ((charIdx * 8 + li * 25) % 360);
      var c = hslToRgb(hue / 360, 0.9, 0.6);
      colored += rgb(c[0], c[1], c[2]) + line[ci];
      charIdx++;
    }
    out += colored + RESET + '\n';
  }
  return out;
}

// Animated rainbow logo — call start() to begin cycling, stop() when done
function animateLogo(text) {
  var art;
  var t = getTheme();
  try {
    art = figlet.textSync(text || 'CC COMMANDER', { font: t.logo.font, horizontalLayout: 'fitted' });
  } catch (_e) {
    art = figlet.textSync(text || 'CC COMMANDER', { font: 'Standard' });
  }
  return animatedRainbow(art, { speed: 60, duration: 3000 });
}

// ─── Box Drawing ──────────────────────────────────────────────────

var BORDERS = {
  single:  { tl: '\u250c', tr: '\u2510', bl: '\u2514', br: '\u2518', h: '\u2500', v: '\u2502' },
  double:  { tl: '\u2554', tr: '\u2557', bl: '\u255a', br: '\u255d', h: '\u2550', v: '\u2551' },
  rounded: { tl: '\u256d', tr: '\u256e', bl: '\u2570', br: '\u256f', h: '\u2500', v: '\u2502' },
  heavy:   { tl: '\u250f', tr: '\u2513', bl: '\u2517', br: '\u251b', h: '\u2501', v: '\u2503' },
};

function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

function box(content, width) {
  var t = getTheme();
  var b = BORDERS[t.border] || BORDERS.rounded;
  var lines = content.split('\n');
  if (!width) width = Math.max.apply(null, lines.map(function(l) { return stripAnsi(l).length; }));
  var pad = function(l) { return l + ' '.repeat(Math.max(0, width - stripAnsi(l).length)); };
  var bc = rgb(t.primary[0], t.primary[1], t.primary[2]);

  var top = bc + b.tl + b.h.repeat(width + 2) + b.tr + RESET;
  var bot = bc + b.bl + b.h.repeat(width + 2) + b.br + RESET;
  var mid = lines.map(function(l) { return bc + b.v + RESET + ' ' + pad(l) + ' ' + bc + b.v + RESET; }).join('\n');
  return top + '\n' + mid + '\n' + bot;
}

// ─── Arrow-Key Select Menu ────────────────────────────────────────

function select(items, prompt, options) {
  return new Promise(function(resolve) {
    // Start selection on first non-separator item
    var sel = 0;
    while (sel < items.length && typeof items[sel] !== 'string' && items[sel] && items[sel].separator === true) sel++;
    var onChange = options && options.onChange;
    var stdin = process.stdin;
    var stdout = process.stdout;
    var t = getTheme();

    if (!stdin.setRawMode) {
      // Fallback for non-TTY: use letter-based selection
      stdout.write('\n  ' + (prompt || 'Choose:') + '\n\n');
      items.forEach(function(item, i) {
        var label = typeof item === 'string' ? item : item.label;
        var desc = typeof item === 'string' ? '' : (item.description || '');
        var key = String.fromCharCode(97 + i);
        stdout.write('    ' + colorText(key + ')', t.primary) + ' ' + label);
        if (desc) stdout.write('  ' + dimText(desc));
        stdout.write('\n');
      });
      stdout.write('\n');
      var rl = readline.createInterface({ input: stdin, output: stdout });
      rl.question('  > ', function(answer) {
        rl.close();
        var idx = answer.trim().charCodeAt(0) - 97;
        if (idx >= 0 && idx < items.length) resolve(idx);
        else resolve(-1);
      });
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    readline.emitKeypressEvents(stdin);
    stdout.write(ESC + '?25l'); // hide cursor
    stdout.write('\x1b[?1000h\x1b[?1006h'); // enable mouse click reporting (SGR mode)

    // Pipe-rail style: BAR prefix every line, RADIO symbols, hint bar at bottom
    var totalLines = 1; // blank pipe-rail line before prompt
    totalLines += 1;    // prompt line (◆  prompt text)
    items.forEach(function(item) {
      if (typeof item !== 'string' && item.separator === true) { totalLines++; return; } // separator → blank pipe-rail line
      totalLines++; // label line
      if (typeof item !== 'string' && item.description) totalLines++; // subtitle
    });
    totalLines += 1; // blank pipe-rail line after items
    totalLines += 1; // hint bar

    var bar = colorText(S.BAR, t.dim);

    function draw() {
      stdout.write('\x1b[u'); // restore saved cursor position
      stdout.write('\x1b[J'); // clear from cursor to end of screen

      // Blank pipe-rail line above prompt
      stdout.write(ESC + '2K' + bar + '\n');

      // Prompt line: ◆  prompt text
      stdout.write(ESC + '2K' + colorText(S.STEP_ACTIVE + '  ', t.primary) + '\x1b[38;5;255m\x1b[1m' + (prompt || 'What would you like to do?') + RESET + '\n');

      items.forEach(function(item, i) {
        var isSeparator = typeof item !== 'string' && item.separator === true;
        if (isSeparator) {
          stdout.write(ESC + '2K' + bar + '\n'); // blank pipe-rail separator
          return;
        }
        var active = i === sel;
        var label = typeof item === 'string' ? item : item.label;
        var desc = typeof item === 'string' ? '' : (item.description || '');

        stdout.write(ESC + '2K' + bar + '  ');
        if (active) {
          // ● selected — rainbow HSL cycling per character
          var rainbowLabel = '';
          var ci = 0;
          for (var rc = 0; rc < label.length; rc++) {
            if (label[rc] === ' ') { rainbowLabel += ' '; continue; }
            var hue = ((ci * 25 + Date.now() / 20) % 360);
            var c = hslToRgb(hue / 360, 0.9, 0.65);
            rainbowLabel += rgb(c[0], c[1], c[2]) + label[rc];
            ci++;
          }
          stdout.write(colorText(S.RADIO_ON + ' ', t.primary) + BOLD + rainbowLabel + RESET);
        } else {
          // ○ unselected — bright white, readable on dark bg
          stdout.write(colorText(S.RADIO_OFF + ' ', t.dim) + '\x1b[38;5;253m' + label + RESET);
        }
        stdout.write('\n');
        if (desc) {
          stdout.write(ESC + '2K' + bar + '     ');
          if (active) {
            stdout.write(colorText(desc, t.primary));
          } else {
            stdout.write('\x1b[38;5;245m' + desc + RESET);
          }
          stdout.write('\n');
        }
      });

      // Blank pipe-rail line + hint bar
      stdout.write(ESC + '2K' + bar + '\n');
      stdout.write(ESC + '2K' + bar + '  ' + colorText('[↑↓] navigate  [enter] select  [q] quit  [?] help', t.dim) + '\n');
    }

    // Save cursor position, reserve space + initial draw
    stdout.write('\x1b[s'); // save cursor position
    stdout.write('\n'.repeat(totalLines));
    draw();

    function isSeparatorItem(idx) {
      var item = items[idx];
      return typeof item !== 'string' && item && item.separator === true;
    }

    // Track the row offset where menu items begin (for mouse click mapping)
    // Layout: saved-cursor-pos + 1 blank + 1 prompt = items start at row offset 2
    var menuItemStartOffset = 2;

    function showHelp() {
      // Save current menu output, overlay help box, wait for any key, redraw
      var helpLines = [
        '  CC Commander \u2014 Quick Help          ',
        '                                     ',
        '  \u2191/\u2193     Navigate menu              ',
        '  Enter   Select item                ',
        '  a-z     Jump to item by letter     ',
        '  q       Quit / Go back             ',
        '  ?       This help                  ',
        '                                     ',
        '  In tmux split mode:                ',
        '  Ctrl+A \u2190\u2192  Switch panes            ',
        '  Ctrl+A z   Zoom pane (fullscreen)  ',
        '  Ctrl+A 0   Jump to menu            ',
        '  Click      Select pane (mouse on)  ',
        '                                     ',
        '  Press any key to close...          ',
      ];
      stdout.write('\x1b[u'); // restore saved cursor position
      stdout.write('\x1b[J'); // clear from cursor to end
      stdout.write('\n');     // blank line (pipe-rail)
      stdout.write(box(helpLines.join('\n')) + '\n');

      // Pause main handler during help, restore on any keypress
      stdin.removeListener('keypress', handler);
      stdin.removeListener('data', mouseDataHandler);
      function helpKeyHandler() {
        stdin.removeListener('keypress', helpKeyHandler);
        draw();
        stdin.on('keypress', handler);
        stdin.on('data', mouseDataHandler);
      }
      stdin.once('keypress', helpKeyHandler);
    }

    // Mouse click handler — parses SGR mouse sequences from raw stdin data
    // SGR format: ESC [ < btn ; col ; row M (press) or m (release)
    function mouseDataHandler(data) {
      var str = typeof data === 'string' ? data : data.toString('binary');
      // Match SGR mouse press event: \x1b[<0;col;rowM  (button 0 = left click press)
      var sgrMatch = str.match(/^\x1b\[<(\d+);(\d+);(\d+)M$/);
      if (!sgrMatch) return;
      var btn = parseInt(sgrMatch[1], 10);
      if (btn !== 0) return; // only left-click press

      var clickRow = parseInt(sgrMatch[3], 10); // 1-based terminal row

      // We need to know the absolute row where the menu starts.
      // We saved cursor position with \x1b[s before drawing. Unfortunately we
      // don't have the absolute row stored. We work around this by tracking the
      // cursor row at the time we saved it.
      if (typeof savedCursorRow !== 'number') return;

      // Calculate which item was clicked
      // menuItemStartOffset lines after savedCursorRow is where items begin
      var itemsStartRow = savedCursorRow + menuItemStartOffset;
      var relRow = clickRow - itemsStartRow; // 0-based line within items area
      if (relRow < 0) return;

      // Walk items to find which one the row maps to
      var lineIdx = 0;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (typeof item !== 'string' && item && item.separator === true) {
          lineIdx++; // separator takes 1 line
          continue;
        }
        var itemLines = 1 + ((typeof item !== 'string' && item.description) ? 1 : 0);
        if (relRow >= lineIdx && relRow < lineIdx + itemLines) {
          if (!isSeparatorItem(i)) {
            sel = i;
            if (onChange) onChange(sel);
            t = getTheme();
            draw();
            done(sel);
          }
          return;
        }
        lineIdx += itemLines;
      }
    }

    // Track absolute cursor row when we save position (best-effort via cursor query)
    var savedCursorRow = null;
    (function queryCursorRow() {
      // Request cursor position report: ESC [ 6 n → response: ESC [ row ; col R
      var cprHandler = function(data) {
        var s = typeof data === 'string' ? data : data.toString('binary');
        var m = s.match(/\x1b\[(\d+);(\d+)R/);
        if (m) {
          stdin.removeListener('data', cprHandler);
          savedCursorRow = parseInt(m[1], 10); // 1-based row where cursor currently is
        }
      };
      stdin.on('data', cprHandler);
      stdout.write('\x1b[6n'); // query cursor position
    })();

    stdin.on('data', mouseDataHandler);

    function handler(str, key) {
      if (!key) return;
      if (key.name === 'up' && sel > 0) {
        var next = sel - 1;
        while (next > 0 && isSeparatorItem(next)) next--;
        if (!isSeparatorItem(next)) { sel = next; if (onChange) onChange(sel); t = getTheme(); draw(); }
      } else if (key.name === 'down' && sel < items.length - 1) {
        var next = sel + 1;
        while (next < items.length - 1 && isSeparatorItem(next)) next++;
        if (!isSeparatorItem(next)) { sel = next; if (onChange) onChange(sel); t = getTheme(); draw(); }
      } else if (key.name === 'return') { done(sel); }
      else if (key.ctrl && key.name === 'c') { done(-1); }
      else {
        // '?' shows help overlay
        if (str === '?') { showHelp(); return; }
        // 'q' quits — find Quit item or cancel
        if (str === 'q') {
          var quitIdx = -1;
          items.forEach(function(it, idx) {
            if (it && !it.separator) {
              var label = typeof it === 'string' ? it : (it.label || '');
              if (label.toLowerCase() === 'quit' || (it.action === 'quit')) quitIdx = idx;
            }
          });
          if (quitIdx >= 0) { done(quitIdx); return; }
          done(-1); return;
        }
        // Letter shortcut: a=0, b=1, c=2, etc.
        var code = (str || '').charCodeAt(0) - 97;
        if (code >= 0 && code < items.length) { sel = code; draw(); done(sel); }
      }
    }

    function done(i) {
      stdin.removeListener('keypress', handler);
      stdin.removeListener('data', mouseDataHandler);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\x1b[?1000l\x1b[?1006l'); // disable mouse reporting
      stdout.write(ESC + '?25h'); // show cursor
      resolve(i);
    }

    stdin.on('keypress', handler);
  });
}

// ─── Spinner ──────────────────────────────────────────────────────

function spinner(text) {
  var frames = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2807', '\u280f'];
  var i = 0;
  var timer;
  var t = getTheme();

  return {
    start: function() {
      process.stdout.write(ESC + '?25l');
      timer = setInterval(function() {
        process.stdout.write('\r' + ESC + '2K  ' + colorText(frames[i++ % frames.length], t.primary) + ' ' + colorText(text, t.text));
      }, 80);
      return this;
    },
    stop: function(success) {
      clearInterval(timer);
      var icon = success !== false ? colorText('\u2714', t.success) : colorText('\u2716', t.error);
      process.stdout.write('\r' + ESC + '2K  ' + icon + ' ' + colorText(text, t.text) + '\n');
      process.stdout.write(ESC + '?25h');
    },
  };
}

// ─── Typewriter Effect ────────────────────────────────────────────

function typewriter(text, speed) {
  if (!speed) speed = 25;
  return new Promise(function(resolve) {
    var i = 0;
    process.stdout.write(ESC + '?25l');
    var timer = setInterval(function() {
      if (i < text.length) { process.stdout.write(text[i]); i++; }
      else { clearInterval(timer); process.stdout.write(ESC + '?25h'); resolve(); }
    }, speed);
  });
}

// ─── Progress Bar ─────────────────────────────────────────────────

function progressBar(current, total, width) {
  if (!width) width = 30;
  var t = getTheme();
  var pct = Math.min(current / total, 1);
  var filled = Math.round(pct * width);
  var bar = '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
  return colorText('\u258c', t.primary) + gradient(bar, [t.secondary, t.primary]) + colorText('\u2590', t.primary) + ' ' + colorText(current + '/' + total, t.text);
}

// ─── Sparkline ────────────────────────────────────────────────────

function sparkline(values) {
  var bars = ' \u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';
  var min = Math.min.apply(null, values);
  var max = Math.max.apply(null, values);
  var range = max - min || 1;
  var t = getTheme();
  return values.map(function(v) {
    var idx = Math.round(((v - min) / range) * 8);
    return colorText(bars[idx], t.primary);
  }).join('');
}

// ─── Screen Control ───────────────────────────────────────────────

function clearScreen() { process.stdout.write(ESC + '2J' + ESC + 'H'); }

function altScreen() { process.stdout.write(ESC + '?1049h'); }
function mainScreen() { process.stdout.write(ESC + '?1049l'); }

// ─── Stats Card ───────────────────────────────────────────────────

function statsCard(data) {
  var t = getTheme();
  var lines = [];
  var keys = Object.keys(data);
  var maxKey = Math.max.apply(null, keys.map(function(k) { return k.length; }));
  keys.forEach(function(k) {
    lines.push('  ' + colorText((k + ':').padEnd(maxKey + 2), t.dim) + boldText(String(data[k]), t.primary));
  });
  return box(lines.join('\n'), Math.max(40, maxKey + 20));
}

// ─── Celebration ──────────────────────────────────────────────────

function celebrate(message) {
  var t = getTheme();
  var styles = [
    '\n  ' + gradient('\u2728 \u2728 \u2728  ' + message + '  \u2728 \u2728 \u2728', [t.primary, t.secondary, t.accent || t.primary]),
    '\n' + box('  ' + boldText(message, t.primary) + '  ', 40),
    '\n  ' + boldText('\u2588'.repeat(3), t.secondary) + ' ' + boldText(message, t.primary) + ' ' + boldText('\u2588'.repeat(3), t.secondary),
  ];
  return styles[Math.floor(Math.random() * styles.length)] + '\n';
}

// ─── Divider ──────────────────────────────────────────────────────

function divider(title) {
  var t = getTheme();
  var b = BORDERS[t.border] || BORDERS.rounded;
  if (title) {
    return colorText('  ' + b.h.repeat(3) + ' ', t.dim) + boldText(title, t.primary) + colorText(' ' + b.h.repeat(30), t.dim);
  }
  return colorText('  ' + b.h.repeat(40), t.dim);
}

module.exports = {
  // Symbols
  S: S,
  // Theme
  THEMES: THEMES,
  setTheme: setTheme,
  getTheme: getTheme,
  getThemeNames: getThemeNames,
  // Rendering
  renderLogo: renderLogo,
  gradient: gradient,
  rainbow: rainbow,
  animatedRainbow: animatedRainbow,
  RAINBOW_STOPS: RAINBOW_STOPS,
  gradientLines: gradientLines,
  box: box,
  statsCard: statsCard,
  celebrate: celebrate,
  divider: divider,
  progressBar: progressBar,
  sparkline: sparkline,
  // Interactive
  select: select,
  spinner: spinner,
  typewriter: typewriter,
  // Screen
  clearScreen: clearScreen,
  altScreen: altScreen,
  mainScreen: mainScreen,
  // Color helpers
  colorText: colorText,
  boldText: boldText,
  dimText: dimText,
  rgb: rgb,
  bgRgb: bgRgb,
  stripAnsi: stripAnsi,
  RESET: RESET,
  BOLD: BOLD,
};

// ─── Responsive Logo ──────────────────────────────────────────────

function renderLogoResponsive(text) {
  var cols = process.stdout.columns || 80;
  var t = getTheme();
  if (cols < 60) {
    // Compact: just gradient text
    return '\n  ' + gradient(BOLD + (text || 'CC COMMANDER') + RESET, t.logo.gradient) + '\n';
  }
  // Full figlet
  return renderLogo(text);
}

// ─── Animated Transitions ─────────────────────────────────────────

function wipeTransition(speed) {
  return new Promise(function(resolve) {
    if ((process.env.CC_NO_ANIMATION || process.env.KC_NO_ANIMATION) === '1' || !process.stdout.columns) {
      clearScreen();
      resolve();
      return;
    }
    var cols = process.stdout.columns || 80;
    var rows = process.stdout.rows || 24;
    var t = getTheme();
    var row = 0;
    process.stdout.write(ESC + '?25l');
    var timer = setInterval(function() {
      if (row >= rows) {
        clearInterval(timer);
        process.stdout.write(ESC + 'H' + ESC + '?25h');
        resolve();
        return;
      }
      process.stdout.write(ESC + (row + 1) + ';1H');
      process.stdout.write(bgRgb(t.highlight[0], t.highlight[1], t.highlight[2]) + ' '.repeat(cols) + RESET);
      row++;
    }, speed || 8);
  });
}

function flashTransition() {
  return new Promise(function(resolve) {
    if ((process.env.CC_NO_ANIMATION || process.env.KC_NO_ANIMATION) === '1') { clearScreen(); resolve(); return; }
    var t = getTheme();
    process.stdout.write(ESC + '?25l');
    // Flash primary color then clear
    process.stdout.write(ESC + '2J' + ESC + 'H');
    process.stdout.write(bgRgb(t.primary[0], t.primary[1], t.primary[2]));
    var cols = process.stdout.columns || 80;
    var rows = process.stdout.rows || 24;
    for (var i = 0; i < rows; i++) process.stdout.write(' '.repeat(cols));
    setTimeout(function() {
      process.stdout.write(RESET + ESC + '2J' + ESC + 'H' + ESC + '?25h');
      resolve();
    }, 60);
  });
}

// ─── Theme Picker with Live Preview ───────────────────────────────

function themePickerItems() {
  return getThemeNames().map(function(name) {
    var t = THEMES[name];
    return {
      label: t.name,
      description: gradient('\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588', [t.primary, t.secondary]),
    };
  });
}

module.exports.renderLogoResponsive = renderLogoResponsive;
module.exports.animateLogo = animateLogo;
module.exports.wipeTransition = wipeTransition;
module.exports.flashTransition = flashTransition;
module.exports.themePickerItems = themePickerItems;

// ─── Rich Stats Dashboard ─────────────────────────────────────────

function renderDashboard(data) {
  var t = getTheme();
  var cols = process.stdout.columns || 80;
  var width = Math.min(cols - 4, 60);
  var out = '';

  // Header
  out += '\n' + divider('Dashboard') + '\n\n';

  // Top stats row
  var statLine = '  '
    + boldText(String(data.sessions || 0), t.primary) + dimText(' sessions') + '    '
    + boldText(String(data.streak || 0), t.secondary) + dimText(' day streak') + '    '
    + boldText(String(data.achievements || 0), t.accent || t.primary) + dimText(' badges') + '    '
    + boldText('$' + (data.cost || 0).toFixed(2), t.text) + dimText(' spent');
  out += statLine + '\n\n';

  // Cost sparkline (last 7 entries)
  if (data.dailyCosts && data.dailyCosts.length > 0) {
    out += '  ' + dimText('Cost trend: ') + sparkline(data.dailyCosts) + '\n';
  }

  // Activity heatmap (last 7 days)
  if (data.dailySessions && data.dailySessions.length > 0) {
    var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var today = new Date().getDay();
    var heatmap = '  ' + dimText('Activity:   ');
    data.dailySessions.forEach(function(count, i) {
      var intensity = count === 0 ? '\u2591' : count < 3 ? '\u2592' : count < 6 ? '\u2593' : '\u2588';
      var dayIdx = (today - data.dailySessions.length + 1 + i + 7) % 7;
      heatmap += colorText(intensity + intensity, count === 0 ? t.dim : (count >= 3 ? t.primary : t.secondary)) + ' ';
    });
    out += heatmap + '\n';
  }

  // Streak fire
  if (data.streak && data.streak > 0) {
    var fires = '';
    var fireCount = Math.min(data.streak, 10);
    for (var i = 0; i < fireCount; i++) fires += '\u{1F525}';
    if (data.streak > 10) fires += ' +' + (data.streak - 10);
    out += '\n  ' + fires + '  ' + boldText(data.streak + '-day streak!', t.primary) + '\n';
    if (data.longestStreak && data.longestStreak > data.streak) {
      out += '  ' + dimText('Longest: ' + data.longestStreak + ' days') + '\n';
    }
  }

  // Level progress
  if (data.level) {
    var nextLevel = data.level === 'guided' ? 'Assisted (5 sessions)' : data.level === 'assisted' ? 'Power (20 sessions)' : 'MAX';
    var progress = data.level === 'guided' ? Math.min(data.sessions / 5, 1) : data.level === 'assisted' ? Math.min(data.sessions / 20, 1) : 1;
    out += '\n  ' + dimText('Level: ') + boldText(data.level.toUpperCase(), t.primary) + '  ' + dimText('Next: ' + nextLevel) + '\n';
    out += '  ' + progressBar(Math.round(progress * 10), 10, 20) + '\n';
  }

  out += '\n';
  return out;
}

module.exports.renderDashboard = renderDashboard;

// ─── Welcome Mini-Dashboard ───────────────────────────────────────

function renderWelcomeDash(data) {
  var t = getTheme();
  var out = '';

  // One-line stats bar
  var parts = [];
  if (data.streak > 0) parts.push(colorText('\u{1F525}' + data.streak + 'd', t.primary));
  parts.push(dimText(data.sessions + ' sessions'));
  if (data.achievements > 0) parts.push(dimText(data.achievements + ' badges'));
  if (data.cost > 0) parts.push(dimText('$' + data.cost.toFixed(2)));
  out += '  ' + parts.join(dimText(' \u2502 ')) + '\n';

  // Last session
  if (data.lastTask) {
    out += '  ' + dimText('Last: ') + colorText(data.lastTask.slice(0, 50), t.text) + '\n';
  }

  // Top recommendation
  if (data.recommendation) {
    out += '  ' + colorText('\u276f', t.secondary) + ' ' + dimText(data.recommendation) + '\n';
  }

  return out;
}

module.exports.renderWelcomeDash = renderWelcomeDash;

// ─── Claude Code Style Elements ───────────────────────────────────

function renderPromptBar(text) {
  var t = getTheme();
  var cols = process.stdout.columns || 80;
  var bar = colorText('▌', t.primary) + ' ' + boldText(text, t.text);
  return '\n' + bar + '\n';
}

function renderStatusLine(items) {
  var t = getTheme();
  var parts = items.map(function(item) {
    return dimText(item.label + ': ') + colorText(item.value, t.primary);
  });
  return '  ' + parts.join(dimText('  │  '));
}

function renderBanner(subtitle) {
  var t = getTheme();
  var BRAND = require('./branding');
  var cols = Math.min(process.stdout.columns || 80, 72);
  var lines = [];
  var border = colorText('  ╔' + '═'.repeat(cols - 6) + '╗', t.dim);
  var mid = colorText('  ╠' + '═'.repeat(cols - 6) + '╣', t.dim);
  var bot = colorText('  ╚' + '═'.repeat(cols - 6) + '╝', t.dim);
  var side = colorText('║', t.dim);
  function padLine(content, rawLen) {
    var pad = cols - 6 - rawLen;
    return '  ' + side + ' ' + content + ' '.repeat(Math.max(0, pad)) + ' ' + side;
  }

  lines.push(border);
  lines.push(padLine(gradient('CC COMMANDER', t.logo.gradient) + '  ' + dimText('v' + BRAND.version), 16 + BRAND.version.length));
  lines.push(padLine(dimText(subtitle || BRAND.tagline), (subtitle || BRAND.tagline).length));
  lines.push(mid);
  return lines.join('\n') + '\n';
}

function renderCompactHeader(subtitle) {
  var t = getTheme();
  var BRAND = require('./branding');
  var cols = Math.min(process.stdout.columns || 80, 72);
  var border = colorText('  ╔' + '═'.repeat(cols - 6) + '╗', t.dim);
  var mid = colorText('  ╠' + '═'.repeat(cols - 6) + '╣', t.dim);
  var side = colorText('║', t.dim);
  function padLine(content, rawLen) {
    var pad = cols - 6 - rawLen;
    return '  ' + side + ' ' + content + ' '.repeat(Math.max(0, pad)) + ' ' + side;
  }
  var out = '';
  out += border + '\n';
  out += padLine(gradient('CC COMMANDER', t.logo.gradient) + '  ' + dimText('v' + BRAND.version), 16 + BRAND.version.length) + '\n';
  out += padLine(dimText(subtitle || BRAND.tagline), (subtitle || BRAND.tagline).length) + '\n';
  out += mid + '\n';
  return out;
}

function renderSeparator() {
  var t = getTheme();
  var cols = Math.min(process.stdout.columns || 80, 60);
  return '  ' + colorText('─'.repeat(cols - 4), t.dim) + '\n';
}

function renderMenuItem(label, desc, isActive, index) {
  var t = getTheme();
  if (isActive) {
    return '  ' + colorText('❯ ', t.primary) + boldText(label, t.primary) + (desc ? '  ' + dimText(desc) : '');
  }
  return '    ' + colorText(label, t.text) + (desc ? '  ' + dimText(desc) : '');
}

module.exports.renderPromptBar = renderPromptBar;
module.exports.renderStatusLine = renderStatusLine;
module.exports.renderBanner = renderBanner;
module.exports.renderCompactHeader = renderCompactHeader;
module.exports.renderSeparator = renderSeparator;
module.exports.renderMenuItem = renderMenuItem;
