/**
 * Structured error envelope for all Commander MCP tool responses.
 * Every error follows { ok: false, error: { code, message, suggestion, trace_id? } }.
 */

export type CommanderErrorCode =
  | "skill_not_found"
  | "agent_not_found"
  | "auth_required"
  | "rate_limited"
  | "invalid_param"
  | "not_configured"
  | "internal";

export type CommanderError = {
  ok: false;
  error: {
    code: CommanderErrorCode;
    message: string;
    suggestion: string;
    trace_id?: string;
  };
};

export function skillNotFound(name: string): CommanderError {
  return {
    ok: false,
    error: {
      code: "skill_not_found",
      message: `Skill '${name}' not found in the Commander catalog.`,
      suggestion: "Use commander_list_skills to browse available skills, or commander_search to find by keyword.",
    },
  };
}

export function agentNotFound(name: string): CommanderError {
  return {
    ok: false,
    error: {
      code: "agent_not_found",
      message: `Agent '${name}' not found in the Commander catalog.`,
      suggestion: "Use commander_list_agents to see available agents (e.g. reviewer, builder, researcher).",
    },
  };
}

export function invalidParam(param: string, detail: string): CommanderError {
  return {
    ok: false,
    error: {
      code: "invalid_param",
      message: `Invalid parameter '${param}': ${detail}`,
      suggestion: "Check the tool's inputSchema for required types and allowed values.",
    },
  };
}

export function notConfigured(feature: string, setupUrl: string): CommanderError {
  return {
    ok: false,
    error: {
      code: "not_configured",
      message: `${feature} is not configured.`,
      suggestion: `Set up via /ccc-connect or visit ${setupUrl}`,
    },
  };
}

export function internalError(traceId: string, detail?: string): CommanderError {
  return {
    ok: false,
    error: {
      code: "internal",
      message: detail ?? "An unexpected error occurred.",
      suggestion: "Open a GitHub issue at https://github.com/KevinZai/commander/issues and include the trace_id.",
      trace_id: traceId,
    },
  };
}
