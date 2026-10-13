// Pins the Commander "Safety" deck (feat/ecosystem-tools):
// commander/cowork-plugin/lib/safety-snapshot.js must render ONE
// self-contained, strict-CSP-safe HTML string from a bounded, tolerant
// read of ~/.claude/commander/analytics/permission-gate.jsonl and
// ~/.claude/commander/tool-failures.jsonl — decision-classification
// counts, top-failing-tool aggregation, error-signature grouping,
// secret redaction, the shared deck strip, and an honest zero-state
// when both logs are absent.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { buildSafetyHtml, readSafetyModel } from '../cowork-plugin/lib/safety-snapshot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERMISSION_GATE_HOOK = path.join(__dirname, '..', 'cowork-plugin', 'hooks', 'permission-gate.js');

let tmpRoot;

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-safety-snapshot-'));
});

test.after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

const NOW = Date.parse('2026-07-20T12:00:00.000Z');

function toLines(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
}

async function makeBase({ gate, failures } = {}) {
  const dir = await fs.mkdtemp(path.join(tmpRoot, 'base-'));
  if (gate) {
    await fs.mkdir(path.join(dir, 'analytics'), { recursive: true });
    await fs.writeFile(path.join(dir, 'analytics', 'permission-gate.jsonl'), toLines(gate));
  }
  if (failures) {
    await fs.writeFile(path.join(dir, 'tool-failures.jsonl'), toLines(failures));
  }
  return dir;
}

const GATE_ROWS = [
  { timestamp: '2026-07-20T05:00:00.000Z', sessionId: 's1', decision: 'approved', toolName: 'Bash' },
  { timestamp: '2026-07-20T05:00:01.000Z', sessionId: 's1', decision: 'approved', toolName: 'Read' },
  { timestamp: '2026-07-20T05:00:02.000Z', sessionId: 's1', decision: 'approved', toolName: 'Bash' },
  {
    timestamp: '2026-07-20T05:00:03.000Z',
    sessionId: 's1',
    decision: 'rejected-dangerous',
    toolName: 'Bash',
    commandSnippet: 'rm -rf /tmp',
  },
  {
    timestamp: '2026-07-20T05:00:04.000Z',
    sessionId: 's1',
    decision: 'rejected-autofix',
    toolName: 'Write',
    skill: '/ccc-review',
    phase: 'autofix',
  },
];

// Split literal so the CI "verify no secrets" grep (sk-<20+ alnum>) doesn't
// false-positive on this redaction-test fixture; runtime value is unchanged.
const SECRET = 'sk-' + 'THISISNOTAREALKEY1234567890ABCDEF';

const FAILURE_ROWS = [
  { ts: '2026-07-19T10:00:00.000Z', tool_name: 'Bash', error: 'Exit code 143\nCommand timed out after 1m 30s' },
  { ts: '2026-07-19T11:00:00.000Z', tool_name: 'Bash', error: 'Exit code 143\nCommand timed out after 2m 45s' },
  {
    ts: '2026-07-19T12:00:00.000Z',
    tool_name: 'mcp__openclaw__web_search',
    error: 'Blocked hostname or private/internal/special-use IP address',
  },
  {
    ts: '2026-07-19T13:00:00.000Z',
    tool_name: 'Bash',
    error: `Auth failed using token ${SECRET}`,
  },
];

test('readSafetyModel classifies decisions: a DENIED autofix is blocked, not auto-fixed', async () => {
  const baseDir = await makeBase({ gate: GATE_ROWS });
  const model = await readSafetyModel({ baseDir, now: NOW });

  assert.equal(model.decisions.total, 5);
  assert.equal(model.decisions.approved, 3);
  // rejected-dangerous AND rejected-autofix are both BLOCKS — the gate logs
  // `rejected-autofix` when it DENIES the write (permission-gate.js:160), so
  // it must never be counted as an applied auto-fix.
  assert.equal(model.decisions.blocked, 2);
  assert.equal(model.decisions.autofixed, 0);
  assert.equal(model.decisions.otherCount, 0);

  const byDecision = Object.fromEntries(model.decisions.counts.map((c) => [c.decision, c]));
  assert.equal(byDecision.approved.count, 3);
  assert.equal(byDecision.approved.kind, 'approved');
  assert.equal(byDecision['rejected-dangerous'].count, 1);
  assert.equal(byDecision['rejected-dangerous'].kind, 'blocked');
  assert.equal(byDecision['rejected-autofix'].count, 1);
  assert.equal(byDecision['rejected-autofix'].kind, 'blocked');
});

