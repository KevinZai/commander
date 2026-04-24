// CC Commander — /cost output parser for /ccc-xray
//
// Parses Claude Code's `/cost` slash-command output into structured
// per-model token + USD breakdowns, plus cache-hit rate and avg $/turn.
//
// Liberal in what it accepts: any line with `<whitespace><model-name>:` is
// treated as a model row. Unparseable lines are pushed to `skipped[]`
// rather than throwing. Empty input returns a zero-state object.
//
// Pure utility — no I/O, no side effects.

'use strict';

// Convert tokens with optional k/m suffix → integer.
// "234.5k" → 234500, "1.2m" → 1200000, "5600" → 5600.
function parseTokens(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim().toLowerCase().replace(/,/g, '');
  const m = s.match(/^([\d.]+)\s*([km]?)$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const mult = m[2] === 'k' ? 1000 : m[2] === 'm' ? 1_000_000 : 1;
  return Math.round(n * mult);
}

// Pull the first dollar amount from a line, e.g. "($8.90)" → 8.90.
function parseUsd(text) {
  const m = String(text).match(/\$\s*([\d.,]+)/);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Match a single field like "234.5k input" or "5.6k cache write".
// Returns { kind, tokens } where kind is one of input/output/cache_creation/cache_read.
function matchField(fragment) {
  const f = fragment.trim().toLowerCase();
  // cache write / cache creation
  let m = f.match(/^([\d.,kKmM]+)\s+cache\s+(write|creation|created)/);
  if (m) return { kind: 'cache_creation', tokens: parseTokens(m[1]) };
  m = f.match(/^([\d.,kKmM]+)\s+cache\s+(read|hit)/);
  if (m) return { kind: 'cache_read', tokens: parseTokens(m[1]) };
  m = f.match(/^([\d.,kKmM]+)\s+input/);
  if (m) return { kind: 'input', tokens: parseTokens(m[1]) };
  m = f.match(/^([\d.,kKmM]+)\s+output/);
  if (m) return { kind: 'output', tokens: parseTokens(m[1]) };
  return null;
}

// Parse a model row like:
//   "    claude-opus-4-7:  234.5k input, 12.3k output, 5.6k cache write, 89.0k cache read ($8.90)"
function parseModelLine(line) {
  // Require leading whitespace + model name + colon
  const m = line.match(/^\s+([a-zA-Z][\w.\-/]*[\w]):\s*(.*)$/);
  if (!m) return null;
  const model = m[1];
  const rest = m[2];

  const fields = { input: 0, output: 0, cache_creation: 0, cache_read: 0 };
  // Split on commas (parens hold USD at end — strip those first)
  const usd = parseUsd(rest);
  const beforeUsd = rest.replace(/\(\$[^)]*\)/, '').trim();

  for (const part of beforeUsd.split(',')) {
    const f = matchField(part);
    if (f) fields[f.kind] = f.tokens;
  }

  return { model, ...fields, usd };
}

function parseCostOutput(input) {
  const raw = typeof input === 'string' ? input : '';
  const skipped = [];
  const models = {};
  let totalUsd = 0;
  let turns = 0;

  if (!raw.trim()) {
    return {
      totalUsd: 0,
      models: {},
      cacheHitRate: 0,
      turns: 0,
      avgUsdPerTurn: 0,
      skipped,
      raw,
    };
  }

  let inUsageBlock = false;
  const lines = raw.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    // Header: total cost
    const totalMatch = line.match(/^\s*Total\s+cost\s*:\s*\$\s*([\d.,]+)/i);
    if (totalMatch) {
      const n = parseFloat(totalMatch[1].replace(/,/g, ''));
      if (Number.isFinite(n)) totalUsd = n;
      continue;
    }

    // Optional: turn count
    const turnsMatch = line.match(/^\s*(?:Total\s+)?turns?\s*:\s*(\d+)/i);
    if (turnsMatch) {
      turns = parseInt(turnsMatch[1], 10);
      continue;
    }

    // Section header — switch into model-parsing mode
    if (/^\s*Usage\s+by\s+model/i.test(line)) {
      inUsageBlock = true;
      continue;
    }

    // Skip other "Total ..." metadata lines
    if (/^\s*Total\s+/i.test(line)) continue;

    if (inUsageBlock) {
      const parsed = parseModelLine(line);
      if (parsed && parsed.model) {
        const { model, input, output, cache_creation, cache_read, usd } = parsed;
        models[model] = { input, output, cache_creation, cache_read, usd };
      } else {
        skipped.push(line);
      }
    }
  }

  // Cache hit rate across all models: cache_read / (cache_read + cache_creation + input)
  let cacheRead = 0;
  let cacheCreation = 0;
  let inputTotal = 0;
  for (const m of Object.values(models)) {
    cacheRead += m.cache_read || 0;
    cacheCreation += m.cache_creation || 0;
    inputTotal += m.input || 0;
  }
  const denom = cacheRead + cacheCreation + inputTotal;
  let cacheHitRate = denom > 0 ? cacheRead / denom : 0;
  if (cacheHitRate < 0) cacheHitRate = 0;
  if (cacheHitRate > 1) cacheHitRate = 1;

  // If totalUsd not stated explicitly, sum from per-model USD
  if (totalUsd === 0) {
    totalUsd = Object.values(models).reduce((s, m) => s + (m.usd || 0), 0);
  }

  const avgUsdPerTurn = turns > 0 ? totalUsd / turns : 0;

  return {
    totalUsd,
    models,
    cacheHitRate,
    turns,
    avgUsdPerTurn,
    skipped,
    raw,
  };
}

export { parseCostOutput, parseTokens, parseUsd };
export default parseCostOutput;
