export const meta = {
  name: 'ccc-migrate',
  description: 'CC Commander codebase migration — discover every site matching a pattern, transform each in an isolated worktree, verify the change holds.',
  whenToUse: 'Large mechanical migrations across many files (API rename, framework bump, import rewrite). Each file is transformed + verified independently.',
  phases: [
    { title: 'Discover', detail: 'find every site that needs the change' },
    { title: 'Migrate', detail: 'transform each site' },
    { title: 'Verify', detail: 'independent refute-framed verifier per changed file' },
  ],
}

// args (required): { pattern: string (what to find), transform: string (how to change it), verify?: string (how to confirm) }
if (!args || !args.pattern || !args.transform) {
  throw new Error('ccc-migrate requires args: { pattern, transform, verify? }')
}
const { pattern, transform } = args
const VERIFY = args.verify || 'the file still parses and existing tests for it pass'

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

const RESULT_SCHEMA = {
  type: 'object',
  required: ['file', 'changed', 'verified'],
  properties: {
    file: { type: 'string' },
    changed: { type: 'boolean' },
    verified: { type: 'boolean' },
    note: { type: 'string' },
  },
}

phase('Discover')
const discovery = await agent(
  `Find EVERY site in this repo that matches: ${pattern}. Search exhaustively (grep by content, by symbol, by import). Return the full list — do not cap it. Exclude vendor/ and node_modules/.`,
  { label: 'discover', phase: 'Discover', schema: SITES_SCHEMA, agentType: 'Explore' }
)
const sites = (discovery && discovery.sites) || []
log(`Discovered ${sites.length} sites to migrate`)
if (!sites.length) return { pattern, sites: 0, migrated: [], note: 'no sites matched the pattern' }

// Each site is transformed in its OWN worktree (parallel-safe — no cross-file conflicts).
// The worker reports changed/unchanged only — verification belongs to an INDEPENDENT
// agent below (Fable Pillar 2: the worker never grades its own work).
const migrated = await parallel(sites.map(s => () =>
  agent(
    `In file "${s.file}", apply this transform: ${transform}\nReport whether you changed the file. If the transform does not apply cleanly, leave the file unchanged and report changed=false with a note. Do NOT self-certify correctness — an independent verifier checks your work.`,
    { label: `migrate:${s.file}`, phase: 'Migrate', schema: RESULT_SCHEMA, isolation: 'worktree' }
  ).catch(() => ({ file: s.file, changed: false, verified: false, note: 'agent error' }))
))

const workerResults = migrated.filter(Boolean)
const changed = workerResults.filter(r => r.changed)
const skipped = workerResults.filter(r => !r.changed)

phase('Verify')
// Verifier ≠ worker: a FRESH refute-framed agent per changed file. verified stays
// false unless the verifier affirmatively confirms — never trust worker self-reports.
const verified = await parallel(changed.map(r => () =>
  agent(
    `You are an independent verifier — you did NOT make this change. In file "${r.file}", a worker claims to have applied: ${transform}\nActively try to REFUTE that claim: check the transform actually landed, check ${VERIFY}, and look for collateral damage (broken imports, syntax, adjacent behavior). Report verified=true ONLY if you affirmatively confirmed the change is present and correct.`,
    { label: `verify:${r.file}`, phase: 'Verify', schema: RESULT_SCHEMA, agentType: 'Explore' }
  ).then(v => ({ ...r, verified: v && v.verified === true, verifierNote: v && v.note }))
   .catch(() => ({ ...r, verified: false, verifierNote: 'verifier error — treated as unverified' }))
))

const results = [...verified, ...skipped.map(r => ({ ...r, verified: false }))]
const ok = verified.filter(r => r.verified)
const failed = verified.filter(r => !r.verified)
log(`Migrated ${ok.length}/${sites.length} (${failed.length} failed independent verify, ${skipped.length} skipped)`)

return { pattern, transform, sites: sites.length, ok: ok.length, failed, skipped, results }
