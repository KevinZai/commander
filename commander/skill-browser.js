'use strict';
// CC Commander Intelligence Layer — Licensed under MIT + Commons Clause.
// See docs/LICENSE-INTELLIGENCE.md for details. Free to use, not to sell.

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_USAGE_PATH = path.join(os.homedir(), '.claude', 'commander', 'skill-usage.json');

/**
 * Load skill usage stats from disk.
 * @returns {Object} Map of skillName → { count, lastUsed, outcomes }
 */
function loadUsageStats() {
  try {
    if (fs.existsSync(SKILL_USAGE_PATH)) {
      return JSON.parse(fs.readFileSync(SKILL_USAGE_PATH, 'utf8'));
    }
  } catch (_e) {}
  return {};
}

/**
 * Persist skill usage stats to disk.
 * @param {Object} stats
 */
function saveUsageStats(stats) {
  try {
    const dir = path.dirname(SKILL_USAGE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SKILL_USAGE_PATH, JSON.stringify(stats, null, 2));
  } catch (_e) {}
}

/**
 * Record that a skill was used, with an optional outcome.
 * @param {string} skillName
 * @param {string} [outcome] - 'success' | 'error' | 'unknown'
 */
function trackSkillUsage(skillName, outcome) {
  if (!skillName) return;
  const stats = loadUsageStats();
  if (!stats[skillName]) {
    stats[skillName] = { count: 0, lastUsed: null, outcomes: [] };
  }
  stats[skillName].count += 1;
  stats[skillName].lastUsed = new Date().toISOString();
  if (outcome) {
    stats[skillName].outcomes = (stats[skillName].outcomes || []).concat(outcome).slice(-20);
  }
  saveUsageStats(stats);
}

/**
 * Return all skill usage stats.
 * @returns {Object}
 */
function getSkillUsageStats() {
  return loadUsageStats();
}

/**
 * Compute a usage-based ranking boost for a skill.
 * Recent successful use → positive boost. Recent errors → slight penalty.
 * @param {string} skillName
 * @param {Object} usageStats
 * @returns {number} Boost value (can be negative)
 */
