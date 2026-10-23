'use strict';

// Every invocable surface in the Desktop plugin shares one namespace:
// skills (frontmatter `name`), plugin commands (`commands/*.md`), workflows
// (`meta.name`, run as /commander:<name>) and mod-registered commands.
// When two surfaces claim the same name, Claude Code lists only one of them
// and the other becomes unreachable by name (audit #209 P0-3: the ccc-fleet
// workflow hid the ccc-fleet skill). This test fails if any name is claimed
// more than once.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN = path.resolve(__dirname, '..', 'cowork-plugin');

function listDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function frontmatterName(file) {
  const src = fs.readFileSync(file, 'utf8');
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const m = fm && fm[1].match(/^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m);
  return m ? m[1].trim() : null;
}

function walk(dir, pick) {
  const out = [];
  for (const entry of listDir(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, pick));
    else if (pick(entry.name)) out.push(full);
  }
  return out;
}

function collectClaims() {
  const claims = [];
  const add = (name, source) => claims.push({ name, source: path.relative(PLUGIN, source) });

  for (const entry of listDir(path.join(PLUGIN, 'skills'))) {
    if (!entry.isDirectory()) continue;
    const file = path.join(PLUGIN, 'skills', entry.name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    add(frontmatterName(file) || entry.name, file);
  }

  for (const file of walk(path.join(PLUGIN, 'commands'), (n) => n.endsWith('.md'))) {
    add(frontmatterName(file) || path.basename(file, '.md'), file);
  }

  for (const entry of listDir(path.join(PLUGIN, 'workflows'))) {
    if (!entry.name.endsWith('.workflow.js')) continue;
    const file = path.join(PLUGIN, 'workflows', entry.name);
    const src = fs.readFileSync(file, 'utf8');
    const m = src.match(/export const meta = \{[\s\S]*?\bname:\s*['"`]([^'"`]+)['"`]/);
    assert.ok(m, `${entry.name}: meta.name not found`);
    add(m[1], file);
  }

  for (const file of walk(path.join(PLUGIN, 'mods'), (n) => /\.(t|j)sx?$/.test(n) && !/\.test\./.test(n))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/command\.register\(\s*\{[^}]*?\bname:\s*['"`]([^'"`]+)['"`]/g)) add(m[1], file);
  }

  return claims;
}

test('the plugin claim scan sees skills and workflows', () => {
  const claims = collectClaims();
  assert.ok(claims.some((c) => c.source.startsWith('skills' + path.sep)), 'no skills found');
  assert.ok(claims.some((c) => c.source.startsWith('workflows' + path.sep)), 'no workflows found');
  assert.ok(claims.some((c) => c.name === 'ccc-hud'), 'mod-registered command ccc-hud not found');
});

test('no command name is claimed by more than one skill, command, workflow or mod', () => {
  const byName = new Map();
  for (const c of collectClaims()) {
    if (!byName.has(c.name)) byName.set(c.name, []);
    byName.get(c.name).push(c.source);
  }
  const dupes = [...byName].filter(([, sources]) => sources.length > 1);
  assert.deepStrictEqual(
    dupes.map(([name, sources]) => `${name}: ${sources.join(', ')}`),
    [],
    'each /commander:<name> must have exactly one owner'
  );
});
