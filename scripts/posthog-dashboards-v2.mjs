#!/usr/bin/env node

/**
 * Create 3 PostHog dashboards for CC Commander plugin telemetry
 * Using HogQL query format (newer API)
 * Linear: CC-705
 */

const API_KEY = process.env.POSTHOG_PERSONAL_KEY || '';
const PROJECT_ID = '386617';
const BASE_URL = 'https://us.posthog.com/api';

async function posthogApi(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PostHog API error ${response.status}: ${text}`);
  }
  return response.json();
}

async function createDashboard(name, description) {
  console.log(`\n📊 Creating dashboard: "${name}"`);
  const result = await posthogApi(
    `/projects/${PROJECT_ID}/dashboards/`,
    'POST',
    { name, description }
  );
  console.log(`   ✅ Dashboard ID: ${result.id}`);
  return result.id;
}

async function createInsightHogQL(name, dashboardId, hogqlQuery, displayType = 'ActionsTable') {
  console.log(`   📈 Creating insight: "${name}"`);
  const result = await posthogApi(
    `/projects/${PROJECT_ID}/insights/`,
    'POST',
    {
      name,
      query: {
        kind: 'HogQLQuery',
        query: hogqlQuery,
      },
      dashboards: [dashboardId],
      saved: true,
    }
  );
  console.log(`      ✅ Insight ID: ${result.id}`);
  return result.id;
}

async function createHookCoverageDashboard() {
  const dashboardId = await createDashboard(
    'Plugin Hook Coverage',
    'Which lifecycle hooks fire most often. Helps prioritize hook-related improvements.'
  );

  // Insight 1: Hooks by count
  await createInsightHogQL(
    'Hook Fired Events (30d)',
    dashboardId,
    `SELECT properties.hook AS hook, count() AS count
     FROM events
     WHERE event = 'hook_fired'
     AND timestamp >= now() - INTERVAL 30 DAY
     GROUP BY hook
     ORDER BY count DESC`
  );

  // Insight 2: Handlers by count
  await createInsightHogQL(
    'Hook Handlers (30d)',
    dashboardId,
    `SELECT properties.handler AS handler, count() AS count
     FROM events
     WHERE event = 'hook_fired'
     AND timestamp >= now() - INTERVAL 30 DAY
     GROUP BY handler
     ORDER BY count DESC`
  );

  // Insight 3: Total hook fires
  await createInsightHogQL(
    'Total Hook Fires (30d)',
    dashboardId,
    `SELECT count() AS total
     FROM events
     WHERE event = 'hook_fired'
     AND timestamp >= now() - INTERVAL 30 DAY`
  );

  return dashboardId;
}

async function createTopSkillsDashboard() {
  const dashboardId = await createDashboard(
    'Top Skills (last 30 days)',
    'Which skills get invoked most often. Drives v4.2 prioritization.'
  );

  // Insight 1: Top 20 skills
  await createInsightHogQL(
    'Top 20 Skills by Invocation (30d)',
    dashboardId,
    `SELECT properties.skill_id AS skill_id, count() AS count
     FROM events
     WHERE (event = 'skill_invoked' OR event = 'cli_skill_invoked')
     AND timestamp >= now() - INTERVAL 30 DAY
     GROUP BY skill_id
     ORDER BY count DESC
     LIMIT 20`
  );

  // Insight 2: Skills by surface
  await createInsightHogQL(
    'Skills by Surface (30d)',
    dashboardId,
    `SELECT properties.surface AS surface, count() AS count
     FROM events
     WHERE event = 'skill_invoked'
     AND timestamp >= now() - INTERVAL 30 DAY
     GROUP BY surface
     ORDER BY count DESC`
  );

  // Insight 3: Daily timeline
  await createInsightHogQL(
    'Daily Skill Invocations (30d)',
    dashboardId,
    `SELECT toStartOfDay(timestamp) AS day, count() AS count
     FROM events
     WHERE (event = 'skill_invoked' OR event = 'cli_skill_invoked')
     AND timestamp >= now() - INTERVAL 30 DAY
     GROUP BY day
     ORDER BY day DESC`
  );

  return dashboardId;
}

async function createTopAgentsDashboard() {
  const dashboardId = await createDashboard(
    'Top Agents (last 30 days)',
    'Which specialist agents dispatched most often. Helps refine agent personas.'
  );

  // Insight 1: Top 22 agents
  await createInsightHogQL(
    'Top 22 Agents by Dispatch (30d)',
    dashboardId,
    `SELECT properties.agent_id AS agent_id, count() AS count
     FROM events
     WHERE (event = 'agent_dispatched' OR event = 'cli_agent_dispatched')
     AND timestamp >= now() - INTERVAL 30 DAY
     GROUP BY agent_id
     ORDER BY count DESC
     LIMIT 22`
  );

  // Insight 2: Agents by model
  await createInsightHogQL(
    'Dispatches by Model (30d)',
    dashboardId,
    `SELECT properties.model AS model, count() AS count
     FROM events
     WHERE (event = 'agent_dispatched' OR event = 'cli_agent_dispatched')
     AND timestamp >= now() - INTERVAL 30 DAY
     GROUP BY model
     ORDER BY count DESC`
  );

  // Insight 3: Total dispatches
  await createInsightHogQL(
    'Total Agent Dispatches (30d)',
    dashboardId,
    `SELECT count() AS total
     FROM events
     WHERE (event = 'agent_dispatched' OR event = 'cli_agent_dispatched')
     AND timestamp >= now() - INTERVAL 30 DAY`
  );

  return dashboardId;
}

async function main() {
  console.log('🚀 CC Commander PostHog Dashboards Creator (HogQL)');
  console.log(`   Project ID: ${PROJECT_ID}`);
  console.log(`   API: ${BASE_URL}\n`);

  try {
    const dashboard1 = await createHookCoverageDashboard();
    const dashboard2 = await createTopSkillsDashboard();
    const dashboard3 = await createTopAgentsDashboard();

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL DASHBOARDS CREATED');
    console.log('='.repeat(70));
    console.log(`\n📊 Dashboard Summary:\n`);
    console.log(`1️⃣  Plugin Hook Coverage`);
    console.log(`   ID: ${dashboard1}`);
    console.log(`   URL: https://us.posthog.com/project/${PROJECT_ID}/dashboard/${dashboard1}`);
    console.log(`   Insights: 3 (hooks, handlers, total count)\n`);

    console.log(`2️⃣  Top Skills (last 30 days)`);
    console.log(`   ID: ${dashboard2}`);
    console.log(`   URL: https://us.posthog.com/project/${PROJECT_ID}/dashboard/${dashboard2}`);
    console.log(`   Insights: 3 (top 20, by surface, daily timeline)\n`);

    console.log(`3️⃣  Top Agents (last 30 days)`);
    console.log(`   ID: ${dashboard3}`);
    console.log(`   URL: https://us.posthog.com/project/${PROJECT_ID}/dashboard/${dashboard3}`);
    console.log(`   Insights: 3 (top 22, by model, total count)\n`);

    console.log('='.repeat(70));
    console.log(`Total: 3 dashboards, 9 insights\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
