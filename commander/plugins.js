'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');

/**
 * Known plugin packages and their skill-to-phase mapping.
 * CC Commander scans for these and uses them when available.
 * Attribution: each package credited to its author.
 */
var KNOWN_PACKAGES = {
  gstack: {
    name: 'gstack',
    author: 'Garry Tan',
    repo: 'github.com/garrytan/gstack',
    stars: '54.6K',
    description: 'Decision layer + QA testing',
    skills: {
      'office-hours': { phase: 'clarify', description: 'Requirements interview' },
      'plan-ceo-review': { phase: 'decide', description: 'Product gate: worth building?' },
      'plan-eng-review': { phase: 'decide', description: 'Architecture gate: will it scale?' },
      'qa': { phase: 'test', description: 'Real browser QA testing' },
      'review': { phase: 'review', description: 'Code review' },
      'ship': { phase: 'ship', description: 'Ship checklist' },
    },
  },
  'compound-engineering': {
    name: 'Compound Engineering',
    author: 'Every Inc',
    repo: 'github.com/EveryInc/compound-engineering-plugin',
    stars: '11.5K',
    description: 'Knowledge compounding + deep review',
    skills: {
      'ce:brainstorm': { phase: 'clarify', description: 'Explore and refine requirements' },
      'ce:plan': { phase: 'plan', description: 'Research-driven plan (scans git history)' },
      'ce:work': { phase: 'execute', description: 'Execute with task tracking' },
      'ce:review': { phase: 'review', description: 'Dynamic 6+ reviewer ensemble' },
      'ce:compound': { phase: 'learn', description: 'Extract and store lessons' },
    },
  },
  superpowers: {
    name: 'Superpowers',
    author: 'Jesse Vincent (obra)',
    repo: 'github.com/obra/superpowers',
    stars: '121K',
    description: 'Structured development workflow',
    skills: {
      'plan': { phase: 'plan', description: 'Structured implementation plan' },
      'code-review': { phase: 'review', description: 'Code quality review' },
      'tdd': { phase: 'execute', description: 'Test-driven development' },
      'verify': { phase: 'test', description: 'Verification loop' },
    },
  },
  'ecc': {
    name: 'Everything Claude Code',
    author: 'Community',
    repo: 'github.com/example/ecc',
    stars: '100K',
    description: '19 lifecycle hooks, developer profiles, agent definitions',
    skills: {
      'configure-ecc': { phase: 'execute', description: 'Configure ECC profiles' },
      'harness-audit': { phase: 'review', description: 'Audit harness configuration' },
    },
  },
  'simone': {
    name: 'Simone',
    author: 'banagale',
    repo: 'github.com/banagale/simone',
    stars: '3K',
    description: 'Structured PM framework',
    skills: {
      'simone': { phase: 'plan', description: 'Structured PM planning' },
    },
  },
};

/**
 * The 10-step build phases and what tool handles each.
 * Commander always provides a fallback for every phase.
 */
var BUILD_PHASES = [
  { id: 'clarify',  name: 'Clarify requirements', fallback: 'CC Commander spec flow (3 questions)', icon: '1' },
  { id: 'decide',   name: 'Decision gates', fallback: 'CC Commander plan-mode dispatch', icon: '2' },
  { id: 'plan',     name: 'Research-driven planning', fallback: 'Claude Code plan mode', icon: '3' },
  { id: 'execute',  name: 'Build / execute', fallback: 'Claude Code headless dispatch', icon: '4' },
  { id: 'review',   name: 'Multi-agent review', fallback: 'Claude Code /simplify', icon: '5' },
  { id: 'test',     name: 'QA testing', fallback: 'Claude Code /verify', icon: '6' },
  { id: 'learn',    name: 'Knowledge compounding', fallback: 'CC Commander knowledge engine', icon: '7' },
  { id: 'ship',     name: 'Ship it', fallback: 'git commit + push', icon: '8' },
];

/**
 * Scan installed skills and detect which packages are available.
 * @returns {object} { installed: string[], available: {phase: tool[]}, missing: string[] }
 */
