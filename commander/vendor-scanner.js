'use strict';

var fs = require('fs');
var path = require('path');

var VENDOR_DIR = path.join(__dirname, '..', 'vendor');

// Cache
var _cachedIndex = null;
var _cacheTime = 0;
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Scan vendor/ directory for initialized submodules.
 * Returns array of {name, path, hasSkills, hasCommands, hasHooks, hasAgents, packageJson}
 */
function scanVendorDir() {
  if (!fs.existsSync(VENDOR_DIR)) return [];

  var entries;
  try {
    entries = fs.readdirSync(VENDOR_DIR, { withFileTypes: true });
  } catch (_e) {
    return [];
  }

  var packages = [];
  entries.forEach(function(entry) {
    if (!entry.isDirectory()) return;
    if (entry.name.startsWith('.')) return;

    var vendorPath = path.join(VENDOR_DIR, entry.name);

    // Skip uninitialized submodules (empty dirs or dirs with only .git file)
    var contents;
    try {
      contents = fs.readdirSync(vendorPath);
    } catch (_e) {
      return;
    }
    var meaningful = contents.filter(function(c) { return c !== '.git' && c !== '.gitmodules'; });
    if (meaningful.length === 0) return;

    var skills = detectSkills(vendorPath);
    var commands = detectCommands(vendorPath);
    var hooks = detectHooks(vendorPath);
    var agents = detectAgents(vendorPath);

    var pkgJson = null;
    var pkgPath = path.join(vendorPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      } catch (_e) {
        pkgJson = null;
      }
    }

    packages.push({
      name: entry.name,
      path: vendorPath,
      hasSkills: skills.length > 0,
      hasCommands: commands.length > 0,
      hasHooks: hooks.length > 0,
      hasAgents: agents.length > 0,
      skills: skills,
      commands: commands,
      hooks: hooks,
      agents: agents,
      packageJson: pkgJson,
    });
  });

  return packages;
}

/**
 * Detect SKILL.md files recursively in a vendor package.
 * Check: <vendor>/skills/SKILL.md (root-level skills like gstack),
 *        <vendor>/skills/<name>/SKILL.md,
 *        <vendor>/.claude/skills/<name>/SKILL.md,
 *        <vendor>/SKILL.md (single-skill package),
 *        <vendor>/<name>/SKILL.md (gstack-style: skills at top level)
 */
function detectSkills(vendorPath) {
  var found = [];

  // Pattern 1: <vendor>/skills/*/SKILL.md
  var skillsDir = path.join(vendorPath, 'skills');
  if (fs.existsSync(skillsDir)) {
    try {
      fs.readdirSync(skillsDir, { withFileTypes: true }).forEach(function(entry) {
        if (entry.isDirectory()) {
          var skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            found.push({ name: entry.name, path: skillFile, source: 'skills/' });
          }
        }
      });
    } catch (_e) {}
  }

  // Pattern 2: <vendor>/.claude/skills/*/SKILL.md
  var dotClaudeSkills = path.join(vendorPath, '.claude', 'skills');
  if (fs.existsSync(dotClaudeSkills)) {
    try {
      fs.readdirSync(dotClaudeSkills, { withFileTypes: true }).forEach(function(entry) {
        if (entry.isDirectory()) {
          var skillFile = path.join(dotClaudeSkills, entry.name, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            found.push({ name: entry.name, path: skillFile, source: '.claude/skills/' });
          }
        }
      });
    } catch (_e) {}
  }

  // Pattern 3: <vendor>/SKILL.md (single-skill package)
  var rootSkill = path.join(vendorPath, 'SKILL.md');
  if (fs.existsSync(rootSkill)) {
    var pkgName = path.basename(vendorPath);
    found.push({ name: pkgName, path: rootSkill, source: 'root' });
  }

  // Pattern 4: <vendor>/*/SKILL.md (gstack-style: each top-level dir is a skill)
  try {
    fs.readdirSync(vendorPath, { withFileTypes: true }).forEach(function(entry) {
      if (!entry.isDirectory()) return;
      // Skip known non-skill dirs
      if (['skills', '.claude', 'node_modules', '.git', 'docs', 'tests', 'src',
           'lib', 'agents', 'hooks', 'commands', 'scripts', 'bin', 'extension',
           'compatibility', 'templates', 'examples', 'research', 'assets',
           'manifests', 'mcp-configs', 'contexts', 'plugins', 'ecc2'].indexOf(entry.name) !== -1) return;
      var skillFile = path.join(vendorPath, entry.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        // Avoid duplicates from pattern 1
        var already = found.some(function(f) { return f.name === entry.name; });
        if (!already) {
          found.push({ name: entry.name, path: skillFile, source: 'top-level/' });
        }
      }
    });
  } catch (_e) {}

  return found;
}

/**
 * Detect command .md files.
 * Check: <vendor>/commands/*.md, <vendor>/.claude/commands/*.md
 */
function detectCommands(vendorPath) {
  var found = [];

  var dirs = [
    path.join(vendorPath, 'commands'),
    path.join(vendorPath, '.claude', 'commands'),
  ];

  dirs.forEach(function(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      fs.readdirSync(dir).forEach(function(file) {
        if (file.endsWith('.md')) {
          found.push({ name: file.replace('.md', ''), path: path.join(dir, file) });
        }
      });
    } catch (_e) {}
  });

  return found;
}

/**
 * Detect hooks.
 * Check: <vendor>/hooks/, <vendor>/.claude/hooks/, <vendor>/hooks.json
 */
