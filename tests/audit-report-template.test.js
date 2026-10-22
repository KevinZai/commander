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
  assert.match(out, /\\\[x\\\]\\\(http:\/\/e\\\)/);
});
