export const meta = {
  name: 'ccc-deep-review',
  description: 'CC Commander branch review — review the diff across 4 weighted dimensions, adversarially verify each finding, return severity-grouped results.',
  whenToUse: 'PR-quality review of the current branch vs a base. Backs /ccc-review. Findings are cross-checked before they are reported.',
  phases: [
    { title: 'Review', detail: 'one agent per dimension reviews the diff' },
    { title: 'Verify', detail: 'refute each finding; keep only what survives' },
  ],
}

// args (optional): { base?: string (default 'main') }
const BASE = (args && args.base) || 'main'

const DIMENSIONS = [
  { key: 'security', weight: 35, prompt: 'security flaws: injection, authz/authn gaps, secret exposure, unsafe input handling, SSRF, insecure deserialization' },
  { key: 'performance', weight: 25, prompt: 'performance regressions: N+1, hot-path complexity, unbounded work, missing memoization/indexes, leaks' },
  { key: 'correctness', weight: 25, prompt: 'correctness bugs: logic errors, race conditions, off-by-one, null/undefined handling, error-path gaps, broken invariants' },
  { key: 'maintainability', weight: 15, prompt: 'maintainability: naming, dead code, duplication, over-complex abstractions, missing tests for new code' },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
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
          rationale: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['real'],
  properties: {
    real: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

log(`Reviewing diff vs ${BASE} across ${DIMENSIONS.length} dimensions`)

const reviewed = await pipeline(
  DIMENSIONS,
  (d) => agent(
    `Review the diff \`git diff ${BASE}...HEAD\` for ${d.key}. ${d.prompt}. Cite file:line and give a one-line fix per finding.`,
    { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: 'Explore' }
  ).then(r => ({ key: d.key, weight: d.weight, findings: r.findings || [] })),
  (review) => parallel(review.findings.map(f => () =>
    agent(
      `Adversarially verify this ${review.key} finding against the actual diff. Try to refute it; answer real=false if you cannot confirm.\n${f.severity} — ${f.title} @ ${f.file}`,
      { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore' }
    ).then(v => ({ ...f, dimension: review.key, real: v && v.real }))
  )).then(vs => vs.filter(Boolean))
)

const all = reviewed.filter(Boolean).flat()
const confirmed = all.filter(f => f.real)
const bySeverity = ['critical', 'high', 'medium', 'low', 'nit'].reduce((acc, s) => {
  acc[s] = confirmed.filter(f => f.severity === s)
  return acc
}, {})
const blockers = bySeverity.critical.length + bySeverity.high.length
const verdict = blockers > 0 ? 'request-changes' : (confirmed.length ? 'comment' : 'approve')

return { base: BASE, verdict, blockers, total: confirmed.length, bySeverity }
