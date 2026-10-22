export const meta = {
  name: 'ccc-prompt-audit',
  description: 'Prompt audit: check every plugin SKILL.md and agent file against the prompt-standard checklist, adversarially verify each finding, return a per-file verdict.',
  whenToUse: 'Before a release or after a prompt rewrite in the Commander repository. Read-only: it reports violations and does not edit files.',
  phases: [
    { title: 'List', detail: 'enumerate every SKILL.md and agent .md' },
    { title: 'Check', detail: 'one checker per file runs the prompt-standard checklist' },
    { title: 'Verify', detail: 'a fresh skeptic tries to refute each finding' },
  ],
}

// args (optional):
//   root?: string       plugin root to audit (default 'commander/cowork-plugin')
//   paths?: string[]    audit exactly these files and skip the List phase
//   standard?: string   checklist source (default 'docs/PROMPT-STANDARD.md', section 5)
//   maxFiles?: number   files checked in this run (default 400, max 2000); the rest are returned as unchecked
const ROOT = (args && typeof args.root === 'string' && args.root) || 'commander/cowork-plugin'
const STANDARD = (args && typeof args.standard === 'string' && args.standard) || 'docs/PROMPT-STANDARD.md'
const MAX_FILES = Math.max(1, Math.min(2000, (args && args.maxFiles) || 400))

const CHECKS = [
  { id: 'frontmatter', rule: 'Frontmatter parses as YAML. For a skill, `name` equals its directory name; for an agent, `name` equals the file basename. `description` is present. `model`, when present, is an alias (haiku, sonnet, opus, fable, inherit), never a dated or full id. `effort` is set. Every tool the body tells the model to call appears in `allowed-tools` (skills) or `tools` (agents).' },
  { id: 'line-limit', rule: 'A SKILL.md is under 400 lines; an agent file is under 120 lines. Count with `wc -l`.' },
  { id: 'stale-model', rule: 'No stale model name. Run: grep -nE "Fable [5]\\b|Opus [5]\\b|Sonnet [5]\\b|Haiku 4[.]5|claude-fable-[5]\\b|claude-opus-[5]\\b|claude-sonnet-[5]\\b|claude-haiku-4-[5]|GPT-5[.]|gpt-5[.]|Ter[r]a" <file>, and flag a bare "Sol" that is not "gpt-6-sol", "gpt-6.1-sol", or "GPT-6".' },
  { id: 'count-version-literal', rule: 'No count or version literal in the body. Run: grep -nE "\\b[0-9]{2,3} (skills|agents|handlers|hooks)\\b|v?7\\.[0-9]\\.[0-9]" <file>.' },
  { id: 'typed-menu', rule: 'No typed-letter menu ("Reply A/B/C", "type 1, 2 or 3") and no table standing in for a menu. Choices go through AskUserQuestion with 2-4 options.' },
  { id: 'pii', rule: 'No personal paths (/Users/<name>, /home/<name>), private hostnames, personal agent rosters, credentials, or the private service names listed in rule 12 of the standard.' },
]

const FILES_SCHEMA = {
  type: 'object',
  required: ['files'],
  properties: { files: { type: 'array', items: { type: 'string', description: 'repo-relative path' } } },
}

