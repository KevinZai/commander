// sprint-contract.mjs — the agreed acceptance criteria for one piece of work.
//
// /ccc-plan writes the contract, /ccc-build implements against it, and the
// independent `verifier` agent checks it before /ccc-build or /ccc-ship calls
// the work done. The file lives at a predictable path, tasks/sprint-contract.md
// in the project, and earlier contracts are archived under tasks/contracts/.
//
// Pure functions only (parse, render, validate, apply a verdict); the CLI in
// ../scripts/sprint-contract.mjs does the file and git I/O.

import { createHash } from 'node:crypto';

export const CONTRACT_PATH = 'tasks/sprint-contract.md';
export const ARCHIVE_DIR = 'tasks/contracts';
export const MARKER = 'ccc-sprint-contract v1';
export const MAX_CRITERIA = 20;

const CHECK_SPLIT = /\s+(?:·|—|-{1,2})\s+check(-json)?:\s+(.+)$/i;
const ITEM = /^\s*[-*]\s+(?:\[( |x|X)\]\s+)?(.*\S)\s*$/;
const ID_PREFIX = /^(AC\d+)\s*(?:—|-|:|·)\s*/;

function slugify(text) {
  return String(text || 'work').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'work';
}

/** Split one bullet into { text, check }; a lone backticked command counts as the check. */
export function splitCriterion(raw) {
  let text = String(raw).trim();
  let check = null;
  const m = text.match(CHECK_SPLIT);
  if (m) {
    text = text.slice(0, m.index).trim();
    if (m[1]) {
      // check-json: the command is a JSON string inside one code span, so
      // newlines and boundary whitespace survive exactly.
      const inner = unwrapCodeSpan(m[2].trim());
      try { check = inner === null ? null : JSON.parse(inner); } catch { check = null; }
      if (typeof check !== 'string') check = null;
      return { text, check };
    }
    check = m[2].trim();
    const inner = unwrapCodeSpan(check);
    if (inner !== null) check = inner;
  } else {
    const cmd = text.match(/`([^`]+)`/);
    if (cmd) check = cmd[1].trim();
  }
  const manual = check && check.match(/^manual\b\s*(?:[—:-]+\s*)?(.*)$/i);
  if (manual) {
    check = null;
    if (manual[1] && !text.includes('(observe:')) text = `${text} (observe: ${manual[1].trim()})`;
  }
  return { text, check };
}

/**
 * A string as one inline code span: the fence is one backtick longer than the
 * longest run inside, padded with a space when the string starts or ends with
 * a backtick (CommonMark code-span rules).
 */
export function codeSpan(command) {
  const s = String(command);
  const longest = Math.max(0, ...(s.match(/`+/g) || []).map((r) => r.length));
  const fence = '`'.repeat(longest + 1);
  const pad = /^`|`$/.test(s) ? ' ' : '';
  return `${fence}${pad}${s}${pad}${fence}`;
}

