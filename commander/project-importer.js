'use strict';

var fs = require('fs');
var path = require('path');

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
  };

  // Check CLAUDE.md
  var claudeMdPath = path.join(dir, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    result.hasClaudeMd = true;
    result.claudeMd = fs.readFileSync(claudeMdPath, 'utf8');
    result.summary.push('CLAUDE.md (' + result.claudeMd.split('\n').length + ' lines)');
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
    var hooksPath = path.join(claudeDir, 'settings.json');
    if (result.settings && result.settings.hooks) {
      var hookCount = Object.keys(result.settings.hooks).length;
      if (hookCount > 0) result.summary.push(hookCount + ' hook events');
    }
  }

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
