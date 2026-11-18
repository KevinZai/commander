#!/usr/bin/env node
// refresh-stats.mjs — aggregate opt-in telemetry into docs/stats.json.
//
// Runs daily in .github/workflows/refresh-stats.yml with POSTHOG_PERSONAL_KEY.
// Without the key it writes a zero-state file. Every figure is an aggregate
// count; no device id, prompt, path or code ever lands in the file.
//
// Activation (the 90-day leading signal) is reported as UNAVAILABLE. The
// plugin sends its once-per-install `first_result` event (lib/activation.mjs)
// to the hosted /v1/events endpoint, which only bumps a process-local counter
// and discards the event (apps/mcp-server-cloud/src/routes/events.ts). Nothing
// reaches PostHog, so a query here would always read zero. activation carries
// null figures and a reason until a retained, privacy-compatible aggregate
// exists (an open decision for Kevin). The north-star figure,
// weekly_active_installs, is distinct installs with any session start in the
// last 7 days, computed from the session events the clients already send.

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POSTHOG_PROJECT_ID = '386617';
const STATS_FILE = path.join(__dirname, '../docs/stats.json');

// A session start: the CLI and plugin session events, or a SessionStart hook fire.
const SESSION_WHERE = "(event IN ('cli_session_started', 'plugin_session_started') OR (event = 'hook_fired' AND properties.hook = 'SessionStart'))";

export const METRICS = {
  hook_fires: "SELECT count() FROM events WHERE event = 'hook_fired' AND timestamp >= now() - INTERVAL 30 DAY",
  sessions: "SELECT count(DISTINCT properties.session_id) FROM events WHERE event IN ('cli_session_started', 'plugin_session_started') AND timestamp >= now() - INTERVAL 30 DAY",
  agents_dispatched: "SELECT count() FROM events WHERE event = 'agent_dispatched' AND timestamp >= now() - INTERVAL 30 DAY",
  skill_invocations: "SELECT count() FROM events WHERE event IN ('skill_invoked', 'cli_skill_invoked') AND timestamp >= now() - INTERVAL 30 DAY",
  mcp_tool_calls: "SELECT count() FROM events WHERE event = 'mcp_tool_called' AND timestamp >= now() - INTERVAL 30 DAY",
};

export const ACTIVATION_METRICS = {
  weekly_active_installs: `SELECT count(DISTINCT distinct_id) FROM events WHERE ${SESSION_WHERE} AND timestamp >= now() - INTERVAL 7 DAY`,
};

export const ACTIVATION_UNAVAILABLE_REASON =
  'first_result goes to the hosted /v1/events endpoint, which keeps only a process-local counter and discards the event; no retained aggregate exists for this report to read.';

