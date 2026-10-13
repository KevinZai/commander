import { expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, On, RenderElement } from 'claude-code'

import { HOME, NOW, SAMPLE } from './fixtures'

const PLUGIN = 'commander-hud'
const SURFACES = ['terminal', 'desktop'] as const
const ENGINE_BAND: RenderElement = { type: 'Text', children: ['engine band'] }

// What the prompt stamps on a typed `/ccc-hud`.
const typed = (args: string): CommandRunInput => ({
  command: 'ccc-hud',
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
})

const BAND = {
  plugin: PLUGIN,
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 9 }, view: {} },
} as const

// Answers $.fs from an in-memory map; a path not in it is missing.
const world = (on: On, files: Readonly<Record<string, string>>) => {
  mock.env(on, { HOME })
  mock.store(on)
  mock.clock(on, { now: NOW })
  on('fs.stat', ($, e) => {
    const text = files[e.path]
    if (text === undefined) throw new Error('ENOENT')
    return { value: { kind: 'file', size: text.length, mtimeMs: 1, isLink: false } }
  })
  on('fs.read', ($, e) => {
    const text = files[e.path]
    if (text === undefined) throw new Error('ENOENT')
    return { value: text }
  })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.render', () => ENGINE_BAND)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
}


test('renders with no telemetry files', async ($, on) => {
  world(on, {})
  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /Fable off/ })).toBeDefined()
    expect(await ui.find({ text: /agents? running/ })).toBeUndefined()
    expect(await ui.find({ text: /tool calls/ })).toBeUndefined()
    expect(await ui.find({ text: /update .* available/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('renders with sample telemetry files', async ($, on) => {
  world(on, SAMPLE)
  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /Fable armed/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 agent running/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /42 tool calls \(~\$0\.42 budget\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\[update 8\.0\.0 available\]/ })).toBeDefined()
    await ui.unmount()
  }
})

test('/ccc-hud toggles the band and prints the summary', async ($, on) => {
  world(on, SAMPLE)
  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })

  const hidden = await $.command.run(typed(''))
  expect(hidden.text).toMatch(/^Commander HUD hidden: Fable armed · 1 agent running · 42 tool calls/)
  const off = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await off.find({ text: /Commander ·/ })).toBeUndefined()
  expect(await off.find({ text: 'engine band' })).toBeDefined()
  await off.unmount()

  const shown = await $.command.run(typed('on'))
  expect(shown.text).toMatch(/^Commander HUD shown:/)
  const on2 = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await on2.find({ text: /Commander ·/ })).toBeDefined()
  await on2.unmount()

  const status = await $.command.run(typed('status'))
  expect(status.text).toMatch(/^Commander HUD shown:.*update 8\.0\.0 available$/)
})
