/**
 * test-results.mjs — test/lint/audit outcomes, scoped to one workspace and one git revision.
 *
 * knowledge-capture.js (PostToolUse) records the outcome of a test, lint or audit command it saw run;
 * suggest-ticker.js (UserPromptSubmit) reads it as a project signal. The cache used to be one lane-wide file,
 * so a failing test in project A could drive advice in project B (Codex audit #25). Now:
 *
 *   <state dir>/projects/<slug>/test-results.json     slug = basename(workspace) + '-' + 8 hex of sha256(workspace)
 *   { workspace, entries: { test|lint|audit: { status, ts, revision } } }
 *
 * workspace = the git top-level of the hook's cwd (so a test run from a subdirectory counts for the repo),
 * else the cwd itself. A reader only accepts an entry recorded at the revision it is looking at now; a commit
 * or checkout makes older results invisible. Both sides find the revision by reading .git directly (no `git`
 * process), so the hot UserPromptSubmit path stays cheap.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { updateJson } from './atomic-json.mjs';

export const RESULT_KINDS = Object.freeze(['test', 'lint', 'audit']);

/** basename(dir) + '-' + 8-char sha256(dir): stable and filesystem-safe (same scheme as suggest-ticker's projects/). */
export function projectSlug(dir) {
  const safe = typeof dir === 'string' && dir ? dir : process.cwd();
  const base = (path.basename(safe) || 'root').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 60) || 'root';
  return `${base}-${crypto.createHash('sha256').update(safe).digest('hex').slice(0, 8)}`;
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

/** { top, gitDir, commonDir } for the repository containing `cwd`, or null outside a repository. */
export function findGitDirs(cwd) {
  let dir = path.resolve(typeof cwd === 'string' && cwd ? cwd : process.cwd());
  for (let i = 0; i < 64; i++) {
    const dotGit = path.join(dir, '.git');
    let st = null;
    try { st = fs.statSync(dotGit); } catch {}
    if (st) {
      let gitDir = dotGit;
      if (st.isFile()) {
        const m = /^gitdir:\s*(.+)$/m.exec(readText(dotGit) || '');
        if (!m) return null;
        gitDir = path.resolve(dir, m[1].trim());
      }
      const common = (readText(path.join(gitDir, 'commondir')) || '').trim();
      return { top: dir, gitDir, commonDir: common ? path.resolve(gitDir, common) : gitDir };
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function resolveRef(dirs, ref) {
  for (const base of [dirs.gitDir, dirs.commonDir]) {
    const v = (readText(path.join(base, ref)) || '').trim();
    if (/^[0-9a-f]{40,64}$/.test(v)) return v;
  }
  const packed = readText(path.join(dirs.commonDir, 'packed-refs')) || '';
  for (const line of packed.split('\n')) {
    const [sha, name] = line.trim().split(/\s+/);
    if (name === ref && /^[0-9a-f]{40,64}$/.test(sha)) return sha;
  }
  return null;
}

/** HEAD's commit id for the repository at `dirs`, or null (unborn branch, unreadable repository). */
export function headRevision(dirs) {
  if (!dirs) return null;
  const head = (readText(path.join(dirs.gitDir, 'HEAD')) || '').trim();
  if (/^[0-9a-f]{40,64}$/.test(head)) return head;
  const m = /^ref:\s*(\S+)$/.exec(head);
  return m ? resolveRef(dirs, m[1]) : null;
}

/** { workspace, revision } for a hook's cwd. revision is null outside git. */
export function workspaceOf(cwd) {
  const dirs = findGitDirs(cwd);
  const workspace = dirs ? dirs.top : path.resolve(typeof cwd === 'string' && cwd ? cwd : process.cwd());
  return { workspace, revision: headRevision(dirs) };
}

export function resultsFile(stateDir, workspace) {
  return path.join(stateDir, 'projects', projectSlug(workspace), 'test-results.json');
}

/** Record one outcome ('passing' | 'failing') for `kind` in the workspace containing `cwd`. */
export async function recordResult(stateDir, cwd, kind, status, now = new Date()) {
  if (!RESULT_KINDS.includes(kind) || (status !== 'passing' && status !== 'failing')) return false;
  const { workspace, revision } = workspaceOf(cwd);
  await updateJson(resultsFile(stateDir, workspace), (current) => ({
    workspace,
    entries: { ...(current.entries || {}), [kind]: { status, ts: now.toISOString(), revision } },
  }));
  return true;
}

/**
 * Outcomes for the workspace containing `cwd` at its current revision, no older than maxAgeMs.
 * Returns { test, lint, audit } with each 'passing' | 'failing' | 'unknown'.
 */
export function readResults(stateDir, cwd, { maxAgeMs = 30 * 60 * 1000, now = Date.now() } = {}) {
  const out = { test: 'unknown', lint: 'unknown', audit: 'unknown' };
  const { workspace, revision } = workspaceOf(cwd);
  let data;
  try { data = JSON.parse(fs.readFileSync(resultsFile(stateDir, workspace), 'utf8')); } catch { return out; }
  if (!data || data.workspace !== workspace || !data.entries) return out;
  for (const kind of RESULT_KINDS) {
    const e = data.entries[kind];
    if (!e || !e.ts || (e.revision || null) !== revision) continue;
    const age = now - new Date(e.ts).getTime();
    if (!(age >= -60 * 1000 && age <= maxAgeMs)) continue;
    if (e.status === 'passing' || e.status === 'failing') out[kind] = e.status;
  }
  return out;
}
