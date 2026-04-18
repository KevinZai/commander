'use strict';

var _pkg = require('../package.json');

var BRAND = Object.freeze({
  product: 'Claude Code Commander',
  productFull: 'Claude Code Commander',
  productShort: 'CCC',
  tagline: 'Every Claude Code tool. One install. Guided access. Auto-updated.',
  taglineShort: 'The Claude Code aggregator. Newbie-friendly.',
  version: _pkg.version,

  author: 'Kevin Zicherman',
  authorFull: 'Kevin Zicherman',
  website: 'https://kevinz.ai',
  twitter: '@kzic',
  github: 'KevinZai',
  repo: 'cc-commander',
  repoUrl: 'https://github.com/KevinZai/commander',

  envPrefix: 'KC_',

  proName: 'CC Commander Pro',
  proPrice: '$19/mo',
  proUrl: 'https://kevinz.ai/pro',

  welcomeNew: "Welcome! I'm your mission control for Claude Code.\nI'll help you build, create, and ship — no coding knowledge needed.",
  welcomeBack: function(name, streak) {
    return 'Welcome back, ' + name + "! You're on a " + streak + '-day streak.';
  },

  planModeNote: 'All sessions start in plan mode for safety.',
  scope: 'Not just coding — marketing, content, social media, research, and more.',

  footer: 'CC Commander by Kevin Zicherman — kevinz.ai',
});

module.exports = BRAND;
