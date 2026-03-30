'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const QUIPS = [
  "Ship it before it ships you.",
  "That's what I call AI-powered productivity.",
  "Another one. DJ Khaled voice.",
  "Your future self will thank you.",
  "Code is temporary. Shipping is forever.",
  "Not bad for a non-coder.",
  "The terminal is your friend.",
  "Progress > perfection.",
  "You're on a roll — keep it going.",
  "Claude handles the code. You handle the vision.",
];

/**
 * Generate context-aware recommendations based on current state.
 * @param {object} state - Commander state
 * @param {object} stats - Kit stats
 * @returns {Array<{emoji: string, text: string, action: string}>}
 */
function getRecommendations(state, stats = {}) {
  const recs = [];

  // Check git status for uncommitted changes
  try {
    const gitStatus = execSync('git status --porcelain 2>/dev/null', {
      encoding: 'utf8',
      timeout: 3000,
    }).trim();
    if (gitStatus.length > 0) {
      const lineCount = gitStatus.split('\n').length;
      recs.push({
        emoji: '\u{1F4BE}',
        text: `You have ${lineCount} uncommitted change${lineCount > 1 ? 's' : ''}. Consider committing.`,
        action: 'checkpoint',
        priority: 2,
      });
    }
  } catch {
    // Not in a git repo or git not available — skip
  }

  // Check streak
  const streak = stats.streak?.current || 0;
  if (streak === 0) {
    recs.push({
      emoji: '\u{1F525}',
      text: 'Start a streak! Complete a session today.',
      action: 'build',
      priority: 3,
    });
  } else if (streak >= 7) {
    recs.push({
      emoji: '\u{1F3C6}',
      text: `${streak}-day streak! You're on fire. Keep it going.`,
      action: null,
      priority: 5,
    });
  }

  // Check session count for progressive disclosure
  const sessions = state.user?.sessionsCompleted || 0;
  if (sessions === 0) {
    recs.push({
      emoji: '\u{1F680}',
      text: 'Build your first project to get started!',
      action: 'build',
      priority: 1,
    });
  } else if (sessions >= 4 && sessions < 6) {
    recs.push({
      emoji: '\u{2B50}',
      text: 'One more session and you unlock Assisted Mode!',
      action: null,
      priority: 2,
    });
  } else if (sessions >= 19 && sessions < 21) {
    recs.push({
      emoji: '\u{1F31F}',
      text: 'Almost at Power User level! Just a few more sessions.',
      action: null,
      priority: 2,
    });
  }

  // Check for existing projects
  try {
    const todoPath = path.join(process.cwd(), 'tasks', 'todo.md');
    if (fs.existsSync(todoPath)) {
      const content = fs.readFileSync(todoPath, 'utf8');
      const pendingTasks = (content.match(/- \[ \]/g) || []).length;
      if (pendingTasks > 0) {
        recs.push({
          emoji: '\u{1F4CB}',
          text: `You have ${pendingTasks} pending task${pendingTasks > 1 ? 's' : ''} in todo.md.`,
          action: 'continue',
          priority: 1,
        });
      }
    }
  } catch {
    // Skip
  }

  // Check cost accumulation
  const totalCost = stats.totalCost || 0;
  if (totalCost > 5) {
    recs.push({
      emoji: '\u{1F4B0}',
      text: `Total spend: $${totalCost.toFixed(2)}. Consider using Haiku for routine tasks.`,
      action: null,
      priority: 4,
    });
  }

  // Sort by priority (lower = more important)
  recs.sort((a, b) => (a.priority || 5) - (b.priority || 5));

  return recs.slice(0, 3);
}

/**
 * Get a random motivational quip.
 * @returns {string}
 */
function getQuip() {
  return QUIPS[Math.floor(Math.random() * QUIPS.length)];
}

module.exports = { getRecommendations, getQuip, QUIPS };
