/**
 * confidence.mjs — shared suggestion-confidence engine.
 *
 * Consumed by suggest-lightweight.js (Stop renderer) and suggest-ticker.js
 * (UserPromptSubmit → model bridge). Pure function of the project-state
 * object written by suggest-ticker.js — no I/O.
 */

export function computeConfidence(state) {
  const suggestions = [];
  let confidence = 0.4; // baseline: no clear signal

  const ahead = state.aheadMain ?? state.ahead ?? 0;
  const behind = state.behindMain ?? state.behind ?? 0;
  const tests = state.testsStatus ?? state.tests ?? 'unknown';
  const lastSkill = state.lastRecommendation?.skill ?? state.lastSkill ?? '';
  const blockers = Array.isArray(state.blockers)
    ? state.blockers.length
    : (state.securityAlerts ?? 0) + (state.lintStatus === 'failing' ? 1 : 0) + (state.lintErrors > 10 ? 1 : 0);
  const openTodos = state.openTodos ?? 0;
  const ciStatus = state.ciStatus ?? 'unknown';

  // Tier 1 signals
  if (ahead >= 2 && (tests === 'green' || tests === 'passing')) {
    confidence = 0.9;
    suggestions.push({ skill: '/ccc-ship', reason: 'branch ahead by ≥2 commits and tests are green' });
  }

  if (tests === 'failing' && confidence < 0.9) {
    confidence = Math.max(confidence, 0.88);
    suggestions.push({ skill: '/ccc-testing', reason: 'last test run failed — fix before adding features' });
  }

  if (behind > 0 && confidence < 0.86) {
    confidence = Math.max(confidence, 0.85);
    suggestions.push({ skill: '/ccc-review', reason: 'branch is behind main — sync before adding features' });
  }

  if (blockers > 0 && confidence < 0.86) {
    confidence = Math.max(confidence, 0.85);
    suggestions.push({ skill: '/ccc-doctor', reason: `${blockers} open blocker(s) detected — investigate first` });
  }

  if (ciStatus === 'failing' && confidence < 0.86) {
    confidence = Math.max(confidence, 0.85);
    suggestions.push({ skill: '/ccc-review', reason: 'CI is failing — review and fix before shipping' });
  }

  // CLAUDE.md coverage (ambient onboarding — ties into /ccc-adopt)
  if (state.hasClaudeMd === false && confidence < 0.86) {
    confidence = Math.max(confidence, 0.85);
    suggestions.push({ skill: '/ccc-adopt', reason: 'no CLAUDE.md — generate one tuned to your stack (asks first)' });
  }

  // Pipeline progression heuristic
  if (confidence < 0.86 && lastSkill) {
    const pipeline = ['/ccc-plan', '/ccc-build', '/ccc-review', '/ccc-ship'];
    const idx = pipeline.findIndex(s => lastSkill.includes(s.replace('/', '')));
    if (idx !== -1 && idx < pipeline.length - 1) {
      const next = pipeline[idx + 1];
      if (!suggestions.find(s => s.skill === next)) {
        confidence = Math.max(confidence, 0.85);
        suggestions.push({ skill: next, reason: `natural next step after ${pipeline[idx]}` });
      }
    }
  }

  // Open todos nudge
  if (openTodos > 0 && confidence < 0.86) {
    confidence = Math.max(confidence, 0.82);
    if (!suggestions.find(s => s.skill === '/ccc-plan')) {
      suggestions.push({ skill: '/ccc-plan', reason: `${openTodos} open todo(s) — resume the plan` });
    }
  }

  // Coach-derived stack heuristics (folded in from the retired kit
  // session-coach.js — ext→domain mapping). Suppressed by CC_COACH_DISABLE=1.
  if (process.env.CC_COACH_DISABLE !== '1' && Array.isArray(state.stack)) {
    const coach = [];
    if (state.stack.includes('react') || state.stack.includes('nextjs')) {
      coach.push({ skill: '/ccc-design', reason: 'React/Next detected — 41 design sub-skills for polish + a11y' });
    }
    if (state.stack.includes('prisma') || state.stack.includes('supabase')) {
      coach.push({ skill: '/ccc-saas', reason: 'database layer detected — schema, migration, and billing skills' });
    }
    if (state.stack.includes('docker')) {
      coach.push({ skill: '/ccc-devops', reason: 'Dockerfile detected — CI/CD, containers, and deploy skills' });
    }
    for (const c of coach) {
      if (suggestions.length >= 3) break;
      if (!suggestions.find(s => s.skill === c.skill)) {
        confidence = Math.max(confidence, 0.7); // domain hints alone never cross the smart gate
        suggestions.push(c);
      }
    }
  }

  // Cap suggestions at 3
  return { confidence, suggestions: suggestions.slice(0, 3) };
}
