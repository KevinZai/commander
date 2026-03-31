'use strict';

const claudeAdapter = require('./claude');
const geminiAdapter = require('./gemini');
const codexAdapter = require('./codex');

const ALL_ADAPTERS = [claudeAdapter, geminiAdapter, codexAdapter];

function detectAvailable() {
  return ALL_ADAPTERS.filter((a) => a.detect());
}

function getPreferred() {
  const available = detectAvailable();
  if (available.length === 0) return null;

  const preferenceOrder = ['claude', 'gemini', 'codex'];
  for (const name of preferenceOrder) {
    const found = available.find((a) => a.name === name);
    if (found) return found;
  }

  return available[0];
}

function getByName(name) {
  return ALL_ADAPTERS.find((a) => a.name === name) || null;
}

module.exports = { detectAvailable, getPreferred, getByName, ALL_ADAPTERS };
