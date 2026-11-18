#!/usr/bin/env node
'use strict';

// Generates src/data/skills.generated.json from the plugin catalog
// (commander/cowork-plugin/skills/*/SKILL.md) so the skill picker never drifts
// from the shipped skills. Run from the repo checkout (needs the root devDependency
// js-yaml); the generated JSON is committed and bundled into the extension.
//
//   node scripts/generate-skills.js           write the file
//   node scripts/generate-skills.js --check   exit 1 when the file is stale

const fs = require('node:fs');
const path = require('node:path');

const EXT_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.resolve(EXT_ROOT, '..', 'commander', 'cowork-plugin', 'skills');
const OUT_FILE = path.join(EXT_ROOT, 'src', 'data', 'skills.generated.json');

function loadYaml() {
  try {
    return require('js-yaml');
  } catch (err) {
    throw new Error('js-yaml is not installed; run `npm ci` at the repository root first (' + err.message + ')');
  }
}

function frontmatter(yaml, file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(file + ': no frontmatter');
  return yaml.load(match[1]) || {};
}

function buildCatalog() {
  if (!fs.existsSync(SKILLS_DIR)) {
    throw new Error('plugin catalog not found at ' + SKILLS_DIR + ' (run from a repository checkout)');
  }
  const yaml = loadYaml();
  const seen = new Set();
  const out = [];
  for (const dir of fs.readdirSync(SKILLS_DIR).sort()) {
    const file = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const fm = frontmatter(yaml, file);
    const name = String(fm.name || dir);
    if (seen.has(name)) throw new Error('duplicate skill name in catalog: ' + name);
    seen.add(name);
    const description = String(fm.description || '').replace(/\s+/g, ' ').trim();
    out.push({ id: name, name, description, command: '/' + name });
  }
  return out;
}

function render(catalog) {
  return JSON.stringify(catalog, null, 2) + '\n';
}

function main() {
  const next = render(buildCatalog());
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
    if (current !== next) {
      console.error('skills.generated.json is stale; run `npm run gen:skills` in vscode-extension/');
      process.exit(1);
    }
    console.log('skills.generated.json is up to date');
    return;
  }
  fs.writeFileSync(OUT_FILE, next);
  console.log('wrote ' + path.relative(EXT_ROOT, OUT_FILE) + ' (' + JSON.parse(next).length + ' skills)');
}

if (require.main === module) main();

module.exports = { buildCatalog, render, OUT_FILE };
