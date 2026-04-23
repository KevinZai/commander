#!/usr/bin/env node
/**
 * CI gate: fail build if any SKILL.md or agent .md has `<` or `>` in YAML description field.
 * Usage: node scripts/audit-frontmatter.js [--check]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  'commander/cowork-plugin/agents',
  'commander/cowork-plugin/skills',
  'skills',
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && (entry.name === 'SKILL.md' || (dir.endsWith('/agents') && entry.name.endsWith('.md')))) {
      out.push(full);
    }
  }
  return out;
}

function extractDescription(content) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  // Match description: "..." or description: '...' or description: | ... or description: > ...
  const m = fm.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
  if (!m) return null;
  // Strip leading YAML block scalar indicator (> or |) — these are YAML syntax, not text content
  return m[1].replace(/^[>|]\s*/, '').trim();
}

const violations = [];
for (const target of TARGETS) {
  const dir = path.join(ROOT, target);
  for (const file of walk(dir)) {
    const content = fs.readFileSync(file, 'utf-8');
    const desc = extractDescription(content);
    if (desc && /[<>]/.test(desc)) {
      violations.push({ file: path.relative(ROOT, file), match: desc.match(/[<>][^<>\n]{0,50}/)?.[0] || '' });
    }
  }
}

if (violations.length > 0) {
  console.error(`❌ Frontmatter audit FAILED — ${violations.length} files have angle brackets in description field:`);
  for (const v of violations) console.error(`  ${v.file}: ${v.match}`);
  process.exit(1);
}
console.log(`✅ Frontmatter audit PASSED — no angle brackets in any description field`);
process.exit(0);
