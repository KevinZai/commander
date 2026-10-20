'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const cases = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'visualize', 'mermaid-cases.json'), 'utf8'));
const CODES = ['unsupported_type', 'empty_source', 'source_too_large', 'unsupported_diagram', 'render_unavailable'];

describe('commander_visualize mermaid fixtures (contract only)', () => {
  it('cover each diagram family and each error code except source_too_large', () => {
    const names = cases.map((c) => c.name);
    assert.strictEqual(new Set(names).size, names.length);
    const diagrams = cases.filter((c) => c.response.ok).map((c) => c.response.diagram).sort();
    assert.deepStrictEqual(diagrams, ['erDiagram', 'flowchart', 'sequenceDiagram']);
    const codes = cases.filter((c) => !c.response.ok).map((c) => c.response.error.code);
    for (const code of CODES.filter((c) => c !== 'source_too_large')) assert.ok(codes.includes(code), code);
  });

  it('success responses echo source as code; failures carry a known code', () => {
    for (const c of cases) {
      if (c.response.ok) {
        assert.strictEqual(c.response.code, c.request.input.source);
        assert.strictEqual(c.response.format, 'mermaid');
      } else {
        assert.ok(CODES.includes(c.response.error.code));
        assert.ok(c.response.error.message.length > 0);
      }
    }
  });
});
