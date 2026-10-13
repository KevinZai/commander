export const meta = {
  name: 'ccc-release-audit',
  description: 'Release audit: run every repository release gate, check that docs, counts, and manifests agree, and return a go or no-go with blockers.',
  whenToUse: 'Before tagging a Commander release, in the repository root of the release branch. Runs gates and checks; it does not commit, tag, push, or publish.',
  phases: [
    { title: 'Gates', detail: 'one agent per release gate runs the exact command' },
    { title: 'Consistency', detail: 'versions, counts, and manifests compared across files' },
    { title: 'Verify', detail: 'failures re-run and mismatches refuted before they block' },
  ],
}

// args (optional):
//   version?: string       expected release version, e.g. '8.0.0'; checked against package.json and every manifest
//   skipTests?: boolean    skip `npm run test:ci` (default false); logged as a coverage gap
//   postRelease?: boolean  also check the GitHub latest release and the live site (default false)
//   repo?: string          GitHub owner/name for the post-release check (default 'KevinZai/commander')
//   site?: string          site URL for the post-release check (default 'https://commanderplugin.com/')
const VERSION = (args && typeof args.version === 'string' && args.version) || null
const SKIP_TESTS = !!(args && args.skipTests)
const POST_RELEASE = !!(args && args.postRelease)
const REPO = (args && typeof args.repo === 'string' && args.repo) || 'KevinZai/commander'
const SITE = (args && typeof args.site === 'string' && args.site) || 'https://commanderplugin.com/'
// args reach shell commands below, so they are shape-checked first.
if (VERSION && !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(VERSION))) throw new Error(`args.version must be semver, got ${JSON.stringify(VERSION)}`)
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(REPO)) throw new Error(`args.repo must be owner/name, got ${JSON.stringify(REPO)}`)
if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?\/?$/.test(SITE)) throw new Error(`args.site must be an https origin, got ${JSON.stringify(SITE)}`)

// Built from parts so this file never matches its own stale-model grep. PCRE
// lookaheads keep current names (claude-opus-5-5, "Opus 5.5") out of the match;
// the registry, the model catalog's legacy table, dated history and the tests
// that deliberately pin superseded ids are excluded on purpose.
const STALE = ['claude-(fable|opus|sonnet)-' + '5(?![-\\d])', 'claude-haiku-4-' + '5', '\\b(Opus|Fable|Sonnet) ' + '5(?![.\\d])', 'Haiku 4\\' + '.5', 'gpt-5\\' + '.[0-9]', 'GPT-5\\' + '.[0-9]']
const STALE_EXCLUDES = ["':!CHANGELOG.md'", "':!docs/reference'", "':!docs/compat'", "':!docs/archive'", "':!vendor'", "':!mintlify-docs/whats-new-v*'", "':!mintlify-docs/quickstart.mdx'", "':!site/releases'", "':!package-lock.json'", "':!commander/adapters/codex/models.js'", "':!skills/claude-api/shared/models.md'", "':!skills/advisor'", "':!scripts/prompt-lint.js'", "':!commander/cowork-plugin/workflows'", "':!commander/cowork-plugin-codex/skills/ccc-codex'", "':!commander/tests/agent-personas.test.js'", "':!**/*.pdf'", "':!**/*.png'", "':!**/*.ansi'"]
const STALE_MODEL_GREP = "git grep -nP '" + STALE.join('|') + "' -- " + STALE_EXCLUDES.join(' ')

