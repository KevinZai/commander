'use strict';
/**
 * CC Commander v6.0 — Savings Counter
 * "The plugin pays for itself" wedge: tracks actual dispatch cost vs an
 * all-Opus 4.8 baseline (the pre-v6 default).
 *
 * HONESTY RULE: all figures are ESTIMATES vs an all-Opus baseline, ±30%.
 * They are NOT actual Anthropic billing data. See getSavings() disclaimer.
 *
 * Storage: ~/.claude/commander/savings.json
 * Schema:
 * {
 *   days: {
 *     "YYYY-MM-DD": { actualUsd, baselineUsd, savedUsd, dispatches }
 *   },
 *   total: { actualUsd, baselineUsd, savedUsd, dispatches }
 * }
 *
 * Atomic write: temp-file + rename to avoid corruption on crash.
 */

var fs = require('fs');
var os = require('os');
var path = require('path');

// Pricing mirrors dispatcher.js MODEL_PRICING (keep in sync manually — both ±30% estimates)
var PRICING = {
  fable:  { input: 10, output: 50 },
  opus:   { input: 5,  output: 25 },
  sonnet: { input: 3,  output: 15 },
  haiku:  { input: 1,  output: 5  },
};

// Baseline is opus (the pre-v6 default model for all dispatches)
var BASELINE_MODEL = 'opus';

var SAVINGS_PATH = path.join(os.homedir(), '.claude', 'commander', 'savings.json');

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadSavings() {
  try {
    var raw = fs.readFileSync(SAVINGS_PATH, 'utf8');
    var parsed = JSON.parse(raw);
    if (!parsed.days || typeof parsed.days !== 'object') parsed.days = {};
    if (!parsed.total || typeof parsed.total !== 'object') {
      parsed.total = { actualUsd: 0, baselineUsd: 0, savedUsd: 0, dispatches: 0 };
    }
    return parsed;
  } catch (_e) {
    return {
      days: {},
      total: { actualUsd: 0, baselineUsd: 0, savedUsd: 0, dispatches: 0 },
    };
  }
}

function writeSavings(data) {
  // Atomic-ish: write to temp file, then rename
  var dir = path.dirname(SAVINGS_PATH);
  var tmp = SAVINGS_PATH + '.tmp.' + process.pid;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, SAVINGS_PATH);
  } catch (_e) {
    // Swallow — never break a dispatch
    try { fs.unlinkSync(tmp); } catch (_e2) {}
  }
}

function calcUsd(modelKey, inputTokens, outputTokens) {
  var pricing = PRICING[modelKey] || PRICING.sonnet;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
}

/**
 * Record a dispatch. Computes actual cost and baseline (all-Opus) cost,
 * accumulates into today's bucket and the all-time total.
 *
 * Swallows ALL errors — must never break a dispatch.
 *
 * @param {{ modelKey: string, inputTokens: number, outputTokens: number }} opts
 */
function recordDispatch(opts) {
  try {
    var modelKey = (opts && opts.modelKey) || 'sonnet';
    var inputTokens = (opts && opts.inputTokens) || 0;
    var outputTokens = (opts && opts.outputTokens) || 0;

    // Normalize modelKey
    var key = String(modelKey).toLowerCase();
    if (!PRICING[key]) key = 'sonnet';

    var actualUsd = calcUsd(key, inputTokens, outputTokens);
    var baselineUsd = calcUsd(BASELINE_MODEL, inputTokens, outputTokens);
    // savedUsd can be negative (Fable > Opus) — report honestly
    var savedUsd = baselineUsd - actualUsd;

    var data = loadSavings();
    var today = todayKey();

    if (!data.days[today]) {
      data.days[today] = { actualUsd: 0, baselineUsd: 0, savedUsd: 0, dispatches: 0 };
    }
    data.days[today].actualUsd += actualUsd;
    data.days[today].baselineUsd += baselineUsd;
    data.days[today].savedUsd += savedUsd;
    data.days[today].dispatches += 1;

    data.total.actualUsd += actualUsd;
    data.total.baselineUsd += baselineUsd;
    data.total.savedUsd += savedUsd;
    data.total.dispatches += 1;

    writeSavings(data);
  } catch (_e) {
    // Swallow — never break a dispatch
  }
}

/**
 * Read saved savings data.
 * Returns today, this month, and all-time buckets.
 *
 * DISCLAIMER: all figures are ESTIMATES vs an all-Opus baseline, ±30%.
 * NOT actual Anthropic billing data.
 *
 * @returns {{ today: object, month: object, total: object, disclaimer: string }}
 */
function getSavings() {
  var data = loadSavings();
  var today = todayKey();
  var monthPrefix = today.slice(0, 7); // YYYY-MM

  var todayData = data.days[today] || { actualUsd: 0, baselineUsd: 0, savedUsd: 0, dispatches: 0 };

  var monthData = { actualUsd: 0, baselineUsd: 0, savedUsd: 0, dispatches: 0 };
  Object.keys(data.days).forEach(function(day) {
    if (day.startsWith(monthPrefix)) {
      var d = data.days[day];
      monthData.actualUsd += d.actualUsd || 0;
      monthData.baselineUsd += d.baselineUsd || 0;
      monthData.savedUsd += d.savedUsd || 0;
      monthData.dispatches += d.dispatches || 0;
    }
  });

  return {
    today: todayData,
    month: monthData,
    total: data.total,
    disclaimer: 'ESTIMATES vs all-Opus baseline, ±30%. Not actual Anthropic billing data.',
  };
}

module.exports = { recordDispatch: recordDispatch, getSavings: getSavings };