const CHECK_SCHEMA = {
  type: 'object',
  required: ['file', 'kind', 'lines', 'findings'],
  properties: {
    file: { type: 'string' },
    kind: { type: 'string', enum: ['skill', 'agent'] },
    lines: { type: 'number' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['check', 'line', 'evidence'],
        properties: {
          check: { type: 'string', enum: CHECKS.map(c => c.id) },
          line: { type: 'number', description: '1-based line, 0 for whole-file findings' },
          evidence: { type: 'string', description: 'the exact offending text or command output' },
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
    refuted: { type: 'boolean', description: 'true unless the violation was confirmed in the file' },
    reason: { type: 'string' },
  },
}

const checklist = CHECKS.map(c => `- ${c.id}: ${c.rule}`).join('\n')

let files
if (args && Array.isArray(args.paths) && args.paths.length) {
  files = args.paths
  log(`Auditing ${files.length} files passed in args.paths`)
} else {
  phase('List')
  const listed = await agent(
    `List every prompt file under "${ROOT}": each skills/*/SKILL.md and each agents/*.md. ` +
    `Use \`find "${ROOT}/skills" -name SKILL.md\` and \`find "${ROOT}/agents" -maxdepth 1 -name "*.md"\`. Return repo-relative paths, sorted, with no other files.`,
    { label: 'list', phase: 'List', schema: FILES_SCHEMA, agentType: 'Explore', effort: 'low' }
  )
  if (!listed) throw new Error('ccc-prompt-audit: list agent failed; nothing audited')
  files = listed.files || []
}
if (!files.length) return { root: ROOT, files: 0, verdicts: [], note: 'no prompt files found' }
const unchecked = files.slice(MAX_FILES)
files = files.slice(0, MAX_FILES)
if (unchecked.length) log(`Checking ${files.length} files; ${unchecked.length} returned as unchecked (raise maxFiles to include them)`)
log(`Checking ${files.length} files against ${STANDARD} section 5`)

const results = await pipeline(
  files,
  (file) => agent(
    `Check the prompt file "${file}" against this checklist from section 5 of ${STANDARD}. Read the standard if a rule is unclear. ` +
    'Run each listed command yourself; report one finding per violation with the line and the exact offending text. Report nothing you cannot quote.\n\n' +
    checklist,
    { label: `check:${file}`, phase: 'Check', schema: CHECK_SCHEMA, agentType: 'Explore', effort: 'medium' }
  ).then(r => r || { file, kind: file.includes('/agents/') ? 'agent' : 'skill', lines: 0, findings: [], failed: true }),
  (r) => parallel((r.findings || []).map(f => () =>
    agent(
      `You did not write this finding. Try to refute it by reading "${r.file}". ` +
      'It is refuted if the quoted text is not at that line, the text is historical context the standard allows, the match is a false positive of the grep (for example "gpt-6-sol" flagged as a bare Sol), or the rule does not apply to this file kind. ' +
      'If you cannot confirm it, answer refuted=true.\n' +
      `Check: ${f.check}\nRule: ${(CHECKS.find(c => c.id === f.check) || {}).rule}\nLine ${f.line}: ${f.evidence}`,
      { label: `verify:${r.file}:${f.line}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore', effort: 'high' }
    ).then(v => ({ ...f, confirmed: !!v && v.refuted === false, verifierReason: v ? v.reason : 'verifier failed' }))
  )).then(vs => ({ ...r, findings: vs.filter(Boolean) }))
)

const verdicts = results.map((r, i) => {
  if (!r || r.failed) return { file: files[i], verdict: 'unchecked', confirmed: [], refuted: 0 }
  const confirmed = r.findings.filter(f => f.confirmed)
  return {
    file: r.file,
    kind: r.kind,
    lines: r.lines,
    verdict: confirmed.length ? 'fail' : 'pass',
    confirmed: confirmed.map(f => ({ check: f.check, line: f.line, evidence: f.evidence, fix: f.fix })),
    refuted: r.findings.length - confirmed.length,
  }
})
const failing = verdicts.filter(v => v.verdict === 'fail')
const notChecked = verdicts.filter(v => v.verdict === 'unchecked')
log(`${failing.length} failing, ${verdicts.length - failing.length - notChecked.length} passing, ${notChecked.length} not checked`)

return {
  root: ROOT,
  standard: STANDARD,
  files: verdicts.length,
  passing: verdicts.length - failing.length - notChecked.length,
  failing: failing.length,
  verdicts,
  unchecked: unchecked.concat(notChecked.map(v => v.file)),
}
