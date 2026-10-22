export const meta = {
  name: 'ccc-fleet',
  description: 'Parallel fleet: fan-out slices with independent verifiers, sequential stage chains, a judge panel of independent attempts, or a multi-lens adversarial debate.',
  whenToUse: 'General multi-agent orchestration. mode=fanout for divisible work, pipeline for staged work, judge for a high-stakes decision worth several attempts, debate for stress-testing a design or diff.',
  phases: [
    { title: 'Fleet', detail: 'dispatch the chosen pattern' },
    { title: 'Synthesize', detail: 'verify, score, or judge the results' },
  ],
}

// args (required):
//   mode: 'fanout' | 'pipeline' | 'judge' | 'debate'
//   tasks?: string[]    fanout: non-overlapping slices; pipeline: ordered stages (2 or more)
//   task?: string       judge and debate: the question or artifact under review
//   attempts?: number   judge: independent attempts, 2-5 (default 3)
//   lenses?: string[]   debate: lenses (default security, performance, contrarian)
//   rounds?: number     debate: cross-examination rounds, 1-3 (default 2)
if (!args || !args.mode) throw new Error('ccc-fleet requires args: { mode, tasks | task }')
const mode = args.mode
const asText = (r) => (typeof r === 'string' ? r : JSON.stringify(r))

const SLICE_VERDICT = {
  type: 'object',
  required: ['refuted', 'reason'],
  properties: {
    refuted: { type: 'boolean', description: 'true unless the claimed change was confirmed in the files and tests' },
    reason: { type: 'string' },
  },
}

phase('Fleet')

if (mode === 'fanout') {
  const tasks = Array.isArray(args.tasks) ? args.tasks : []
  if (!tasks.length) throw new Error('fanout requires args.tasks: string[]')
  log(`Fan-out: ${tasks.length} slices, each verified as soon as it finishes`)
  // Slices mutate files concurrently, so each runs in its own worktree.
  // Failed slices are surfaced in the result, never dropped.
  const results = await pipeline(
    tasks,
    (t, _item, i) => agent(
      `Slice ${i + 1} of ${tasks.length}. Work only on this slice; other agents own the rest: ${t}\n` +
      'Report the worktree path (`git rev-parse --show-toplevel`), the branch, every file you changed, and the check you ran. ' +
      'Do not grade your own work; an independent verifier checks it.',
      { label: `slice-${i + 1}`, phase: 'Fleet', isolation: 'worktree', effort: 'medium' }
    ).then(r => (r === null ? { slice: i + 1, task: t, failed: true, error: 'agent returned no result' } : { slice: i + 1, task: t, result: asText(r) })),
    (r) => {
      if (r.failed) return r
      return agent(
        `You did not do this work. A fan-out slice claims it completed: ${r.task}\nSlice report:\n${r.result}\n` +
        'Try to refute the claim: open the reported worktree, confirm each file changed as described, and run the relevant tests. ' +
        'If anything is missing or you cannot confirm it, answer refuted=true.',
        { label: `verify-slice-${r.slice}`, phase: 'Synthesize', schema: SLICE_VERDICT, effort: 'high' }
      ).then(v => ({ ...r, verified: !!v && v.refuted === false, verification: v ? v.reason : 'verifier failed; slice unverified' }))
    }
  )
  const rows = results.map((r, i) => r || { slice: i + 1, task: tasks[i], failed: true, error: 'stage threw' })
  const failed = rows.filter(r => r.failed)
  const unverified = rows.filter(r => !r.failed && !r.verified)
  if (failed.length) log(`${failed.length}/${tasks.length} slices failed; surfaced in results`)
  if (unverified.length) log(`${unverified.length}/${tasks.length} slices did not survive verification`)
  return { mode, slices: tasks.length, failed: failed.length, unverified: unverified.length, results: rows }
}

if (mode === 'pipeline') {
  const stages = Array.isArray(args.tasks) ? args.tasks : []
  if (stages.length < 2) throw new Error('pipeline requires args.tasks: string[] with 2 or more stages')
  log(`Pipeline: ${stages.length} sequential stages in the current tree`)
  // Stages run one after another and build on each other's edits, so no worktree isolation.
  let carry = ''
  const out = []
  for (let i = 0; i < stages.length; i++) {
    const r = await agent(
      `Pipeline stage ${i + 1} of ${stages.length}: ${stages[i]}` +
      (carry ? `\n\nPrevious stage report:\n${carry}` : '') +
      '\n\nReport what you changed and the check you ran.',
      { label: `stage-${i + 1}`, phase: 'Fleet', effort: 'medium' }
    )
    if (r === null) {
      log(`Stage ${i + 1} failed; stages ${i + 2}-${stages.length} not run`)
      out.push({ stage: i + 1, failed: true })
      return { mode, stages: stages.length, completed: i, out }
    }
    carry = asText(r)
    out.push({ stage: i + 1, result: r })
  }
  phase('Synthesize')
  const check = await agent(
    `You did not do this work. A ${stages.length}-stage pipeline claims it completed:\n` +
    stages.map((s, i) => `${i + 1}. ${s}`).join('\n') + `\n\nFinal stage report:\n${carry}\n` +
    'Try to refute that every stage landed: inspect the changed files and run the relevant tests. If you cannot confirm it, answer refuted=true.',
    { label: 'verify-pipeline', phase: 'Synthesize', schema: SLICE_VERDICT, effort: 'high' }
  )
  return { mode, stages: stages.length, completed: stages.length, verified: !!check && check.refuted === false, verification: check ? check.reason : 'verifier failed', out }
}

