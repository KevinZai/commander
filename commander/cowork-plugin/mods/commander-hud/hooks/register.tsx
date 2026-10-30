import type { EngineInterface, Register } from 'claude-code'

import { EMPTY_HUD, countActive, parseCost, parseFable, parseUpdate, parts, sessionKey, summary, updateLabel } from './hud'
import type { Hud } from './hud'

// Observe-only: no tool.call/prompt hooks, no model calls, no network. Every
// read is a fixed file name under the lane's state dir, <config dir>/commander
// (CCC_CONFIG_DIR, then CLAUDE_CONFIG_DIR, then ~/.claude), where the hooks write.
const REFRESH_MS = 30_000
const HIDDEN_KEY = 'hidden'

// Module variables, not $.state: a hot reload starts them over and the next
// refresh refills them, so nothing here needs to survive one.
const live: {
  hud: Hud
  isHidden: boolean
  root: string | null
  legacyRoot: string | null
  seen: Map<string, { stamp: string; text: string | undefined }>
} = { hud: EMPTY_HUD, isHidden: false, root: null, legacyRoot: null, seen: new Map() }

// Re-reads a file only when its size or mtime moved; a missing or unreadable
// file (including one over the engine's 4 MiB read cap) reads as undefined.
async function readCached($: EngineInterface, name: string, root: string | null = live.root): Promise<string | undefined> {
  if (root === null) return undefined
  const path = `${root}/${name}`
  const stat = await $.fs.stat(path).catch(() => undefined)
  if (stat === undefined || stat.kind !== 'file') {
    live.seen.delete(path)
    return undefined
  }
  const stamp = `${stat.size}:${stat.mtimeMs}`
  const hit = live.seen.get(path)
  if (hit !== undefined && hit.stamp === stamp) return hit.text
  const text = await $.fs.read(path).then(
    value => (typeof value === 'string' ? value : undefined),
    () => undefined,
  )
  live.seen.set(path, { stamp, text })
  return text
}

async function refresh($: EngineInterface): Promise<void> {
  try {
    if (live.root === null) {
      const home = await $.env.get('HOME')
      if (home === undefined || home === '') return
      const legacy = `${home.replace(/\/+$/, '')}/.claude`
      const configDir = (await $.env.get('CCC_CONFIG_DIR')) || (await $.env.get('CLAUDE_CONFIG_DIR')) || legacy
      live.root = `${configDir.replace(/\/+$/, '')}/commander`
      live.legacyRoot = `${legacy}/commander`
    }
    const key = sessionKey(await $.env.get('CLAUDE_SESSION_ID'))
    const [state, starts, stops, cost, update, now] = await Promise.all([
      // state.json is user state: read the legacy copy until the lane has its own.
      readCached($, 'state.json').then(text =>
        text !== undefined || live.legacyRoot === live.root ? text : readCached($, 'state.json', live.legacyRoot)),
      readCached($, 'subagent-runs.jsonl'),
      readCached($, 'agent-runs.jsonl'),
      readCached($, `sessions/active-cost-${key}.json`),
      readCached($, 'update-nudge.json'),
      $.clock.now(),
    ])
    const next: Hud = {
      fable: parseFable(state),
      activeAgents: countActive(starts, stops, now),
      cost: parseCost(cost),
      update: parseUpdate(update),
    }
    if (JSON.stringify(next) !== JSON.stringify(live.hud)) {
      live.hud = next
      $.ui.invalidate('ui.render')
    }
  } catch {
    // Fail open: keep the last good snapshot.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      live.isHidden = (await $.store.get(HIDDEN_KEY)) === true
      await $.command.register({
        name: 'ccc-hud',
        description: 'Toggle the Commander HUD band and print its summary',
        argumentHint: '[on|off|status]',
        immediate: true,
      })
      await refresh($)
      $.clock.every(REFRESH_MS, () => void refresh($))
    } catch {
      // Fail open: the session starts whether or not the HUD does.
    }
    return next(e)
  })

  // Answers its own command: no Claude turn, nothing for the model to read.
  on('command.run', { command: 'ccc-hud' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    if (arg === 'off') live.isHidden = true
    else if (arg === 'on') live.isHidden = false
    else if (arg !== 'status') live.isHidden = !live.isHidden
    await $.store.set(HIDDEN_KEY, live.isHidden).catch(() => undefined)
    await refresh($)
    $.ui.invalidate('ui.render')
    return { text: summary(live.hud, live.isHidden) }
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (live.isHidden || e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const pill = updateLabel(live.hud)
    return (
      <Box flexDirection="row">
        <Text dimColor wrap="truncate">
          Commander · {parts(live.hud).join(' · ')}
        </Text>
        {pill !== null && (
          <Text color="warning">
            {' '}[{pill}]
          </Text>
        )}
      </Box>
    )
  })
}
