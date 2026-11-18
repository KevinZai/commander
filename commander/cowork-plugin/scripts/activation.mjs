#!/usr/bin/env node
// activation.mjs — first-run state and the once-only first_result signal.
//
//   node activation.mjs detect [--stamp]          first-run check (JSON); --stamp records firstRunAt once
//   node activation.mjs complete                  mark onboarding complete
//   node activation.mjs first-result <skill> [--via <skill>]
//                                                 record the first finished result once; sends the
//                                                 first_result event only when telemetry is opted in
//
// Prints one JSON line. Exit 0 on success, 1 on a usage or write error. Never
// prints anything that identifies the user or the project.

import { detectFirstRun, markOnboardingComplete, recordFirstResult, FLAGSHIPS } from '../lib/activation.mjs';

function print(obj, code = 0) {
  process.stdout.write(JSON.stringify(obj) + '\n');
  process.exitCode = code;
}

async function main([cmd, ...args]) {
  try {
    if (cmd === 'detect') return print(detectFirstRun({ stamp: args.includes('--stamp') }));
    if (cmd === 'complete') {
      markOnboardingComplete();
      return print({ ok: true, message: 'onboarding marked complete' });
    }
    if (cmd === 'first-result') {
      const skill = args[0];
      if (!FLAGSHIPS.includes(skill)) return print({ ok: false, error: `skill must be one of ${FLAGSHIPS.join(', ')}` }, 1);
      const i = args.indexOf('--via');
      const r = await recordFirstResult(skill, { via: i >= 0 ? args[i + 1] : null });
      return print({ ok: true, recorded: r.recorded, sent: r.sent, skill: r.skill });
    }
    return print({ ok: false, error: 'usage: activation.mjs detect [--stamp] | complete | first-result <skill> [--via <skill>]' }, 1);
  } catch (e) {
    return print({ ok: false, error: e.message }, 1);
  }
}

main(process.argv.slice(2));
