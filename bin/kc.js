#!/usr/bin/env node
'use strict';

/**
 * Kit Commander — Your AI-Powered Project Manager
 *
 * Interactive, menu-driven CLI that sits above Claude Code sessions.
 * Guides beginners through multiple-choice workflows.
 * Dispatches to Claude Code headlessly and tracks sessions.
 *
 * Usage:
 *   npx kit-commander          # Start interactive mode
 *   node bin/kc.js              # Same, from repo
 *   node bin/kc.js --version    # Show version
 *   node bin/kc.js --test       # Run self-test
 */

const path = require('path');

// Handle --version flag
if (process.argv.includes('--version')) {
  const BRAND = require(path.join(__dirname, '..', 'commander', 'branding'));
  console.log(`${BRAND.product} v${BRAND.version}`);
  process.exit(0);
}

// Handle --test flag
if (process.argv.includes('--test')) {
  console.log('Kit Commander self-test:');
  const checks = [
    ['branding.js', () => require(path.join(__dirname, '..', 'commander', 'branding'))],
    ['state.js', () => require(path.join(__dirname, '..', 'commander', 'state'))],
    ['adventure.js', () => require(path.join(__dirname, '..', 'commander', 'adventure'))],
    ['renderer.js', () => require(path.join(__dirname, '..', 'commander', 'renderer'))],
    ['dispatcher.js', () => require(path.join(__dirname, '..', 'commander', 'dispatcher'))],
    ['engine.js', () => require(path.join(__dirname, '..', 'commander', 'engine'))],
    ['main-menu.json', () => require(path.join(__dirname, '..', 'commander', 'adventures', 'main-menu.json'))],
  ];

  let passed = 0;
  for (const [name, fn] of checks) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${name}: ${err.message}`);
    }
  }
  console.log(`\n  ${passed}/${checks.length} passed`);
  process.exit(passed === checks.length ? 0 : 1);
}

// Start Kit Commander
const KitCommander = require(path.join(__dirname, '..', 'commander', 'engine'));
const commander = new KitCommander();

commander.start().catch(err => {
  console.error('Kit Commander error:', err.message);
  process.exit(1);
});
