'use strict';

/**
 * CC Commander — Cockpit Dashboard Rendering
 * Emoji-rich status panels, ASCII meters, fading borders.
 * Separated from tui.js to avoid linter conflicts.
 */

var tui = null;
function getTui() { if (!tui) tui = require('./tui'); return tui; }

var RESET = '\x1b[0m';
var BOLD = '\x1b[1m';

function rgb(r, g, b) { return '\x1b[38;2;' + r + ';' + g + ';' + b + 'm'; }

// ─── Fading Border ────────────────────────────────────────────

function fadeBorder(char, len, color) {
  var out = '';
  for (var i = 0; i < len; i++) {
    var fade = Math.max(0, 1 - (i / len) * 1.3);
    out += rgb(Math.round(color[0] * fade), Math.round(color[1] * fade), Math.round(color[2] * fade)) + char;
  }
  return out + RESET;
}

// ─── ASCII Meter ──────────────────────────────────────────────

function asciiMeter(value, max, width, label, color) {
  var t = getTui().getTheme();
  var pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  var filled = Math.round((pct / 100) * width);
  var empty = width - filled;
  var bar = '';
  for (var i = 0; i < filled; i++) {
    var fade = i / width;
    var r = Math.round(color[0] + (t.secondary[0] - color[0]) * fade);
    var g = Math.round(color[1] + (t.secondary[1] - color[1]) * fade);
    var b = Math.round(color[2] + (t.secondary[2] - color[2]) * fade);
    bar += rgb(r, g, b) + '\u2588';
  }
  bar += rgb(t.dim[0], t.dim[1], t.dim[2]) + '\u2591'.repeat(empty) + RESET;
  return dim(label + ' [') + bar + dim('] ') + BOLD + rgb(color[0], color[1], color[2]) + pct + '%' + RESET;
}

// Mini 6-char meter for compact footer
function miniMeter(pct, color) {
  var t = getTui().getTheme();
  var filled = Math.round((pct / 100) * 6);
  var empty = 6 - filled;
  var bar = rgb(t.dim[0], t.dim[1], t.dim[2]) + '\u258C' + RESET;
  for (var i = 0; i < filled; i++) bar += rgb(color[0], color[1], color[2]) + '\u2588';
  bar += rgb(t.dim[0], t.dim[1], t.dim[2]) + '\u2591'.repeat(empty) + '\u2590' + RESET;
  return bar + BOLD + rgb(color[0], color[1], color[2]) + pct + '%' + RESET;
}

function dim(text) { var t = getTui().getTheme(); return rgb(t.dim[0], t.dim[1], t.dim[2]) + text + RESET; }
function bold(text, color) { return BOLD + rgb(color[0], color[1], color[2]) + text + RESET; }
function col(text, color) { return rgb(color[0], color[1], color[2]) + text + RESET; }
function fmtK(v) { if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'; if (v >= 1000) return Math.round(v / 1000) + 'K'; return String(v); }

// ─── Cockpit Status Panel ─────────────────────────────────────

function renderCockpitStatus(data) {
  var t = getTui().getTheme();
  var cols = Math.min(process.stdout.columns || 80, 72);
  var out = '';

  // Top fading border
  out += '  ' + fadeBorder('\u2500', cols - 4, t.primary) + '\n';

  // Line 1: Model + emoji + cost + tokens + duration
  var emoji = data.thinking ? '\u{1F525}' : data.toolActive ? '\u26A1' : '\u{1F9E0}';
  out += '  ' + emoji + ' ' + bold(data.model || 'Claude', t.primary);
  out += dim('  \u2502  ') + bold('$' + (data.cost || 0).toFixed(2), t.text);
  out += dim('  \u2502  ') + col('\u2191', t.primary) + bold(fmtK(data.inputTokens || 0), t.text) + col('\u2193', t.secondary) + bold(fmtK(data.outputTokens || 0), t.text);
  out += dim('  \u2502  ') + dim(data.duration || '0s');
  out += '\n';

  // Line 2: Context meter + Rate meter
  out += '  ' + asciiMeter(data.contextPct || 0, 100, 16, 'CTX', t.primary);
  out += '  ' + asciiMeter(data.ratePct || 0, 100, 16, 'RATE', t.secondary);
  out += '\n';

  // Line 3: Linear + skills + vendors + active skill
  var parts = [];
  if (data.linearTicket) parts.push('\u{1F4CB} ' + bold(data.linearTicket, t.primary) + (data.linearTitle ? ' ' + dim(data.linearTitle) : ''));
  parts.push('\u{1F3AF} ' + bold(String(data.skillCount || 0), t.primary) + dim(' skills'));
  parts.push('\u{1F4E6} ' + bold(String(data.vendorCount || 0), t.secondary) + dim(' vendors'));
  if (data.activeSkill) parts.push('\u26A1 ' + col(data.activeSkill, t.accent || t.primary));
  out += '  ' + parts.join(dim('  \u2502  ')) + '\n';

  // Bottom fading border
  out += '  ' + fadeBorder('\u2500', cols - 4, t.dim) + '\n';

  return out;
}

// ─── Cockpit Footer (one-line) ────────────────────────────────

function renderCockpitFooter(data) {
  var t = getTui().getTheme();
  var emoji = data.thinking ? '\u{1F525}' : data.toolActive ? '\u26A1' : '\u{1F9E0}';
  var parts = [];
  parts.push(emoji + col(data.model || 'Claude', t.primary));
  parts.push(bold('$' + (data.cost || 0).toFixed(2), t.text));
  if (data.contextPct > 0) parts.push('CTX' + miniMeter(data.contextPct, t.primary));
  if (data.linearTicket) parts.push('\u{1F4CB}' + col(data.linearTicket, t.primary));
  parts.push('\u{1F3AF}' + col(String(data.skillCount || 0), t.primary));
  parts.push('\u{1F4E6}' + col(String(data.vendorCount || 0), t.secondary));
  return '  ' + parts.join(dim(' \u2502 '));
}

// ─── Fading Header/Banner ─────────────────────────────────────

function renderBanner(subtitle, projectName) {
  var t = getTui().getTheme();
  var BRAND = require('./branding');
  var gr = getTui().gradient;
  var cols = Math.min(process.stdout.columns || 80, 72);
  var out = '';
  out += '  ' + fadeBorder('\u2550', cols - 4, t.primary) + '\n';
  var titleLine = '  ' + gr('CC COMMANDER', t.logo.gradient) + '  ' + dim('v' + BRAND.version);
  if (projectName) titleLine += '  ' + bold('\u{1F4C2} ' + projectName, t.secondary);
  out += titleLine + '\n';
  out += '  ' + dim(subtitle || BRAND.tagline) + '\n';
  out += '  ' + fadeBorder('\u2500', cols - 4, t.dim) + '\n';
  return out;
}

function renderCompactHeader(subtitle, projectName) {
  return renderBanner(subtitle, projectName);
}

module.exports = {
  fadeBorder: fadeBorder,
  asciiMeter: asciiMeter,
  miniMeter: miniMeter,
  renderCockpitStatus: renderCockpitStatus,
  renderCockpitFooter: renderCockpitFooter,
  renderBanner: renderBanner,
  renderCompactHeader: renderCompactHeader,
};
