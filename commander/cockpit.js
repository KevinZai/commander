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
function miniMeter(pct, color, remaining) {
  var t = getTui().getTheme();
  var filled = Math.round((pct / 100) * 4);
  var empty = 4 - filled;
  var bar = rgb(t.dim[0], t.dim[1], t.dim[2]) + '\u258C' + RESET;
  for (var i = 0; i < filled; i++) bar += rgb(color[0], color[1], color[2]) + '\u2588';
  bar += rgb(t.dim[0], t.dim[1], t.dim[2]) + '\u2591'.repeat(empty) + '\u2590' + RESET;
  var label = BOLD + rgb(color[0], color[1], color[2]) + pct + '%' + RESET;
  if (remaining) label += dim('[' + remaining + ']');
  return bar + label;
}

function detectAuthSource() {
  // ClaudeSwap: look for swap state file
  try {
    var os = require('os');
    var path = require('path');
    var fs = require('fs');
    var swapState = path.join(os.homedir(), '.config', 'claudeswap-state.json');
    if (fs.existsSync(swapState)) {
      var state = JSON.parse(fs.readFileSync(swapState, 'utf8'));
      if (state.active) return 'swap';
    }
  } catch(_) {}
  // Native OAuth: check for OAuth token file
  try {
    var oauthPath = path.join(os.homedir(), '.claude', '.credentials');
    if (fs.existsSync(oauthPath)) return 'oauth';
  } catch(_) {}
  // API key
  if (process.env.ANTHROPIC_API_KEY) return 'key';
  return '?';
}

function fmtTimeRemaining(minutesLeft) {
  if (minutesLeft <= 0) return '0m';
  if (minutesLeft < 60) return Math.round(minutesLeft) + 'm';
  var h = Math.floor(minutesLeft / 60);
  var m = Math.round(minutesLeft % 60);
  if (h >= 24) {
    var d = Math.floor(h / 24);
    h = h % 24;
    return d + 'd' + (h > 0 ? h + 'h' : '');
  }
  return h + 'h' + (m > 0 ? m + 'm' : '');
}

