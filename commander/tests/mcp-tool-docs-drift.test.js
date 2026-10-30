'use strict';

// The browse-modes page lists the hosted MCP server's tools from a generated
// block (scripts/generate-mcp-tool-docs.js). Fails when the server's tool
// registry (apps/mcp-server-cloud/src/tools/index.ts) and the docs drift.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'generate-mcp-tool-docs.js');
const gen = require(SCRIPT);

function registryNames() {
  const src = fs.readFileSync(gen.REGISTRY, 'utf8');
  const block = src.slice(src.indexOf('export const TOOL_NAMES'), src.indexOf('] as const;'));
  return [...block.matchAll(/"(commander_[a-z_]+)"/g)].map((m) => m[1]);
}

function docBlock() {
  const doc = fs.readFileSync(gen.DOC, 'utf8');
  return doc.slice(doc.indexOf(gen.BEGIN), doc.indexOf(gen.END));
}

test('generator --check passes on the committed docs', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr || r.stdout);
});

test('every registry tool appears in the browse-modes table, and nothing else', () => {
  const names = registryNames();
  assert.ok(names.length >= 18, `expected the full registry, got ${names.length}`);
  const listed = [...docBlock().matchAll(/^\| `(commander_[a-z_]+)/gm)].map((m) => m[1]);
  assert.deepStrictEqual(listed, names);
  assert.match(docBlock(), new RegExp(`\\*\\*${names.length} MCP tools\\*\\*`));
});

test('parser reads a title and description for every tool', () => {
  const tools = gen.parseRegistry(fs.readFileSync(gen.REGISTRY, 'utf8'));
  assert.deepStrictEqual(tools.map((t) => t.name), registryNames());
  for (const t of tools) {
    assert.ok(t.title && t.description, t.name);
  }
});

test('a doc missing a tool row is detected as drift', () => {
  const tools = gen.parseRegistry(fs.readFileSync(gen.REGISTRY, 'utf8'));
  const doc = fs.readFileSync(gen.DOC, 'utf8');
  const stale = gen.applyBlock(doc, gen.renderBlock(tools.slice(0, -1)));
  assert.notStrictEqual(gen.applyBlock(stale, gen.renderBlock(tools)), stale);
});

test('the old hand-written 13-tool list is gone', () => {
  const doc = fs.readFileSync(gen.DOC, 'utf8');
  assert.doesNotMatch(doc, /\b13 MCP tools\b/);
  for (const ghost of ['list_modes', 'enter_mode', 'send_feedback', 'get_session_time', 'list_hooks', 'get_connector']) {
    assert.ok(!doc.includes('`' + ghost), `${ghost} is not a server tool`);
  }
});
