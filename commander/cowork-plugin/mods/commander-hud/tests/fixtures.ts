// Sample ~/.claude/commander files, shaped like what the plugin's hooks write.
// Synthetic ids only.
export const HOME = '/home/hud-test'
export const ROOT = `${HOME}/.claude/commander`
export const NOW = Date.parse('2026-10-13T12:00:00.000Z')

export const SAMPLE: Readonly<Record<string, string>> = {
  [`${ROOT}/state.json`]: JSON.stringify({ onboardingCompleted: true, fableMethod: { armed: true } }),
  // Three starts: one stopped, one running, one older than the 6 h window.
  [`${ROOT}/subagent-runs.jsonl`]: [
    { ts: '2026-10-13T11:50:00.000Z', agent_name: 'Explore', agent_id: 'agent-stopped', session_id: 's1' },
    { ts: '2026-10-13T11:55:00.000Z', agent_name: 'general-purpose', agent_id: 'agent-running', session_id: 's1' },
    { ts: '2026-10-12T01:00:00.000Z', agent_name: 'Explore', agent_id: 'agent-stale', session_id: 's0' },
  ].map(row => JSON.stringify(row)).join('\n') + '\nnot json\n',
  [`${ROOT}/agent-runs.jsonl`]: JSON.stringify({ ts: '2026-10-13T11:58:00.000Z', agent: 'Explore', agentId: 'agent-stopped', status: 'completed' }) + '\n',
  [`${ROOT}/sessions/active-cost-default.json`]: JSON.stringify({ toolCalls: 42, estimatedCost: 0.42, sessionId: 'default' }),
  [`${ROOT}/update-nudge.json`]: JSON.stringify({ installed: '7.4.2', latest: '8.0.0', outdated: true, status: 'outdated' }),
}
