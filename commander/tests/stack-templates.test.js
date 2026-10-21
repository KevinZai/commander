'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const v = require('../stack-templates/validate');

function clone(o) { return JSON.parse(JSON.stringify(o)); }

describe('stack templates (offline)', () => {
  const doc = v.loadTemplates();

  it('shipped templates validate with no errors', () => {
    assert.deepEqual(v.validateTemplates(doc), []);
  });

  it('ships about ten templates including the card examples', () => {
    assert.ok(doc.templates.length >= 10);
    const ids = doc.templates.map((t) => t.id);
    assert.ok(ids.includes('nextjs-supabase-vercel'));
    assert.ok(ids.includes('bun-postgres-fly'));
    assert.ok(ids.includes('other'));
  });

  it('contains no URLs at all (no signups, no affiliate params)', () => {
    const raw = fs.readFileSync(v.TEMPLATES_PATH, 'utf8');
    assert.ok(!/https?:\/\//i.test(raw));
    assert.ok(!/ref=|aff|utm_/i.test(raw));
  });

  it('every connector id appears in the ccc-connect catalog', () => {
    const catalog = fs.readFileSync(
      path.join(__dirname, '..', 'cowork-plugin', 'skills', 'ccc-connect', 'references', 'connectors.md'), 'utf8'
    ).toLowerCase().replace(/[.\s]/g, '');
    doc.templates.forEach((t) => t.services.forEach((s) => {
      if (s.connector) assert.ok(catalog.includes('|' + s.connector + '[aff]|') || catalog.includes('|' + s.connector + '|'), s.connector);
    }));
  });

  it('rejects bad schemaVersion, empty templates and duplicate ids', () => {
    const a = clone(doc); a.schemaVersion = 2;
    assert.ok(v.validateTemplates(a).length > 0);
    assert.ok(v.validateTemplates({ schemaVersion: 1, templates: [] }).length > 0);
    const b = clone(doc); b.templates.push(clone(b.templates[0]));
    assert.ok(v.validateTemplates(b).some((e) => /duplicate template id/.test(e)));
  });

  it('rejects bad id, role, unknown connector, duplicate connector and URL fields', () => {
    const t = clone(doc.templates[0]);
    t.id = 'Bad_ID';
    t.services[0].role = 'nope';
    t.services[1].connector = 'madeup';
    t.services[2].url = 'https://example.com';
    const errs = v.validateTemplate(t, 0).join('\n');
    assert.match(errs, /kebab-case/);
    assert.match(errs, /role must be/);
    assert.match(errs, /unknown connector/);
    assert.match(errs, /URLs are not allowed/);
    const d = clone(doc.templates[0]);
    d.services[2].connector = d.services[1].connector;
    assert.match(v.validateTemplate(d, 0).join('\n'), /duplicate connector/);
  });

  it('rejects non-object inputs', () => {
    assert.ok(v.validateTemplates(null).length > 0);
    assert.ok(v.validateTemplate(null, 0).length > 0);
  });
});