/** A command that renders as a plain one-backtick span and reads back unchanged. */
function plainCommand(s) {
  return s.length > 0 && !/[`\n\r]/.test(s) && s === s.trim();
}

/** How a check command is written in the contract: plain span, else JSON in a span. */
export function renderCheck(command) {
  const s = String(command);
  return plainCommand(s) ? `check: ${codeSpan(s)}` : `check-json: ${codeSpan(JSON.stringify(s))}`;
}

/**
 * The content of a string that is exactly one enclosing code span, or null.
 * The span must open and close with the same backtick run and contain no run
 * of that length inside (so "`a` && `b`" is two spans and is left alone).
 */
function unwrapCodeSpan(raw) {
  const s = String(raw);
  const m = s.match(/^(`+)([\s\S]*?[^`]|)(`+)$/);
  if (!m || m[1].length !== m[3].length) return null;
  let inner = m[2];
  const runs = inner.match(/`+/g) || [];
  if (runs.some((r) => r.length === m[1].length)) return null;
  if (inner.length >= 2 && inner.startsWith(' ') && inner.endsWith(' ') && inner.trim() && /^ `|` $/.test(inner)) inner = inner.slice(1, -1);
  return inner;
}

/**
 * Identity of a contract's content: title, every criterion's id, text and
 * check, and the out-of-scope list. A verifier report must name this value, so evidence for one contract
 * can never be recorded against another.
 */
export function contractFingerprint(parsed) {
  const body = JSON.stringify({
    title: parsed.title || '',
    criteria: (parsed.criteria || []).map((c) => [c.id, c.text, c.check || null]),
    outOfScope: parsed.outOfScope || [],
  });
  return createHash('sha256').update(body).digest('hex').slice(0, 16);
}

/** Lines of the first section whose heading matches `re`, up to the next `## `. */
function sectionLines(markdown, re) {
  const lines = String(markdown).split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && re.test(l));
  if (start < 0) return null;
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##?\s/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out;
}

function bullets(lines) {
  const items = [];
  for (const line of lines || []) {
    const m = line.match(ITEM);
    if (m && !/^<!--/.test(m[2])) items.push({ done: !!(m[1] && m[1].trim()), body: m[2] });
  }
  return items;
}

/**
 * Criteria from a /ccc-plan plan file: the "## Evals — what does done look like?"
 * section (or an "## Acceptance criteria" section when the plan has one).
 */
export function criteriaFromPlan(markdown) {
  const lines = sectionLines(markdown, /acceptance criteria/i) || sectionLines(markdown, /evals\b.*\bdone\b/i) || [];
  return bullets(lines).map((b, i) => ({ id: `AC${i + 1}`, ...splitCriterion(b.body), done: false }));
}

export function titleFromPlan(markdown) {
  const h1 = String(markdown).split('\n').find((l) => /^#\s+\S/.test(l));
  return h1 ? h1.replace(/^#\s+/, '').trim() : 'Untitled work';
}

/** Render a contract file. `criteria` items: { id?, text, check?, done? }. */
export function renderContract({ title, source = 'manual', created = new Date().toISOString(), criteria = [], outOfScope = [] }) {
  const items = criteria.map((c, i) => {
    const id = c.id || `AC${i + 1}`;
    const check = c.check ? ` · ${renderCheck(c.check)}` : ' · check: manual';
    return `- [${c.done ? 'x' : ' '}] ${id} — ${c.text}${check}`;
  });
  return [
    `<!-- ${MARKER} · source: ${source} · created: ${created} -->`,
    `# Sprint contract — ${title}`,
    '',
    'Status: open',
    'Verified: never',
    '',
    '## Acceptance criteria',
    '',
    ...items,
    '',
    '## Out of scope',
    '',
    ...(outOfScope.length ? outOfScope.map((s) => `- ${s}`) : ['- Anything not listed above.']),
    '',
    '## Verification log',
    '',
    '<!-- appended by sprint-contract.mjs record; the verifier agent writes nothing -->',
    '',
  ].join('\n');
}

/** Parse a contract file into { title, status, verified, criteria, marker }. */
export function parseContract(markdown) {
  const text = String(markdown);
  const firstLine = text.split('\n')[0] || '';
  const titleLine = text.split('\n').find((l) => /^#\s+Sprint contract/i.test(l)) || '';
  const status = (text.match(/^Status:\s*(\S+)/m) || [])[1] || null;
  const verified = (text.match(/^Verified:\s*(.+)$/m) || [])[1] || null;
  const criteria = bullets(sectionLines(text, /acceptance criteria/i)).map((b, i) => {
    const idm = b.body.match(ID_PREFIX);
    const body = idm ? b.body.slice(idm[0].length) : b.body;
    const { text: ctext, check } = splitCriterion(body);
    return { id: idm ? idm[1] : `AC${i + 1}`, text: ctext, check: check && check !== 'manual' ? check : null, done: b.done };
  });
  return {
    marker: firstLine.includes(MARKER),
    title: titleLine.replace(/^#\s+Sprint contract\s*[—-]\s*/i, '').trim() || null,
    status,
    verified,
    criteria,
    outOfScope: bullets(sectionLines(text, /out of scope/i)).map((b) => b.body),
  };
}

/** { ok, errors, warnings } for a parsed contract. */
export function validateContract(parsed) {
  const errors = [];
  const warnings = [];
  if (!parsed.marker) errors.push(`first line is not the ${MARKER} marker`);
  if (!parsed.title) errors.push('missing "# Sprint contract — <title>" heading');
  if (!['open', 'verified', 'failed'].includes(parsed.status)) errors.push('Status must be open, verified or failed');
  if (parsed.criteria.length === 0) errors.push('no acceptance criteria under "## Acceptance criteria"');
  if (parsed.criteria.length > MAX_CRITERIA) errors.push(`more than ${MAX_CRITERIA} criteria; split the work`);
  const seen = new Set();
  for (const c of parsed.criteria) {
    if (seen.has(c.id)) errors.push(`duplicate criterion id ${c.id}`);
    seen.add(c.id);
    if (!c.text || c.text.length < 8) errors.push(`${c.id}: criterion text is too short to check`);
    if (!c.check) warnings.push(`${c.id}: no check command; the verifier must find observable evidence`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Normalize a verifier report against the contract. The overall verdict is PASS
 * only when every contract criterion is reported `pass` with evidence; a
 * missing, unknown or evidence-free criterion counts as failed (unverified).
 */
export function normalizeVerdict(parsed, report) {
  const byId = new Map();
  for (const r of (report && Array.isArray(report.criteria) ? report.criteria : [])) {
    if (r && typeof r.id === 'string') byId.set(r.id, r);
  }
  const results = parsed.criteria.map((c) => {
    const r = byId.get(c.id);
    const evidence = r && typeof r.evidence === 'string' ? r.evidence.trim() : '';
    let status = r && ['pass', 'fail', 'unverified'].includes(r.status) ? r.status : 'unverified';
    if (status === 'pass' && !evidence) status = 'unverified';
    return { id: c.id, text: c.text, status, evidence: evidence || 'no evidence reported' };
  });
  const pass = results.length > 0 && results.every((r) => r.status === 'pass');
  return { verdict: pass ? 'PASS' : 'FAIL', claimed: report && report.verdict, results };
}

/** Apply a normalized verdict to the contract text: status line, ticks, log entry. */
export function applyVerdict(markdown, normalized, { head = 'unknown', at = new Date().toISOString(), by = 'verifier', fingerprint = null } = {}) {
  const passed = new Set(normalized.results.filter((r) => r.status === 'pass').map((r) => r.id));
  const status = normalized.verdict === 'PASS' ? 'verified' : 'failed';
  let text = String(markdown)
    .replace(/^Status:\s*.*$/m, `Status: ${status}`)
    .replace(/^Verified:\s*.*$/m, `Verified: ${at} at ${head} (${normalized.verdict})${fingerprint ? ` · contract ${fingerprint}` : ''}`);
  const lines = text.split('\n');
  let inAc = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) inAc = /acceptance criteria/i.test(lines[i]);
    else if (inAc) {
      const m = lines[i].match(/^(\s*[-*]\s+\[)( |x|X)(\]\s+)(AC\d+)/);
      if (m) lines[i] = lines[i].replace(/^(\s*[-*]\s+\[)( |x|X)\]/, `$1${passed.has(m[4]) ? 'x' : ' '}]`);
    }
  }
  text = lines.join('\n').replace(/\s*$/, '\n');
  const entry = [
    '',
    `### ${at} · ${normalized.verdict} · ${head} · ${by}`,
    '',
    ...normalized.results.map((r) => `- ${r.status === 'pass' ? '✅' : '❌'} ${r.id} ${r.status} — ${r.evidence.replace(/\s+/g, ' ').slice(0, 400)}`),
    '',
  ].join('\n');
  return text + entry;
}

export function archiveName(parsed, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `${ARCHIVE_DIR}/${stamp}-${slugify(parsed.title)}.md`;
}
