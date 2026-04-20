#!/usr/bin/env node
// CC Commander — menu renderer (DORMANT / future use)
//
// STATUS (beta.7): The active `/ccc-*` UX uses `AskUserQuestion` native chip
// pickers in Claude Cowork Desktop, NOT fenced HTML artifacts. Cowork Desktop
// renders ```html blocks as LITERAL CODE, not as interactive artifacts. This
// renderer is preserved for two future use cases:
//   1. Claude.ai web app + Claude Desktop app — which DO render fenced HTML
//      as sandboxed interactive artifacts. Useful for exporting CC Commander
//      menus to web-shareable HTML for marketing / docs site.
//   2. When/if Anthropic adds interactive-artifact support to Cowork Desktop.
//
// Reads a menu JSON tree + the shared HTML template, emits a fully-formed
// HTML block. Call sites should output it inside a fenced ```html block IF
// the target client is known to render them.
//
// Usage:
//   node menu-render.js <menu-id> [--context <json>]
//
// Menu ID maps to ../menus/<menu-id>.json.
// Context (optional) is a JSON blob with { branch, session, cost, ... }
// rendered in the context strip at the top of the artifact.
//
// TODO(beta.8+): when native `claude --usage-json` ships (per @ClaudeDevs
// tweet ref in docs/ECOSYSTEM.md), include usage numbers in the context
// strip. For now, caller passes context in.

'use strict';

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(__dirname, 'menu-artifact.html.tpl');
const MENUS_DIR = path.join(PLUGIN_ROOT, 'menus');

function readPluginVersion() {
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
    return pj.version || 'unknown';
  } catch (_) {
    return 'unknown';
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTile(choice) {
  const icon = escapeHtml(choice.icon || '•');
  const label = escapeHtml(choice.label || choice.id || 'Untitled');
  const desc = escapeHtml(choice.description || '');
  const cmd = escapeHtml(choice.command || choice.next || '');
  const star = choice.recommended ? ' <span title="Recommended" style="color:#fbbf24;">⭐</span>' : '';
  return `<button data-cmd="${cmd}"
    style="background:#1a1d25;border:1px solid ${choice.recommended ? '#7c3aed' : '#2a2f3b'};color:#e7e9ee;padding:16px;border-radius:12px;cursor:pointer;font:inherit;text-align:left;transition:background 0.1s,border-color 0.1s;"
    onmouseover="this.style.background='#222632';this.style.borderColor='#3a4050';"
    onmouseout="this.style.background='#1a1d25';this.style.borderColor='${choice.recommended ? '#7c3aed' : '#2a2f3b'}';"
    onclick="cccMenuClick(this)">
    <div style="font-size:20px;margin-bottom:6px;">${icon}</div>
    <div style="font-weight:700;font-size:14px;margin-bottom:3px;">${label}${star}</div>
    <div style="font-size:12px;color:#9aa3b2;line-height:1.4;">${desc}</div>
  </button>`;
}

function renderContextStrip(ctx) {
  if (!ctx || typeof ctx !== 'object') return '';
  const items = [];
  if (ctx.branch) items.push(`<span>🌿 <b>${escapeHtml(ctx.branch)}</b></span>`);
  if (ctx.cwd) items.push(`<span>📂 ${escapeHtml(ctx.cwd)}</span>`);
  if (ctx.session) items.push(`<span>💬 ${escapeHtml(ctx.session)}</span>`);
  if (ctx.cost) items.push(`<span>💰 ${escapeHtml(ctx.cost)}</span>`);
  if (ctx.context) items.push(`<span>🧠 ${escapeHtml(ctx.context)}</span>`);
  if (ctx.note) items.push(`<span style="color:#fbbf24;">💡 ${escapeHtml(ctx.note)}</span>`);
  if (items.length === 0) return '';
  return `<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#9aa3b2;padding:10px 14px;margin-bottom:14px;background:#0a0c10;border-radius:8px;border:1px solid #1e222b;">
    ${items.join('')}
  </div>`;
}

function renderFooter(menu) {
  if (!menu.footer) return '';
  const msg = escapeHtml(menu.footer);
  return `<div style="font-size:12px;color:#9aa3b2;padding:10px 14px;background:#0a0c10;border-radius:8px;border:1px solid #1e222b;margin-bottom:8px;">
    ${msg}
  </div>`;
}

function renderShortcuts(menu) {
  if (!menu.shortcuts || !Array.isArray(menu.shortcuts) || menu.shortcuts.length === 0) return '';
  const items = menu.shortcuts
    .map(s => `<code style="background:#1a1d25;padding:1px 6px;border-radius:4px;color:#c8cdd6;">${escapeHtml(s)}</code>`)
    .join(' · ');
  return `<div style="font-size:11px;color:#6b7280;padding:8px 0;">
    Shortcuts: ${items}
  </div>`;
}

function render(menuId, context) {
  const menuPath = path.join(MENUS_DIR, `${menuId}.json`);
  if (!fs.existsSync(menuPath)) {
    throw new Error(`Menu not found: ${menuPath}`);
  }
  const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
  let tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  // Strip ONLY the leading and trailing HTML-comment doc blocks (not internal
  // ones). Leading comment runs from start until the first "-->". Trailing
  // comment runs from the last "<!--" to end.
  const leadingEnd = tpl.indexOf('-->');
  if (tpl.trimStart().startsWith('<!--') && leadingEnd !== -1) {
    tpl = tpl.slice(leadingEnd + 3).trimStart();
  }
  const trailingStart = tpl.lastIndexOf('<!--');
  if (trailingStart !== -1 && tpl.indexOf('-->', trailingStart) === tpl.length - 3) {
    tpl = tpl.slice(0, trailingStart).trimEnd();
  }

  const tiles = (menu.choices || []).map(renderTile).join('\n    ');

  return tpl
    .replace('{{TITLE}}', escapeHtml(menu.title || 'CC Commander'))
    .replace('{{SUBTITLE}}', escapeHtml(menu.subtitle || ''))
    .replace('{{VERSION}}', escapeHtml(readPluginVersion()))
    .replace('{{CONTEXT}}', renderContextStrip(context))
    .replace('{{TILES}}', tiles)
    .replace('{{FOOTER}}', renderFooter(menu))
    .replace('{{SHORTCUTS}}', renderShortcuts(menu));
}

// CLI entrypoint
function parseArgs(argv) {
  const args = { menuId: null, context: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--context' && argv[i + 1]) {
      try { args.context = JSON.parse(argv[++i]); } catch (_) {}
    } else if (!args.menuId && !a.startsWith('--')) {
      args.menuId = a;
    }
  }
  return args;
}

if (require.main === module) {
  const { menuId, context } = parseArgs(process.argv.slice(2));
  if (!menuId) {
    console.error('Usage: node menu-render.js <menu-id> [--context <json>]');
    process.exit(2);
  }
  try {
    process.stdout.write(render(menuId, context));
  } catch (err) {
    console.error(`menu-render error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { render, readPluginVersion };
