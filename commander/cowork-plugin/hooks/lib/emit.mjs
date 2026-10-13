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

// The harness validator accepts hookSpecificOutput.hookEventName ONLY from this
// exact 20-literal union (extracted from CLI 2.1.220's binary) — any other value
// gets the ENTIRE hook output rejected ("Hook JSON output validation failed"),
// which is how the PostCompact-class bug shipped (see post-compact-recovery.js).
// This guard only covers UNION MEMBERSHIP — it cannot know which specific event a
// hook is currently firing under; handlers still own passing the event they were
// actually invoked with (matching it exactly is on them, not this guard).
export const VALID_HOOKSPECIFIC_EVENTS = new Set([
  'PreToolUse',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'SessionStart',
  'Setup',
  'SubagentStart',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'Stop',
  'SubagentStop',
  'PermissionDenied',
  'Notification',
  'PermissionRequest',
  'Elicitation',
  'ElicitationResult',
  'CwdChanged',
  'FileChanged',
  'WorktreeCreate',
  'MessageDisplay',
]);

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
  if (!VALID_HOOKSPECIFIC_EVENTS.has(hookEventName)) {
    // Not a valid hookSpecificOutput.hookEventName — degrade to the emitSilent
    // shape rather than shipping output the harness will reject wholesale.
    return emitSilent(extra);
  }
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
  if (!VALID_HOOKSPECIFIC_EVENTS.has(hookEventName)) {
    // Not a valid hookSpecificOutput.hookEventName — degrade to the emitUser
    // shape (keep systemMessage, drop hookSpecificOutput) rather than shipping
    // output the harness will reject wholesale.
    return emitUser(message, extra);
  }
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
