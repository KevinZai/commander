'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const AUDIT_SCRIPT = path.join(ROOT, 'commander/scripts/audit-naming.js');
const TMP_DIR = path.join(ROOT, '.tmp-audit-naming-test');

const VALID_DOMAINS = [
  'plugin', 'lifecycle', 'design', 'marketing', 'saas', 'devops', 'seo',
  'testing', 'security', 'data', 'research', 'mobile', 'makeover', 'agent', 'meta',
];

function runAudit(dir) {
  try {
    const out = execFileSync(process.execPath, [AUDIT_SCRIPT, '--check'], {
      env: { ...process.env, _AUDIT_NAMING_OVERRIDE_ROOT: dir },
      encoding: 'utf-8',
    });
    return { code: 0, output: out };
  } catch (err) {
    return { code: err.status || 1, output: (err.stdout || '') + (err.stderr || '') };
  }
}

function makeTmp(structure) {
  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });
  for (const [relPath, content] of Object.entries(structure)) {
    const full = path.join(TMP_DIR, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
  }
}

// ── Unit: extractDescription parses correctly ────────────────────────────────
test('extractDescription: parses quoted description', function() {
  const content = `---\nname: foo\ndescription: "Build something new"\n---\n\nbody`;
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  assert.ok(m, 'Has frontmatter');
  const fm = m[1];
  const dm = fm.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
  assert.ok(dm, 'Has description line');
  let raw = dm[1].trim();
  if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
  assert.equal(raw, 'Build something new', 'Description parsed clean');
});

// ── Live tree: 0 violations on current codebase ───────────────────────────────
test('Live tree has 0 audit-naming violations', function() {
  try {
    execFileSync(process.execPath, [AUDIT_SCRIPT, '--check'], { encoding: 'utf-8' });
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    assert.fail(`audit-naming reported violations:\n${output}`);
  }
});

// ── Live tree: covers all 3 scan locations ────────────────────────────────────
test('Audit covers all 3 scan directories', function() {
  const skillsDir = path.join(ROOT, 'commander/cowork-plugin/skills');
  const agentsDir = path.join(ROOT, 'commander/cowork-plugin/agents');
  const commandsDir = path.join(ROOT, 'commands');
  assert.ok(fs.existsSync(skillsDir), 'Plugin skills dir exists');
  assert.ok(fs.existsSync(agentsDir), 'Agents dir exists');
  assert.ok(fs.existsSync(commandsDir), 'Commands dir exists');
  // Count files
  const skills = fs.readdirSync(skillsDir).filter(d => fs.existsSync(path.join(skillsDir, d, 'SKILL.md')));
  assert.ok(skills.length >= 60, `Expected ≥60 plugin skills, got ${skills.length}`);
  const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md') && !f.includes('.backup'));
  assert.ok(agents.length >= 22, `Expected ≥22 agents, got ${agents.length}`);
});

// ── Valid domain list covers all used domains ─────────────────────────────────
test('All domains in VALID_DOMAINS are strings and non-empty', function() {
  for (const d of VALID_DOMAINS) {
    assert.ok(typeof d === 'string' && d.length > 0, `Domain invalid: ${d}`);
  }
  assert.ok(VALID_DOMAINS.includes('plugin'), 'plugin domain present');
  assert.ok(VALID_DOMAINS.includes('agent'), 'agent domain present');
  assert.ok(VALID_DOMAINS.includes('meta'), 'meta domain present');
});

// ── Plugin skills must NOT have [C:...] prefix (UX cleanup 2026-05-14) ──────
test('No plugin skill has [C:domain] — prefix (UX cleanup)', function() {
  const skillsDir = path.join(ROOT, 'commander/cowork-plugin/skills');
  const failures = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const content = fs.readFileSync(skillFile, 'utf-8');
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) { failures.push(`${entry.name}: no frontmatter`); continue; }
    const fm = fmMatch[1];
    const dm = fm.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
    if (!dm) { failures.push(`${entry.name}: no description`); continue; }
    let raw = dm[1].trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) raw = raw.slice(1, -1);
    if (/^\[C:[a-z-]+\]\s*[—–-]/.test(raw)) {
      failures.push(`${entry.name}: stale prefix — "${raw.slice(0, 60)}"`);
    }
  }
  assert.deepStrictEqual(failures, [], `Skills with stale [C:*] prefix:\n${failures.join('\n')}`);
});

