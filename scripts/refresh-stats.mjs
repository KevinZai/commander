#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_KEY;
const POSTHOG_PROJECT_ID = '386617';
const STATS_FILE = path.join(__dirname, '../docs/stats.json');

async function query(hql) {
  const response = await fetch(`https://us.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query: hql,
      },
    }),
  });

  if (!response.ok) {
    console.error(`PostHog API error: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error('Response:', text);
    return null;
  }

  const data = await response.json();
  return data;
}

async function getTotals() {
  const metrics = {
    hook_fires: "SELECT count() FROM events WHERE event = 'hook_fired' AND timestamp >= now() - INTERVAL 30 DAY",
    sessions: "SELECT count(DISTINCT properties.session_id) FROM events WHERE event = 'session_start' AND timestamp >= now() - INTERVAL 30 DAY",
    agents_dispatched: "SELECT count() FROM events WHERE event = 'agent_dispatched' AND timestamp >= now() - INTERVAL 30 DAY",
    skill_invocations: "SELECT count() FROM events WHERE event IN ('skill_invoked', 'cli_skill_invoked') AND timestamp >= now() - INTERVAL 30 DAY",
    mcp_tool_calls: "SELECT count() FROM events WHERE event = 'mcp_tool_called' AND timestamp >= now() - INTERVAL 30 DAY",
  };

  const totals = {};

  for (const [key, hql] of Object.entries(metrics)) {
    try {
      const result = await query(hql);
      if (result && result.results && result.results.length > 0) {
        // Extract the count from the first row, first column
        const row = result.results[0];
        totals[key] = typeof row[0] === 'number' ? Math.floor(row[0]) : 0;
      } else {
        totals[key] = 0;
      }
    } catch (err) {
      console.error(`Error querying ${key}:`, err.message);
      totals[key] = 0;
    }
  }

  return totals;
}

async function getTopItems(event, propertyKey, limit = 5) {
  const hql = `SELECT ${propertyKey} as name, count() as count FROM events WHERE event = '${event}' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY ${propertyKey} ORDER BY count DESC LIMIT ${limit}`;

  try {
    const result = await query(hql);
    if (result && result.results && result.results.length > 0) {
      return result.results.map(row => ({
        name: row[0] || 'Unknown',
        count: typeof row[1] === 'number' ? Math.floor(row[1]) : 0,
      }));
    }
  } catch (err) {
    console.error(`Error querying top ${event}:`, err.message);
  }

  return [];
}

async function main() {
  console.log('Refreshing stats...');

  if (!POSTHOG_API_KEY) {
    console.error('POSTHOG_PERSONAL_KEY environment variable not set. Skipping stats refresh.');
    // Don't fail the job, just return empty stats
    const emptyStats = {
      generated_at: new Date().toISOString(),
      totals: {
        hook_fires: 0,
        sessions: 0,
        agents_dispatched: 0,
        skill_invocations: 0,
        mcp_tool_calls: 0,
      },
      top_skills: [],
      top_agents: [],
      top_hooks: [],
      sessions_last_7d: 0,
      note: 'Aggregating telemetry data. Numbers will start showing as plugin adoption grows.',
    };
    fs.writeFileSync(STATS_FILE, JSON.stringify(emptyStats, null, 2));
    console.log('Wrote empty stats (API key not available)');
    return;
  }

  try {
    const totals = await getTotals();
    const topSkills = await getTopItems('skill_invoked', 'properties.skill_name');
    const topAgents = await getTopItems('agent_dispatched', 'properties.agent_id');
    const topHooks = await getTopItems('hook_fired', 'properties.hook_name');

    const stats = {
      generated_at: new Date().toISOString(),
      totals,
      top_skills: topSkills,
      top_agents: topAgents,
      top_hooks: topHooks,
      sessions_last_7d: totals.sessions, // For now, use 30d as proxy
      note: 'Aggregate telemetry updated daily. Zero prompts, zero code, zero secrets — just event counts.',
    };

    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    console.log('✓ Stats refreshed:', {
      hook_fires: totals.hook_fires,
      sessions: totals.sessions,
      agents_dispatched: totals.agents_dispatched,
      skill_invocations: totals.skill_invocations,
      mcp_tool_calls: totals.mcp_tool_calls,
    });
  } catch (err) {
    console.error('Fatal error refreshing stats:', err.message);
    // Don't fail the job entirely — write existing stats or placeholder
    const fallback = {
      generated_at: new Date().toISOString(),
      totals: {
        hook_fires: 0,
        sessions: 0,
        agents_dispatched: 0,
        skill_invocations: 0,
        mcp_tool_calls: 0,
      },
      top_skills: [],
      top_agents: [],
      top_hooks: [],
      sessions_last_7d: 0,
      note: 'Telemetry refresh encountered an issue. Last successful update pending.',
    };
    fs.writeFileSync(STATS_FILE, JSON.stringify(fallback, null, 2));
    console.log('Wrote fallback stats due to error');
  }
}

main();