// Read-only gates run concurrently. expect: 'exit0' | 'empty' (exit 0 or 1 with no output) | 'contains:<text>'.
const READ_ONLY_GATES = [
  { id: 'stale-models', command: STALE_MODEL_GREP, expect: 'empty' },
  { id: 'product-contract', command: 'node scripts/check-product-contract.js --check', expect: 'exit0' },
  { id: 'registry', command: 'node scripts/build-from-registry.js --check', expect: 'exit0' },
  { id: 'version-parity', command: 'node scripts/check-version-parity.js --check', expect: 'exit0' },
  { id: 'audit-counts', command: 'node scripts/audit-counts.js --check', expect: 'exit0' },
  { id: 'doc-sync', command: 'node bin/doc-sync.js', expect: 'exit0' },
  { id: 'skill-doc-sync', command: 'node commander/cowork-plugin/skills/ccc-doc-sync/sync.js --check', expect: 'exit0' },
  { id: 'frontmatter', command: 'node scripts/audit-frontmatter.js --check', expect: 'exit0' },
  { id: 'compat', command: 'node scripts/check-compat.js', expect: 'exit0' },
  { id: 'changelog-version', command: 'node scripts/generate-changelog.js --check-version', expect: 'exit0' },
  { id: 'plugin-validate', command: 'claude plugin validate ./commander/cowork-plugin --strict', expect: 'contains:Validation passed' },
]
if (!SKIP_TESTS) READ_ONLY_GATES.push({ id: 'test-ci', command: 'npm run test:ci', expect: 'exit0' })
if (VERSION) READ_ONLY_GATES.push({ id: 'package-version', command: `node -e "console.log(require('./package.json').version)"`, expect: `contains:${VERSION}` })
if (POST_RELEASE && VERSION) {
  READ_ONLY_GATES.push({ id: 'github-release', command: `gh api repos/${REPO}/releases/latest --jq .tag_name`, expect: `contains:v${VERSION}` })
  READ_ONLY_GATES.push({ id: 'live-site', command: `curl -s ${SITE} | grep -c ${VERSION}`, expect: 'nonzero-count' })
}
// build:codex rewrites the Codex mirror, so it runs alone after every other gate.
const MUTATING_GATE = { id: 'codex-mirror', command: 'npm run build:codex > /dev/null && git status --porcelain commander/cowork-plugin-codex', expect: 'empty' }

if (SKIP_TESTS) log('test:ci skipped by args.skipTests; the verdict does not cover the test suite')
if (POST_RELEASE && !VERSION) log('postRelease needs args.version; GitHub release and live-site checks not run')

const GATE_SCHEMA = {
  type: 'object',
  required: ['id', 'command', 'exitCode', 'outputTail'],
  properties: {
    id: { type: 'string' },
    command: { type: 'string' },
    exitCode: { type: 'number' },
    outputTail: { type: 'string', description: 'last 40 lines of combined stdout and stderr, verbatim' },
  },
}