if (mode === 'judge') {
  const task = args.task
  if (!task) throw new Error('judge requires args.task: string')
  const N = Math.max(2, Math.min(5, args.attempts || 3))
  const ANGLES = ['MVP-first: the simplest thing that works', 'risk-first: what could go wrong', 'user-first: the best end-to-end experience', 'performance-first', 'maintainability-first']
  log(`Judge panel: ${N} independent attempts`)
  // Barrier: the referee compares every attempt side by side.
  const attempts = await parallel(Array.from({ length: N }, (_, i) => () =>
    agent(`Propose an approach to: ${task}\nLens: ${ANGLES[i % ANGLES.length]}. Be concrete and brief.`,
      { label: `attempt-${i + 1}`, phase: 'Fleet', effort: 'medium' })
  ))
  const valid = attempts.filter(Boolean)
  if (valid.length < N) log(`${N - valid.length}/${N} attempts failed; judging ${valid.length}`)
  if (!valid.length) return { mode, attempts: 0, judged: null }
  phase('Synthesize')
  const VERDICT = { type: 'object', required: ['winner', 'rationale'], properties: { winner: { type: 'number' }, rationale: { type: 'string' }, synthesis: { type: 'string' } } }
  const judged = await agent(
    `You are the referee. ${valid.length} independent approaches to "${task}":\n` +
    valid.map((a, i) => `\n--- Attempt ${i + 1} ---\n${asText(a)}`).join('\n') +
    '\n\nFor each attempt, name its weakest assumption first. Then pick the strongest (winner = 1-based index), explain why, and write a synthesis that grafts the best ideas from the runners-up.',
    { label: 'referee', phase: 'Synthesize', schema: VERDICT, effort: 'high' })
  return { mode, attempts: valid.length, judged }
}

if (mode === 'debate') {
  const task = args.task
  if (!task) throw new Error('debate requires args.task: string')
  const lenses = (Array.isArray(args.lenses) && args.lenses.length) ? args.lenses : ['security', 'performance', 'contrarian']
  const rounds = Math.max(1, Math.min(3, args.rounds || 2))
  log(`Debate: ${lenses.length} lenses x ${rounds} round(s)`)

  // Round 1: each lens argues blind to the others.
  let positions = await parallel(lenses.map(lens => () =>
    agent(
      `Argue adversarially about: ${task}\nYour lens: ${lens}. Take the strongest position from this lens: concrete objections, risks, or requirements, citing path:line where relevant. ` +
      `Round 1 of ${rounds}; you have not seen the other lenses.`,
      { label: `${lens}-r1`, phase: 'Fleet', effort: 'medium' }
    ).then(r => ({ lens, text: r === null ? '(no response)' : asText(r) }))
  ))

  // Rounds 2..N need every lens's previous position, so each round is a barrier.
  for (let round = 2; round <= rounds; round++) {
    const summary = positions.map(p => `--- ${p.lens} (round ${round - 1}) ---\n${p.text}`).join('\n\n')
    const prior = positions
    positions = await parallel(lenses.map((lens, i) => () =>
      agent(
        `You are the ${lens} lens in an adversarial debate about: ${task}\n\nRound ${round - 1} positions:\n${summary}\n\n` +
        `Cross-examine the other lenses from your ${lens} viewpoint. Concede where their point is stronger, sharpen objections that survive, and withdraw weak claims explicitly. Round ${round} of ${rounds}.`,
        { label: `${lens}-r${round}`, phase: 'Fleet', effort: 'medium' }
      ).then(r => ({ lens, text: r === null ? (prior[i] && prior[i].text) || '(no response)' : asText(r) }))
    ))
  }

  phase('Synthesize')
  const VERDICT = {
    type: 'object',
    required: ['verdict', 'rationale'],
    properties: {
      verdict: { type: 'string', enum: ['ship', 'revise', 'block'] },
      blocking: { type: 'array', items: { type: 'string' } },
      tradeoffs: { type: 'array', items: { type: 'string' } },
      rationale: { type: 'string' },
    },
  }
  const finalPositions = positions.map(p => `--- ${p.lens} (final) ---\n${p.text}`).join('\n\n')
  const judged = await agent(
    `You judge an adversarial debate about: ${task}\n\nFinal positions after ${rounds} round(s):\n${finalPositions}\n\n` +
    'List the objections that survived cross-examination (blocking, with path:line where given), the accepted tradeoffs, and a ship, revise, or block verdict with a one-line rationale. Discard anything a lens conceded or withdrew.',
    { label: 'judge', phase: 'Synthesize', schema: VERDICT, effort: 'high' }
  )
  return { mode, lenses, rounds, judged }
}

throw new Error(`unknown mode: ${mode} (expected fanout | pipeline | judge | debate)`)