function posthogQuery(apiKey) {
  return async function query(hql) {
    const response = await fetch(`https://us.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hql } }),
    });
    if (!response.ok) {
      console.error(`PostHog API error: ${response.status} ${response.statusText}`);
      console.error('Response:', await response.text());
      return null;
    }
    return response.json();
  };
}

/** First cell of the first row as a number, or null when the query gave nothing usable. */
async function scalar(query, hql) {
  try {
    const result = await query(hql);
    const cell = result && result.results && result.results[0] ? result.results[0][0] : null;
    const n = typeof cell === 'number' ? cell : Number(cell);
    return cell !== null && cell !== undefined && Number.isFinite(n) ? n : null;
  } catch (err) {
    console.error('Query failed:', err.message);
    return null;
  }
}

async function getCounts(query, metrics) {
  const out = {};
  for (const [key, hql] of Object.entries(metrics)) {
    const n = await scalar(query, hql);
    out[key] = n === null ? 0 : Math.floor(n);
  }
  return out;
}

function mergeTopItems(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const item of list || []) map.set(item.name, (map.get(item.name) || 0) + item.count);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

async function getTopItems(query, events, propertyKey, limit = 5) {
  const eventList = Array.isArray(events) ? events : [events];
  const eventClause = eventList.map((e) => `'${e}'`).join(', ');
  const hql = `SELECT ${propertyKey} as name, count() as count FROM events WHERE event IN (${eventClause}) AND ${propertyKey} IS NOT NULL AND timestamp >= now() - INTERVAL 30 DAY GROUP BY ${propertyKey} ORDER BY count DESC LIMIT ${limit}`;
  try {
    const result = await query(hql);
    if (result && result.results && result.results.length > 0) {
      return result.results.map((row) => ({ name: row[0] || 'Unknown', count: typeof row[1] === 'number' ? Math.floor(row[1]) : 0 }));
    }
  } catch (err) {
    console.error(`Error querying top ${eventClause}:`, err.message);
  }
  return [];
}

/**
 * Activation block. Every figure is null and `reason` says why: there is no
 * retained first_result aggregate to read (see the header). A zero here would
 * read as "nobody activated", which the data cannot support.
 */
export function buildActivation() {
  return {
    available: false,
    reason: ACTIVATION_UNAVAILABLE_REASON,
    window_days: 30,
    installs: null,
    first_results: null,
    rate: null,
    median_seconds_to_first_result: null,
    by_skill: null,
  };
}

export function emptyStats(note) {
  return {
    generated_at: new Date().toISOString(),
    totals: { hook_fires: 0, sessions: 0, agents_dispatched: 0, skill_invocations: 0, mcp_tool_calls: 0 },
    weekly_active_installs: 0,
    activation: buildActivation(),
    top_skills: [],
    top_agents: [],
    top_hooks: [],
    sessions_last_7d: 0,
    note,
  };
}

/** Full stats object from a HogQL query function (injected for tests). */
export async function collectStats(query) {
  const totals = await getCounts(query, METRICS);
  const raw = {};
  for (const [key, hql] of Object.entries(ACTIVATION_METRICS)) raw[key] = await scalar(query, hql);
  const topSkillsById = await getTopItems(query, ['skill_invoked', 'cli_skill_invoked'], 'properties.skill_id');
  const topSkillsByName = await getTopItems(query, ['skill_invoked', 'cli_skill_invoked'], 'properties.skill_name');
  return {
    generated_at: new Date().toISOString(),
    totals,
    weekly_active_installs: raw.weekly_active_installs === null ? 0 : Math.floor(raw.weekly_active_installs),
    activation: buildActivation(),
    top_skills: mergeTopItems(topSkillsById, topSkillsByName).slice(0, 5),
    top_agents: await getTopItems(query, ['agent_dispatched', 'cli_agent_dispatched'], 'properties.agent_id'),
    top_hooks: await getTopItems(query, 'hook_fired', 'properties.hook'),
    sessions_last_7d: totals.sessions, // For now, use 30d as proxy
    note: 'Aggregate opt-in telemetry updated daily. Zero prompts, zero code, zero secrets — just event counts. Activation is not reported yet: no retained first_result aggregate exists.',
  };
}

/** One-line summary for the job log. */
export function summarize(stats) {
  const a = stats.activation;
  const activation = a && a.available !== false && a.rate !== null
    ? `${a.first_results}/${a.installs} installs (${(a.rate * 100).toFixed(1)}%)`
    : 'unavailable';
  return `weekly active installs ${stats.weekly_active_installs} · activation ${activation} · hook fires ${stats.totals.hook_fires} · skill invocations ${stats.totals.skill_invocations}`;
}

async function main() {
  console.log('Refreshing stats...');
  const apiKey = process.env.POSTHOG_PERSONAL_KEY;
  if (!apiKey) {
    console.error('POSTHOG_PERSONAL_KEY environment variable not set. Skipping stats refresh.');
    fs.writeFileSync(STATS_FILE, JSON.stringify(emptyStats('Aggregating telemetry data. Numbers will start showing as plugin adoption grows.'), null, 2));
    console.log('Wrote empty stats (API key not available)');
    return;
  }
  try {
    const stats = await collectStats(posthogQuery(apiKey));
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    console.log('✓ Stats refreshed:', summarize(stats));
  } catch (err) {
    console.error('Fatal error refreshing stats:', err.message);
    fs.writeFileSync(STATS_FILE, JSON.stringify(emptyStats('Telemetry refresh encountered an issue. Last successful update pending.'), null, 2));
    console.log('Wrote fallback stats due to error');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