function detectPlugins() {
  var skillDirs = [
    path.join(os.homedir(), '.claude', 'skills'),
    path.join(os.homedir(), '.claude', 'commands'),
    path.join(process.cwd(), '.claude', 'skills'),
    path.join(process.cwd(), '.claude', 'commands'),
  ];

  var foundSkills = new Set();
  skillDirs.forEach(function(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      // Check for skill directories
      fs.readdirSync(dir, { withFileTypes: true }).forEach(function(entry) {
        if (entry.isDirectory()) foundSkills.add(entry.name);
        if (entry.isFile() && entry.name.endsWith('.md')) foundSkills.add(entry.name.replace('.md', ''));
      });
    } catch (_e) {}
  });

  var installed = [];
  var missing = [];

  Object.keys(KNOWN_PACKAGES).forEach(function(pkgName) {
    var pkg = KNOWN_PACKAGES[pkgName];
    var skillNames = Object.keys(pkg.skills);
    var hasAny = skillNames.some(function(s) {
      var checkName = s.replace(':', '-');
      return foundSkills.has(s) || foundSkills.has(checkName) || foundSkills.has(s.replace(':', '_'));
    });
    if (hasAny) installed.push(pkgName);
    else missing.push(pkgName);
  });

  // Map phases to best available tool
  var phaseTools = {};
  BUILD_PHASES.forEach(function(phase) {
    phaseTools[phase.id] = { phase: phase, tools: [], fallback: phase.fallback };
    installed.forEach(function(pkgName) {
      var pkg = KNOWN_PACKAGES[pkgName];
      Object.keys(pkg.skills).forEach(function(skillName) {
        if (pkg.skills[skillName].phase === phase.id) {
          phaseTools[phase.id].tools.push({
            package: pkgName,
            skill: skillName,
            description: pkg.skills[skillName].description,
            author: pkg.author,
          });
        }
      });
    });
  });

  return { installed: installed, missing: missing, phaseTools: phaseTools, foundSkills: Array.from(foundSkills).length };
}

/**
 * Get the best tool for a given phase.
 * Prefers: CE for plan/review/learn, gstack for decide/test, Commander for clarify.
 * @param {string} phaseId
 * @param {object} detection - From detectPlugins()
 * @returns {{ skill: string|null, package: string|null, fallback: string }}
 */
function bestToolForPhase(phaseId, detection) {
  var phase = detection.phaseTools[phaseId];
  if (!phase) return { skill: null, package: null, fallback: 'CC Commander default' };
  if (phase.tools.length === 0) return { skill: null, package: null, fallback: phase.fallback };

  // Priority: CE > gstack > superpowers (for overlap phases like review)
  var priority = ['compound-engineering', 'gstack', 'superpowers'];
  for (var i = 0; i < priority.length; i++) {
    var match = phase.tools.find(function(t) { return t.package === priority[i]; });
    if (match) return { skill: match.skill, package: match.package, fallback: phase.fallback, author: match.author };
  }
  return { skill: phase.tools[0].skill, package: phase.tools[0].package, fallback: phase.fallback };
}

/**
 * Build the full 10-step dispatch plan for a task.
 * Each step has the best available tool + fallback.
 * @param {object} detection - From detectPlugins()
 * @returns {Array<{phase, tool, method}>}
 */
function buildDispatchPlan(detection) {
  return BUILD_PHASES.map(function(phase) {
    var best = bestToolForPhase(phase.id, detection);
    return {
      id: phase.id,
      name: phase.name,
      icon: phase.icon,
      tool: best.skill ? ('/' + best.skill + ' (' + best.package + ')') : best.fallback,
      skill: best.skill,
      package: best.package,
      fallback: best.fallback,
      hasPlugin: Boolean(best.skill),
      author: best.author || null,
    };
  });
}

/**
 * Generate attribution text for installed packages.
 * @param {string[]} installed
 * @returns {string}
 */
function getAttribution(installed) {
  if (installed.length === 0) return '';
  var parts = installed.map(function(name) {
    var pkg = KNOWN_PACKAGES[name];
    return pkg.name + ' by ' + pkg.author + ' (' + pkg.repo + ')';
  });
  return 'Powered by: ' + parts.join(' + ') + ' + CC Commander';
}

module.exports = {
  KNOWN_PACKAGES: KNOWN_PACKAGES,
  BUILD_PHASES: BUILD_PHASES,
  detectPlugins: detectPlugins,
  bestToolForPhase: bestToolForPhase,
  buildDispatchPlan: buildDispatchPlan,
  getAttribution: getAttribution,
};
