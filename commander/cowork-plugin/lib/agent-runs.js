/**
 * agent-runs.js — which agent-runs.jsonl rows are Claude Code's own
 * internal/background agents rather than dispatched subagents (CC-1383 / CC-2120).
 *
 * Those agents fire SubagentStop with an agent_id but no agent name or type,
 * and never fire SubagentStart. On Oct 26 2026 they were 56/57 (ai1), 47/51
 * (ai2), 384/423 (ai3) and 45/48 (ai4) of the stop rows, none with a start
 * row, while every named stop had one. Readers skip them so the roster,
 * activity feed and analytics are not flooded with "unknown" agents.
 *
 * agent-run-logger.js stamps `internal`: true when it scanned the whole start
 * log and found no record for the id, null when the log was too big to scan
 * fully (inconclusive), false otherwise. Older rows carry no flag and are
 * classified from the same facts, but only against a complete start log:
 * readers load a bounded tail (or may fail to read the file), and a missing id
 * in a cut-off or unread log proves nothing. When in doubt a row is kept.
 */

function isNamed(name) {
  return typeof name === 'string' && name.trim() !== '' && name !== 'unknown';
}

/** Set of agent_id values found in subagent-runs.jsonl records. */
export function startIdSet(starts) {
  const ids = new Set();
  for (const start of starts || []) {
    if (start && typeof start.agent_id === 'string' && start.agent_id) ids.add(start.agent_id);
  }
  return ids;
}

/**
 * @param startIds agent_ids from the start log the reader loaded (optional)
 * @param startsComplete false when that start log was cut off or unreadable
 */
export function isInternalAgentRun(stop, startIds, startsComplete = true) {
  if (!stop || typeof stop !== 'object') return false;
  if (stop.internal === false || stop.internal === null) return false;
  if (isNamed(stop.agent)) return false;
  if (typeof stop.agentId !== 'string' || !stop.agentId) return false;
  if (startIds && startIds.has(stop.agentId)) return false;
  if (stop.internal === true) return true;
  return Boolean(startIds) && startsComplete;
}

/**
 * agent-runs rows without the internal ones. `starts` are subagent-runs rows;
 * a reader that read only the tail of that file, or could not read it, sets
 * `starts.incomplete`. Anything that is not an array (e.g. a failed source
 * returning null) is an unknown start log.
 */
export function withoutInternalRuns(stops, starts) {
  const startIds = startIdSet(starts);
  const complete = Array.isArray(starts) && !starts.incomplete;
  return (stops || []).filter((stop) => !isInternalAgentRun(stop, startIds, complete));
}
