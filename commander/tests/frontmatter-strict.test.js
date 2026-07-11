// Strict-YAML frontmatter gate.
//
// Operationalizes the designer.md incident (2026-07-10): a duplicated `effort:`
// key shipped to main and passed the entire green suite — only an EXTERNAL
// strict parser (the ReadyIQ build) caught it. Lenient loaders (and some of
// Claude's own tooling) tolerate malformed frontmatter; strict consumers — the
// Cowork Desktop picker, the codex/AGENTS.md mirror, third-party skill
// installers — do not. This test makes the whole surface strict-parseable so
// the next duplicate key / bad-indent / unquoted-colon fails CI here, not in a
// downstream repo.
//
// Covers every SKILL.md + agent .md across:
//   - commander/cowork-plugin/skills   (the Cowork plugin picker surface)
//   - commander/cowork-plugin/agents   (the specialist personas; designer.md lived here)
//   - skills                           (the 459-skill ecosystem catalog)

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..', '..');

/** Recursively collect every *.md file under `dir` (returns [] if dir absent). */
function collectMarkdown(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMarkdown(rel));
    else if (entry.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

/** Extract the YAML frontmatter block, or null if the file has none. */
function frontmatter(relPath) {
  const text = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  if (!text.startsWith('---')) return null;
  // Split on a line that is exactly `---`; [1] is the frontmatter body.
  const parts = text.split(/^---\s*$/m);
  return parts.length >= 2 ? parts[1] : null;
}

const SURFACES = [
  'commander/cowork-plugin/skills',
  'commander/cowork-plugin/agents',
  'skills',
];

test('frontmatter gate self-check: strict loader rejects a duplicate mapping key', () => {
  // Guards the guard — if js-yaml ever stopped throwing on dup keys, the sweep
  // below would silently pass on a designer.md-class regression. This is the
  // exact shape that shipped to main.
  const dupKey = 'name: designer\neffort: undefined\neffort: high\n';
  assert.throws(
    () => yaml.load(dupKey),
    /duplicated mapping key/i,
    'js-yaml must reject duplicate keys for this gate to be meaningful',
  );
});

for (const surface of SURFACES) {
  const files = collectMarkdown(surface);

  test(`${surface}: has markdown files to check`, () => {
    assert.ok(files.length > 0, `no .md files found under ${surface}`);
  });

  for (const rel of files) {
    const fm = frontmatter(rel);
    if (fm === null) continue; // files without frontmatter are fine (e.g. plain refs)
    test(`strict frontmatter: ${rel}`, () => {
      assert.doesNotThrow(
        () => yaml.load(fm),
        `frontmatter in ${rel} fails strict YAML parse — quote colon-space values, ` +
          `remove duplicate keys, fix indentation`,
      );
    });
  }
}
