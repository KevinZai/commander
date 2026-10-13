// Pure parsing and formatting for the Commander HUD. No `$` here, so the
// tests can exercise every branch without an engine.

export type Hud = {
  fable: 'armed' | 'off'
  activeAgents: number | null
  cost: { toolCalls: number; estimate: number } | null
  update: { installed: string | null; latest: string } | null
}

export const EMPTY_HUD: Hud = { fable: 'off', activeAgents: null, cost: null, update: null }

// Same window mission-control-snapshot.js uses: a start record older than this
// with no matching stop is "stale", not running.
export const RUNNING_WINDOW_MS = 6 * 60 * 60 * 1000

const parseJson = (text: string | undefined): unknown => {
  if (text === undefined) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// state.json carries no Fable flag today; /ccc-fable is expected to write
// `fableMethod: { armed }` (or a flat `fableArmed`). Anything else reads "off".
export const parseFable = (text: string | undefined): Hud['fable'] => {
  const state = parseJson(text)
  if (!isRecord(state)) return 'off'
  const nested = isRecord(state.fableMethod) ? state.fableMethod.armed : undefined
  return nested === true || state.fableArmed === true ? 'armed' : 'off'
}

const jsonl = (text: string | undefined): Record<string, unknown>[] =>
  (text ?? '')
    .split('\n')
    .map(line => parseJson(line.trim() || undefined))
    .filter(isRecord)

// Starts come from subagent-runs.jsonl (`agent_id`), stops from
// agent-runs.jsonl (`agentId`). Running = a start inside the window with no stop.
export const countActive = (
  startsText: string | undefined,
  stopsText: string | undefined,
  nowMs: number,
): number | null => {
  if (startsText === undefined) return null
  const stopped = new Set(
    jsonl(stopsText)
      .map(row => row.agentId)
      .filter((id): id is string => typeof id === 'string'),
  )
  const running = new Set<string>()
  for (const row of jsonl(startsText)) {
    const id = row.agent_id
    const ts = typeof row.ts === 'string' ? Date.parse(row.ts) : NaN
    if (typeof id !== 'string' || stopped.has(id) || !Number.isFinite(ts)) continue
    if (nowMs - ts <= RUNNING_WINDOW_MS) running.add(id)
  }
  return running.size
}

// cost-tracker.js counts tool calls and prices them at a $0.01 budget unit;
// it is an activity metric, not real spend, and the HUD labels it so.
export const parseCost = (text: string | undefined): Hud['cost'] => {
  const data = parseJson(text)
  if (!isRecord(data) || typeof data.toolCalls !== 'number') return null
  const estimate = typeof data.estimatedCost === 'number' ? data.estimatedCost : data.toolCalls * 0.01
  return { toolCalls: data.toolCalls, estimate }
}

export const parseUpdate = (text: string | undefined): Hud['update'] => {
  const data = parseJson(text)
  if (!isRecord(data) || data.outdated !== true || typeof data.latest !== 'string') return null
  return { installed: typeof data.installed === 'string' ? data.installed : null, latest: data.latest }
}

// Mirrors cost-tracker.js's SESSION_KEY so both name the same file.
export const sessionKey = (raw: string | undefined): string =>
  (raw || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default'

export const parts = (hud: Hud): string[] => {
  const out = [`Fable ${hud.fable}`]
  if (hud.activeAgents !== null) out.push(`${hud.activeAgents} agent${hud.activeAgents === 1 ? '' : 's'} running`)
  if (hud.cost !== null) out.push(`${hud.cost.toolCalls} tool calls (~$${hud.cost.estimate.toFixed(2)} budget)`)
  return out
}

export const updateLabel = (hud: Hud): string | null =>
  hud.update === null ? null : `update ${hud.update.latest} available`

export const summary = (hud: Hud, isHidden: boolean): string => {
  const line = [...parts(hud), updateLabel(hud)].filter(Boolean).join(' · ')
  return `Commander HUD ${isHidden ? 'hidden' : 'shown'}: ${line}`
}
