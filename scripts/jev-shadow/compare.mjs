// CC-1594 Jev shadow harness: offline comparison of a judge against incumbent decisions.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeEvent, redact } from './record.mjs';

export const DEFAULT_USD_PER_MTOK = 0.042;

const DANGEROUS = /(rm\s+-rf|push\s+(--force|-f)\b|curl[^|]*\|\s*(ba)?sh|\.env\b|drop\s+table|chmod\s+777)/i;
const ROUTES = [
  [/(test|spec|jest|coverage)/i, 'test-runner'],
  [/(review|audit|diff)/i, 'reviewer'],
  [/(lint|format|rename|typo)/i, 'haiku'],
];

// Deterministic, offline stand-in for Jev. Never makes a network call.
export function stubJudge(row) {
  if (row.kind === 'permission') return DANGEROUS.test(row.input) ? 'deny' : 'allow';
  if (row.kind === 'route') {
    for (const [re, target] of ROUTES) if (re.test(row.input)) return target;
    return 'default';
  }
  const m = /x(\d+)/.exec(row.input);
  return m && Number(m[1]) >= 3 ? 'break' : 'continue';
}

const estTokens = (row) => Math.ceil((row.input.length + row.kind.length) / 4);

export function compare(rows, judge = stubJudge, { usdPerMTok = DEFAULT_USD_PER_MTOK } = {}) {
  const perKind = {};
  const confusion = {};
  const disagreements = [];
  let agree = 0;
  let tokens = 0;
  let unsafeAllows = 0;
  let incumbentDenies = 0;
  let denyAgree = 0;
  for (const raw of rows) {
    // Defense in depth: never trust that rows were already normalized; the judge and every output see redacted input.
    const row = { ...raw, input: redact(raw.input) };
    const j = String(judge(row));
    const inc = row.incumbentDecision;
    const k = (perKind[row.kind] ??= { total: 0, agree: 0, rate: 0 });
    k.total++;
    tokens += estTokens(row);
    const cm = ((confusion[row.kind] ??= {})[inc] ??= {});
    cm[j] = (cm[j] ?? 0) + 1;
    if (j === inc) { agree++; k.agree++; } else disagreements.push({ ts: row.ts, kind: row.kind, input: row.input, incumbent: inc, judge: j });
    if (row.kind === 'permission') {
      if (inc === 'deny') { incumbentDenies++; if (j === 'deny') denyAgree++; }
      if (inc === 'deny' && j === 'allow') unsafeAllows++;
    }
  }
  for (const k of Object.values(perKind)) k.rate = k.total ? k.agree / k.total : 0;
  return {
    total: rows.length,
    agreement: rows.length ? agree / rows.length : 0,
    perKind,
    confusion,
    disagreements,
    permissionDenyAgreement: incumbentDenies ? denyAgree / incumbentDenies : null,
    unsafeAllows,
    estTokens: tokens,
    estCostUsd: (tokens / 1e6) * usdPerMTok,
    usdPerMTok,
  };
}

export function loadEvents(text) {
  return text.split('\n').filter((l) => l.trim()).map((l, i) => {
    try { return normalizeEvent(JSON.parse(l)); } catch (e) { throw new Error(`line ${i + 1}: ${redact(e.message)}`); }
  });
}

const pct = (x) => (x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`);

export function renderReport(r) {
  const out = ['# Jev shadow report (offline)', '', `Events: ${r.total}`, `Overall agreement: ${pct(r.agreement)}`,
    `Permission deny agreement: ${pct(r.permissionDenyAgreement)}`, `Unsafe allows: ${r.unsafeAllows}`,
    `Est. cost: $${r.estCostUsd.toFixed(6)} (${r.estTokens} tokens at $${r.usdPerMTok}/MTok)`, '',
    '## Agreement by kind', '', '| kind | agree | total | rate |', '|---|---|---|---|'];
  for (const [kind, k] of Object.entries(r.perKind)) out.push(`| ${kind} | ${k.agree} | ${k.total} | ${pct(k.rate)} |`);
  out.push('', '## Confusion (incumbent -> judge)', '');
  for (const [kind, rows] of Object.entries(r.confusion)) {
    out.push(`### ${kind}`, '', '| incumbent | judge | count |', '|---|---|---|');
    for (const [inc, js] of Object.entries(rows)) for (const [j, n] of Object.entries(js)) out.push(`| ${inc} | ${j} | ${n} |`);
    out.push('');
  }
  out.push('## Disagreements', '');
  if (!r.disagreements.length) out.push('None.');
  for (const d of r.disagreements) out.push(`- [${d.kind}] ${d.ts} incumbent=${d.incumbent} judge=${d.judge}: ${redact(d.input).replace(/\n/g, ' ').slice(0, 120)}`);
  return out.join('\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node scripts/jev-shadow/compare.mjs <events.jsonl>'); process.exit(2); }
  try {
    process.stdout.write(renderReport(compare(loadEvents(readFileSync(file, 'utf8')))));
  } catch (e) { console.error(`error: ${e.message}`); process.exit(1); }
}
