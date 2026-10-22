// CC-757 slice 1: offline audit-report template. Run: node --test tests/audit-report-template.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'templates', 'audit-report');
const fixture = JSON.parse(fs.readFileSync(path.join(dir, 'fixture.json'), 'utf8'));
const load = () => import(path.join(dir, 'render.mjs'));

test('full render fills every section and leaves no placeholders', async () => {
  const { renderAuditReport } = await load();
  const out = renderAuditReport(fixture);
  assert.doesNotMatch(out, /\{\{\w+\}\}/);
  assert.doesNotMatch(out, /_Not assessed_/);
  for (const h of ['Executive summary', 'Scorecard', 'Hardening pillars', 'Project health', 'Review findings by severity', 'Prioritized fixes', 'Methodology', 'Disclaimer']) {
    assert.match(out, new RegExp(`## \\d\\. ${h}`));
  }
  assert.match(out, /acme\/storefront/);
  assert.match(out, /\*\*Overall score:\*\* 72 \/ 100/);
  assert.match(out, /### High \(1\)/);
  assert.ok(out.indexOf('### High') < out.indexOf('### Medium'));
  assert.ok(out.indexOf('### Medium') < out.indexOf('### Low'));
  assert.match(out, /1\. \*\*Rotate committed API key\*\* \(P0, effort: 1h\)/);
  assert.equal(renderAuditReport(fixture), out, 'pure: same input, same output');
});

test('missing sections render as _Not assessed_', async () => {
  const { renderAuditReport } = await load();
  const { review, xray, ...rest } = fixture;
  const out = renderAuditReport(rest);
  assert.match(out, /## 4\. Project health \(\/ccc-xray\)\n\n_Not assessed_/);
  assert.match(out, /## 5\. Review findings by severity \(\/ccc-review\)\n\n_Not assessed_/);
  assert.match(out, /## 2\. Scorecard\n\n\*\*Overall/);
  const empty = renderAuditReport({});
  assert.doesNotMatch(empty, /\{\{\w+\}\}/);
  assert.equal(renderAuditReport(undefined).includes('_Not assessed_'), true);
});

test('values are Markdown-escaped and cannot inject placeholders or tables', async () => {
  const { renderAuditReport, escapeMd } = await load();
  assert.equal(escapeMd('a*b_c`d'), 'a\\*b\\_c\\`d');
  assert.equal(escapeMd('<script>'), '&lt;script&gt;');
  const out = renderAuditReport({
    ...fixture,
    client: '# Evil *Corp* {{repo}}',
    scorecard: { categories: [{ name: 'a | b\nc', score: 1, notes: '[x](http://e)' }] },
  });
  assert.match(out, /\\# Evil \\\*Corp\\\* \\\{\\\{repo\\\}\\\}/);
  assert.match(out, /a \\\| b c/);
  assert.match(out, /\\\[x\\\]\\\(hxxp:\/\/e\\\)/);
});

test('escapeMd collapses every line terminator including lone CR, NEL, LS and PS', async () => {
  const { escapeMd } = await load();
  for (const nl of ['\r', '\n', '\r\n', '\u0085', '\u2028', '\u2029']) {
    assert.equal(escapeMd(`a${nl}b`), 'a b', JSON.stringify(nl));
  }
  assert.equal(escapeMd('a\r\r\n\nb'), 'a b');
});

test('malformed section shapes render _Not assessed_ instead of throwing', async () => {
  const { renderAuditReport } = await load();
  const bad = [
    { fixes: 'abc' },
    { fixes: [null] },
    { fixes: [null, 5, 'x'] },
    { hardening: { pillars: 'abc' } },
    { hardening: { pillars: [null] } },
    { review: { findings: [null] } },
    { review: { findings: 'abc' } },
    { scorecard: { categories: 'abc' } },
    { scorecard: { categories: [null, 3] } },
    { xray: { dimensions: 'abc' } },
    { xray: { dimensions: [null] } },
  ];
  for (const d of bad) {
    let out;
    assert.doesNotThrow(() => { out = renderAuditReport(d); }, JSON.stringify(d));
    assert.match(out, /_Not assessed_/);
  }
  const out = renderAuditReport({ fixes: 'abc', hardening: { pillars: 'abc' }, review: { findings: [null] } });
  assert.match(out, /## 3\. Hardening pillars[^\n]*\n\n_Not assessed_/);
  assert.match(out, /## 5\. Review findings by severity[^\n]*\n\n_Not assessed_/);
  assert.match(out, /## 6\. Prioritized fixes[^\n]*\n\n_Not assessed_/);
});

test('null items are skipped while valid siblings still render', async () => {
  const { renderAuditReport } = await load();
  const out = renderAuditReport({ fixes: [null, { title: 'Patch it', priority: 'P1', effort: '2h' }], review: { findings: [null, { severity: 'high', title: 'T', detail: 'D' }] } });
  assert.match(out, /1\. \*\*Patch it\*\* \(P1, effort: 2h\)/);
  assert.match(out, /### High \(1\)/);
});

test('ampersands are escaped without double-escaping angle brackets', async () => {
  const { escapeMd } = await load();
  assert.equal(escapeMd('a & b'), 'a &amp; b');
  assert.equal(escapeMd('&lt;'), '&amp;lt;');
  assert.equal(escapeMd('<b>&'), '&lt;b&gt;&amp;');
});

test('bare URLs are defanged to hxxp/hxxps', async () => {
  const { escapeMd, renderAuditReport } = await load();
  assert.equal(escapeMd('see http://evil.test/x'), 'see hxxp://evil.test/x');
  assert.equal(escapeMd('see https://evil.test/x'), 'see hxxps://evil.test/x');
  assert.equal(escapeMd('HTTPS://EVIL.TEST'), 'HxxPS://EVIL.TEST');
  const out = renderAuditReport({ ...fixture, client: 'go to https://evil.test/phish now' });
  assert.doesNotMatch(out, /https?:\/\/evil\.test/);
  assert.match(out, /hxxps:\/\/evil\.test\/phish/);
});

test('placeholder lookup ignores inherited Object.prototype keys', async () => {
  const { renderAuditReport } = await load();
  const out = renderAuditReport({}, 'a {{constructor}} b {{toString}} c {{__proto__}} d {{repo}}');
  assert.equal(out, 'a {{constructor}} b {{toString}} c {{__proto__}} d _Not assessed_');
});