function detectHooks(vendorPath) {
  var found = [];

  // hooks.json at root
  var rootHooksJson = path.join(vendorPath, 'hooks.json');
  if (fs.existsSync(rootHooksJson)) {
    found.push({ name: 'hooks.json', path: rootHooksJson, type: 'json' });
  }

  var dirs = [
    path.join(vendorPath, 'hooks'),
    path.join(vendorPath, '.claude', 'hooks'),
  ];

  dirs.forEach(function(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      fs.readdirSync(dir).forEach(function(file) {
        var filePath = path.join(dir, file);
        if (file === 'hooks.json') {
          found.push({ name: file, path: filePath, type: 'json' });
        } else if (!file.startsWith('.') && file !== 'README.md') {
          found.push({ name: file, path: filePath, type: 'script' });
        }
      });
    } catch (_e) {}
  });

  return found;
}

/**
 * Detect agent definitions.
 * Check: <vendor>/agents/, <vendor>/.claude/agents/
 */
function detectAgents(vendorPath) {
  var found = [];

  var dirs = [
    path.join(vendorPath, 'agents'),
    path.join(vendorPath, '.claude', 'agents'),
  ];

  dirs.forEach(function(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      fs.readdirSync(dir).forEach(function(file) {
        if (file.startsWith('.') || file === 'README.md') return;
        if (file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')) {
          found.push({ name: file.replace(/\.(md|yaml|yml)$/, ''), path: path.join(dir, file) });
        }
      });
    } catch (_e) {}
  });

  return found;
}

/**
 * Phase mapping keywords
 */
var PHASE_KEYWORDS = {
  clarify:  ['office-hours', 'interview', 'clarify', 'brainstorm', 'requirements', 'ask', 'deep-interview'],
  decide:   ['decide', 'gate', 'approve', 'ceo-review', 'eng-review', 'design-review', 'triage'],
  plan:     ['plan', 'planning', 'spec', 'prd', 'autoplan', 'ralplan', 'blueprint', 'architecture'],
  execute:  ['execute', 'work', 'build', 'code', 'implement', 'ultrawork', 'autopilot'],
  review:   ['review', 'code-review', 'audit', 'critique', 'simplify', 'refactor', 'clean'],
  test:     ['test', 'tdd', 'qa', 'verify', 'ultraqa', 'e2e', 'benchmark', 'verification'],
  learn:    ['learn', 'compound', 'knowledge', 'reflect', 'retro', 'learner', 'continuous-learning', 'writer-memory'],
  ship:     ['ship', 'deploy', 'release', 'land', 'canary', 'document-release'],
};

/**
 * Map a skill name to a phase using keyword heuristic.
 * Returns the best-matching phase or 'execute' as default.
 */
function mapSkillToPhase(skillName) {
  var lower = skillName.toLowerCase();
  var bestPhase = 'execute';
  var bestScore = 0;

  Object.keys(PHASE_KEYWORDS).forEach(function(phase) {
    var keywords = PHASE_KEYWORDS[phase];
    keywords.forEach(function(kw) {
      if (lower === kw || lower.indexOf(kw) !== -1) {
        // Exact match scores higher than partial
        var score = lower === kw ? 10 : kw.length;
        if (score > bestScore) {
          bestScore = score;
          bestPhase = phase;
        }
      }
    });
  });

  return bestPhase;
}

/**
 * Extract a short description from a SKILL.md file (first non-heading, non-empty line).
 */
function extractDescription(skillPath) {
  try {
    var content = fs.readFileSync(skillPath, 'utf8');
    var lines = content.split('\n');
    for (var i = 0; i < Math.min(lines.length, 20); i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith('#')) continue;
      if (line.startsWith('---')) continue;
      // Return first meaningful text line, truncated
      return line.length > 120 ? line.substring(0, 117) + '...' : line;
    }
  } catch (_e) {}
  return '';
}

/**
 * Build capability index: Map from phase -> [{vendor, skill, description}]
 * Phases: clarify, decide, plan, execute, review, test, learn, ship
 */
function buildCapabilityIndex(packages) {
  var index = {
    clarify: [],
    decide: [],
    plan: [],
    execute: [],
    review: [],
    test: [],
    learn: [],
    ship: [],
  };

  packages.forEach(function(pkg) {
    pkg.skills.forEach(function(skill) {
      var phase = mapSkillToPhase(skill.name);
      var desc = extractDescription(skill.path);
      index[phase].push({
        vendor: pkg.name,
        skill: skill.name,
        description: desc,
        skillPath: skill.path,
      });
    });
  });

  return index;
}

/**
 * Get cached index or rebuild if stale (>5 min)
 */
function getCachedIndex() {
  var now = Date.now();
  if (_cachedIndex && (now - _cacheTime) < CACHE_TTL) {
    return _cachedIndex;
  }

  var packages = scanVendorDir();
  if (packages.length === 0) return null;

  _cachedIndex = buildCapabilityIndex(packages);
  _cacheTime = now;
  return _cachedIndex;
}

module.exports = {
  scanVendorDir: scanVendorDir,
  detectSkills: detectSkills,
  detectCommands: detectCommands,
  detectHooks: detectHooks,
  detectAgents: detectAgents,
  buildCapabilityIndex: buildCapabilityIndex,
  getCachedIndex: getCachedIndex,
  mapSkillToPhase: mapSkillToPhase,
  VENDOR_DIR: VENDOR_DIR,
};
