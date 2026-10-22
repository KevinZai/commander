export const meta = {
  name: 'ccc-audit',
  description: 'Repo health audit: one finder per dimension, every finding adversarially verified, scored scorecard returned.',
  whenToUse: 'Repo-wide quality, security, performance, dependency, test, docs, or CI audit. Backs /ccc-xray full. Scope to a path first on large repos.',
  phases: [
    { title: 'Audit', detail: 'one read-only finder per health dimension' },
    { title: 'Verify', detail: 'a fresh skeptic tries to refute each finding' },
  ],
}

// args (optional):
//   target?: string           path to scope the audit (default '.')
//   dimensions?: string[]     subset of: quality, security, performance, deps, tests, docs, ci
//   maxPerDimension?: number  findings verified per dimension (default 12, max 40); the rest return as unverified
const TARGET = (args && typeof args.target === 'string' && args.target) || '.'
const MAX_PER_DIMENSION = Math.max(1, Math.min(40, (args && args.maxPerDimension) || 12))

const DEFAULT_DIMENSIONS = [
  { key: 'quality', look: 'oversized files (over 800 lines), deep nesting, dead code, duplicated logic, missing error handling' },
  { key: 'security', look: 'hardcoded secrets, injection (SQL, command, XSS), unsafe deserialization, SSRF, path traversal, weak crypto, OWASP Top 10' },
  { key: 'performance', look: 'N+1 queries, quadratic work in hot paths, unbounded loops or queries, missing indexes, resource leaks, bundle bloat' },
  { key: 'deps', look: 'outdated or vulnerable packages, lockfile drift, duplicate or unused dependencies, license risk (GPL/AGPL inside an MIT project)' },
  { key: 'tests', look: 'untested modules, weak coverage of error paths and edge cases, flaky patterns, tests that only mirror implementation' },
  { key: 'docs', look: 'stale README or CHANGELOG, undocumented public APIs, broken relative links, version or count literals that disagree with the source' },
  { key: 'ci', look: 'missing pipelines, no test gate, unpinned action versions, plaintext secrets, no deploy or rollback path' },
]
const DIMENSIONS = (args && Array.isArray(args.dimensions) && args.dimensions.length)
  ? DEFAULT_DIMENSIONS.filter(d => args.dimensions.includes(d.key))
  : DEFAULT_DIMENSIONS
if (!DIMENSIONS.length) throw new Error('ccc-audit: args.dimensions matched none of quality, security, performance, deps, tests, docs, ci')

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['score', 'findings'],
  properties: {
    score: { type: 'number', description: '0-100 health score for this dimension (100 = healthy)' },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'file', 'evidence'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'nit'] },
          file: { type: 'string', description: 'path:line' },
          evidence: { type: 'string', description: 'the exact code or command output that shows the problem' },
          fix: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'reason'],
  properties: {
    refuted: { type: 'boolean', description: 'true unless the finding was confirmed from the actual code' },
    reason: { type: 'string' },
  },
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'nit']
const bySeverity = (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)

log(`Auditing ${TARGET} across ${DIMENSIONS.length} dimensions`)

// pipeline: a dimension's findings start verification as soon as that finder returns.
const perDimension = await pipeline(
  DIMENSIONS,
  (d) => agent(
    `Audit the code under "${TARGET}" for ${d.key}. Look for: ${d.look}. ` +
    'Report only problems you can point at: cite path:line and quote the evidence. Skip vendor/ and node_modules/. ' +
    'Score the dimension 0-100 where 100 means healthy.',
    { label: `audit:${d.key}`, phase: 'Audit', schema: FINDINGS_SCHEMA, agentType: 'Explore', effort: 'medium' }
  ).then(r => {
    if (!r) return { key: d.key, score: null, summary: 'finder failed', findings: [], unverified: [] }
    const sorted = (r.findings || []).slice().sort(bySeverity)
    const unverified = sorted.slice(MAX_PER_DIMENSION)
    if (unverified.length) log(`${d.key}: verifying the top ${MAX_PER_DIMENSION} of ${sorted.length} findings; ${unverified.length} lower-severity findings return unverified`)
    return { key: d.key, score: r.score, summary: r.summary, findings: sorted.slice(0, MAX_PER_DIMENSION), unverified }
  }),
  (review) => parallel(review.findings.map(f => () =>
    agent(
      `You did not write this finding. Try to refute it by reading the actual code under "${TARGET}". ` +
      'It is refuted if the cited line does not exist, the evidence is misquoted, an existing guard already handles it, or the severity is clearly overstated. ' +
      'If you cannot confirm it from the code, answer refuted=true.\n' +
      `Dimension: ${review.key}\nFinding: ${f.severity} | ${f.title} @ ${f.file}\nEvidence: ${f.evidence}`,
      { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore', effort: 'high' }
    ).then(v => ({ ...f, dimension: review.key, confirmed: !!v && v.refuted === false, verifierReason: v ? v.reason : 'verifier failed' }))
  )).then(verified => ({ ...review, findings: verified.filter(Boolean) }))
)

const dimensions = perDimension.filter(Boolean)
const confirmed = dimensions.flatMap(d => d.findings).filter(f => f.confirmed).sort(bySeverity)
const scored = dimensions.filter(d => typeof d.score === 'number')
const scorecard = dimensions.map(d => ({
  dimension: d.key,
  score: d.score,
  confirmedFindings: d.findings.filter(f => f.confirmed).length,
  refutedFindings: d.findings.filter(f => !f.confirmed).length,
  unverifiedFindings: d.unverified.length,
  summary: d.summary,
}))
const overall = scored.length ? Math.round(scored.reduce((a, d) => a + d.score, 0) / scored.length) : null
const unverified = dimensions.flatMap(d => d.unverified.map(f => ({ ...f, dimension: d.key })))

return { target: TARGET, overall, scorecard, confirmed, unverified }