const MISMATCH_SCHEMA = {
  type: 'object',
  required: ['mismatches'],
  properties: {
    mismatches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['what', 'files', 'evidence'],
        properties: {
          what: { type: 'string' },
          files: { type: 'array', items: { type: 'string', description: 'path:line' } },
          evidence: { type: 'string', description: 'the disagreeing values, quoted' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'reason'],
  properties: {
    refuted: { type: 'boolean', description: 'true unless the problem was reproduced or confirmed' },
    reason: { type: 'string' },
  },
}

const passes = (g, r) => {
  const out = r.outputTail || ''
  if (g.expect === 'exit0') return r.exitCode === 0
  if (g.expect === 'empty') return (r.exitCode === 0 || r.exitCode === 1) && out.trim() === ''
  if (g.expect === 'nonzero-count') return r.exitCode === 0 && parseInt(out.trim(), 10) > 0
  if (g.expect.startsWith('contains:')) return r.exitCode === 0 && out.includes(g.expect.slice('contains:'.length))
  return false
}

const runGate = (g, label) => agent(
  `Run exactly this command from the repository root and report its real exit code and the last 40 lines of combined output, verbatim:\n\n${g.command}\n\n` +
  'Use a Bash timeout of 600000 ms. Do not fix anything, do not retry with different flags, and do not summarize the output.',
  { label, phase: 'Gates', schema: GATE_SCHEMA, effort: 'low' }
)

// A failing gate is re-run once by a fresh agent before it blocks, to separate a real failure from a flake.
const recheck = (g, first) => {
  if (!first) return { id: g.id, command: g.command, passed: false, outputTail: 'gate agent failed', confirmed: true }
  if (passes(g, first)) return { id: g.id, command: g.command, passed: true, exitCode: first.exitCode }
  return runGate(g, `rerun:${g.id}`).then(second => ({
    id: g.id,
    command: g.command,
    passed: !!second && passes(g, second),
    exitCode: first.exitCode,
    outputTail: first.outputTail,
    flaky: !!second && passes(g, second),
  }))
}

log(`Running ${READ_ONLY_GATES.length} read-only gates, then the Codex mirror gate`)

// Barrier: the mirror gate writes files, so it waits until every read-only gate and checker is done.

const [gateRows, consistency] = await parallel([
  () => pipeline(READ_ONLY_GATES, (g) => runGate(g, `gate:${g.id}`), (first, g) => recheck(g, first)),
  () => pipeline(
    [
      { id: 'versions', ask: `Compare the version in package.json, every .claude-plugin/plugin.json and marketplace.json, .agents/plugins/marketplace.json, commander/contract.json, the top CHANGELOG.md entry, and the README "What's new" heading${VERSION ? `; the expected version is ${VERSION}` : ''}.` },
      { id: 'counts', ask: 'Compare the skill, agent, hook-event, and handler counts in commander/contract.json against the actual directories (commander/cowork-plugin/skills/*/SKILL.md, agents/*.md, hooks/hooks.json) and against every count stated in README.md, CLAUDE.md, and commander/cowork-plugin/README.md.' },
      { id: 'manifests', ask: 'Check that commander/cowork-plugin/.claude-plugin/plugin.json and the generated Codex mirror manifest agree on name, version, description, and listed components, and that every path a manifest names exists.' },
    ],
    (c) => agent(
      `${c.ask} Report only disagreements, each with the files (path:line) and the quoted values. Report nothing when they agree.`,
      { label: `consistency:${c.id}`, phase: 'Consistency', schema: MISMATCH_SCHEMA, agentType: 'Explore', effort: 'medium' }
    ).then(r => ((r && r.mismatches) || []).map(m => ({ ...m, area: c.id })).concat(r ? [] : [{ area: c.id, what: 'consistency checker failed', files: [], evidence: '', unchecked: true }])),
    (mismatches) => parallel(mismatches.map(m => () => {
      if (m.unchecked) return Promise.resolve({ ...m, confirmed: false })
      return agent(
        `You did not report this. Try to refute it by reading the cited files: ${m.what}\nFiles: ${m.files.join(', ')}\nEvidence: ${m.evidence}\n` +
        'It is refuted if the values actually agree, the cited text is historical (CHANGELOG entries for older releases, archived docs), or the file is generated and not shipped. If you cannot confirm it, answer refuted=true.',
        { label: `verify:${m.area}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore', effort: 'high' }
      ).then(v => ({ ...m, confirmed: !!v && v.refuted === false, unchecked: !v, verifierReason: v ? v.reason : 'verifier failed (unchecked, blocks GO)' }))
    })).then(vs => vs.filter(Boolean))
  ),
])

const mirrorFirst = await runGate(MUTATING_GATE, `gate:${MUTATING_GATE.id}`)
const mirror = await recheck(MUTATING_GATE, mirrorFirst)

const gates = (gateRows || []).map((r, i) => r || { id: READ_ONLY_GATES[i].id, command: READ_ONLY_GATES[i].command, passed: false, outputTail: 'stage threw' }).concat([mirror])
const mismatches = (consistency || []).filter(Boolean).flat()
const confirmedMismatches = mismatches.filter(m => m.confirmed)
const uncheckedAreas = mismatches.filter(m => m.unchecked).map(m => m.area)
const failedGates = gates.filter(g => !g.passed)
const flaky = gates.filter(g => g.flaky).map(g => g.id)

const blockers = failedGates.map(g => ({ kind: 'gate', id: g.id, command: g.command, exitCode: g.exitCode, outputTail: g.outputTail }))
  .concat(confirmedMismatches.map(m => ({ kind: 'consistency', id: m.area, what: m.what, files: m.files, evidence: m.evidence })))
if (flaky.length) log(`Flaky gates (failed once, passed on rerun): ${flaky.join(', ')}`)
if (uncheckedAreas.length) log(`Consistency areas not checked: ${uncheckedAreas.join(', ')}`)

const go = blockers.length === 0 && uncheckedAreas.length === 0
log(go ? 'GO: every gate passed and no confirmed mismatch' : `NO-GO: ${blockers.length} blocker(s)`)

return {
  verdict: go ? 'go' : 'no-go',
  version: VERSION,
  blockers,
  gates: gates.map(g => ({ id: g.id, passed: g.passed, flaky: !!g.flaky })),
  refutedMismatches: mismatches.filter(m => !m.confirmed && !m.unchecked).length,
  coverageGaps: [].concat(SKIP_TESTS ? ['test:ci skipped'] : [], POST_RELEASE && !VERSION ? ['post-release checks need args.version'] : [], uncheckedAreas.map(a => `consistency:${a} not checked`)),
}
