export const meta = {
  name: 'ccc-fleet',
  description: 'CC Commander parallel fleet — fan-out (slices in parallel), pipeline (sequential stages), or judge (N independent attempts scored by a panel).',
  whenToUse: 'General multi-agent orchestration. mode=fanout for divisible work, pipeline for staged work, judge for a high-stakes decision worth several attempts.',
  phases: [
    { title: 'Fleet', detail: 'dispatch the chosen pattern' },
    { title: 'Synthesize', detail: 'merge / score the results' },
  ],
}

// args (required): { mode: 'fanout'|'pipeline'|'judge', tasks: string[] (fanout/pipeline) | task: string (judge), attempts?: number }
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

throw new Error(`unknown mode: ${mode} (expected fanout|pipeline|judge)`)
