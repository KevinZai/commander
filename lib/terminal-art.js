// ============================================================================
// CC Commander — Terminal Art Library (Node.js)
// ============================================================================
// Pure functions returning ANSI strings. No I/O — callers decide output.
//
//   const art = require('./terminal-art');
//   console.error(art.statusBlock({ step: 'Auth', done: 3, total: 8 }));
// ============================================================================

'use strict';

const COLORS = {
  bright: '\x1b[38;5;172m',
  mid: '\x1b[38;5;145m',
  dim: '\x1b[38;5;240m',
  fade: '\x1b[38;5;130m',
  white: '\x1b[38;5;255m',
  cyan: '\x1b[38;5;99m',
  amber: '\x1b[38;5;214m',
  red: '\x1b[38;5;196m',
  gray: '\x1b[38;5;238m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

const C = COLORS;

function repeat(ch, n) {
  return n > 0 ? ch.repeat(n) : '';
}

function sectionDivider(title) {
  const pad = repeat('━', 18);
  return `${C.mid}${pad}${C.reset} ${C.bright}[ ${title} ]${C.reset} ${C.mid}${pad}${C.reset}`;
}

function progressBar(current, total) {
  const width = 20;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = `${C.bright}${repeat('█', filled)}${C.dim}${repeat('░', empty)}`;
  return `${C.mid}▐${bar}${C.mid}▌${C.reset}  ${C.white}${current}/${total}${C.reset}`;
}

function statusBlock({ step, nextStep, done, total, suggestions }) {
  const bar = progressBar(done, total);
  const lines = [
    `${C.mid}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${C.reset}`,
    `${C.mid}┃${C.reset}  ${C.bright}${C.bold}KIT${C.reset}  ${bar}  ${C.dim}tasks done${C.reset}    ${C.mid}┃${C.reset}`,
    `${C.mid}┃${C.reset}  ${C.white}Step:${C.reset} ${step || 'Working...'}${pad(step, 37)}${C.mid}┃${C.reset}`,
  ];

  if (nextStep) {
    lines.push(`${C.mid}┃${C.reset}  ${C.dim}Next:${C.reset} ${nextStep}${pad(nextStep, 37)}${C.mid}┃${C.reset}`);
  }

  lines.push(`${C.mid}┃${C.reset}                                               ${C.mid}┃${C.reset}`);

  if (suggestions && suggestions.length > 0) {
    lines.push(`${C.mid}┃${C.reset}  ${C.dim}Manage tasks:${C.reset}                                 ${C.mid}┃${C.reset}`);
    for (const s of suggestions) {
      lines.push(`${C.mid}┃${C.reset}    ${C.cyan}${s.cmd}${C.reset}${pad(s.cmd, 20)}${C.dim}— ${s.desc}${C.reset}${pad(s.desc, 16)}${C.mid}┃${C.reset}`);
    }
  }

  lines.push(`${C.mid}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${C.reset}`);

  return lines.join('\n');
}

function pad(text, maxLen) {
  const len = (text || '').length;
  const remaining = maxLen - len;
  return remaining > 0 ? ' '.repeat(remaining) : '';
}

function minimalFooter() {
  return `${C.dim}━━━━━━${C.reset} ${C.mid}CCK${C.reset} ${C.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`;
}

function parseTodo(content) {
  if (!content) return { done: 0, total: 0, currentStep: null, nextStep: null };

  const lines = content.split('\n');
  let done = 0;
  let total = 0;
  let currentStep = null;
  let nextStep = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
      done++;
      total++;
    } else if (trimmed.startsWith('- [ ]')) {
      total++;
      const task = trimmed.replace(/^- \[ \]\s*/, '').trim();
      if (!currentStep) {
        currentStep = task;
      } else if (!nextStep) {
        nextStep = task;
      }
    }
  }

  return { done, total, currentStep, nextStep };
}

function defaultSuggestions() {
  return [
    { cmd: '/project:todo', desc: 'view task list' },
    { cmd: '/checkpoint', desc: 'save progress' },
    { cmd: '/verify', desc: 'run checks' },
  ];
}

