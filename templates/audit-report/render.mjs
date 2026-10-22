// Offline audit-report renderer (CC-757 slice 1). Pure: data in, Markdown out.
// No network, no payment, no email. PDF conversion is a later slice.
import { readFileSync } from 'node:fs';

const TEMPLATE_PATH = new URL('./report.md.tmpl', import.meta.url);
const NOT_ASSESSED = '_Not assessed_';
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const DEFAULT_METHODOLOGY =
  'Automated and manual checks using /ccc-harden (production hardening pillars), ' +
  '/ccc-xray (0-100 project health scorecard) and /ccc-review (severity-rated code review). ' +
  'All analysis ran read-only against the supplied repository snapshot.';
const DEFAULT_DISCLAIMER =
  'This report reflects the repository state at the commit audited and is provided for ' +
  'informational purposes only. It is not a guarantee of security or fitness for purpose, ' +
  'and absence of a finding is not proof of absence of a defect.';

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** Escape a value for inline Markdown. Non-strings are stringified; null/undefined -> ''. */
export function escapeMd(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\r\n\u2028\u2029\u0085]+/g, ' ')
    // Defang bare URLs so a report never carries a live link (http -> hxxp, https -> hxxps).
    .replace(/\b(h)tt(ps?:\/\/)/gi, '$1xx$2')
    .replace(/[&\\`*_{}\[\]()<>#+!|~]/g, (c) => ENTITIES[c] ?? `\\${c}`)
    .trim();
}

// Only plain-object items count; null, scalars and nested arrays in a list are skipped.
const objs = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && typeof x === 'object' && !Array.isArray(x)) : []);
const has = (v) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== '');
const orNA = (v) => (has(v) ? escapeMd(v) : NOT_ASSESSED);
const bullets = (items) => items.map((i) => `- ${escapeMd(i)}`).join('\n');

function table(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  return [head, sep, ...rows.map((r) => `| ${r.map(orNA).join(' | ')} |`)].join('\n');
}

function executiveSummary(s) {
  if (!has(s)) return NOT_ASSESSED;
  return Array.isArray(s) ? bullets(s) : escapeMd(s);
}

function scorecard(sc) {
  const cats = objs(sc?.categories);
  if (!cats.length) return NOT_ASSESSED;
  const overall = has(sc.overall) ? `**Overall score:** ${escapeMd(sc.overall)} / 100\n\n` : '';
  return overall + table(['Category', 'Score', 'Notes'], cats.map((c) => [c.name, has(c.score) ? `${c.score}/100` : null, c.notes]));
}

function hardening(h) {
  const pillars = objs(h?.pillars);
  if (!pillars.length) return NOT_ASSESSED;
  return table(['#', 'Pillar', 'Status', 'Findings'], pillars.map((p, i) => [p.id ?? i + 1, p.name, p.status, p.findings]));
}

function xray(x) {
  const dims = objs(x?.dimensions);
  if (!dims.length) return NOT_ASSESSED;
  const fix = has(x.fixFirst) ? `\n\n**Fix first:** ${escapeMd(x.fixFirst)}` : '';
  return table(['Dimension', 'Score', 'Notes'], dims.map((d) => [d.name, has(d.score) ? `${d.score}/100` : null, d.notes])) + fix;
}

function reviewFindings(r) {
  const findings = objs(r?.findings);
  if (!findings.length) return NOT_ASSESSED;
  const out = [];
  for (const sev of SEVERITIES) {
    const group = findings.filter((f) => String(f.severity).toLowerCase() === sev);
    if (!group.length) continue;
    out.push(`### ${sev[0].toUpperCase()}${sev.slice(1)} (${group.length})`);
    out.push(group.map((f) => `- **${orNA(f.title)}**${has(f.location) ? ` (${escapeMd(f.location)})` : ''}: ${orNA(f.detail)}`).join('\n'));
  }
  const unknown = findings.filter((f) => !SEVERITIES.includes(String(f.severity).toLowerCase()));
  if (unknown.length) {
    out.push(`### Unrated (${unknown.length})`);
    out.push(unknown.map((f) => `- **${orNA(f.title)}**: ${orNA(f.detail)}`).join('\n'));
  }
  return out.join('\n\n');
}

function fixes(list) {
  const items = objs(list);
  if (!items.length) return NOT_ASSESSED;
  return items
    .map((f, i) => `${i + 1}. **${orNA(f.title)}** (${orNA(f.priority)}, effort: ${orNA(f.effort)})${has(f.detail) ? ` - ${escapeMd(f.detail)}` : ''}`)
    .join('\n');
}

/** Render the audit report Markdown from a data object. Pure; never throws on missing sections. */
export function renderAuditReport(data = {}, template = readFileSync(TEMPLATE_PATH, 'utf8')) {
  const d = data ?? {};
  const values = {
    repo: orNA(d.repo),
    client: orNA(d.client),
    date: orNA(d.date),
    auditor: orNA(d.auditor),
    commit: orNA(d.commit),
    executive_summary: executiveSummary(d.executiveSummary),
    scorecard: scorecard(d.scorecard),
    hardening: hardening(d.hardening),
    xray: xray(d.xray),
    review_findings: reviewFindings(d.review),
    prioritized_fixes: fixes(d.fixes),
    methodology: has(d.methodology) ? escapeMd(d.methodology) : DEFAULT_METHODOLOGY,
    disclaimer: has(d.disclaimer) ? escapeMd(d.disclaimer) : DEFAULT_DISCLAIMER,
  };
  // Single pass: substituted values are never re-scanned for placeholders.
  return template.replace(/\{\{(\w+)\}\}/g, (m, k) => (Object.hasOwn(values, k) ? values[k] : m));
}
