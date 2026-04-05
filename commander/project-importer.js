'use strict';

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

/**
 * Scan a directory for Claude Code project context.
 * Reads CLAUDE.md, .claude/ settings, skills, and commands.
 * Does NOT modify any files — read-only import.
 *
 * @param {string} dir - Directory to scan (default: process.cwd())
 * @returns {object} Imported project context
 */
function scanProject(dir) {
  if (!dir) dir = process.cwd();
  var result = {
    dir: dir,
    name: path.basename(dir),
    hasClaudeMd: false,
    claudeMd: null,
    hasClaudeDir: false,
    settings: null,
    skills: [],
    commands: [],
    agents: [],
    hooks: null,
    summary: [],
    // New fields
    isMonorepo: false,
    gitBranch: null,
    recentCommitThemes: [],
    readmePreview: null,
  };

  // Check CLAUDE.md
  var claudeMdPath = path.join(dir, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    result.hasClaudeMd = true;
    result.claudeMd = fs.readFileSync(claudeMdPath, 'utf8');
    result.summary.push('CLAUDE.md (' + result.claudeMd.split('\n').length + ' lines)');
  }

  // README detection — first 5 lines as preview
  var readmePaths = ['README.md', 'readme.md', 'Readme.md'];
  for (var ri = 0; ri < readmePaths.length; ri++) {
    var rp = path.join(dir, readmePaths[ri]);
    if (fs.existsSync(rp)) {
      try {
        var readmeLines = fs.readFileSync(rp, 'utf8').split('\n').slice(0, 5).filter(function(l) { return l.trim(); });
        result.readmePreview = readmeLines.join('\n').slice(0, 500);
      } catch (_e) {}
      break;
    }
  }

  // Check .claude/ directory
  var claudeDir = path.join(dir, '.claude');
  if (fs.existsSync(claudeDir) && fs.statSync(claudeDir).isDirectory()) {
    result.hasClaudeDir = true;

    // Settings
    var settingsPath = path.join(claudeDir, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        result.settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        result.summary.push('settings.json');
      } catch (_e) {}
    }

    // Skills
    var skillsDir = path.join(claudeDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      try {
        var entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        result.skills = entries.filter(function(e) { return e.isDirectory(); }).map(function(e) { return e.name; });
        if (result.skills.length > 0) result.summary.push(result.skills.length + ' project skills');
      } catch (_e) {}
    }

    // Commands
    var cmdsDir = path.join(claudeDir, 'commands');
    if (fs.existsSync(cmdsDir)) {
      try {
        result.commands = fs.readdirSync(cmdsDir).filter(function(f) { return f.endsWith('.md'); }).map(function(f) { return f.replace('.md', ''); });
        if (result.commands.length > 0) result.summary.push(result.commands.length + ' commands');
      } catch (_e) {}
    }

    // Agents
    var agentsDir = path.join(claudeDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      try {
        result.agents = fs.readdirSync(agentsDir).filter(function(f) { return f.endsWith('.md'); }).map(function(f) { return f.replace('.md', ''); });
        if (result.agents.length > 0) result.summary.push(result.agents.length + ' agents');
      } catch (_e) {}
    }

    // Hooks
    if (result.settings && result.settings.hooks) {
      var hookCount = Object.keys(result.settings.hooks).length;
      if (hookCount > 0) result.summary.push(hookCount + ' hook events');
    }
  }

  // Tech stack detection
  result.techStack = [];
  var pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      var pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      var allDeps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
      if (allDeps.includes('next')) result.techStack.push('nextjs');
      if (allDeps.includes('react') && !allDeps.includes('next')) result.techStack.push('react');
      if (allDeps.includes('vue')) result.techStack.push('vue');
      if (allDeps.includes('express') || allDeps.includes('fastify') || allDeps.includes('hono')) result.techStack.push('node-api');
      if (allDeps.includes('stripe')) result.techStack.push('billing');
      if (allDeps.includes('drizzle-orm') || allDeps.includes('prisma') || allDeps.includes('typeorm')) result.techStack.push('orm');
      if (allDeps.includes('tailwindcss')) result.techStack.push('tailwind');
      if (allDeps.includes('playwright') || allDeps.includes('vitest') || allDeps.includes('jest')) result.techStack.push('testing');

      // Monorepo detection from package.json workspaces field
      if (pkg.workspaces) result.isMonorepo = true;
    } catch(_e) {}
  }
  if (fs.existsSync(path.join(dir, 'Dockerfile')) || fs.existsSync(path.join(dir, 'docker-compose.yml'))) result.techStack.push('docker');
  if (fs.existsSync(path.join(dir, '.github', 'workflows'))) result.techStack.push('github-actions');
  if (fs.existsSync(path.join(dir, 'pyproject.toml')) || fs.existsSync(path.join(dir, 'requirements.txt'))) result.techStack.push('python');
  if (fs.existsSync(path.join(dir, 'Cargo.toml'))) result.techStack.push('rust');
  if (fs.existsSync(path.join(dir, 'go.mod'))) result.techStack.push('go');

  // Monorepo detection from workspace config files
  if (!result.isMonorepo) {
    var monoFiles = ['pnpm-workspace.yaml', 'pnpm-workspace.yml', 'lerna.json', 'turbo.json', 'nx.json'];
    for (var mi = 0; mi < monoFiles.length; mi++) {
      if (fs.existsSync(path.join(dir, monoFiles[mi]))) {
        result.isMonorepo = true;
        break;
      }
    }
  }
  if (result.isMonorepo) result.summary.push('monorepo');

  // Git branch awareness
  try {
    result.gitBranch = childProcess.execSync('git branch --show-current', {
      cwd: dir, encoding: 'utf8', stdio: 'pipe', timeout: 3000,
    }).trim() || null;
  } catch (_e) { result.gitBranch = null; }

  // Recent commit themes — extract keywords from last 5 commit messages
  try {
    var logOutput = childProcess.execSync('git log --oneline -5', {
      cwd: dir, encoding: 'utf8', stdio: 'pipe', timeout: 3000,
    }).trim();
    if (logOutput) {
      var stopWords = ['a','an','the','is','it','to','of','in','for','on','with','and','or','but','fix','add','update','feat','docs','test','chore','refactor'];
      var commitWords = logOutput
        .split('\n')
        .map(function(line) { return line.replace(/^[a-f0-9]+\s+/, ''); }) // strip SHA
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(function(w) { return w.length > 3 && stopWords.indexOf(w) < 0; });
      // Dedupe and take top 10 most representative words
      var seen = {};
      result.recentCommitThemes = commitWords.filter(function(w) {
        if (seen[w]) return false;
        seen[w] = true;
        return true;
      }).slice(0, 10);
    }
  } catch (_e) { result.recentCommitThemes = []; }

  if (result.gitBranch) result.summary.push('branch:' + result.gitBranch);

  return result;
}

