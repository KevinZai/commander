#!/usr/bin/env node
/**
 * voice-injector.js
 * Hook: SessionStart (via the session-start orchestrator handler list)
 *
 * Opt-in (CC-2112): injects a ~20-line condensation of the CCC PM-consultant
 * voice — the semantic emoji palette + the "🟢 my call" convention — as
 * additionalContext for the MODEL. Off by default: it costs ~370 tokens every
 * session and overrides users' own style rules. Full doctrine:
 * rules/common/response-style.md.
 *
 * Enable with CCC_VOICE=1, or "voice": true in ~/.claude/commander/config.json
 * (the lane's config dir). CCC_VOICE_DISABLE=1 or CCC_VOICE=0 always wins.
 * Always fail-open.
 */
import { emitModel } from './lib/emit.mjs';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { readablePath } from '../lib/lane-state.js';

const VOICE_CONTEXT = [
  'CC Commander voice (condensed from rules/common/response-style.md):',
  '- Decisive with visible reasoning: every recommendation ends with "🟢 My call: X" + one-line rationale.',
  '- Structured > prose: tables when listing 3+ things, rank badges (🥇🥈🥉) when ranking, bullets over paragraphs.',
  '- Emoji are semantic anchors, not decoration. Fixed palette:',
  '  🎯 focus · 💡 idea · 🚀 launch · 📊 data · 💰 money',
  '  ✅ done · ❌ fail · 🔄 running · ⏭️ next · ⏳ waiting · 🔒 locked',
  '  🟢 approve · 🟡 caution · 🔴 block · ⚠️ warning · 🎉 win',
  '  🏗️ architecture · 🔧 fix · 🧪 test · 📝 note · 🎨 design · 🔐 security',
  '  🤖 agent · 🔬 research · 🧠 model · 📦 package · 🌐 web · ⌨️ cli',
  '- Multi-option decisions: show A/B/C with pros/cons — one MUST carry the 🟢 recommendation.',
  '- Push back with teeth: if an idea would hurt the product, say so and propose an alternative.',
  '- Lead with the answer; detail below. No saccharine openers ("Excellent question!").',
  '- Uncertainty: use a confidence meter (🎯 87%) — never fake certainty.',
  '- Adjacent improvements: flag as "💡 IDEA:" — do not execute inline (scope discipline).',
  '- End substantive responses with a concrete next step or 💡 idea, not "let me know".',
  '- When offering 2+ choices, use AskUserQuestion chips — never "Reply A/B/C" text lists.',
].join('\n');

/** True only when the user opted in via CCC_VOICE=1 or config `voice: true`. */
export function voiceEnabled(env = process.env) {
  if (env.CCC_VOICE_DISABLE === '1' || env.CCC_VOICE === '0') return false;
  if (env.CCC_VOICE === '1') return true;
  try {
    return JSON.parse(readFileSync(readablePath('config.json', env), 'utf8')).voice === true;
  } catch {
    return false;
  }
}

/**
 * Pure-function entry for orchestrator (CC-414).
 */
export async function run({ input = {}, env = process.env } = {}) {
  try {
    if (!voiceEnabled(env)) return { continue: true };
    const hookEventName = input.hook_event_name || 'SessionStart';
    return emitModel(hookEventName, VOICE_CONTEXT);
  } catch {
    return { continue: true };
  }
}

// Standalone CLI tail — dual-mode like stale-claude-md-nudge.js.
const isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();

if (isMain) {
  (async () => {
    let input = {};
    try {
      let raw = '';
      for await (const chunk of process.stdin) raw += chunk;
      if (raw.trim()) input = JSON.parse(raw);
    } catch { input = {}; }
    try {
      const result = await run({ input });
      process.stdout.write(JSON.stringify(result) + '\n');
    } catch {
      process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    }
    process.exit(0);
  })();
}
