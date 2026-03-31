'use strict';

const RULES = [
  {
    id: 'sec-no-env-secrets',
    condition: (s) => s.envFiles && s.envFiles.some((f) => f.hasSecrets),
    skill: 'security-reviewer',
    baseScore: 95,
    category: 'security',
    priority: 1,
    explanation: 'Secrets detected in environment files — run security audit',
  },
  {
    id: 'sec-no-lockfile',
    condition: (s) => s.hasPackageJson && !s.hasLockfile,
    skill: 'guard',
    baseScore: 80,
    category: 'security',
    priority: 2,
    explanation: 'No lockfile found — dependency versions are unpinned',
  },
  {
    id: 'sec-outdated-deps',
    condition: (s) => s.outdatedDeps && s.outdatedDeps.length > 10,
    skill: 'tob-supply-chain-risk-auditor',
    baseScore: 70,
    category: 'security',
    priority: 3,
    explanation: 'Many outdated dependencies — supply chain risk',
  },
  {
    id: 'test-no-tests',
    condition: (s) => s.hasSource && !s.hasTests,
    skill: 'tdd-workflow',
    baseScore: 90,
    category: 'testing',
    priority: 1,
    explanation: 'No test files detected — critical coverage gap',
  },
  {
    id: 'test-low-coverage',
    condition: (s) => s.testCoverage !== null && s.testCoverage < 60,
    skill: 'test-coverage',
    baseScore: 75,
    category: 'testing',
    priority: 2,
    explanation: 'Test coverage below 60% — add tests to critical paths',
  },
  {
    id: 'test-no-e2e',
    condition: (s) => s.hasUI && !s.hasE2E,
    skill: 'e2e-testing',
    baseScore: 65,
    category: 'testing',
    priority: 3,
    explanation: 'UI detected but no E2E tests — user flows are untested',
  },
  {
    id: 'devops-no-ci',
    condition: (s) => !s.hasCI,
    skill: 'senior-devops',
    baseScore: 85,
    category: 'devops',
    priority: 1,
    explanation: 'No CI/CD pipeline — automate build and deploy',
  },
  {
    id: 'devops-no-docker',
    condition: (s) => s.isServer && !s.hasDockerfile,
    skill: 'docker-development',
    baseScore: 60,
    category: 'devops',
    priority: 3,
    explanation: 'Server project without Dockerfile — containerization recommended',
  },
  {
    id: 'devops-no-deploy-config',
    condition: (s) => !s.hasDeployConfig && s.hasCI,
    skill: 'setup-deploy',
    baseScore: 55,
    category: 'devops',
    priority: 4,
    explanation: 'CI exists but no deployment configuration',
  },
  {
    id: 'quality-no-lint',
    condition: (s) => s.hasSource && !s.hasLintConfig,
    skill: 'coding-standards',
    baseScore: 70,
    category: 'quality',
    priority: 2,
    explanation: 'No linter configuration — code quality at risk',
  },
  {
    id: 'quality-no-typescript',
    condition: (s) => s.hasJsFiles && !s.hasTsConfig,
    skill: 'coding-standards',
    baseScore: 50,
    category: 'quality',
    priority: 4,
    explanation: 'JavaScript without TypeScript — consider adding type safety',
  },
  {
    id: 'quality-large-files',
    condition: (s) => s.largeFiles && s.largeFiles.length > 0,
    skill: 'refactor-clean',
    baseScore: 55,
    category: 'quality',
    priority: 3,
    explanation: 'Large files detected (>800 lines) — consider splitting',
  },
  {
    id: 'quality-no-formatter',
    condition: (s) => s.hasSource && !s.hasFormatter,
    skill: 'plankton-code-quality',
    baseScore: 45,
    category: 'quality',
    priority: 5,
    explanation: 'No code formatter configured — inconsistent style likely',
  },
  {
    id: 'docs-no-readme',
    condition: (s) => !s.hasReadme,
    skill: 'update-docs',
    baseScore: 75,
    category: 'docs',
    priority: 1,
    explanation: 'No README — project is undocumented',
  },
  {
    id: 'docs-no-claude-md',
    condition: (s) => !s.hasClaudeMd,
    skill: 'project-kickoff',
    baseScore: 80,
    category: 'docs',
    priority: 1,
    explanation: 'No CLAUDE.md — AI coding agents lack project context',
  },
  {
    id: 'docs-no-api-docs',
    condition: (s) => s.hasAPI && !s.hasAPIDocs,
    skill: 'api-design',
    baseScore: 60,
    category: 'docs',
    priority: 3,
    explanation: 'API endpoints found but no API documentation',
  },
  {
    id: 'docs-no-changelog',
    condition: (s) => s.hasGit && !s.hasChangelog,
    skill: 'document-release',
    baseScore: 40,
    category: 'docs',
    priority: 5,
    explanation: 'No CHANGELOG — release history is invisible',
  },
  {
    id: 'arch-no-error-handling',
    condition: (s) => s.tryCatchRatio !== null && s.tryCatchRatio < 0.1,
    skill: 'systematic-debugging',
    baseScore: 70,
    category: 'architecture',
    priority: 2,
    explanation: 'Minimal error handling — failures will be silent',
  },
  {
    id: 'arch-circular-deps',
    condition: (s) => s.circularDeps && s.circularDeps.length > 0,
    skill: 'refactor-clean',
    baseScore: 65,
    category: 'architecture',
    priority: 2,
    explanation: 'Circular dependencies detected — refactoring needed',
  },
  {
    id: 'arch-no-validation',
    condition: (s) => s.hasAPI && !s.hasInputValidation,
    skill: 'backend-patterns',
    baseScore: 80,
    category: 'architecture',
    priority: 1,
    explanation: 'API without input validation — injection risk',
  },
  {
    id: 'arch-monolith-warning',
    condition: (s) => s.sourceFileCount > 200 && !s.hasModuleBoundaries,
    skill: 'backend-patterns',
    baseScore: 50,
    category: 'architecture',
    priority: 4,
    explanation: 'Large codebase without clear module boundaries',
  },
];

function evaluate(signals, options = {}) {
  const { maxResults = 10, minScore = 0, categories = null } = options;

  const results = [];

  for (const rule of RULES) {
    if (categories && !categories.includes(rule.category)) continue;

    let matches = false;
    try {
      matches = rule.condition(signals);
    } catch {
      continue;
    }

    if (!matches) continue;

    const contextBoost = rule.priority <= 2 ? 10 : 0;
    const score = Math.min(100, rule.baseScore + contextBoost);

    if (score < minScore) continue;

    results.push({
      id: rule.id,
      skill: rule.skill,
      score,
      category: rule.category,
      priority: rule.priority,
      explanation: rule.explanation,
    });
  }

  results.sort((a, b) => b.score - a.score || a.priority - b.priority);

  return results.slice(0, maxResults);
}

module.exports = { RULES, evaluate };
