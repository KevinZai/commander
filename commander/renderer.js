'use strict';

const BRAND = require('./branding');

// ANSI color helpers — respect KC_NO_COLOR
const noColor = process.env.KC_NO_COLOR === '1' || process.env.NO_COLOR === '1' || process.env.CC_NO_COLOR === '1';

const c = {
  reset: noColor ? '' : '\x1b[0m',
  bold: noColor ? '' : '\x1b[1m',
  dim: noColor ? '' : '\x1b[2m',
  amber: noColor ? '' : '\x1b[38;5;214m',
  indigo: noColor ? '' : '\x1b[38;5;62m',
  green: noColor ? '' : '\x1b[38;5;78m',
  red: noColor ? '' : '\x1b[38;5;196m',
  cyan: noColor ? '' : '\x1b[38;5;81m',
  white: noColor ? '' : '\x1b[37m',
  gray: noColor ? '' : '\x1b[38;5;240m',
};

/**
 * Render the Kit Commander header banner.
 */
function renderHeader() {
  const lines = [
    '',
    `${c.amber}${c.bold}  ╔══════════════════════════════════════════╗${c.reset}`,
    `${c.amber}${c.bold}  ║          ${BRAND.product.toUpperCase().padEnd(22)}       v${BRAND.version} ║${c.reset}`,
    `${c.amber}${c.bold}  ║   ${BRAND.tagline.padEnd(38)} ║${c.reset}`,
    `${c.amber}${c.bold}  ╚══════════════════════════════════════════╝${c.reset}`,
    '',
  ];
  return lines.join('\n');
}

/**
 * Render an adventure screen (title, subtitle, choices).
 * @param {object} prepared - Prepared adventure from adventure.js
 * @returns {string} Rendered screen
 */
function renderAdventure(prepared) {
  const lines = [];

  // Title bar
  lines.push(`${c.amber}${c.bold}  ━━━ ${prepared.title} ━━━${c.reset}`);

  // Subtitle
  if (prepared.subtitle) {
    lines.push(`${c.dim}  ${prepared.subtitle}${c.reset}`);
  }
  lines.push('');

  // Prompt
  lines.push(`  ${c.white}${prepared.prompt}${c.reset}`);
  lines.push('');

  // Choices
  for (const choice of prepared.choices) {
    const desc = choice.description ? `${c.dim} — ${choice.description}${c.reset}` : '';
    lines.push(`    ${c.cyan}${c.bold}${choice.key})${c.reset} ${choice.label}${desc}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Render a progress checklist.
 * @param {Array} items - Array of { text, status: 'done'|'active'|'pending' }
 * @returns {string}
 */
function renderChecklist(items) {
  const lines = [''];
  for (const item of items) {
    const icon =
      item.status === 'done' ? `${c.green}  ✓${c.reset}` :
      item.status === 'active' ? `${c.amber}  ◉${c.reset}` :
      `${c.dim}  ○${c.reset}`;
    const text =
      item.status === 'done' ? `${c.dim}${item.text}${c.reset}` :
      item.status === 'active' ? `${c.bold}${item.text}${c.reset}` :
      `${item.text}`;
    lines.push(`${icon} ${text}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Render a simple stats card.
 * @param {object} stats - { sessions, streak, achievements, cost }
 * @returns {string}
 */
function renderStatsCard(stats) {
  const lines = [
    '',
    `${c.amber}  ┌──────────────────────────────────┐${c.reset}`,
    `${c.amber}  │${c.reset}  Sessions: ${c.bold}${String(stats.sessions || 0).padEnd(6)}${c.reset}  Streak: ${c.bold}${String(stats.streak || 0).padEnd(4)}${c.reset}  ${c.amber}│${c.reset}`,
    `${c.amber}  │${c.reset}  Badges:   ${c.bold}${String(stats.achievements || 0).padEnd(6)}${c.reset}  Cost:   ${c.bold}$${String((stats.cost || 0).toFixed(2)).padEnd(3)}${c.reset}  ${c.amber}│${c.reset}`,
    `${c.amber}  └──────────────────────────────────┘${c.reset}`,
    '',
  ];
  return lines.join('\n');
}

/**
 * Render a celebration.
 * @param {string} message - Celebration message
 * @returns {string}
 */
function renderCelebration(message) {
  const styles = [
    `  🎉 ✨ 🎊 ✨ 🎉  ${message}`,
    `  🚀 ━━━━━━━━━━━━ ${message} ━━━━━━━━━━━━ 🚀`,
    `  ╔══════════════════╗\n  ║ ${message.padEnd(17)}║\n  ╚══════════════════╝`,
    `  ˚ ₊ ‧ ⁺ ˚  ${message}  ˚ ⁺ ‧ ₊ ˚`,
  ];
  const pick = styles[Math.floor(Math.random() * styles.length)];
  return `\n${c.amber}${c.bold}${pick}${c.reset}\n`;
}

/**
 * Render the footer.
 * @returns {string}
 */
function renderFooter() {
  return `${c.dim}  ${BRAND.footer}${c.reset}\n`;
}

/**
 * Render a freeform prompt (for when user needs to type text).
 * @param {string} prompt
 * @returns {string}
 */
function renderFreeformPrompt(prompt) {
  return `\n  ${c.white}${prompt}${c.reset}\n`;
}

/**
 * Render a session summary.
 * @param {object} session - Session object
 * @returns {string}
 */
function renderSessionSummary(session) {
  const duration = session.duration ? `${Math.round(session.duration / 60)}m` : 'ongoing';
  const cost = session.cost ? `$${session.cost.toFixed(2)}` : '$0.00';
  const status = session.status === 'completed'
    ? `${c.green}✓ completed${c.reset}`
    : `${c.amber}◉ active${c.reset}`;

  return [
    `  ${c.bold}${session.task || 'Untitled session'}${c.reset}`,
    `  ${c.dim}Duration: ${duration}  |  Cost: ${cost}  |  ${status}${c.reset}`,
    `  ${c.dim}Started: ${new Date(session.startTime).toLocaleDateString()}${c.reset}`,
  ].join('\n');
}

/**
 * Clear screen.
 */
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

module.exports = {
  renderHeader,
  renderAdventure,
  renderChecklist,
  renderStatsCard,
  renderCelebration,
  renderFooter,
  renderFreeformPrompt,
  renderSessionSummary,
  clearScreen,
  colors: c,
};
