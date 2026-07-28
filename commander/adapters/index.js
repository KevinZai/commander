'use strict';

// Claude first, Codex CLI as the fallback executor. Deliberately NO Gemini and no
// local-LLM adapter: CC Commander routes to Anthropic models and the Codex CLI only,
// so behaviour stays predictable and every documented workflow is reproducible on a
// stock install. Do not re-add a third-party or local adapter without revisiting that.
const claudeAdapter = require('./claude');
const codexAdapter = require('./codex');

const ALL_ADAPTERS = [claudeAdapter, codexAdapter];

function detectAvailable() {
  return ALL_ADAPTERS.filter((a) => a.detect());
}

function getPreferred() {
  const available = detectAvailable();
  if (available.length === 0) return null;

  const preferenceOrder = ['claude', 'codex'];
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
