// Pins Commander Mission Control's Item 4 (CC-1380) — the topSkills
// panel: commander/cowork-plugin/lib/top-skills.js (readTopSkills), a
// contract owed to Cockpit (CC-1379). The writer (skill-runs-logger.js)
// ships with Cockpit v6.8.2 and is NOT on main yet, so
// ~/.claude/commander/skill-runs.jsonl is normally absent — every
// reader here must degrade to [] cleanly, not throw.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

import { readTopSkills, skillRunsFile } from '../cowork-plugin/lib/top-skills.js';
import { buildMissionModel } from '../../dashboard/lib/mission-model.js';
import { createServer } from '../../dashboard/server.js';
import { readModel } from '../cowork-plugin/lib/mission-control-snapshot.js';

let tmpRoot;

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-mission-top-skills-'));
});

test.after(async () => {
  if (tmpRoot) await fs.rm(tmpRoot, { force: true, recursive: true });
});

async function freshBaseDir() {
  return fs.mkdtemp(path.join(tmpRoot, 'base-'));
}

function toLines(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
}

const NOW = Date.parse('2026-07-16T10:04:00.000Z');

test('readTopSkills: skill-runs-logger.js is confirmed NOT present anywhere on main (CC-1380 spec claim, verified)', async () => {
  // This is a repo-state assertion, not a functional one: it fails loudly
  // if a future change lands the writer without updating this file's
  // "zero-state tolerant" framing.
  let found = false;
  try {
    await fs.access(path.join(REPO_ROOT, 'commander', 'cowork-plugin', 'hooks', 'skill-runs-logger.js'));
    found = true;
  } catch {
    found = false;
  }
  assert.equal(found, false, 'skill-runs-logger.js should not exist yet — CC-1379 owns adding it');
});

test('readTopSkills: missing skill-runs.jsonl returns []', async () => {
  const baseDir = await freshBaseDir();
  const rows = await readTopSkills({ baseDir, now: NOW });
  assert.deepEqual(rows, []);
  await assert.rejects(fs.access(skillRunsFile(baseDir)));
});

test('readTopSkills: mixed-source fixture produces correct bySource split', async () => {
  const baseDir = await freshBaseDir();
  await fs.writeFile(
    skillRunsFile(baseDir),
    toLines([
      { ts: '2026-07-15T10:00:00.000Z', skill: 'ccc-build', source_app: 'claude-code', session_id: 'S1' },
      { ts: '2026-07-15T10:01:00.000Z', skill: 'ccc-build', source_app: 'codex', session_id: 'S2' },
      { ts: '2026-07-15T10:02:00.000Z', skill: 'ccc-build', source_app: 'codex', session_id: 'S3' },
      { ts: '2026-07-15T10:03:00.000Z', skill: 'ccc-review', session_id: 'S4' },
    ])
  );
  const rows = await readTopSkills({ baseDir, now: NOW });

  const build = rows.find((row) => row.skill === 'ccc-build');
  assert.deepEqual(build.bySource, { 'claude-code': 1, codex: 2 });
  const review = rows.find((row) => row.skill === 'ccc-review');
  assert.deepEqual(review.bySource, { 'claude-code': 1 }, 'a row lacking source_app counts into claude-code (pre-fix history)');
});

test('readTopSkills: sorted by runs7d desc, capped at 10', async () => {
  const baseDir = await freshBaseDir();
  const entries = [];
  for (let i = 0; i < 12; i += 1) {
    for (let run = 0; run <= i; run += 1) {
      entries.push({ ts: '2026-07-15T10:00:00.000Z', skill: `skill-${i}`, session_id: `S${i}-${run}` });
    }
  }
  await fs.writeFile(skillRunsFile(baseDir), toLines(entries));
  const rows = await readTopSkills({ baseDir, now: NOW });

  assert.equal(rows.length, 10);
  assert.equal(rows[0].skill, 'skill-11', 'the skill with the most runs (12) leads');
  assert.ok(rows.every((row, i) => i === 0 || row.runs7d <= rows[i - 1].runs7d));
});

test('readTopSkills: runs7d only counts activity within the trailing 7 days; runs30d covers 30', async () => {
  const baseDir = await freshBaseDir();
  await fs.writeFile(
    skillRunsFile(baseDir),
    toLines([
      { ts: '2026-07-15T10:00:00.000Z', skill: 'ccc-build', session_id: 'S1' }, // 1 day ago
      { ts: '2026-07-01T10:00:00.000Z', skill: 'ccc-build', session_id: 'S2' }, // 15 days ago
      { ts: '2026-05-01T10:00:00.000Z', skill: 'ccc-build', session_id: 'S3' }, // >30 days ago
    ])
  );
  const rows = await readTopSkills({ baseDir, now: NOW });

  const build = rows.find((row) => row.skill === 'ccc-build');
  assert.equal(build.runs7d, 1);
  assert.equal(build.runs30d, 2, 'the 15-day-old run counts toward 30d; the >30d one does not');
});

test('readTopSkills: bad JSONL lines and rows lacking a skill name are skipped, never throw', async () => {
  const baseDir = await freshBaseDir();
  await fs.writeFile(
    skillRunsFile(baseDir),
    [
      'not json {{{',
      JSON.stringify({ ts: '2026-07-15T10:00:00.000Z', session_id: 'no-skill-field' }),
      JSON.stringify({ ts: '2026-07-15T10:00:00.000Z', skill: 'ccc-build', session_id: 'S1' }),
    ].join('\n') + '\n'
  );
  const rows = await readTopSkills({ baseDir, now: NOW });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].skill, 'ccc-build');
});

test('model.topSkills: buildMissionModel and readModel (snapshot) both expose [] when skill-runs.jsonl is absent', async () => {
  const baseDir = await freshBaseDir();
  const model = await buildMissionModel({ baseDir, now: NOW, cache: false });
  assert.deepEqual(model.topSkills, []);

  const snapshot = await readModel({ baseDir, now: NOW });
  assert.deepEqual(snapshot.topSkills, []);
});

test('model.topSkills: buildMissionModel and readModel (snapshot) agree on a populated fixture', async () => {
  const baseDir = await freshBaseDir();
  await fs.writeFile(
    skillRunsFile(baseDir),
    toLines([
      { ts: '2026-07-15T10:00:00.000Z', skill: 'ccc-ship', source_app: 'claude-code', session_id: 'S1' },
    ])
  );
  const model = await buildMissionModel({ baseDir, now: NOW, cache: false });
  const snapshot = await readModel({ baseDir, now: NOW });

  assert.deepEqual(model.topSkills, [{ skill: 'ccc-ship', runs7d: 1, runs30d: 1, bySource: { 'claude-code': 1 } }]);
  assert.deepEqual(snapshot.topSkills, model.topSkills);
});

function dispatch(server, url) {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        this.push(null);
      },
    });
    req.method = 'GET';
    req.url = url;
    req.headers = {};

    const chunks = [];
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    res.statusCode = 200;
    res.headers = {};
    res.writeHead = (statusCode, headers) => {
      res.statusCode = statusCode;
      res.headers = headers || {};
      return res;
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      resolve({ body: Buffer.concat(chunks).toString('utf8'), statusCode: res.statusCode });
      return Writable.prototype.end.call(res);
    };

    server.emit('request', req, res);
  });
}

test('GET /api/top-skills returns { topSkills, generatedAt }', async () => {
  const commanderDir = await freshBaseDir();
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'none'), commanderDir });
  const response = await dispatch(server, '/api/top-skills');

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.deepEqual(body.topSkills, []);
  assert.equal(typeof body.generatedAt, 'string');
});
