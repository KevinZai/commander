/**
 * emit.mjs — the single place the CCC hook output contract lives.
 *
 * Claude Code's hook schema documents exactly two delivery channels:
 *   1. `systemMessage`        — rendered to the USER in the transcript
 *   2. `hookSpecificOutput.additionalContext` — injected into the MODEL's context
 *
 * Undocumented top-level keys (`status`, `output`, …) are stripped by the
 * harness and never render anywhere. Every CCC hook that wants to say
 * something MUST route through these helpers — enforced by
 * commander/tests/hook-output-contract.test.js.
 */

/** Message for the USER (transcript). */
export function emitUser(message, extra = {}) {
  return {
    continue: true,
    suppressOutput: false,
    systemMessage: String(message),
    ...extra,
  };
}

/** Context for the MODEL (invisible to the user). */
export function emitModel(hookEventName, additionalContext, extra = {}) {
  return {
    continue: true,
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName,
      additionalContext: String(additionalContext),
    },
    ...extra,
  };
}

/** Same content on both channels (user sees it AND the model can act on it). */
export function emitBoth(hookEventName, message, modelContext, extra = {}) {
  return {
    continue: true,
    suppressOutput: false,
    systemMessage: String(message),
    hookSpecificOutput: {
      hookEventName,
      additionalContext: String(modelContext ?? message),
    },
    ...extra,
  };
}

/** Silent pass-through — nothing rendered, nothing injected. */
export function emitSilent(extra = {}) {
  return { continue: true, suppressOutput: true, ...extra };
}
