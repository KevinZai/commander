'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

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
        if (!fs.existsSync(skillMd)) continue;

        const summary = getSkillSummary(skillMd);
        if (!summary) continue;

        skills.push({
          name: summary.name,
          description: summary.description,
          dirName: entry.name,
          path: skillMd,
          isMega: entry.name.startsWith('ccc-'),
        });
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

function filterByProject(skills, techStack) {
  if (!techStack || techStack.length === 0) return skills.slice();
  var stackMap = {
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
  var relevant = {};
  techStack.forEach(function(tech) {
    (stackMap[tech] || []).forEach(function(skill) { relevant[skill] = true; });
  });
  return skills.slice().sort(function(a, b) {
    var ar = relevant[a.name] ? 0 : 1;
    var br = relevant[b.name] ? 0 : 1;
    return ar - br || a.name.localeCompare(b.name);
  });
}

module.exports = { filterByProject: filterByProject,
  SKILL_DIRS,
  listSkills,
  getSkillSummary,
  categorizeSkills,
  getSkillPreview,
};
