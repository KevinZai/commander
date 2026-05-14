#!/usr/bin/env node
/**
 * CI gate: enforce [C:domain] — prefix on plugin layer files.
 * Scans:
 *   - commander/cowork-plugin/skills/*\/SKILL.md
 *   - commander/cowork-plugin/agents/*.md
 *   - commands/*.md
 *
 * Usage:
 *   node commander/scripts/audit-naming.js --check   # exit 1 on violation
 *   node commander/scripts/audit-naming.js --fix     # auto-fix safe issues (trim trailing space, normalize em-dash)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

const VALID_DOMAINS = new Set([
  'plugin', 'lifecycle', 'design', 'marketing', 'saas', 'devops', 'seo',
  'testing', 'security', 'data', 'research', 'mobile', 'makeover', 'agent', 'meta',
]);

const WARN_LEN = 180;
const FAIL_LEN = 200;

// ── File collection ───────────────────────────────────────────────────────────
function collectFiles() {
  const files = [];

  // Plugin skills
  const skillsDir = path.join(ROOT, 'commander/cowork-plugin/skills');
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) files.push(skillFile);
    }
  }

  // Agents
  const agentsDir = path.join(ROOT, 'commander/cowork-plugin/agents');
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir)) {
      if (entry.endsWith('.md') && !entry.includes('.backup')) {
        files.push(path.join(agentsDir, entry));
      }
    }
  }

  // Commands
  const commandsDir = path.join(ROOT, 'commands');
  if (fs.existsSync(commandsDir)) {
    for (const entry of fs.readdirSync(commandsDir)) {
      if (entry.endsWith('.md')) {
        const full = path.join(commandsDir, entry);
        if (fs.statSync(full).isFile()) files.push(full);
      }
    }
  }

  return files;
}

// ── Frontmatter parsing ───────────────────────────────────────────────────────
function extractDescription(content) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  // Match description: "..." or description: '...' or description: bare
  const m = fm.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
  if (!m) return null;
  let raw = m[1].trim();
  // Strip surrounding quotes
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return raw;
}

// ── Check logic ───────────────────────────────────────────────────────────────
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rel = path.relative(ROOT, filePath);

  if (!content.startsWith('---')) {
    return [{ file: rel, type: 'ERROR', msg: 'No frontmatter block' }];
  }

  const desc = extractDescription(content);
  const issues = [];

  if (!desc) {
    issues.push({ file: rel, type: 'ERROR', msg: 'No description field in frontmatter' });
    return issues;
  }

  // Check that [C:domain] — prefix is ABSENT (UX cleanup 2026-05-14: prefixes
  // were stripped from user-facing descriptions since they leaked into the
  // Cowork Desktop chip picker. Source-of-truth for domain is the directory
  // path / file location, not a stringly-typed prefix.)
  if (/^\[C:[a-z-]+\]\s*[—–-]/.test(desc)) {
    issues.push({ file: rel, type: 'ERROR', msg: `Stale [C:domain] — prefix present. Strip it. Got: "${desc.slice(0, 60)}"` });
  }

  // Length check
  if (desc.length > FAIL_LEN) {
    issues.push({ file: rel, type: 'ERROR', msg: `Description too long (${desc.length} chars, max ${FAIL_LEN})` });
  } else if (desc.length > WARN_LEN) {
    issues.push({ file: rel, type: 'WARN', msg: `Description approaching limit (${desc.length} chars, warn at ${WARN_LEN})` });
  }

  return issues;
}

// ── Fix logic (safe auto-fixes only) ─────────────────────────────────────────
function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let fixed = content;

  // Normalize en-dash/hyphen to em-dash after [C:domain]
  fixed = fixed.replace(/(\[C:[a-z-]+\])\s*[–-]\s*/g, '$1 — ');

  // Trim trailing whitespace in description line
  fixed = fixed.replace(/(^description:.*)\s+$/m, '$1');

  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed, 'utf-8');
    return true;
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isCheck = args.includes('--check') || (!args.includes('--fix'));
const isFix = args.includes('--fix');

const files = collectFiles();
const allIssues = [];

for (const file of files) {
  if (isFix) fixFile(file);
  const issues = checkFile(file);
  allIssues.push(...issues);
}

const errors = allIssues.filter(i => i.type === 'ERROR');
const warns  = allIssues.filter(i => i.type === 'WARN');

if (warns.length > 0) {
  console.warn(`⚠️  ${warns.length} warnings:`);
  for (const w of warns) console.warn(`  [WARN] ${w.file}: ${w.msg}`);
}

if (errors.length > 0) {
  console.error(`\n❌ Naming audit FAILED — ${errors.length} violations across ${files.length} files:`);
  for (const e of errors) console.error(`  [ERROR] ${e.file}: ${e.msg}`);
  process.exit(1);
}

console.log(`✅ Naming audit PASSED — ${files.length} files checked, 0 violations${warns.length > 0 ? `, ${warns.length} warnings` : ''}.`);
process.exit(0);
