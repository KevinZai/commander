export const meta = {
  name: 'ccc-deep-review',
  description: 'Branch review: four weighted dimensions review the diff, every finding adversarially verified, severity-grouped verdict returned.',
  whenToUse: 'PR-quality review of the current branch against a base ref. Backs /ccc-review. Findings are refuted or confirmed before they are reported.',
  phases: [
    { title: 'Read', detail: 'opt-in (reader: true): one cheap read-only reader digests the diff once for every reviewer' },
    { title: 'Review', detail: 'one read-only reviewer per dimension reads the diff, or the digest when the reader ran' },
    { title: 'Verify', detail: 'a fresh skeptic tries to refute each finding' },
  ],
}

// args (optional):
//   base?: string             base ref to diff against (default 'main')
//   maxPerDimension?: number  findings verified per dimension (default 15, max 40); the rest return as unverified
//   reader?: boolean          default false: every reviewer reads the diff itself. true: a haiku reader digests the diff
//                             once and reviewers start from it (trial; off by default because one measured sample saved
//                             only ~8% of session-model tokens while adding a serial read step, see KEV-55 in the PR)
const BASE = (args && typeof args.base === 'string' && args.base) || 'main'
const MAX_PER_DIMENSION = Math.max(1, Math.min(40, (args && args.maxPerDimension) || 15))
const USE_READER = !!(args && args.reader === true)

const DIMENSIONS = [
  { key: 'security', weight: 35, look: 'injection, authn/authz gaps, secret exposure, unsafe input handling, SSRF, insecure deserialization' },
  { key: 'correctness', weight: 25, look: 'logic errors, race conditions, off-by-one, null handling, error-path gaps, broken invariants' },
  { key: 'performance', weight: 25, look: 'N+1, hot-path complexity, unbounded work, missing memoization or indexes, leaks' },
  { key: 'maintainability', weight: 15, look: 'naming, dead code, duplication, over-complex abstractions, new code without tests' },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'file', 'evidence'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'nit'] },
          file: { type: 'string', description: 'path:line inside the diff' },
          evidence: { type: 'string', description: 'the changed lines that show the problem' },
          fix: { type: 'string', description: 'one-line fix' },
        },
      },
    },
  },
}

const DIGEST_SCHEMA = {
  type: 'object',
  required: ['files'],
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'status', 'hunks'],
        properties: {
          path: { type: 'string' },
          status: { type: 'string', enum: ['added', 'modified', 'deleted', 'renamed'] },
          hunks: {
            type: 'array',
            items: {
              type: 'object',
              required: ['lines', 'summary', 'excerpt'],
              properties: {
                lines: { type: 'string', description: 'new-side line range, e.g. 40-58' },
                summary: { type: 'string', description: 'one line: what the hunk changes' },
                excerpt: { type: 'string', description: 'the changed lines verbatim, at most 30 lines' },
                truncated: { type: 'boolean', description: 'true when the hunk has more changed lines than the excerpt holds' },
              },
            },
          },
        },
      },
    },
    omitted: { type: 'array', items: { type: 'string' }, description: 'files skipped (binary, generated, lockfiles)' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'reason'],
  properties: {
    refuted: { type: 'boolean', description: 'true unless the finding was confirmed against the actual diff' },
    reason: { type: 'string' },
  },
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'nit']
const bySeverity = (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
const DIFF = `git diff ${BASE}...HEAD`

log(`Reviewing ${DIFF} across ${DIMENSIONS.length} dimensions`)

// Shopify pattern: the reading-heavy step runs once on a cheap model; reviewers spend their tokens on judgment.
// A failed reader falls back to the pre-reader path rather than reviewing blind.
let digest = null
if (USE_READER) {
  digest = await agent(
    `Run \`${DIFF}\` and digest every changed file for code reviewers who will not run it themselves. ` +
    'Per file: status, and per hunk the new-side line range, a one-line summary of the change, and the changed lines verbatim (at most 30 per hunk; set truncated=true when a hunk has more). ' +
    'Record facts only: no judgments, no findings. List binary, generated and lockfiles under omitted instead of digesting them.',
    { label: 'read:diff', phase: 'Read', schema: DIGEST_SCHEMA, agentType: 'Explore', model: 'haiku', effort: 'low' }
  )
  if (!digest) log('reader failed: reviewers read the diff themselves')
  else log(`reader digested ${digest.files.length} files${digest.omitted && digest.omitted.length ? `, omitted ${digest.omitted.length}` : ''}`)
}
const reviewSource = digest
  ? 'Start from this digest of the diff, made by a reader for you. Do not re-read the whole diff: open a file to confirm the exact lines of a finding, ' +
    `and read every omitted file and every truncated hunk yourself with \`${DIFF} -- <path>\`, since the digest does not cover them.\n` +
    `Digest: ${JSON.stringify(digest)}\n`
  : `Run \`${DIFF}\` and `

const reviewed = await pipeline(
  DIMENSIONS,
  (d) => agent(
    `${reviewSource}${digest ? 'Review' : 'review'} only the changed code for ${d.key}: ${d.look}. ` +
    'Cite path:line inside the diff, quote the changed lines as evidence, and give a one-line fix. Report nothing you cannot point at.',
    { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: 'Explore', effort: 'medium' }
  ).then(r => {
    const sorted = ((r && r.findings) || []).slice().sort(bySeverity)
    const unverified = sorted.slice(MAX_PER_DIMENSION)
    if (unverified.length) log(`${d.key}: verifying the top ${MAX_PER_DIMENSION} of ${sorted.length} findings; ${unverified.length} return unverified`)
    if (!r) log(`${d.key}: reviewer failed, dimension not covered`)
    return { key: d.key, weight: d.weight, covered: !!r, findings: sorted.slice(0, MAX_PER_DIMENSION), unverified }
  }),
  (review) => parallel(review.findings.map(f => () =>
    agent(
      `You did not write this finding. Try to refute it against \`${DIFF}\`. ` +
      'It is refuted if the cited lines are not in the diff, the code already handles the case, the behavior predates this branch, or the severity is clearly overstated. ' +
      'If you cannot confirm it, answer refuted=true.\n' +
      `Dimension: ${review.key}\nFinding: ${f.severity} | ${f.title} @ ${f.file}\nEvidence: ${f.evidence}`,
      { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore', effort: 'high' }
    ).then(v => ({ ...f, dimension: review.key, confirmed: !!v && v.refuted === false, verifierReason: v ? v.reason : 'verifier failed' }))
  )).then(vs => ({ ...review, findings: vs.filter(Boolean) }))
)

const dims = reviewed.filter(Boolean)
const confirmed = dims.flatMap(d => d.findings).filter(f => f.confirmed)
const grouped = SEVERITY_ORDER.reduce((acc, s) => {
  acc[s] = confirmed.filter(f => f.severity === s)
  return acc
}, {})
const blockers = grouped.critical.length + grouped.high.length
const uncovered = dims.filter(d => !d.covered).map(d => d.key)
const verdict = blockers > 0 ? 'request-changes' : (confirmed.length || uncovered.length ? 'comment' : 'approve')
const unverified = dims.flatMap(d => d.unverified.map(f => ({ ...f, dimension: d.key })))

return { base: BASE, reader: USE_READER ? (digest ? 'used' : 'failed') : 'off', verdict, blockers, total: confirmed.length, bySeverity: grouped, uncovered, unverified }
