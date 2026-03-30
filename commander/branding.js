'use strict';

// Centralized branding strings — single source of truth for easy pivoting
// Every user-facing string that mentions the product or author lives here.

const BRAND = Object.freeze({
  product: 'Kit Commander',
  productShort: 'KC',
  tagline: 'Your AI-Powered Project Manager',
  version: '1.5.0',

  author: 'Kevin Z',
  authorFull: 'Kevin Zicherman',
  website: 'https://kevinz.ai',
  twitter: '@kzic',
  github: 'k3v80',
  repo: 'claude-code-kit',
  repoUrl: 'https://github.com/k3v80/claude-code-kit',

  // Env var prefix for Commander-specific settings
  envPrefix: 'KC_',

  // Upgrade messaging
  proName: 'Kit Commander Pro',
  proPrice: '$19/mo',
  proUrl: 'https://kevinz.ai/pro',

  // Welcome messages
  welcomeNew: "Welcome! I'm your project manager for Claude Code.\nI'll help you build things — no coding knowledge needed.",
  welcomeBack: (name, streak) =>
    `Welcome back, ${name}! You're on a ${streak}-day streak.`,

  // Footer
  footer: 'Kit Commander by Kevin Z — kevinz.ai',
});

module.exports = BRAND;
