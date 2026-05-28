export const meta = {
  name: 'ccc-audit',
  description: 'CC Commander repo-wide health audit — fan out one agent per dimension, adversarially verify each finding, synthesize a scorecard.',
  whenToUse: 'Repo-wide quality/security/perf/deps/tests/docs/CI audit. Backs /ccc-xray full. Best on a scoped path first.',
  phases: [
    { title: 'Audit', detail: 'one agent per health dimension finds issues' },
    { title: 'Verify', detail: 'adversarially confirm each finding is real' },
  ],
}

// args (optional): { target?: string (path to scope the audit), dimensions?: string[] }
const TARGET = (args && args.target) || '.'
const DEFAULT_DIMENSIONS = [
  { key: 'quality', prompt: 'code quality: oversized files (>800 lines), deep nesting, dead code, duplicated logic, missing error handling' },
  { key: 'security', prompt: 'security: hardcoded secrets, injection (SQL/command/XSS), unsafe deserialization, SSRF, path traversal, weak crypto, OWASP Top 10' },
  { key: 'performance', prompt: 'performance: N+1 queries, O(n^2) in hot paths, unbounded loops/queries, missing indexes, resource leaks, bundle bloat' },
  { key: 'deps', prompt: 'dependencies: outdated/vulnerable packages, lockfile drift, duplicate deps, unused deps, license risk (GPL/AGPL in an MIT project)' },
  { key: 'tests', prompt: 'tests: untested modules, low coverage areas, flaky patterns, missing edge-case/error-path coverage' },
  { key: 'docs', prompt: 'docs: stale README/CHANGELOG, undocumented public APIs, broken links, version/count drift vs reality' },
  { key: 'ci', prompt: 'CI/CD: missing pipelines, no test gate, unpinned action versions, secrets in plaintext, missing deploy/rollback path' },
]
const DIMENSIONS = (args && Array.isArray(args.dimensions) && args.dimensions.length)
  ? DEFAULT_DIMENSIONS.filter(d => args.dimensions.includes(d.key))
  : DEFAULT_DIMENSIONS

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['score', 'findings'],
  properties: {
    score: { type: 'number', description: '0-100 health score for this dimension' },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'file'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'nit'] },
          file: { type: 'string', description: 'path:line' },
          fix: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['isReal', 'confidence'],
  properties: {
    isReal: { type: 'boolean' },
    confidence: { type: 'number' },
    reason: { type: 'string' },
  },
}

log(`Auditing ${TARGET} across ${DIMENSIONS.length} dimensions`)

// Pipeline: each dimension finds issues, then its findings verify as soon as that
// dimension's scan completes (no barrier — fast dimensions don't wait for slow ones).
const perDimension = await pipeline(
  DIMENSIONS,
  (d) => agent(
    `Audit the codebase under "${TARGET}" for ${d.key}. Look for: ${d.prompt}. Cite file:line. Score the dimension 0-100 (100 = healthy).`,
    { label: `audit:${d.key}`, phase: 'Audit', schema: FINDINGS_SCHEMA, agentType: 'Explore' }
  ).then(r => ({ key: d.key, ...r })),
  (review) => parallel((review.findings || []).map(f => () =>
    agent(
      `Adversarially verify this ${review.key} finding. Try to REFUTE it. Default isReal=false if you cannot confirm from the actual code.\nFinding: ${f.severity} — ${f.title} @ ${f.file}`,
      { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore' }
    ).then(v => ({ ...f, dimension: review.key, verdict: v }))
  )).then(verified => ({ key: review.key, score: review.score, summary: review.summary, findings: verified.filter(Boolean) }))
)

const dimensions = perDimension.filter(Boolean)
const confirmed = dimensions.flatMap(d => d.findings).filter(f => f.verdict && f.verdict.isReal)
const scorecard = dimensions.map(d => ({
  dimension: d.key,
  score: d.score,
  confirmedFindings: d.findings.filter(f => f.verdict && f.verdict.isReal).length,
  summary: d.summary,
}))
const overall = scorecard.length ? Math.round(scorecard.reduce((a, d) => a + (d.score || 0), 0) / scorecard.length) : 0

return { target: TARGET, overall, scorecard, confirmed }