// ── Plugin agents must NOT have [C:agent] prefix (UX cleanup) ───────────────
test('No plugin agent has [C:agent] — prefix (UX cleanup)', function() {
  const agentsDir = path.join(ROOT, 'commander/cowork-plugin/agents');
  const failures = [];
  for (const entry of fs.readdirSync(agentsDir)) {
    if (!entry.endsWith('.md') || entry.includes('.backup')) continue;
    const filePath = path.join(agentsDir, entry);
    const content = fs.readFileSync(filePath, 'utf-8');
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) { failures.push(`${entry}: no frontmatter`); continue; }
    const fm = fmMatch[1];
    const dm = fm.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
    if (!dm) { failures.push(`${entry}: no description`); continue; }
    let raw = dm[1].trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) raw = raw.slice(1, -1);
    if (/^\[C:[a-z-]+\]\s*[—–-]/.test(raw)) {
      failures.push(`${entry}: stale prefix — "${raw.slice(0, 60)}"`);
    }
  }
  assert.deepStrictEqual(failures, [], `Agents with stale [C:*] prefix:\n${failures.join('\n')}`);
});

// ── All descriptions ≤ 200 chars ──────────────────────────────────────────────
test('No description exceeds 200 chars', function() {
  const dirs = [
    path.join(ROOT, 'commander/cowork-plugin/skills'),
    path.join(ROOT, 'commander/cowork-plugin/agents'),
    path.join(ROOT, 'commands'),
  ];
  const failures = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      let filePath;
      if (entry.isDirectory()) {
        filePath = path.join(dir, entry.name, 'SKILL.md');
        if (!fs.existsSync(filePath)) continue;
      } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.includes('.backup')) {
        filePath = path.join(dir, entry.name);
      } else continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];
      const dm = fm.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
      if (!dm) continue;
      let raw = dm[1].trim();
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) raw = raw.slice(1, -1);
      if (raw.length > 200) {
        failures.push(`${path.relative(ROOT, filePath)}: ${raw.length} chars`);
      }
    }
  }
  assert.deepStrictEqual(failures, [], `Descriptions > 200 chars:\n${failures.join('\n')}`);
});

// ── 3 zero-description skills now have descriptions ──────────────────────────
test('Previously zero-description skills now have [C:...] descriptions', function() {
  const targets = [
    { file: 'skills/benchmark/SKILL.md',            expectedDomain: 'devops' },
    { file: 'skills/plan-design-review/SKILL.md',   expectedDomain: 'design' },
    { file: 'skills/continuous-improvement/SKILL.md', expectedDomain: 'meta' },
  ];
  for (const { file, expectedDomain } of targets) {
    const filePath = path.join(ROOT, file);
    assert.ok(fs.existsSync(filePath), `Missing: ${file}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    assert.ok(fmMatch, `${file}: no frontmatter`);
    const fm = fmMatch[1];
    const dm = fm.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
    assert.ok(dm, `${file}: no description field`);
    let raw = dm[1].trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) raw = raw.slice(1, -1);
    assert.ok(raw.startsWith(`[C:${expectedDomain}]`), `${file}: expected [C:${expectedDomain}], got "${raw.slice(0, 60)}"`);
  }
});

// ── ccc-seo duplicate aligned ─────────────────────────────────────────────────
test('skills/ccc-seo/SKILL.md has [C:seo] prefix (aligned with plugin version)', function() {
  const filePath = path.join(ROOT, 'skills/ccc-seo/SKILL.md');
  assert.ok(fs.existsSync(filePath), 'skills/ccc-seo/SKILL.md exists');
  const content = fs.readFileSync(filePath, 'utf-8');
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  assert.ok(fmMatch, 'Has frontmatter');
  const fm = fmMatch[1];
  const dm = fm.match(/^description:\s*(.+?)(?=\n[a-zA-Z_]+:|\n---|$)/ms);
  assert.ok(dm, 'Has description');
  let raw = dm[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) raw = raw.slice(1, -1);
  assert.ok(raw.startsWith('[C:seo]'), `Expected [C:seo] prefix, got "${raw.slice(0, 60)}"`);
});

// ── Cleanup ───────────────────────────────────────────────────────────────────
test('Cleanup tmp dir', function() {
  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true });
  assert.ok(!fs.existsSync(TMP_DIR), 'Tmp dir cleaned up');
});
