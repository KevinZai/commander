const AGENTS = [
  { name: 'Alfred', model: 'claude-sonnet-4-6', role: 'coordinator' },
  { name: 'Morpheus', model: 'claude-opus-4-6', role: 'architect' },
  { name: 'Neo', model: 'claude-sonnet-4-6', role: 'orchestrator' },
  { name: 'Codex', model: 'claude-sonnet-4-6', role: 'developer' },
  { name: 'Viper', model: 'claude-sonnet-4-6', role: 'trading' },
  { name: 'Jarvis', model: 'claude-sonnet-4-6', role: 'platform' },
  { name: 'Forge', model: 'claude-haiku-4-5', role: 'worker' },
  { name: 'Flare', model: 'claude-haiku-4-5', role: 'worker' },
];

const STATUSES = ['complete', 'complete', 'complete', 'complete', 'complete', 'failed', 'cancelled'];

const TASKS = [
  'Fix authentication middleware token refresh',
  'Implement WebSocket reconnection logic',
  'Refactor database query optimization layer',
  'Build landing page hero section with animations',
  'Review PR #142 — schema migration for v2',
  'Run E2E test suite for checkout flow',
  'Optimize image pipeline with sharp integration',
  'Deploy staging environment via GitHub Actions',
  'Implement rate limiting on API endpoints',
  'Debug memory leak in session manager',
  'Create OpenAPI spec for REST endpoints',
  'Add Stripe webhook handlers for subscriptions',
  'Migrate legacy CSS to Tailwind v4',
  'Implement RBAC permission system',
  'Set up monitoring with Prometheus metrics',
  'Build CSV export for analytics dashboard',
  'Implement search with full-text indexing',
  'Fix CORS configuration for multi-tenant setup',
  'Add Redis caching layer for hot paths',
  'Create data migration script for PostgreSQL',
  'Implement OAuth2 PKCE flow for mobile',
  'Build real-time notification system',
  'Refactor component library to use composition',
  'Set up CI/CD pipeline with test gates',
  'Implement audit logging for compliance',
  'Build admin dashboard with role-based views',
  'Fix timezone handling in scheduler module',
  'Optimize bundle size — remove unused deps',
  'Implement file upload with presigned URLs',
  'Add error boundary and fallback UI',
  'Create SDK for partner API integrations',
  'Build email template system with MJML',
  'Implement A/B testing framework hooks',
  'Fix race condition in concurrent writes',
  'Add health check endpoints for all services',
  'Implement graceful shutdown handlers',
  'Build feature flag system with remote config',
  'Refactor auth module to support SSO',
  'Create performance benchmarks for critical paths',
  'Implement data export in multiple formats',
];

const SKILLS = [
  'tdd-workflow', 'code-review', 'security-reviewer', 'planner',
  'architect', 'e2e-runner', 'build-fix', 'refactor-clean',
  'deploy', 'checkpoint', 'ccc-testing', 'ccc-devops',
];

function seededRandom(seed) {
  let s = seed;
  return function next() {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateSessionId(rng) {
  const chars = 'abcdef0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(rng() * chars.length)];
  }
  return `ses_${id}`;
}

/**
 * Generate realistic demo session history data.
 * Uses a seeded RNG for deterministic output across renders.
 *
 * @param {number} days - Number of days of history to generate.
 * @returns {Array<Object>} Array of session objects.
 */
export function generateDemoHistory(days = 90) {
  const rng = seededRandom(42);
  const sessions = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dayOfWeek = date.getDay();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseSessions = isWeekend ? 2 : 7;
    const variance = Math.floor(rng() * 5) - 1;
    const sessionsForDay = Math.max(0, baseSessions + variance);

    for (let s = 0; s < sessionsForDay; s++) {
      const hour = isWeekend
        ? 10 + Math.floor(rng() * 8)
        : 8 + Math.floor(rng() * 12);
      const minute = Math.floor(rng() * 60);

      const sessionDate = new Date(date);
      sessionDate.setHours(hour, minute, 0, 0);

      const agent = pickRandom(AGENTS, rng);
      const durationMinutes = 2 + Math.floor(rng() * 45);
      const toolCalls = 5 + Math.floor(rng() * 80);

      const costBase = agent.model.includes('opus') ? 0.15 : agent.model.includes('haiku') ? 0.01 : 0.05;
      const cost = costBase + rng() * costBase * durationMinutes * 0.1;

      const skillCount = 1 + Math.floor(rng() * 3);
      const usedSkills = [];
      for (let k = 0; k < skillCount; k++) {
        const skill = pickRandom(SKILLS, rng);
        if (!usedSkills.includes(skill)) {
          usedSkills.push(skill);
        }
      }

      sessions.push({
        id: generateSessionId(rng),
        date: sessionDate.toISOString(),
        agent: agent.name,
        model: agent.model,
        status: pickRandom(STATUSES, rng),
        cost: Math.round(cost * 10000) / 10000,
        duration: durationMinutes * 60,
        toolCalls,
        task: pickRandom(TASKS, rng),
        skills: usedSkills,
      });
    }
  }

  return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Generate heatmap grid data from session history.
 * Returns an array of { date, sessions, toolCalls, cost } for each day.
 *
 * @param {number} days - Number of days to generate.
 * @returns {Array<Object>} Heatmap data points.
 */
export function generateDemoHeatmap(days = 182) {
  const sessions = generateDemoHistory(days);
  const dayMap = new Map();

  for (const session of sessions) {
    const dayKey = session.date.slice(0, 10);
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { date: dayKey, sessions: 0, toolCalls: 0, cost: 0 });
    }
    const entry = dayMap.get(dayKey);
    dayMap.set(dayKey, {
      ...entry,
      sessions: entry.sessions + 1,
      toolCalls: entry.toolCalls + session.toolCalls,
      cost: Math.round((entry.cost + session.cost) * 10000) / 10000,
    });
  }

  const now = new Date();
  const result = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const key = date.toISOString().slice(0, 10);
    result.push(dayMap.get(key) || { date: key, sessions: 0, toolCalls: 0, cost: 0 });
  }

  return result.reverse();
}
