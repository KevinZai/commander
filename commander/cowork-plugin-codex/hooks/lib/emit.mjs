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

// hookSpecificOutput.hookEventName must name an event that accepts a
// hookSpecificOutput block; any other value gets the ENTIRE hook output
// rejected ("Hook JSON output validation failed"), which is how the
// PostCompact-class bug shipped (see post-compact-recovery.js).
// Source: docs/reference/platform-facts-2026-10.md §2.2 (Claude Code 2.1.296,
// verified 2026-10-13) — every event in its hookSpecificOutput table except the
// side-effect-only row (Setup, Notification, SessionEnd, PostCompact,
// InstructionsLoaded, StopFailure, CwdChanged, DirectoryAdded, FileChanged,
// WorktreeRemove). This guard only covers SET MEMBERSHIP — handlers still own
// passing the event they were actually invoked with, and the fields they put
// next to additionalContext must be ones that event accepts.
export const VALID_HOOKSPECIFIC_EVENTS = new Set([
  'PreToolUse',
  'PermissionRequest',
  'PermissionDenied',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'Stop',
  'SubagentStop',
  'SessionStart',
  'SubagentStart',
  'PostModelSwitch',
  'PreModelSwitch',
  'Elicitation',
  'ElicitationResult',
  'MessageDisplay',
  'WorktreeCreate',
  'TaskCreated',
  'TaskCompleted',
  'TeammateIdle',
  'PreCompact',
  'ConfigChange',
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

/**
 * Deny ONE PreToolUse call. The turn continues: Claude sees the reason and can
 * adjust, the user sees it too. `continue: false` would instead halt the whole
 * turn and never tell Claude why (code.claude.com/docs/en/hooks#pretooluse-decision-control).
 */
export function emitDeny(reason, extra = {}) {
  return {
    continue: true,
    suppressOutput: false,
    systemMessage: String(reason),
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: String(reason),
    },
    ...extra,
  };
}

/** Silent pass-through — nothing rendered, nothing injected. */
export function emitSilent(extra = {}) {
  return { continue: true, suppressOutput: true, ...extra };
}
