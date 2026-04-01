'use strict';

/**
 * CC Commander — Share Card Generator
 * Generates beautiful ASCII art session cards for sharing on X/social media.
 * Screenshot it, share it, flex it.
 */

var tui = null;
function getTui() { if (!tui) tui = require('./tui'); return tui; }

/**
 * Generate a shareable ASCII art card for a session
 */
function generateCard(session, score) {
  var t = getTui();
  var theme = t.getTheme();
  var g = t.gradient;

  var task = (session.task || 'Untitled').slice(0, 45);
  var duration = session.duration ? formatDur(session.duration) : '?';
  var cost = session.cost ? '$' + session.cost.toFixed(2) : '$0';
  var files = (session.filesChanged && session.filesChanged.length) || 0;
  var skills = (session.skillsUsed && session.skillsUsed.length) || 0;
  var scoreVal = score ? score.total : 0;
  var grade = scoreVal >= 90 ? 'S' : scoreVal >= 80 ? 'A' : scoreVal >= 70 ? 'B' : scoreVal >= 60 ? 'C' : 'D';

  var RESET = '\x1b[0m';
  var BOLD = '\x1b[1m';
  var DIM = '\x1b[2m';

  var lines = [];
  lines.push('');
  lines.push(g('  CC COMMANDER', theme.logo.gradient) + DIM + ' SESSION COMPLETE' + RESET);
  lines.push(DIM + '  ' + '~'.repeat(50) + RESET);
  lines.push('');
  lines.push(BOLD + '  ' + task + RESET);
  lines.push('');
  lines.push(g('  SCORE: ' + scoreVal + '/100', theme.logo.gradient) + '  ' + BOLD + '[' + grade + ']' + RESET);
  lines.push('');
  lines.push(DIM + '  Duration  ' + RESET + BOLD + duration + RESET + DIM + '   Cost  ' + RESET + BOLD + cost + RESET + DIM + '   Files  ' + RESET + BOLD + files + RESET + DIM + '   Skills  ' + RESET + BOLD + skills + RESET);
  lines.push('');

  // Score breakdown as mini bars
  if (score) {
    var bar = function(val, max, label) {
      var filled = Math.round((val / max) * 10);
      var empty = 10 - filled;
      return DIM + '  ' + label.padEnd(12) + RESET + g('\u2588'.repeat(filled), theme.logo.gradient) + DIM + '\u2591'.repeat(empty) + ' ' + val + '/' + max + RESET;
    };
    lines.push(bar(score.completion, 30, 'Completion'));
    lines.push(bar(score.efficiency, 25, 'Efficiency'));
    lines.push(bar(score.scope, 25, 'Scope'));
    lines.push(bar(score.cost, 20, 'Cost Mgmt'));
  }

  lines.push('');
  lines.push(DIM + '  ' + '~'.repeat(50) + RESET);
  lines.push(g('  CC Commander v2.1.0', theme.logo.gradient) + DIM + '  kevinz.ai  @kzic' + RESET);
  lines.push(DIM + '  Every Claude Code tool. One install. Guided access.' + RESET);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate share text for X/Twitter
 */
function generateShareText(session, score) {
  var task = (session.task || 'Built something cool').slice(0, 80);
  var scoreVal = score ? score.total : 0;
  var grade = scoreVal >= 90 ? 'S' : scoreVal >= 80 ? 'A' : scoreVal >= 70 ? 'B' : scoreVal >= 60 ? 'C' : 'D';
  var cost = session.cost ? '$' + session.cost.toFixed(2) : '$0';

  var text = 'Just shipped with CC Commander\n\n';
  text += task + '\n\n';
  text += 'Score: ' + scoreVal + '/100 [' + grade + ']\n';
  text += 'Cost: ' + cost + '\n\n';
  text += 'Every Claude Code tool. One install.\n';
  text += 'github.com/KevinZai/cc-commander';

  return text;
}

function formatDur(s) {
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  return Math.floor(s / 3600) + 'h' + Math.floor((s % 3600) / 60) + 'm';
}

module.exports = {
  generateCard: generateCard,
  generateShareText: generateShareText,
};
