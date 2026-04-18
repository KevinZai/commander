#!/usr/bin/env node
'use strict';

/**
 * CC Commander — Registry Drift Check
 *
 * Scans skills/, commands/, and plugin skills, then compares against
 * commander/core/registry.yaml. Exits non-zero on drift.
 *
 * Usage:
 *   node scripts/build-from-registry.js --check    # drift check only
 *   node scripts/build-from-registry.js --generate # regenerate registry.yaml
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var REGISTRY_PATH = path.join(ROOT, 'commander', 'core', 'registry.yaml');

// ─── Scan helpers ──────────────────────────────────────────────

function scanSkillDirs(dir, tier) {
  var skills = [];
  try {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      var skillPath = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;
      var domain = entry.name.startsWith('ccc-') ? entry.name : 'general';
      var description = '';
      try {
        var lines = fs.readFileSync(skillPath, 'utf8').split('\n');
        for (var line of lines) {
          var t = line.trim();
          if (t && !t.startsWith('#') && !t.startsWith('---')) { description = t.slice(0, 100); break; }
        }
      } catch (_) {}
      skills.push({ id: entry.name, path: 'skills/' + entry.name + '/SKILL.md', domain: domain, tier: tier || 'free', description: description });
    }
  } catch (_) {}
  return skills;
}

function scanCommandFiles(dir) {
  var commands = [];
  function walk(d, prefix) {
    try {
      var entries = fs.readdirSync(d, { withFileTypes: true });
      for (var entry of entries) {
        if (entry.isDirectory()) { walk(path.join(d, entry.name), (prefix || '') + entry.name + '/'); continue; }
        if (!entry.name.endsWith('.md')) continue;
        var name = ((prefix || '') + entry.name).replace('.md', '').replace(/\//g, ':');
        var relPath = path.relative(ROOT, path.join(d, entry.name));
        commands.push({ id: name, path: relPath });
      }
    } catch (_) {}
  }
  walk(dir, '');
  return commands;
}

function scanAgents(dir) {
  var agents = [];
  var proAgents = ['reviewer', 'builder', 'researcher', 'debugger', 'fleet-worker'];
  try {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      var name = entry.name.replace('.md', '');
      agents.push({ id: name, path: 'commander/cowork-plugin/agents/' + entry.name, tier: proAgents.includes(name) ? 'pro' : 'free' });
    }
  } catch (_) {}
  return agents;
}

function scanHooks(dir) {
  var hooks = [];
  try {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var entry of entries) {
      if (!entry.isFile() || (!entry.name.endsWith('.js') && entry.name !== 'hooks.json')) continue;
      hooks.push({ id: entry.name.replace('.js', ''), path: 'commander/cowork-plugin/hooks/' + entry.name });
    }
  } catch (_) {}
  return hooks;
}

// ─── YAML serializer (no deps) ────────────────────────────────

function toYaml(obj, indent) {
  indent = indent || 0;
  var pad = '  '.repeat(indent);
  var childPad = '  '.repeat(indent + 1);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]\n';
    return obj.map(function(item) {
      if (typeof item === 'object' && item !== null) {
        var keys = Object.keys(item);
        if (keys.length === 0) return pad + '- {}\n';
        var firstKey = keys[0];
        var firstVal = item[firstKey];
        var firstLine = pad + '- ' + firstKey + ': ' + yamlScalar(firstVal) + '\n';
        var rest = keys.slice(1).map(function(key) {
          var val = item[key];
          if (typeof val === 'object' && val !== null) {
            return childPad + key + ':\n' + toYaml(val, indent + 2);
          }
          return childPad + key + ': ' + yamlScalar(val) + '\n';
        }).join('');
        return firstLine + rest;
      }
      return pad + '- ' + yamlScalar(item) + '\n';
    }).join('');
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).map(function(key) {
      var val = obj[key];
      if (typeof val === 'object' && val !== null) {
        return pad + key + ':\n' + toYaml(val, indent + 1);
      }
      return pad + key + ': ' + yamlScalar(val) + '\n';
    }).join('');
  }
  return pad + yamlScalar(obj) + '\n';
}

function yamlScalar(val) {
  if (typeof val === 'string') {
    if (val.includes(':') || val.includes('#') || val.includes('"') || val.includes("'")) {
      return '"' + val.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return val || '""';
  }
  return String(val);
}

// ─── Generate registry ────────────────────────────────────────

function generateRegistry() {
  var skillsDir = path.join(ROOT, 'skills');
  var pluginSkillsDir = path.join(ROOT, 'commander', 'cowork-plugin', 'skills');
  var commandsDir = path.join(ROOT, 'commands');
  var agentsDir = path.join(ROOT, 'commander', 'cowork-plugin', 'agents');
  var hooksDir = path.join(ROOT, 'commander', 'cowork-plugin', 'hooks');

  var skills = [].concat(scanSkillDirs(skillsDir, 'free'), scanSkillDirs(pluginSkillsDir, 'free'));
  var commands = scanCommandFiles(commandsDir);
  var agents = scanAgents(agentsDir);
  var hooks = scanHooks(hooksDir);

  var modes = [
    { id: 'race', trigger: '/mode race', costProfile: 'haiku-first' },
    { id: 'production', trigger: '/mode production', costProfile: 'sonnet-opus-mix' },
    { id: 'learning', trigger: '/mode learning', costProfile: 'sonnet' },
    { id: 'silent', trigger: '/mode silent', costProfile: 'haiku' },
    { id: 'explore', trigger: '/mode explore', costProfile: 'sonnet' },
    { id: 'deep', trigger: '/mode deep', costProfile: 'opus-xhigh' },
    { id: 'vibe', trigger: '/mode vibe', costProfile: 'sonnet' },
  ];

  var registry = {
    generated: new Date().toISOString().split('T')[0],
    version: require(path.join(ROOT, 'package.json')).version,
    skills: skills,
    agents: agents,
    modes: modes,
    commands: commands,
    hooks: hooks,
  };

  return registry;
}

// ─── Registry parser (minimal YAML → object for drift check) ──

function parseRegistryIds(yamlText, key) {
  var ids = [];
  var inSection = false;
  var lines = yamlText.split('\n');
  for (var line of lines) {
    var trimmed = line.trim();
    if (trimmed === key + ':') { inSection = true; continue; }
    if (inSection) {
      if (trimmed.startsWith('- id:')) {
        ids.push(trimmed.replace('- id:', '').trim().replace(/^"|"$/g, ''));
      } else if (trimmed && !trimmed.startsWith('-') && trimmed.endsWith(':')) {
        inSection = false;
      }
    }
  }
  return ids;
}

// ─── Main ─────────────────────────────────────────────────────

var CHECK_MODE = process.argv.includes('--check');
var GENERATE_MODE = process.argv.includes('--generate');

var registry = generateRegistry();

if (GENERATE_MODE || (!CHECK_MODE && !GENERATE_MODE)) {
  // Generate/overwrite registry.yaml
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  var yaml = '# CC Commander Registry — auto-generated by scripts/build-from-registry.js\n# DO NOT edit by hand. Run: node scripts/build-from-registry.js --generate\n\n' + toYaml(registry);
  fs.writeFileSync(REGISTRY_PATH, yaml);
  if (!CHECK_MODE) {
    process.stdout.write('Registry generated: ' + REGISTRY_PATH + '\n');
    process.stdout.write('  skills: ' + registry.skills.length + '\n');
    process.stdout.write('  agents: ' + registry.agents.length + '\n');
    process.stdout.write('  commands: ' + registry.commands.length + '\n');
    process.stdout.write('  hooks: ' + registry.hooks.length + '\n');
    process.exit(0);
  }
}

if (CHECK_MODE) {
  // Load existing registry and compare
  if (!fs.existsSync(REGISTRY_PATH)) {
    process.stdout.write('FAIL: registry.yaml not found at ' + REGISTRY_PATH + '\n');
    process.stdout.write('Run: node scripts/build-from-registry.js --generate\n');
    process.exit(1);
  }

  var existingYaml = fs.readFileSync(REGISTRY_PATH, 'utf8');
  var existingSkillIds = parseRegistryIds(existingYaml, 'skills');
  var existingAgentIds = parseRegistryIds(existingYaml, 'agents');

  var currentSkillIds = registry.skills.map(function(s) { return s.id; });
  var currentAgentIds = registry.agents.map(function(a) { return a.id; });

  var missingSkills = currentSkillIds.filter(function(id) { return !existingSkillIds.includes(id); });
  var extraSkills = existingSkillIds.filter(function(id) { return !currentSkillIds.includes(id); });
  var missingAgents = currentAgentIds.filter(function(id) { return !existingAgentIds.includes(id); });
  var extraAgents = existingAgentIds.filter(function(id) { return !currentAgentIds.includes(id); });

  var hasDrift = missingSkills.length > 0 || extraSkills.length > 0 || missingAgents.length > 0 || extraAgents.length > 0;

  if (hasDrift) {
    if (missingSkills.length > 0) process.stdout.write('DRIFT: skills in filesystem but not in registry: ' + missingSkills.slice(0, 5).join(', ') + (missingSkills.length > 5 ? ' (+' + (missingSkills.length - 5) + ' more)' : '') + '\n');
    if (extraSkills.length > 0) process.stdout.write('DRIFT: skills in registry but not in filesystem: ' + extraSkills.slice(0, 5).join(', ') + (extraSkills.length > 5 ? ' (+' + (extraSkills.length - 5) + ' more)' : '') + '\n');
    if (missingAgents.length > 0) process.stdout.write('DRIFT: agents in filesystem but not in registry: ' + missingAgents.join(', ') + '\n');
    if (extraAgents.length > 0) process.stdout.write('DRIFT: agents in registry but not in filesystem: ' + extraAgents.join(', ') + '\n');
    process.stdout.write('FAIL: registry drift detected. Run: node scripts/build-from-registry.js --generate\n');
    process.exit(1);
  } else {
    process.stdout.write('PASS: registry is in sync (' + currentSkillIds.length + ' skills, ' + currentAgentIds.length + ' agents)\n');
    process.exit(0);
  }
}