const QUIPS = [
  'Ship it before it ships you.',
  "That's what I call AI-powered recklessness.",
  'Another one. DJ Khaled voice.',
  'Veni, vidi, vibe-coded.',
  'Built different. Literally.',
  'Zero to deployed, no coffee needed.',
  'The commit graph is modern art.',
  'Context is milk. You\'re fresh.',
  'CLAUDE.md appreciates the investment.',
  'Speed run any%.',
  'The keyboard didn\'t even feel that.',
  'Less meetings, more shipping.',
];

function celebrate(style) {
  const nc = COLORS.nc;
  const styles = {
    confetti: `\n  ${COLORS.bright}🎉  ✨  🎊  ✨  🎉${nc}\n  ${COLORS.cyan}Another one shipped.${nc}\n`,
    fireworks: `\n  ${COLORS.dim}˚ ₊ ‧${nc} ${COLORS.bright}⁺${nc} ${COLORS.dim}˚ ₊${nc} ${COLORS.bright}‧ ⁺${nc} ${COLORS.dim}·${nc} ${COLORS.cyan}✦${nc}\n  ${COLORS.bright}BOOM.${nc} ${COLORS.dim}That's a wrap.${nc}\n`,
    victory: `\n  ${COLORS.mid}╔══════════════╗${nc}\n  ${COLORS.mid}║${nc} ${COLORS.bright}${COLORS.bold} SHIPPED! 🚀 ${nc} ${COLORS.mid}║${nc}\n  ${COLORS.mid}╚══════════════╝${nc}\n`,
    rocket: `\n  ${COLORS.bright}🚀${nc} ${COLORS.mid}━━━━━━━━━━━━━${nc} ${COLORS.cyan}LAUNCH!${nc}\n`,
  };
  if (!style || style === 'random') {
    const keys = Object.keys(styles);
    style = keys[Math.floor(Math.random() * keys.length)];
  }
  return styles[style] || styles.confetti;
}

function checkmark(msg) {
  return `  ${COLORS.bright}✓${COLORS.nc} ${COLORS.white}${msg || 'Done'}${COLORS.nc}`;
}

function progressChecklist(items) {
  return items.map((item) => {
    const [prefix, ...rest] = item.split(':');
    const text = rest.join(':');
    switch (prefix) {
      case 'done': return `  ${COLORS.bright}✓${COLORS.nc} ${COLORS.dim}${text}${COLORS.nc}`;
      case 'current': return `  ${COLORS.cyan}◉${COLORS.nc} ${COLORS.white}${text}${COLORS.nc}`;
      case 'pending': return `  ${COLORS.dim}○ ${text}${COLORS.nc}`;
      default: return `  ${COLORS.dim}○ ${item}${COLORS.nc}`;
    }
  }).join('\n');
}

function streakDisplay(count) {
  let fires = '💤';
  if (count >= 7) fires = '🔥🔥🔥';
  else if (count >= 3) fires = '🔥🔥';
  else if (count >= 1) fires = '🔥';
  return `  ${COLORS.bright}${fires}${COLORS.nc} ${COLORS.white}${count}-day streak${COLORS.nc}`;
}

function randomQuip() {
  return `  ${COLORS.dim}"${QUIPS[Math.floor(Math.random() * QUIPS.length)]}"${COLORS.nc}`;
}

function miniDashboard(pairs) {
  const lines = [
    `  ${COLORS.mid}┌──────────────────────────────────────────┐${COLORS.nc}`,
    `  ${COLORS.mid}│${COLORS.nc}  ${COLORS.bright}${COLORS.bold}SESSION STATS${COLORS.nc}                             ${COLORS.mid}│${COLORS.nc}`,
  ];
  for (const [key, val] of pairs) {
    lines.push(`  ${COLORS.mid}│${COLORS.nc}  ${COLORS.dim}${key.padEnd(16)}${COLORS.nc} ${COLORS.white}${String(val).padEnd(23)}${COLORS.nc} ${COLORS.mid}│${COLORS.nc}`);
  }
  lines.push(`  ${COLORS.mid}└──────────────────────────────────────────┘${COLORS.nc}`);
  return lines.join('\n');
}

module.exports = {
  COLORS,
  sectionDivider,
  progressBar,
  statusBlock,
  minimalFooter,
  parseTodo,
  defaultSuggestions,
  celebrate,
  checkmark,
  progressChecklist,
  streakDisplay,
  randomQuip,
  miniDashboard,
  QUIPS,
};
