export const meta = {
  name: 'ccc-migrate',
  description: 'Codebase migration: discover every matching site, transform each in its own worktree, and verify each change with an independent skeptic.',
  whenToUse: 'Large mechanical migrations across many files (API rename, framework bump, import rewrite). Each site is transformed and verified independently.',
  phases: [
    { title: 'Discover', detail: 'find every site that needs the change' },
    { title: 'Migrate', detail: 'transform each site in an isolated worktree' },
    { title: 'Verify', detail: 'a fresh skeptic tries to refute each change' },
  ],
}

// args (required):
//   pattern: string     what to find
//   transform: string   how to change each site
//   verify?: string     how to confirm a site (default: the file parses and its tests pass)
//   maxSites?: number   sites migrated in this run (default 200, max 1000); the rest are returned as remaining
if (!args || !args.pattern || !args.transform) {
  throw new Error('ccc-migrate requires args: { pattern, transform, verify?, maxSites? }')
}
const { pattern, transform } = args
const VERIFY = args.verify || 'the file still parses and the existing tests that cover it pass'
const MAX_SITES = Math.max(1, Math.min(1000, args.maxSites || 200))

const SITES_SCHEMA = {
  type: 'object',
  required: ['sites'],
  properties: {
    sites: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file'],
        properties: {
          file: { type: 'string' },
          note: { type: 'string', description: 'what about this site matches the pattern' },
        },
      },
    },
  },
}

const WORKER_SCHEMA = {
  type: 'object',
  required: ['file', 'changed'],
  properties: {
    file: { type: 'string' },
    changed: { type: 'boolean' },
    worktree: { type: 'string', description: 'absolute path from git rev-parse --show-toplevel' },
    branch: { type: 'string' },
    note: { type: 'string' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'reason'],
  properties: {
    refuted: { type: 'boolean', description: 'true unless the change was confirmed present and correct' },
    reason: { type: 'string' },
  },
}

phase('Discover')
const discovery = await agent(
  `Find every site in this repository that matches: ${pattern}\n` +
  'Search by content, by symbol, and by import, then merge the lists. Return every site; do not cap the list. Exclude vendor/ and node_modules/.',
  { label: 'discover', phase: 'Discover', schema: SITES_SCHEMA, agentType: 'Explore', effort: 'medium' }
)
if (!discovery) throw new Error('ccc-migrate: discovery agent failed; nothing migrated')
const allSites = discovery.sites || []
if (!allSites.length) return { pattern, sites: 0, ok: 0, results: [], note: 'no sites matched the pattern' }
const sites = allSites.slice(0, MAX_SITES)
const remaining = allSites.slice(MAX_SITES)
log(`Discovered ${allSites.length} sites; migrating ${sites.length}` + (remaining.length ? `, ${remaining.length} returned as remaining (raise maxSites to include them)` : ''))

// Workers edit files concurrently, so each gets its own worktree. The worker reports
// where its change lives; a separate agent verifies it there.
const results = await pipeline(
  sites,
  (s) => agent(
    `In file "${s.file}", apply this transform: ${transform}\n` +
    'If it does not apply cleanly, leave the file unchanged and report changed=false with a note. ' +
    'Report the worktree path (`git rev-parse --show-toplevel`) and branch. Do not grade your own work; an independent verifier checks it.',
    { label: `migrate:${s.file}`, phase: 'Migrate', schema: WORKER_SCHEMA, isolation: 'worktree', effort: 'medium' }
  ).then(r => r || { file: s.file, changed: false, note: 'worker failed' }),
  (r) => {
    if (!r.changed) return { ...r, verified: false, verifierNote: 'not changed' }
    return agent(
      `You did not make this change. In worktree "${r.worktree || '(unknown)'}" on branch "${r.branch || '(unknown)'}", file "${r.file}", a worker claims it applied: ${transform}\n` +
      `Try to refute the claim: confirm the transform landed, check that ${VERIFY}, and look for collateral damage (broken imports, syntax, adjacent behavior). ` +
      'If the worktree is missing or you cannot confirm the change, answer refuted=true.',
      { label: `verify:${r.file}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore', effort: 'high' }
    ).then(v => ({ ...r, verified: !!v && v.refuted === false, verifierNote: v ? v.reason : 'verifier failed; treated as unverified' }))
  }
)

const rows = results.map((r, i) => r || { file: sites[i].file, changed: false, verified: false, note: 'stage threw' })
const ok = rows.filter(r => r.changed && r.verified)
const failed = rows.filter(r => r.changed && !r.verified)
const skipped = rows.filter(r => !r.changed)
log(`Migrated ${ok.length}/${sites.length}: ${failed.length} failed verification, ${skipped.length} unchanged`)

return { pattern, transform, sites: allSites.length, attempted: sites.length, ok: ok.length, failed, skipped, remaining, results: rows }
