// Offline reference of queries.hogql over synthetic fixtures. No network.
import { readFileSync } from 'node:fs';
const events = JSON.parse(readFileSync(new URL('./fixtures/events.json', import.meta.url)));
const SKILL = new Set(['skill_invoked', 'cli_skill_invoked']);
// Week starts Sunday UTC (ClickHouse toStartOfWeek default mode 0).
const week = (t) => { const d = new Date(t); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.getTime() / 6048e5 | 0; };
const wau = {}; const first = {}; const active = {};
for (const e of events) {
  const w = week(e.timestamp);
  first[e.distinct_id] = Math.min(first[e.distinct_id] ?? Infinity, w);
  if (SKILL.has(e.event)) { (wau[w] ??= new Set()).add(e.distinct_id); (active[e.distinct_id] ??= new Set()).add(w); }
}
const out = { wau: Object.fromEntries(Object.entries(wau).map(([w, s]) => [w, s.size])), cohorts: {} };
for (const [id, c] of Object.entries(first)) {
  const row = (out.cohorts[c] ??= { size: 0, w1: 0, w2: 0, w3: 0, w4: 0 });
  row.size++;
  for (let n = 1; n <= 4; n++) if (active[id]?.has(c + n)) row['w' + n]++;
}
console.log(JSON.stringify(out, null, 1));
const c0 = Object.values(out.cohorts)[0];
if (c0.size !== 3 || c0.w1 !== 1 || c0.w2 !== 0 || c0.w3 !== 1 || c0.w4 !== 1) { console.error('unexpected fixture result'); process.exit(1); }