test('readSafetyModel counts a GENUINE applied auto-fix as auto-fixed (forward-compat)', async () => {
  const baseDir = await makeBase({
    gate: [
      { timestamp: '2026-07-20T06:00:00.000Z', sessionId: 's2', decision: 'auto-fixed', toolName: 'Edit' },
      { timestamp: '2026-07-20T06:00:01.000Z', sessionId: 's2', decision: 'approved-autofix', toolName: 'Edit' },
    ],
  });
  const model = await readSafetyModel({ baseDir, now: NOW });
  assert.equal(model.decisions.autofixed, 2);
  assert.equal(model.decisions.blocked, 0);
});

// v7.3.0, W2+/codex 13 — end-to-end: spawns the REAL permission-gate.js hook
// (not a hand-crafted fixture row) with CCC_AUTOFIX_APPROVED=1, then feeds
// its actual jsonl output straight into readSafetyModel/buildSafetyHtml.
// This is what proves the "auto-fixed" bucket is wired end-to-end, not just
// that classifyDecision() recognizes the string in isolation.
test('end-to-end: permission-gate.js CCC_AUTOFIX_APPROVED=1 write feeds readSafetyModel\'s "auto-fixed" bucket', async () => {
  const home = await fs.mkdtemp(path.join(tmpRoot, 'e2e-home-'));
  const payload = JSON.stringify({
    tool_name: 'Write',
    tool_input: { file_path: '/tmp/foo.js', content: 'fixed' },
    session_id: 'e2e-autofix',
    context: { skill: '/ccc-review', phase: 'autofix' },
  });

  const result = spawnSync(process.execPath, [PERMISSION_GATE_HOOK], {
    input: payload,
    encoding: 'utf-8',
    timeout: 8000,
    env: { ...process.env, HOME: home, CCC_AUTOFIX_APPROVED: '1' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout.trim()).continue, true);

  const baseDir = path.join(home, '.claude', 'commander');
  const model = await readSafetyModel({ baseDir, now: NOW });
  assert.equal(model.decisions.autofixed, 1);
  assert.equal(model.decisions.blocked, 0);
  assert.equal(model.decisions.total, 1);

  const html = buildSafetyHtml(model, { now: NOW });
  assert.match(html, /auto-fixed <strong>1<\/strong> for you/);
});

test('readSafetyModel aggregates top-failing tools by count', async () => {
  const baseDir = await makeBase({ failures: FAILURE_ROWS });
  const model = await readSafetyModel({ baseDir, now: NOW });

  assert.equal(model.toolFailures.total, 4);
  assert.equal(model.toolFailures.byTool[0].tool, 'Bash');
  assert.equal(model.toolFailures.byTool[0].count, 3);
  const webSearch = model.toolFailures.byTool.find((t) => t.tool === 'mcp__openclaw__web_search');
  assert.equal(webSearch.count, 1);
});

test('readSafetyModel groups near-duplicate errors (same signature, different exit-timing) into one row', async () => {
  const baseDir = await makeBase({ failures: FAILURE_ROWS });
  const model = await readSafetyModel({ baseDir, now: NOW });

  const timeoutSignature = model.toolFailures.topErrors.find((e) => /Exit code/.test(e.signature));
  assert.ok(timeoutSignature, 'expected a grouped Exit-code-143 signature');
  assert.equal(timeoutSignature.count, 2);
});

test('readSafetyModel redacts secrets in both the sample and the signature — never shown raw', async () => {
  const baseDir = await makeBase({ failures: FAILURE_ROWS });
  const model = await readSafetyModel({ baseDir, now: NOW });

  const serialized = JSON.stringify(model);
  assert.ok(!serialized.includes(SECRET), 'raw secret leaked into the model');
  assert.ok(serialized.includes('[redacted]'), 'expected the redaction marker to appear');
});

test('readSafetyModel redacts MULTI-TOKEN secrets — Basic auth base64 + AWS AKIA never leak', async () => {
  // Regression for the adversarial finding: `Authorization: Basic <base64>`
  // survived redaction because the keyword pattern only stripped one token.
  const BASIC = 'dXNlcm5hbWU6c3VwZXJzZWNyZXRwYXNzd29yZA==';
  const AKIA = 'AKIAIOSFODNN7EXAMPLE';
  const baseDir = await makeBase({
    failures: [
      { ts: '2026-07-19T14:00:00.000Z', tool_name: 'Bash', error: `curl -H "Authorization: Basic ${BASIC}" failed` },
      { ts: '2026-07-19T15:00:00.000Z', tool_name: 'Bash', error: `aws call denied for ${AKIA}` },
    ],
  });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  for (const surface of [JSON.stringify(model), html]) {
    assert.ok(!surface.includes(BASIC), 'Basic-auth base64 credential leaked');
    assert.ok(!surface.includes(AKIA), 'AWS access-key id leaked');
  }
  assert.ok(html.includes('[redacted]'), 'expected the redaction marker');
});

test('redaction: Basic credentials redact in EVERY wrapping form; benign "Basic ..." prose does NOT', async () => {
  // Two adversarial rounds: a length threshold missed short creds + over-redacted
  // prose; then a context-anchored matcher leaked quoted/JSON/raw forms. The
  // shape-based decoder must redact `Basic <base64-of-user:pass>` however it's
  // wrapped, while leaving prose words after "Basic" untouched.
  const SHORT = 'dXNlcjpw'; // base64("user:p")
  const LONG = 'dXNlcjpwYXNz'; // base64("user:pass")
  const baseDir = await makeBase({
    failures: [
      { ts: '2026-07-19T16:00:00.000Z', tool_name: 'Bash', error: `curl -H "Authorization: Basic ${SHORT}" -> 401` },
      { ts: '2026-07-19T16:10:00.000Z', tool_name: 'Bash', error: `header Authorization: "Basic ${LONG}" rejected` },
      { ts: '2026-07-19T16:20:00.000Z', tool_name: 'Bash', error: `{"Authorization":"Basic ${LONG}"}` },
      { ts: '2026-07-19T16:30:00.000Z', tool_name: 'Bash', error: `raw creds Basic ${LONG} in log` },
      { ts: '2026-07-19T16:40:00.000Z', tool_name: 'Bash', error: `Proxy-Authorization: Basic ${LONG}` },
      { ts: '2026-07-19T17:00:00.000Z', tool_name: 'Bash', error: 'Basic authentication failed for the upstream proxy' },
    ],
  });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  for (const surface of [JSON.stringify(model), html]) {
    assert.ok(!surface.includes(SHORT), 'short Basic credential leaked');
    assert.ok(!surface.includes(LONG), 'Basic credential leaked in a quoted/JSON/raw/Proxy form');
  }
  // benign prose survives — "authentication" must not have been eaten
  assert.ok(html.includes('authentication failed'), 'benign "Basic authentication failed" prose was over-redacted');
});

test('readSafetyModel on an empty baseDir returns an honest zero-state, no crash', async () => {
  const baseDir = await makeBase({});
  const model = await readSafetyModel({ baseDir, now: NOW });

  assert.equal(model.decisions.total, 0);
  assert.deepEqual(model.decisions.counts, []);
  assert.equal(model.toolFailures.total, 0);
  assert.deepEqual(model.toolFailures.byTool, []);
  assert.deepEqual(model.toolFailures.topErrors, []);
});

test('readSafetyModel tolerates a missing baseDir entirely (no throw)', async () => {
  const missing = path.join(tmpRoot, 'does-not-exist-' + Math.random().toString(36).slice(2));
  const model = await readSafetyModel({ baseDir: missing, now: NOW });
  assert.equal(model.decisions.total, 0);
  assert.equal(model.toolFailures.total, 0);
});

test('buildSafetyHtml is self-contained: one <title>, no <script>, no external URLs', async () => {
  const baseDir = await makeBase({ gate: GATE_ROWS, failures: FAILURE_ROWS });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  const titleMatches = html.match(/<title>/g) || [];
  assert.equal(titleMatches.length, 1, 'expected exactly one <title>');
  assert.ok(!/<script/i.test(html), 'artifact must not contain <script>');
  assert.ok(!/https?:\/\//i.test(html), 'artifact must not reference an external URL');
  assert.ok(!/\bsrc=["']/i.test(html), 'artifact must not have a src= attribute');
});

test('buildSafetyHtml includes the deck strip with Safety marked current', async () => {
  const baseDir = await makeBase({ gate: GATE_ROWS, failures: FAILURE_ROWS });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  assert.ok(html.includes('deck-strip'), 'expected the shared deck-switcher strip');
  assert.ok(html.includes('Commander decks'), 'expected the deck-strip label');
  const currentChipIdx = html.indexOf('deck-chip current');
  assert.ok(currentChipIdx !== -1, 'expected a deck-chip current element');
  assert.ok(
    html.slice(currentChipIdx, currentChipIdx + 200).includes('Safety'),
    'expected Safety marked as the current deck'
  );
  // Non-interactive render mode (no <script> in this artifact) — other decks
  // show their open command as plain text, not a data-copy button.
  assert.ok(!html.includes('data-copy'), 'safety snapshot has no <script>, so chips must not be interactive buttons');
});

test('buildSafetyHtml never shows the raw secret, even end-to-end through the renderer', async () => {
  const baseDir = await makeBase({ failures: FAILURE_ROWS });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  assert.ok(!html.includes(SECRET), 'raw secret leaked into rendered HTML');
});

test('buildSafetyHtml renders the hero headline with real blocked/auto-fixed/approved counts', async () => {
  const baseDir = await makeBase({ gate: GATE_ROWS });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  // blocked = 2 (dangerous + denied autofix); no longer labelled "dangerous",
  // and the "auto-fixed" clause is absent because autofixed === 0.
  assert.ok(html.includes('blocked <strong>2</strong> action'));
  assert.ok(!/blocked <strong>\d+<\/strong> dangerous action/.test(html), 'headline must not claim all blocks are dangerous');
  assert.ok(!html.includes('auto-fixed <strong>0</strong>'), 'must not render "auto-fixed 0 for you"');
  assert.ok(html.includes('<strong>3</strong> tool call'));
});

test('buildSafetyHtml with no data anywhere renders an honest zero-state, not fabricated numbers', async () => {
  const baseDir = await makeBase({});
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  assert.ok(html.includes('No permission-gate telemetry yet'));
  assert.ok(html.includes('No tool failures logged yet'));
  assert.ok(!/<script/i.test(html));
  const titleMatches = html.match(/<title>/g) || [];
  assert.equal(titleMatches.length, 1);
});

test('readSafetyModel bad JSONL lines are skipped, valid lines survive', async () => {
  const dir = await fs.mkdtemp(path.join(tmpRoot, 'base-'));
  await fs.mkdir(path.join(dir, 'analytics'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'analytics', 'permission-gate.jsonl'),
    'not json\n' + JSON.stringify(GATE_ROWS[0]) + '\n\n[1,2,3]\n'
  );
  const model = await readSafetyModel({ baseDir: dir, now: NOW });
  // The bad line and the bare array are dropped; the one valid object survives.
  assert.equal(model.decisions.total, 1);
});

// ---------------------------------------------------------------------------
// v7.3.0 — Item 6: dataThrough + staleness banner.
// ---------------------------------------------------------------------------

test('readSafetyModel computes dataThroughMs as the newest of both logs\' timestamps', async () => {
  const baseDir = await makeBase({
    gate: [{ timestamp: '2026-07-18T00:00:00.000Z', sessionId: 's', decision: 'approved', toolName: 'Bash' }],
    failures: [{ ts: '2026-07-19T06:00:00.000Z', tool_name: 'Bash', error: 'boom' }],
  });
  const model = await readSafetyModel({ baseDir, now: NOW });

  assert.equal(model.dataThroughMs, Date.parse('2026-07-19T06:00:00.000Z'));
  assert.equal(model.hasAnySourceRow, true);
});

test('readSafetyModel hasAnySourceRow is false and dataThroughMs is null when both logs are empty', async () => {
  const baseDir = await makeBase({});
  const model = await readSafetyModel({ baseDir, now: NOW });

  assert.equal(model.hasAnySourceRow, false);
  assert.equal(model.dataThroughMs, null);
});

test('buildSafetyHtml renders "Data through" next to the snapshot stamp', async () => {
  const baseDir = await makeBase({
    failures: [{ ts: '2026-07-19T06:00:00.000Z', tool_name: 'Bash', error: 'boom' }],
  });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  assert.match(html, /Data through: 2026-07-19/);
});

test('buildSafetyHtml shows the stale-telemetry warning when the newest row is more than 24h old', async () => {
  const baseDir = await makeBase({
    failures: [{ ts: '2026-07-10T06:00:00.000Z', tool_name: 'Bash', error: 'boom' }],
  });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  assert.match(html, /Telemetry last written .* ago/);
  assert.match(html, /\/ccc-doctor/);
  assert.match(html, /update the plugin to ≥7\.2\.0/);
});

test('buildSafetyHtml does NOT show the stale-telemetry warning when the newest row is within 24h', async () => {
  const baseDir = await makeBase({
    failures: [{ ts: '2026-07-20T06:00:00.000Z', tool_name: 'Bash', error: 'boom' }],
  });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  assert.doesNotMatch(html, /Telemetry last written/);
});

test('buildSafetyHtml extends the honest zero-state with the doctor pointer when both logs are empty', async () => {
  const baseDir = await makeBase({});
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  assert.match(html, /No permission-gate telemetry yet/);
  assert.match(html, /Run \/ccc-doctor to check your hooks are wired/);
});

test('buildSafetyHtml does NOT append the doctor pointer when tool-failures has data but permission-gate is empty', async () => {
  const baseDir = await makeBase({
    failures: [{ ts: '2026-07-20T06:00:00.000Z', tool_name: 'Bash', error: 'boom' }],
  });
  const model = await readSafetyModel({ baseDir, now: NOW });
  const html = buildSafetyHtml(model, { now: NOW });

  assert.match(html, /No permission-gate telemetry yet/);
  assert.doesNotMatch(html, /Run \/ccc-doctor to check your hooks are wired/);
});

// ── 2026-07-28 security-audit regressions ────────────────────────────────────
// The full pattern library (secret-patterns.json) was previously consumed ONLY
// by secret-leak-guard.js, so JWTs and Google API keys rode error samples into
// published artifacts unredacted; and redactedSample kept absolute home paths,
// leaking the machine username. All fixture values are split literals per the
// repo convention so secret-scan tooling doesn't false-positive on them.

import { redact, redactedSample } from '../cowork-plugin/lib/safety-snapshot.js';

const FAKE_JWT =
  'eyJ' + 'hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' + '.' +
  'eyJ' + 'zdWIiOiIxMjM0NTY3ODkwIn0' + '.' +
  'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
const FAKE_GOOGLE_KEY = 'AIza' + 'SyA1234567890abcdefghijklmnopqrstuvw';

test('redact: JWTs are redacted (pattern library is wired in)', () => {
  const out = redact(`auth failed: ${FAKE_JWT}`);
  assert.ok(!out.includes(FAKE_JWT), 'JWT must not survive redaction');
  assert.ok(out.includes('[redacted]'), 'redaction marker expected');
});

test('redact: Google API keys are redacted (pattern library is wired in)', () => {
  const out = redact(`fetch with key ${FAKE_GOOGLE_KEY} failed`);
  assert.ok(!out.includes(FAKE_GOOGLE_KEY), 'AIza key must not survive redaction');
});

test('redactedSample: home-dir username is folded out of display samples', () => {
  const out = redactedSample('ENOENT: /Users/somebody/clawd/projects/x/file.txt missing');
  assert.ok(!out.includes('/Users/somebody'), 'username must not reach a published sample');
  assert.ok(out.includes('<home>'), 'folded marker expected');
  assert.ok(out.includes('file.txt'), 'leaf segment kept for debuggability');
});

test('redactedSample: linux /home paths fold too', () => {
  const out = redactedSample('read /home/someuser/.ssh/config failed');
  assert.ok(!out.includes('/home/someuser'));
  assert.ok(out.includes('<home>'));
});

test('redactedSample: flattened Claude project-dir home paths fold too (CC-1397)', () => {
  // Claude Code's project-dir naming turns "/Users/kevin/clawd/…" into
  // "-Users-kevin-clawd-…" (slashes replaced with dashes) — the "/Users/" fold
  // above never matches that shape because it requires a literal slash.
  const out = redactedSample('config read from -Users-kevin-clawd-projects-cc-commander/settings.json failed');
  assert.ok(!out.includes('-Users-kevin-clawd-projects-cc-commander'), 'flattened home path must not survive');
  assert.ok(out.includes('<home>'), 'folded marker expected');
});

test('redact: clean text passes through unmodified', () => {
  assert.equal(redact('ordinary error, no secrets'), 'ordinary error, no secrets');
});