function dim(text) { var t = getTui().getTheme(); return rgb(t.dim[0], t.dim[1], t.dim[2]) + text + RESET; }
function bold(text, color) { return BOLD + rgb(color[0], color[1], color[2]) + text + RESET; }
function col(text, color) { return rgb(color[0], color[1], color[2]) + text + RESET; }
function fmtK(v) { if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'; if (v >= 1000) return Math.round(v / 1000) + 'K'; return String(v); }

// ─── Cockpit Status Panel ─────────────────────────────────────

function renderCockpitStatus(data) {
  if (!data) data = {};
  var t = getTui().getTheme();
  var cols = Math.min(process.stdout.columns || 80, 72);
  var out = '';

  // Top rounded border
  out += '  ' + rgb(t.primary[0], t.primary[1], t.primary[2]) + '\u256d' + '\u2500'.repeat(cols - 5) + '\u256e' + RESET + '\n';

  // Line 1: Model + emoji + cost + tokens + duration
  var emoji = data.thinking ? '\u{1F525}' : data.toolActive ? '\u26A1' : '\u{1F9E0}';
  out += '  ' + emoji + ' ' + bold(data.model || 'Claude', t.primary);
  out += dim('  \u2502  ') + bold('$' + (data.cost || 0).toFixed(2), data.cost > 2 ? [255, 150, 50] : t.text);
  out += dim('  \u2502  ') + col('\u2191', t.primary) + bold(fmtK(data.inputTokens || 0), t.text) + col('\u2193', t.secondary) + bold(fmtK(data.outputTokens || 0), t.text);
  out += dim('  \u2502  ') + dim(data.duration || '0s');
  out += '\n';

  // Line 2: Context meter + Rate meter + session timer + 7d budget
  var sessionMinutes = data.sessionMinutes || 0;
  var sessionLimit = data.sessionLimitMinutes || 0;
  var weekPct = Math.min(100, Math.round(((data.weekCost || 0) / (data.weekBudget || 50)) * 100));
  out += '  ' + asciiMeter(data.contextPct || 0, 100, 14, 'CTX', t.primary);
  out += '  ' + asciiMeter(data.ratePct || 0, 100, 14, 'RATE', t.secondary);
  if (sessionLimit > 0) {
    var sessionPct = Math.min(100, Math.round((sessionMinutes / sessionLimit) * 100));
    out += '  \u23F1\uFE0F' + asciiMeter(sessionPct, 100, 10, 'SES', sessionPct > 80 ? [255, 80, 80] : t.secondary);
  } else {
    out += '  \u23F1\uFE0F' + dim('SES [') + bold(fmtTimeRemaining(sessionMinutes), t.secondary) + dim('] ');
  }
  out += '  \u{1F4C5}' + asciiMeter(weekPct, 100, 10, '7d', weekPct > 80 ? [255, 80, 80] : t.secondary);
  out += '\n';

  // Line 3: Linear + skills + vendors + active skill + cwd
  var parts = [];
  if (data.linearTicket) parts.push('\u{1F4CB} ' + bold(data.linearTicket, t.primary) + (data.linearTitle ? ' ' + dim(data.linearTitle) : ''));
  parts.push('\u{1F3AF} ' + bold(String(data.skillCount || 0), t.primary) + dim(' skills'));
  parts.push('\u{1F4E6} ' + bold(String(data.vendorCount || 0), t.secondary) + dim(' vendors'));
  if (data.activeSkill) parts.push('\u26A1 ' + col(data.activeSkill, t.accent || t.primary));
  var dir = data.cwd || process.cwd();
  var shortDir = dir.replace(require('os').homedir(), '~');
  if (shortDir.length > 20) shortDir = '...' + shortDir.slice(-17);
  parts.push('\u{1F4C2}' + dim(shortDir));
  out += '  ' + parts.join(dim('  \u2502  ')) + '\n';

  // Bottom rounded border
  out += '  ' + rgb(t.dim[0], t.dim[1], t.dim[2]) + '\u2570' + '\u2500'.repeat(cols - 5) + '\u256f' + RESET + '\n';

  return out;
}

// ─── Cockpit Footer (one-line) ────────────────────────────────

function renderCockpitFooter(data) {
  if (!data) data = {};
  var t = getTui().getTheme();
  var B = require('./branding');
  var parts = [];

  // Version
  parts.push(dim('\u2501\u2501 ') + col('CCC' + B.version, t.primary));

  // Model
  parts.push('\u{1F525}' + col(data.model || 'Opus1M', t.primary));

  // Auth source + key hint
  var authSrc = detectAuthSource();
  var authKey = 'n/a';
  try { var k = process.env.ANTHROPIC_API_KEY || ''; if (k.length > 6) authKey = k.slice(-3); } catch(_) {}
  var authLabel = authSrc === 'swap' ? 'SW:' + authKey : authSrc === 'oauth' ? 'OA' : authKey;
  parts.push('\u{1F511}' + col(authLabel, t.text));

  // Context meter
  parts.push('\u{1F9E0}' + miniMeter(data.contextPct || 0, t.primary));

  // Session meter with time elapsed (or percent if limit provided)
  var sessionMinutes = data.sessionMinutes || 0;
  var sessionLimit = data.sessionLimitMinutes || 0;
  if (sessionLimit > 0) {
    var sessionPctF = Math.min(100, Math.round((sessionMinutes / sessionLimit) * 100));
    var sessionColorF = sessionPctF > 80 ? [255, 60, 60] : sessionPctF > 50 ? [255, 200, 50] : [80, 220, 80];
    var sessionRemainingF = fmtTimeRemaining(Math.max(0, sessionLimit - sessionMinutes));
    parts.push('\u23F1\uFE0F' + miniMeter(sessionPctF, sessionColorF, sessionRemainingF));
  } else {
    parts.push('\u23F1\uFE0F' + col(fmtTimeRemaining(sessionMinutes), t.text));
  }

  // 7d rolling meter with time remaining
  var weekPct = Math.min(100, Math.round(((data.weekCost || 0) / (data.weekBudget || 50)) * 100));
  var weekColor = weekPct > 80 ? [255, 60, 60] : weekPct > 50 ? [255, 200, 50] : [80, 220, 80];
  var dayOfWeek = new Date().getDay();
  var daysLeft = (7 - dayOfWeek) % 7 || 7;
  var weekRemaining = fmtTimeRemaining(daysLeft * 24 * 60);
  parts.push('\u{1F4C5}' + miniMeter(weekPct, weekColor, weekRemaining));

  // Cost — green/yellow/red
  var costColor = (data.cost || 0) > 5 ? [255, 60, 60] : (data.cost || 0) > 2 ? [255, 200, 50] : t.text;
  parts.push('\u{1F4B0}' + bold('$' + (data.cost || 0).toFixed(2), costColor));

  // Tokens — original arrows
  parts.push('\u2191' + col(fmtK(data.inputTokens || 0), t.primary) + '\u2193' + col(fmtK(data.outputTokens || 0), t.text));

  // Time spent
  var totalMinutes = data.totalMinutes || 0;
  var hours = Math.floor(totalMinutes / 60);
  var mins = totalMinutes % 60;
  parts.push('\u23F0' + col(hours + 'h' + mins + 'm', t.text));

  // Skills count
  parts.push('\u{1F3AF}' + col(String(data.skillCount || 0), t.primary));

  // Linear ticket
  if (data.linearTicket) {
    parts.push('\u{1F4CB}' + bold(data.linearTicket, t.primary));
  }

  // Directory
  var dir = data.cwd || process.cwd();
  var shortDir = dir.replace(require('os').homedir(), '~');
  if (shortDir.length > 20) shortDir = '...' + shortDir.slice(-17);
  parts.push('\u{1F4C2}' + dim(shortDir));

  return '  ' + parts.join(dim('\u2502'));
}

// ─── Fading Header/Banner ─────────────────────────────────────

function renderBanner(subtitle, projectName) {
  var t = getTui().getTheme();
  var BRAND = require('./branding');
  var cols = Math.min(process.stdout.columns || 80, 72);
  var out = '';
  out += '  ' + fadeBorder('\u2550', cols - 4, t.primary) + '\n';
  var titleLine = '  ' + bold('CC COMMANDER', t.primary) + '  ' + dim('v' + BRAND.version);
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