/**
 * Generate a system prompt from imported project context.
 * This gets passed to --append-system-prompt when dispatching.
 * Commander NEVER writes to the project's .claude/ — only reads.
 *
 * @param {object} project - From scanProject()
 * @returns {string} System prompt addition
 */
function buildProjectPrompt(project) {
  var parts = [];
  parts.push('Project: ' + project.name + ' (' + project.dir + ')');

  if (project.isMonorepo) {
    parts.push('Note: This is a monorepo project.');
  }

  if (project.gitBranch) {
    parts.push('Current git branch: ' + project.gitBranch);
  }

  if (project.recentCommitThemes && project.recentCommitThemes.length > 0) {
    parts.push('Recent work themes (from git log): ' + project.recentCommitThemes.join(', '));
  }

  if (project.readmePreview) {
    parts.push('\nProject README (first 5 lines):\n' + project.readmePreview);
  }

  if (project.claudeMd) {
    // Include first 100 lines of CLAUDE.md as context
    var lines = project.claudeMd.split('\n').slice(0, 100);
    parts.push('\nProject instructions (from CLAUDE.md):\n' + lines.join('\n'));
  }

  if (project.skills.length > 0) {
    parts.push('\nProject skills available: ' + project.skills.join(', '));
  }

  if (project.commands.length > 0) {
    parts.push('Project commands available: ' + project.commands.join(', '));
  }

  if (project.agents.length > 0) {
    parts.push('Project agents available: ' + project.agents.join(', '));
  }

  if (project.techStack && project.techStack.length > 0) {
    parts.push('Detected tech stack: ' + project.techStack.join(', '));
  }

  return parts.join('\n');
}

/**
 * Check if current directory has any Claude Code project context.
 * @param {string} dir
 * @returns {boolean}
 */
function hasProjectContext(dir) {
  if (!dir) dir = process.cwd();
  return fs.existsSync(path.join(dir, 'CLAUDE.md')) || fs.existsSync(path.join(dir, '.claude'));
}

module.exports = {
  scanProject: scanProject,
  buildProjectPrompt: buildProjectPrompt,
  hasProjectContext: hasProjectContext,
};
