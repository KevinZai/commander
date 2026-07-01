export const meta = {
  name: 'ccc-fleet',
  description: 'CC Commander parallel fleet — fan-out (slices in parallel), pipeline (sequential stages), judge (N independent attempts scored by a panel), or debate (adversarial multi-lens cross-examination).',
  whenToUse: 'General multi-agent orchestration. mode=fanout for divisible work, pipeline for staged work, judge for a high-stakes decision worth several attempts, debate for stress-testing a design/diff from distinct adversarial lenses.',
  phases: [
    { title: 'Fleet', detail: 'dispatch the chosen pattern' },
    { title: 'Synthesize', detail: 'merge / score the results' },
  ],
}

// args (required): { mode: 'fanout'|'pipeline'|'judge'|'debate', tasks: string[] (fanout/pipeline) | task: string (judge/debate), attempts?: number, lenses?: string[] (debate), rounds?: number (debate) }
if (!args || !args.mode) throw new Error("ccc-fleet requires args: { mode, tasks|task }")
const mode = args.mode

phase('Fleet')

if (mode === 'fanout') {
  const tasks = args.tasks || []
  if (!tasks.length) throw new Error('fanout requires args.tasks: string[]')
  log(`Fan-out: ${tasks.length} parallel slices`)
  const results = await parallel(tasks.map((t, i) => () =>
    agent(`Slice ${i + 1} of a fan-out job. Work ONLY on this slice (non-overlapping with the others): ${t}. Report files changed + whether tests pass.`,
      { label: `slice-${i + 1}`, phase: 'Fleet', isolation: 'worktree' }).catch(() => null)
  ))
  return { mode, slices: tasks.length, results: results.filter(Boolean) }
}

if (mode === 'pipeline') {
  const stages = args.tasks || []
  if (stages.length < 2) throw new Error('pipeline requires args.tasks: string[] (>=2 stages)')
  log(`Pipeline: ${stages.length} sequential stages`)
  let carry = ''
  const out = []
  for (let i = 0; i < stages.length; i++) {
    const r = await agent(`Pipeline stage ${i + 1}/${stages.length}: ${stages[i]}${carry ? `\n\nPrior stage output:\n${carry}` : ''}`,
      { label: `stage-${i + 1}`, phase: 'Fleet' })
    carry = typeof r === 'string' ? r : JSON.stringify(r)
    out.push({ stage: i + 1, result: r })
  }
  return { mode, stages: stages.length, out }
}

if (mode === 'judge') {
  const task = args.task
  if (!task) throw new Error('judge requires args.task: string')
  const N = Math.max(2, Math.min(5, args.attempts || 3))
  const ANGLES = ['MVP-first / simplest thing that works', 'risk-first / what could go wrong', 'user-first / best end-to-end experience', 'performance-first', 'maintainability-first']
  log(`Judge panel: ${N} independent attempts`)
  const attempts = await parallel(Array.from({ length: N }, (_, i) => () =>
    agent(`Propose an approach to: ${task}. Lens: ${ANGLES[i % ANGLES.length]}. Be concrete and concise.`,
      { label: `attempt-${i + 1}`, phase: 'Fleet' }).catch(() => null)
  ))
  const valid = attempts.filter(Boolean)
  phase('Synthesize')
  const VERDICT = { type: 'object', required: ['winner', 'rationale'], properties: { winner: { type: 'number' }, rationale: { type: 'string' }, synthesis: { type: 'string' } } }
  const judged = await agent(
    `You are the referee. Here are ${valid.length} independent approaches to "${task}":\n` +
    valid.map((a, i) => `\n--- Attempt ${i + 1} ---\n${typeof a === 'string' ? a : JSON.stringify(a)}`).join('\n') +
    `\n\nPick the strongest (winner = its 1-based index), explain why, and write a synthesis that grafts the best ideas from the runners-up.`,
    { label: 'referee', phase: 'Synthesize', schema: VERDICT })
  return { mode, attempts: valid.length, judged }
}

if (mode === 'debate') {
  const task = args.task
  if (!task) throw new Error('debate requires args.task: string')
  const lenses = (args.lenses && args.lenses.length) ? args.lenses : ['security', 'performance', 'contrarian']
  const rounds = Math.max(1, Math.min(3, args.rounds || 2))
  log(`Debate: ${lenses.length} lenses × ${rounds} round(s)`)

  // Round 1: each lens argues independently, blind to the others.
  let positions = await parallel(lenses.map((lens, i) => () =>
    agent(
      `Adversarially argue about: ${task}\nYour lens: ${lens}. Take the strongest position from this lens — concrete objections, risks, or requirements it implies. Be specific (cite file:line where relevant). This is round 1 of ${rounds} — you have not seen the other lenses' arguments yet.`,
      { label: `${lens}-r1`, phase: 'Fleet' }
    ).then(r => ({ lens, text: typeof r === 'string' ? r : JSON.stringify(r) })).catch(() => ({ lens, text: '(no response)' }))
  ))

  // Rounds 2..N: cross-examine — each lens sees every other lens's prior-round position and
  // either concedes, sharpens its objection, or rebuts. Weak claims should die here.
  for (let round = 2; round <= rounds; round++) {
    const summary = positions.map(p => `--- ${p.lens} (round ${round - 1}) ---\n${p.text}`).join('\n\n')
    positions = await parallel(lenses.map((lens, i) => () =>
      agent(
        `You are the ${lens} lens in an adversarial debate about: ${task}\n\nAll lenses' round ${round - 1} positions:\n${summary}\n\nCross-examine the OTHER lenses' positions from your ${lens} viewpoint. For each: concede if it's actually stronger than your objection, sharpen your own objection if it survives scrutiny, or explicitly withdraw a weak claim. Round ${round} of ${rounds}.`,
        { label: `${lens}-r${round}`, phase: 'Fleet' }
      ).then(r => ({ lens, text: typeof r === 'string' ? r : JSON.stringify(r) })).catch(() => ({ lens, text: positions[i]?.text || '(no response)' }))
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
  const finalPositions = positions.map(p => `--- ${p.lens} (final position) ---\n${p.text}`).join('\n\n')
  const judged = await agent(
    `You are the judge for an adversarial debate about: ${task}\n\nFinal positions after ${rounds} round(s) of cross-examination:\n${finalPositions}\n\nRule: which objections SURVIVED cross-examination (blocking issues, cite file:line where given), which are accepted tradeoffs, and a ship/revise/block verdict with a one-line rationale. Only report objections that actually survived — discard anything a lens conceded or withdrew.`,
    { label: 'judge', phase: 'Synthesize', schema: VERDICT }
  )
  return { mode, lenses, rounds, judged }
}

throw new Error(`unknown mode: ${mode} (expected fanout|pipeline|judge|debate)`)