function usageBoost(skillName, usageStats) {
  const entry = usageStats[skillName];
  if (!entry) return 0;

  const outcomes = entry.outcomes || [];
  const recentOutcomes = outcomes.slice(-5);
  const successCount = recentOutcomes.filter(o => o === 'success').length;
  const errorCount   = recentOutcomes.filter(o => o === 'error').length;

  // Recency bonus: used in last 7 days
  let recencyBonus = 0;
  if (entry.lastUsed) {
    const ageDays = (Date.now() - new Date(entry.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) recencyBonus = 2;
    else if (ageDays < 30) recencyBonus = 1;
  }

  return successCount * 1.5 - errorCount * 0.5 + recencyBonus;
}

const SKILL_DIRS = [
  path.join(__dirname, '..', 'skills'),
  path.join(os.homedir(), '.claude', 'skills'),
  path.join(process.cwd(), '.claude', 'skills'),
];

/**
 * Extract name and description from SKILL.md frontmatter.
 * Reads the first ~30 lines looking for YAML frontmatter.
 * @param {string} skillPath - Path to SKILL.md
 * @returns {{ name: string, description: string }|null}
 */
function getSkillSummary(skillPath) {
  try {
    const content = fs.readFileSync(skillPath, 'utf8');
    const lines = content.split('\n').slice(0, 30);

    if (lines[0]?.trim() !== '---') return { name: path.basename(path.dirname(skillPath)), description: '' };

    const endIdx = lines.slice(1).findIndex(l => l.trim() === '---');
    if (endIdx < 0) return { name: path.basename(path.dirname(skillPath)), description: '' };

    const frontmatter = lines.slice(1, endIdx + 1).join('\n');
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

    return {
      name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : path.basename(path.dirname(skillPath)),
      description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : '',
    };
  } catch {
    return null;
  }
}

/**
 * List all skills from known directories.
 * @param {string[]} dirs - Directories to scan (default: SKILL_DIRS)
 * @returns {Array<{ name: string, description: string, path: string, isMega: boolean }>}
 */
function listSkills(dirs = SKILL_DIRS) {
  const skills = [];
  const seen = new Set();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const isDir = entry.isDirectory() || (entry.isSymbolicLink() && (() => {
          try { return fs.statSync(path.join(dir, entry.name)).isDirectory(); } catch { return false; }
        })());
        if (!isDir) continue;
        if (seen.has(entry.name)) continue;
        seen.add(entry.name);

        const skillMd = path.join(dir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          const summary = getSkillSummary(skillMd);
          if (summary) {
            skills.push({
              name: summary.name,
              description: summary.description,
              dirName: entry.name,
              path: skillMd,
              isMega: entry.name.startsWith('ccc-'),
            });
          }
        }

        // Recurse one level into all skill dirs to find sub-skills
        {
          const subDir = path.join(dir, entry.name);
          try {
            const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
            for (const sub of subEntries) {
              if (!sub.isDirectory()) continue;
              const subSkillMd = path.join(subDir, sub.name, 'SKILL.md');
              if (!fs.existsSync(subSkillMd)) continue;
              const subName = entry.name + '-' + sub.name;
              if (seen.has(subName)) continue;
              seen.add(subName);
              const subSummary = getSkillSummary(subSkillMd);
              if (subSummary) {
                skills.push({
                  name: subSummary.name,
                  description: subSummary.description,
                  dirName: sub.name,
                  path: subSkillMd,
                  isMega: false,
                });
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* permission or fs error — skip dir */ }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Group skills by category prefix.
 * @param {Array} skills - From listSkills()
 * @returns {Object<string, Array>} Grouped by category
 */
function categorizeSkills(skills) {
  const groups = {};
  for (const skill of skills) {
    const parts = skill.dirName.split('-');
    const category = parts.length > 1 ? parts[0] : 'general';
    if (!groups[category]) groups[category] = [];
    groups[category].push(skill);
  }
  return groups;
}

/**
 * Read the first N non-frontmatter lines of a SKILL.md for display.
 * @param {string} skillPath - Path to SKILL.md
 * @param {number} maxLines - Max lines to return (default 15)
 * @returns {string} Preview text
 */
function getSkillPreview(skillPath, maxLines = 15) {
  try {
    const content = fs.readFileSync(skillPath, 'utf8');
    const lines = content.split('\n');

    let start = 0;
    if (lines[0]?.trim() === '---') {
      const endIdx = lines.slice(1).findIndex(l => l.trim() === '---');
      if (endIdx >= 0) start = endIdx + 2;
    }

    return lines.slice(start, start + maxLines)
      .join('\n')
      .trim();
  } catch {
    return '(could not read skill)';
  }
}

const STACK_MAP = {
  'nextjs': ['nextjs-app-router', 'ccc-saas', 'ccc-design', 'shadcn-ui', 'tailwind-v4', 'frontend-patterns'],
  'react': ['frontend-patterns', 'ccc-design', 'frontend-design', 'shadcn-ui'],
  'vue': ['vue-nuxt', 'frontend-patterns'],
  'node-api': ['backend-patterns', 'api-design', 'fastify-api', 'ccc-saas', 'api-first-workflow'],
  'docker': ['ccc-devops', 'docker-development', 'container-security', 'senior-devops'],
  'testing': ['ccc-testing', 'tdd-workflow', 'e2e-testing', 'ai-regression-testing'],
  'billing': ['stripe-subscriptions', 'billing-automation', 'ccc-saas'],
  'tailwind': ['tailwind-v4', 'ccc-design', 'frontend-design'],
  'python': ['python-patterns', 'python-testing'],
  'github-actions': ['github-actions-security', 'github-actions-reusable-workflows', 'ccc-devops'],
  'orm': ['postgres-patterns', 'database-designer', 'database-migrations', 'drizzle-neon'],
  'rust': ['coding-standards'],
  'go': ['coding-standards'],
  'ruby': ['coding-standards'],
};

/**
 * Filter and rank skills by tech stack relevance and usage history.
 * @param {Array} skills - From listSkills()
 * @param {string[]} techStack - Detected tech stack identifiers
 * @returns {Array} Skills sorted by relevance (stack match + usage boost)
 */
function filterByProject(skills, techStack) {
  if (!techStack || techStack.length === 0) return skills.slice();
  const relevant = {};
  techStack.forEach(function(tech) {
    (STACK_MAP[tech] || []).forEach(function(skill) { relevant[skill] = true; });
  });

  const usageStats = loadUsageStats();

  return skills.slice().sort(function(a, b) {
    // Stack relevance: 0 = relevant, 1 = not relevant (lower = better)
    const ar = relevant[a.name] ? 0 : 1;
    const br = relevant[b.name] ? 0 : 1;
    if (ar !== br) return ar - br;

    // Within same relevance group, sort by usage boost descending
    const boostA = usageBoost(a.name, usageStats);
    const boostB = usageBoost(b.name, usageStats);
    if (boostB !== boostA) return boostB - boostA;

    return a.name.localeCompare(b.name);
  });
}

/**
 * Extract keywords from a task string for skill matching.
 * Simple whitespace split + lower-case, no stopwords needed here.
 * @param {string} task
 * @returns {string[]}
 */
function extractTaskKeywords(task) {
  if (!task) return [];
  return task.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function(w) { return w.length > 2; });
}

/**
 * Recommend the top N skills for a given task and tech stack.
 * Combines stack matching + keyword matching against skill names/descriptions + usage history.
 *
 * @param {string} task - Task description
 * @param {string[]} techStack - Detected tech stack identifiers (can be empty)
 * @param {number} [limit=5] - Max skills to return
 * @returns {Array<{ name: string, description: string, score: number, path: string, isMega: boolean }>}
 */
function recommendSkills(task, techStack, limit) {
  if (!limit) limit = 5;
  const skills = listSkills();
  const usageStats = loadUsageStats();
  const taskKeywords = extractTaskKeywords(task || '');

  const relevant = {};
  (techStack || []).forEach(function(tech) {
    (STACK_MAP[tech] || []).forEach(function(skill) { relevant[skill] = true; });
  });

  const scored = skills.map(function(skill) {
    let score = 0;

    // Stack relevance
    if (relevant[skill.name] || relevant[skill.dirName]) score += 10;

    // Keyword match in skill name and description
    const skillText = (skill.name + ' ' + skill.description + ' ' + skill.dirName).toLowerCase();
    taskKeywords.forEach(function(kw) {
      if (skillText.indexOf(kw) >= 0) score += 2;
    });

    // Usage boost
    score += usageBoost(skill.name, usageStats);

    return { skill: skill, score: score };
  });

  // Deduplicate by dirName (sub-skills may share the same display name)
  const seenDirs = new Set();
  return scored
    .filter(function(s) { return s.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .filter(function(s) {
      if (seenDirs.has(s.skill.dirName)) return false;
      seenDirs.add(s.skill.dirName);
      return true;
    })
    .slice(0, limit)
    .map(function(s) {
      return {
        name: s.skill.name,
        description: s.skill.description,
        dirName: s.skill.dirName,
        path: s.skill.path,
        isMega: s.skill.isMega,
        score: Math.round(s.score * 10) / 10,
      };
    });
}

/**
 * Return skills with increasing usage in the last N days.
 * A skill is "trending" if it has been used at least twice in the window.
 *
 * @param {number} [days=7] - Look-back window in days
 * @returns {Array<{ name: string, count: number, lastUsed: string }>}
 */
function getTrendingSkills(days) {
  if (!days) days = 7;
  const stats = loadUsageStats();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const trending = [];
  Object.keys(stats).forEach(function(name) {
    const entry = stats[name];
    if (!entry.lastUsed) return;
    if (new Date(entry.lastUsed).getTime() < cutoff) return;

    // Count outcomes within the window (approximation: use total count if window not tracked per use)
    const recentOutcomes = (entry.outcomes || []).slice(-days);
    if (recentOutcomes.length >= 2) {
      trending.push({ name: name, count: entry.count, lastUsed: entry.lastUsed });
    }
  });

  return trending.sort(function(a, b) { return b.count - a.count; });
}

/**
 * List skills with optional MCP-backed enhancement.
 * When useMcp is true AND mcp-passthrough is enabled, fetches additional
 * skill metadata from the MCP server and merges with local results.
 * Falls back to local results on any failure — same shape either way.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.useMcp=false]  - Opt-in to MCP lookup
 * @param {string[]} [opts.dirs]         - Custom skill dirs (passed to listSkills)
 * @returns {Promise<Array<{ name: string, description: string, path: string, isMega: boolean }>>}
 */
async function listSkillsEnhanced(opts) {
  const useMcp = opts && opts.useMcp === true;
  const dirs = opts && opts.dirs;
  const local = listSkills(dirs);

  if (!useMcp) return local;

  let passthrough;
  try {
    passthrough = require('./cowork-plugin/lib/mcp-passthrough');
  } catch (_e) {
    return local;
  }

  const result = await passthrough.call('list_skills', {}, {
    timeout: 2000,
    fallback: async () => ({ source: 'local', skills: [] }),
  });

  // If MCP returned nothing useful, return local as-is
  if (!result || result.source === 'local' || !Array.isArray(result.skills) || result.skills.length === 0) {
    return local;
  }

  // Merge: MCP skills that aren't already in local (by name) are appended
  const localNames = new Set(local.map(s => s.name));
  const remote = result.skills
    .filter(s => s && s.name && !localNames.has(s.name))
    .map(s => ({
      name: s.name,
      description: s.description || '',
      dirName: s.dirName || s.name,
      path: s.path || '',
      isMega: s.isMega || false,
      source: 'mcp',
    }));

  return local.concat(remote).sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  filterByProject,
  recommendSkills,
  trackSkillUsage,
  getSkillUsageStats,
  getTrendingSkills,
  SKILL_DIRS,
  STACK_MAP,
  listSkills,
  listSkillsEnhanced,
  getSkillSummary,
  categorizeSkills,
  getSkillPreview,
};
