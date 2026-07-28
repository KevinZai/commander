#!/usr/bin/env node
'use strict';

// ⚠️  --patch IS ADVISORY. ALWAYS `git diff` ITS OUTPUT BEFORE COMMITTING.
//
// Deciding whether a version reference in prose is "current" or "historical" is a
// natural-language judgement, and six consecutive adversarial review rounds each
// defeated the heuristic with a new phrasing ("vX ships", spelled-out "version",
// "as of now", "Historical release note:", "from vX onward", "vX or newer"…).
// Each miss silently falsified a committed doc — usually a release date or a
// compatibility floor, which then tells users to upgrade past a version that
// already works for them.
//
// The guards below (HISTORY_HINT, HISTORY_LEAD_IN, isSafeToPatch) close every case
// found so far and are pinned by commander/tests/contract-patch-safety.test.js.
// They are NOT proof of correctness — assume the next phrasing is still unhandled.
// --check is the trustworthy half: it reports liberally and is the release gate.
// This file is maintainer tooling only; it is not published to npm and not part of
// the shipped plugin.

var fs = require('fs');
var path = require('path');

var REQUIRED_FIELDS = {
  version: 'string',
  plugin_skills: 'number',
  specialist_agents: 'number',
  lifecycle_hooks: 'number',
  hook_handlers: 'number',
  bundled_mcp_servers: 'number',
  opt_in_mcp_servers: 'number',
  ecosystem_skills: 'number',
  ccc_domains: 'number',
  package_name: 'string',
  plugin_name: 'string',
  plugin_displayName: 'string',
  marketplace_name: 'string',
  repo: 'string',
  homepage: 'string',
  command_prefix: 'string',
  license: 'string',
  pricing_model: 'string',
  hosted_mcp_status: 'string',
  claude_code_compat: 'string',
  codex_cli_compat: 'string',
  codex_desktop_compat: 'string',
  cursor_windsurf_compat: 'string',
};

var TEXT_SURFACES = [
  'README.md',
  'CLAUDE.md',
  'SKILLS-INDEX.md',
  'BIBLE.md',
  'CHEATSHEET.md',
  'docs/POSITIONING-SNIPPET.md',
  'docs/plugin.md',
  'docs/cli.md',
  'docs/WHY-CCC.md',
];

var JSON_SURFACES = [
  'commander/cowork-plugin/.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  'apps/mcp-server-cloud/package.json',
];

function parseArgs(argv) {
  var args = {
    mode: 'report',
    root: path.join(__dirname, '..'),
  };

  for (var i = 2; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--check') {
      args.mode = 'check';
    } else if (arg === '--report') {
      args.mode = 'report';
    } else if (arg === '--patch') {
      args.mode = 'patch';
    } else if (arg === '--root') {
      i++;
      if (!argv[i]) usage('Missing value for --root');
      args.root = path.resolve(argv[i]);
    } else {
      usage('Unknown argument: ' + arg);
    }
  }

  return args;
}

function usage(message) {
  if (message) process.stderr.write('ERROR: ' + message + '\n');
  process.stderr.write('Usage: node scripts/check-product-contract.js [--check|--report|--patch] [--root <path>]\n');
  process.exit(2);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readFile(filePath));
}

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

// Historical/rollback pages describe PAST versions on purpose — scanning them as
// current-state surfaces is how release notes got rewritten (v6.8.0 audit finding).
var HISTORICAL_SURFACES = [
  'mintlify-docs/whats-new-v5.mdx',
  'mintlify-docs/plugin/upgrade.mdx',
];

function listMdxFiles(root) {
  var base = path.join(root, 'mintlify-docs');
  var files = [];
  if (!exists(base)) return files;

  function walk(dir) {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(function(entry) {
      var full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        var rel = toPosix(path.relative(root, full));
        if (HISTORICAL_SURFACES.indexOf(rel) === -1) files.push(rel);
      }
    });
  }

  walk(base);
  return files.sort();
}

function getSurfacePaths(root) {
  var rels = TEXT_SURFACES.concat(listMdxFiles(root)).concat(JSON_SURFACES);
  var seen = Object.create(null);
  return rels.filter(function(rel) {
    if (seen[rel]) return false;
    seen[rel] = true;
    return exists(path.join(root, rel));
  });
}

function validateContract(contract) {
  var findings = [];
  Object.keys(REQUIRED_FIELDS).forEach(function(field) {
    var expectedType = REQUIRED_FIELDS[field];
    var actualType = typeof contract[field];
    if (actualType !== expectedType) {
      findings.push({
        surface: 'commander/contract.json',
        field: field,
        expected: expectedType,
        actual: actualType === 'undefined' ? 'missing' : actualType,
        excerpt: field,
        patchable: false,
      });
    }
  });
  return findings;
}

function makeFinding(surface, field, expected, actual, excerpt, patchable) {
  return {
    surface: surface,
    field: field,
    expected: expected,
    actual: actual,
    excerpt: excerpt.replace(/\s+/g, ' ').trim(),
    patchable: Boolean(patchable),
  };
}

function normalizeRepo(value) {
  if (!value) return '';
  var text = String(value);
  text = text.replace(/^git\+/, '');
  text = text.replace(/^https:\/\/github\.com\//, '');
  text = text.replace(/^git@github\.com:/, '');
  text = text.replace(/\.git$/, '');
  return text;
}

function compareDirect(findings, surface, field, expected, actual) {
  if (expected !== actual) {
    findings.push(makeFinding(surface, field, expected, actual === undefined ? 'missing' : actual, field, false));
  }
}

function countFilesNamed(dir, filename) {
  var count = 0;
  if (!exists(dir)) return null;

  function walk(current) {
    fs.readdirSync(current, { withFileTypes: true }).forEach(function(entry) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'vendor') return;
      var full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === filename) {
        count++;
      }
    });
  }

  walk(dir);
  return count;
}

function countTopLevelFiles(dir, ext) {
  if (!exists(dir)) return null;
  return fs.readdirSync(dir, { withFileTypes: true }).filter(function(entry) {
    return entry.isFile() && entry.name.endsWith(ext);
  }).length;
}

function countHookHandlers(hooksConfig) {
  var total = 0;
  Object.keys(hooksConfig.hooks || {}).forEach(function(eventName) {
    (hooksConfig.hooks[eventName] || []).forEach(function(group) {
      total += Array.isArray(group.hooks) ? group.hooks.length : 0;
    });
  });
  return total;
}

function scanFilesystemFacts(root, contract) {
  var findings = [];

  var packagePath = path.join(root, 'package.json');
  if (exists(packagePath)) {
    var pkg = readJson(packagePath);
    compareDirect(findings, '[filesystem]', 'package_name', contract.package_name, pkg.name);
    compareDirect(findings, '[filesystem]', 'version', contract.version, pkg.version);
    compareDirect(findings, '[filesystem]', 'license', contract.license, pkg.license);
    compareDirect(findings, '[filesystem]', 'repo', contract.repo, normalizeRepo(pkg.repository && pkg.repository.url));
  }

  var pluginPath = path.join(root, 'commander/cowork-plugin/.claude-plugin/plugin.json');
  if (exists(pluginPath)) {
    var plugin = readJson(pluginPath);
    compareDirect(findings, '[filesystem]', 'plugin_name', contract.plugin_name, plugin.name);
    compareDirect(findings, '[filesystem]', 'plugin_displayName', contract.plugin_displayName, plugin.displayName);
    compareDirect(findings, '[filesystem]', 'version', contract.version, plugin.version);
    compareDirect(findings, '[filesystem]', 'homepage', contract.homepage, plugin.homepage);
    compareDirect(findings, '[filesystem]', 'license', contract.license, plugin.license);
    compareDirect(findings, '[filesystem]', 'repo', contract.repo, normalizeRepo(plugin.repository));
  }

  var marketplacePath = path.join(root, '.claude-plugin/marketplace.json');
  if (exists(marketplacePath)) {
    var marketplace = readJson(marketplacePath);
    var marketplacePlugin = Array.isArray(marketplace.plugins) ? marketplace.plugins[0] : {};
    compareDirect(findings, '[filesystem]', 'marketplace_name', contract.marketplace_name, marketplace.name);
    compareDirect(findings, '[filesystem]', 'plugin_name', contract.plugin_name, marketplacePlugin && marketplacePlugin.name);
    compareDirect(findings, '[filesystem]', 'plugin_displayName', contract.plugin_displayName, marketplacePlugin && marketplacePlugin.displayName);
    compareDirect(findings, '[filesystem]', 'version', contract.version, marketplacePlugin && marketplacePlugin.version);
    compareDirect(findings, '[filesystem]', 'license', contract.license, marketplacePlugin && marketplacePlugin.license);
  }

  var mcpPackagePath = path.join(root, 'apps/mcp-server-cloud/package.json');
  if (exists(mcpPackagePath)) {
    var mcpPackage = readJson(mcpPackagePath);
    compareDirect(findings, '[filesystem]', 'version', contract.version, mcpPackage.version);
  }

  var pluginSkillCount = countFilesNamed(path.join(root, 'commander/cowork-plugin/skills'), 'SKILL.md');
  if (pluginSkillCount !== null) {
    compareDirect(findings, '[filesystem]', 'plugin_skills', contract.plugin_skills, pluginSkillCount);
  }

  var agentCount = countTopLevelFiles(path.join(root, 'commander/cowork-plugin/agents'), '.md');
  if (agentCount !== null) {
    compareDirect(findings, '[filesystem]', 'specialist_agents', contract.specialist_agents, agentCount);
  }

  var hooksPath = path.join(root, 'commander/cowork-plugin/hooks/hooks.json');
  if (exists(hooksPath)) {
    var hooksConfig = readJson(hooksPath);
    compareDirect(findings, '[filesystem]', 'lifecycle_hooks', contract.lifecycle_hooks, Object.keys(hooksConfig.hooks || {}).length);
    compareDirect(findings, '[filesystem]', 'hook_handlers', contract.hook_handlers, countHookHandlers(hooksConfig));
  }

  var bundledMcpPath = path.join(root, 'commander/cowork-plugin/.mcp.json');
  if (exists(bundledMcpPath)) {
    var bundledMcp = readJson(bundledMcpPath);
    compareDirect(findings, '[filesystem]', 'bundled_mcp_servers', contract.bundled_mcp_servers, Object.keys(bundledMcp.mcpServers || {}).length);
  }

  // Count skills across both the open ecosystem (skills/) and the plugin
  // (commander/cowork-plugin/skills/) since the public claim "502+ skills" is
  // the union of both surfaces. The contract value is a floor — actual count
  // ≥ contract value passes.
  var ecosystemSkillCount =
    (countFilesNamed(path.join(root, 'skills'), 'SKILL.md') || 0) +
    (countFilesNamed(path.join(root, 'commander/cowork-plugin/skills'), 'SKILL.md') || 0);
  if (ecosystemSkillCount > 0 && ecosystemSkillCount < contract.ecosystem_skills) {
    compareDirect(findings, '[filesystem]', 'ecosystem_skills', contract.ecosystem_skills, ecosystemSkillCount);
  }

  var domainsPath = path.join(root, 'commander/adventures/ccc-domains.json');
  if (exists(domainsPath)) {
    var domainsText = readFile(domainsPath);
    var domainMatch = domainsText.match(/\bAll\s+(\d+)\s+CCC domains\b/);
    if (domainMatch) {
      compareDirect(findings, '[filesystem]', 'ccc_domains', contract.ccc_domains, Number(domainMatch[1]));
    }
  }

  return findings;
}

function makeNumberRules(contract) {
  return [
    {
      field: 'plugin_skills',
      expected: contract.plugin_skills,
      regex: /\b(?<value>\d+)\+?\s+plugin skills?\b/gi,
      patchable: true,
    },
    {
      field: 'specialist_agents',
      expected: contract.specialist_agents,
      regex: /\b(?<value>\d+)\s+(?:speciali[sz]ed|specialist)\s+(?:sub-?)?agents?\b/gi,
      patchable: true,
    },
    {
      field: 'specialist_agents',
      expected: contract.specialist_agents,
      regex: /\b(?<value>\d+)\s+specialist\s+(?:sub-agent\s+)?personas?\b/gi,
      patchable: true,
    },
    {
      field: 'lifecycle_hooks',
      expected: contract.lifecycle_hooks,
      regex: /\b(?<value>\d+)\s+lifecycle hooks?\b/gi,
      patchable: true,
    },
    {
      field: 'lifecycle_hooks',
      expected: contract.lifecycle_hooks,
      regex: /\b(?<value>\d+)\s+hook events?\b/gi,
      patchable: true,
    },
    {
      field: 'lifecycle_hooks',
      expected: contract.lifecycle_hooks,
      regex: /\b(?<value>\d+)\s+events\s*,\s*\d+\s+handlers?\b/gi,
      patchable: true,
    },
    {
      field: 'hook_handlers',
      expected: contract.hook_handlers,
      regex: /\b(?<value>\d+)\s+handlers?\b/gi,
      patchable: true,
    },
    {
      field: 'bundled_mcp_servers',
      expected: contract.bundled_mcp_servers,
      regex: /\b(?<value>\d+)\s+(?:credential-free\s+)?bundled MCPs?(?: servers?)?\b/gi,
      patchable: true,
    },
    {
      field: 'bundled_mcp_servers',
      expected: contract.bundled_mcp_servers,
      regex: /\b(?<value>\d+)\s+pre-?configured MCP servers?\b/gi,
      patchable: true,
    },
    {
      field: 'bundled_mcp_servers',
      expected: contract.bundled_mcp_servers,
      regex: /\b(?<value>\d+)\s+core MCP servers? pre-wired\b/gi,
      patchable: true,
    },
    {
      field: 'bundled_mcp_servers',
      expected: contract.bundled_mcp_servers,
      regex: /\bPlus\s+(?<value>\d+)\s+pre-wired MCPs?\b/gi,
      patchable: true,
    },
    {
      field: 'opt_in_mcp_servers',
      expected: contract.opt_in_mcp_servers,
      regex: /\+\s*(?<value>\d+)\s+opt-in\b/gi,
      patchable: true,
    },
    {
      field: 'opt_in_mcp_servers',
      expected: contract.opt_in_mcp_servers,
      regex: /\b(?<value>\d+)\s+opt-in(?: MCPs?| servers?| connectors?| integrations?)\b/gi,
      patchable: true,
    },
    {
      field: 'opt_in_mcp_servers',
      expected: contract.opt_in_mcp_servers,
      regex: /\+\s*(?<value>\d+)\s+more opt-in\b/gi,
      patchable: true,
    },
    {
      field: 'ecosystem_skills',
      expected: contract.ecosystem_skills,
      regex: /\b(?<value>\d+)\+?\s+skills across\s+\d+\s+CCC domains?\b/gi,
      patchable: true,
    },
    {
      field: 'ecosystem_skills',
      expected: contract.ecosystem_skills,
      regex: /\bsame\s+(?<value>\d+)-skill catalog\b/gi,
      patchable: true,
    },
    {
      field: 'ecosystem_skills',
      expected: contract.ecosystem_skills,
      regex: /\b(?<value>\d+)\+?\s+skill catalog\b/gi,
      patchable: true,
    },
    {
      field: 'ecosystem_skills',
      expected: contract.ecosystem_skills,
      regex: /\b(?:all|browse all)\s+(?<value>\d+)\+?\s+skills\b/gi,
      min: 100,
      patchable: true,
    },
    {
      field: 'ecosystem_skills',
      expected: contract.ecosystem_skills,
      regex: /\bFull\s+\((?<value>\d+)\s+skills\)/gi,
      min: 100,
      patchable: true,
    },
    {
      field: 'ecosystem_skills',
      expected: contract.ecosystem_skills,
      regex: /\bAll\s+(?<value>\d+)\s+skills available\b/g,
      min: 100,
      patchable: true,
    },
    {
      field: 'ecosystem_skills',
      expected: contract.ecosystem_skills,
      regex: /\b(?<value>\d+)\+?\s+deeper skills\b/gi,
      patchable: true,
    },
    {
      field: 'ecosystem_skills',
      expected: contract.ecosystem_skills,
      regex: /\b(?<value>\d+)\+?\s+skills as JSON\b/gi,
      patchable: true,
    },
    {
      field: 'ccc_domains',
      expected: contract.ccc_domains,
      regex: /\bacross\s+(?<value>\d+)\s+CCC domains?\b/gi,
      patchable: true,
    },
    {
      field: 'ccc_domains',
      expected: contract.ccc_domains,
      regex: /\b(?<value>\d+)\s+CCC domains?\b/gi,
      patchable: true,
    },
    {
      field: 'ccc_domains',
      expected: contract.ccc_domains,
      regex: /\b(?<value>\d+)\s+(?:specialty\s+)?domain routers?\b/gi,
      patchable: true,
    },
  ];
}

function makeVersionRule(contract) {
  return {
    field: 'version',
    expected: contract.version,
    regex: /\bv?(?<value>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/g,
    patchable: true,
  };
}

function scanNumberRule(content, surface, rule) {
  var findings = [];
  var match;
  rule.regex.lastIndex = 0;
  while ((match = rule.regex.exec(content)) !== null) {
    var value = match.groups && match.groups.value;
    if (!value) continue;
    var actual = Number(value);
    if (!Number.isFinite(actual)) continue;
    if (rule.min && actual < rule.min) continue;
    if (actual !== rule.expected) {
      findings.push(makeFinding(surface, rule.field, rule.expected, actual, match[0], rule.patchable));
    }
  }
  return findings;
}

function scanVersionRule(content, surface, contract) {
  var findings = [];
  var rule = makeVersionRule(contract);
  var match;
  rule.regex.lastIndex = 0;
  while ((match = rule.regex.exec(content)) !== null) {
    var version = match.groups && match.groups.value;
    if (!version || version === contract.version) continue;
    if (!isVersionRelevant(content, match.index, match[0].length)) continue;
    findings.push(makeFinding(surface, 'version', contract.version, version, match[0], true));
  }
  return findings;
}

function isVersionRelevant(content, index, matchLen) {
  // Skip entire documents that announce a specific dated past release (e.g.
  // "**Released 2026-05-28** — v6.0.0 ships four major additions."). Every version
  // mention in a "what's new in vX" style doc describes that historical release, not
  // the current product version — rewriting them to the current version would assert
  // a past release shipped on a date before it existed. Doc-level (not proximity-based)
  // because these pages repeat the historical version number throughout the body.
  if (/\*{0,2}Released\s+\d{4}-\d{2}-\d{2}\*{0,2}/i.test(content)) return false;

  var start = Math.max(0, index - 90);
  var end = Math.min(content.length, index + 90);
  var context = content.slice(start, end);
  // Skip editor/runtime version mentions (e.g. "Claude Code v2.1.154+", "claude update").
  // Those are the host CLI's version, NOT the CC Commander product version, so they
  // must not be flagged as contract drift. Only the ~30 chars immediately before the
  // number are inspected so we don't accidentally suppress a real CCC version nearby.
  var before = content.slice(Math.max(0, index - 45), index);
  if (/claude[\s-]?code/i.test(before)) return false;
  // Historical stamps naming the release a feature first shipped in — rewriting them
  // each release falsifies history (v6.8.0 audit + the recurring --patch corruption
  // class). Both "before" phrasings ("added in vX", "as of vX", "from before vX",
  // "Status (vX") and "after" phrasings ("vX ships a…", "vX makes…", "vX release note").
  if (/(added|introduced|shipped|since|new|as of|from before)\s+(in\s+)?$/i.test(before)) return false;
  // Same class, but with words between the cue and the number — "two new self-contained
  // artifacts in v7.2.0", "what changed in v7.3.0". Bounded to 40 chars with no sentence
  // break so a cue in a previous sentence can't suppress a real current-version ref.
  if (/\b(added|introduced|shipped|new|what changed)\b[^.!?\n]{0,40}\bin\s+$/i.test(before)) return false;
  // "Status (vX)" is historical release-status labelling (e.g. the codex-compat
  // page's "**Status (v6.8.2):**") — BUT only skip it when the surrounding text
  // isn't asserting a CURRENT version, so "current Status (vX)" drift is still caught.
  if (/\bStatus\s*\($/i.test(before) && !/\b(current|latest|now)\b/i.test(context)) return false;
  var after = content.slice(index + (matchLen || 0), index + (matchLen || 0) + 45);
  // "vX ships…", "vX corrects…", "update to vX or later" — the number names the
  // release that did the thing (or the remediation floor), not the current version.
  // EXCEPT when the product name leads it ("CC Commander v7.3.1 ships as a native
  // plugin") — that is a current-state assertion and must still be checked, or the
  // guard silently blinds the gate to the very line it is meant to keep fresh.
  // Accept both "CC Commander v7.3.1" and "CC Commander version 7.3.1" — the latter
  // was a false negative that let genuine current-state drift through.
  // But an explicit historical lead-in ("the release note says: CC Commander v6.0.0
  // ships…") still wins: quoting a past release is not asserting a current version.
  // `before` is only 45 chars, so a {0,60} window here silently truncated — keep the
  // bound inside the slice. Bare "changelog" is NOT a history cue on its own
  // ("obsolete changelog; CC Commander version 6.4.2 ships…" is current-state drift);
  // require a phrasing that actually quotes a past release.
  // "as of" is deliberately NOT here: "as of now, CC Commander version X ships…" is
  // present-tense. Only phrasings that unambiguously quote a PAST release qualify.
  var historicalQuote = /\b(release note|changelog entry|changelog for|previously|back in)\b[^.!?\n;]{0,40}$/i.test(before);
  var productLed = !historicalQuote && /\b(CC Commander|Commander|CCC)\s+(v|version\s+)?$/i.test(before);
  if (!productLed && /^\)?\s*(ships?\b|makes?\b|release note\b|corrects?\b|fixes?\b|or later\b)/i.test(after)) return false;
  return /CC Commander|Commander|cc-commander|commander|Version|version|plugin|npm|should show|expect/i.test(context);
}

// --- patch safety ------------------------------------------------------------
//
// isVersionRelevant is a PROSE HEURISTIC, and four consecutive adversarial review
// rounds each broke it with a new phrasing. It is good enough to *report* on, but
// not to silently rewrite on: the two error directions are wildly asymmetric.
//   over-report  -> a human reads one extra line. Free.
//   over-rewrite -> history is falsified in a committed doc, usually unnoticed.
// So --patch gets a STRICTER predicate than --check. If anything in the vicinity
// hints the reference might be historical, --patch declines and leaves it for the
// human that --check already told. Under-patching is a chore; over-patching is a
// corrupted record — when unsure, do nothing.
// Includes COMPATIBILITY FLOORS ("from vX onward", "vX or newer", "requires vX"),
// not just past-tense history. A floor names the release something became true in;
// bumping it silently tells users to upgrade past a version that already works.
var HISTORY_HINT = /\b(release note|changelog|previously|back in|as of|history|historical|used to|formerly|prior to|before|since|was|were|shipped|introduced|added|launched|old|legacy|deprecated|onward|or newer|or above|or higher|or later|compatible|compatibility|requires|required|minimum|at least|from|v\d+\.\d+)\b/i;

// Historical lead-ins are often a HEADING on the preceding line ("Historical release
// note:\nCC Commander v6.4.2 ships…"), which same-line bounding alone cannot see.
// Must LOOK like a lead-in — a markdown heading, or a short line ending in a colon.
// Matching any sentence that merely mentions "changelog" would freeze the perfectly
// current line that happens to follow it.
var HISTORY_LEAD_IN = /^(#{1,6}\s+|\**)[^\n]{0,80}\b(release notes?|changelog|history|historical|previously|deprecated|legacy|older releases?|past releases?)\b[^\n]{0,40}(:|\**)\s*$/i;

function isSafeToPatch(content, index, matchLen) {
  if (!isVersionRelevant(content, index, matchLen)) return false;
  // Bounded to the SAME LINE. A raw character window bleeds into neighbouring lines,
  // so one "changelog" in an adjacent bullet would freeze patching for a perfectly
  // current line below it — over-conservative to the point of uselessness.
  var lineStart = content.lastIndexOf('\n', index) + 1;
  var lineEndRaw = content.indexOf('\n', index);
  var lineEnd = lineEndRaw === -1 ? content.length : lineEndRaw;
  var line = content.slice(lineStart, lineEnd);
  // Drop the version token itself so its own "v7.3.0" shape can't trip the hint.
  var lineSansMatch =
    line.slice(0, index - lineStart) + line.slice(index - lineStart + (matchLen || 0));
  if (HISTORY_HINT.test(lineSansMatch)) return false;
  // Look back one non-empty line for a historical heading/lead-in.
  var prevEnd = lineStart > 0 ? lineStart - 1 : 0;
  while (prevEnd > 0 && /\s/.test(content.charAt(prevEnd - 1)) && content.charAt(prevEnd - 1) !== '\n') prevEnd--;
  if (prevEnd > 0) {
    var prevStart = content.lastIndexOf('\n', prevEnd - 1) + 1;
    var prevLine = content.slice(prevStart, prevEnd);
    if (prevLine.trim() && HISTORY_LEAD_IN.test(prevLine)) return false;
  }
  return true;
}

function scanCommandPrefix(content, surface, contract) {
  var findings = [];
  var regex = /\/ccc:/g;
  var match;
  while ((match = regex.exec(content)) !== null) {
    findings.push(makeFinding(surface, 'command_prefix', contract.command_prefix, '/ccc:', match[0], false));
  }
  return findings;
}

function scanPricing(content, surface, contract) {
  var findings = [];
  if (!contract.pricing_model) return findings;

  // When a pro/paid tier is planned, absolutist "no paid tier ever" claims are false —
  // flag them as unpatchable (manual fix required) regardless of pricing_model wording.
  if (contract.pro_tier_planned) {
    var absolutistPatterns = [
      /\bno\s+paid\s+tier\s+ever\b/gi,
      /\bnever\s+pay\b/gi,
      /\bno\s+pro\s+tier\b/gi,
      /\bno\s+paid\s+plans?\s+ever\b/gi,
    ];
    absolutistPatterns.forEach(function(re) {
      var m;
      while ((m = re.exec(content)) !== null) {
        findings.push(makeFinding(surface, 'pricing_model', contract.pricing_model, m[0], 'pro tier is planned — absolutist claim is false', false));
      }
    });
  }

  // If the pricing model itself describes a "free-forever" tier, "free forever"
  // prose in docs is correct — don't flag.
  if (/free[- ]?forever/i.test(contract.pricing_model)) return findings;

  var regex = /\b(?:free forever|free-forever|always free|100% free|free for life|permanently free)\b/gi;
  var match;
  while ((match = regex.exec(content)) !== null) {
    findings.push(makeFinding(surface, 'pricing_model', contract.pricing_model, match[0], 'free during launch / Starter tier', false));
  }
  return findings;
}

function scanHostedMcp(content, surface, contract) {
  var findings = [];
  if (contract.hosted_mcp_status !== 'scaffolded-not-deployed') return findings;

  var regex = /(?:hosted[-\s]?MCP|mcp\.cc-commander\.com|MCP only|any MCP-capable client|same \d+\+? skill catalog becomes available|makes most skills available)[^\n.]*/gi;
  var match;
  while ((match = regex.exec(content)) !== null) {
    var text = match[0];
    if (/not live|not deployed|deploy pending|planned|once .*live|when .*live|scaffolded|future|will introduce/i.test(text)) {
      continue;
    }
    findings.push(makeFinding(surface, 'hosted_mcp_status', contract.hosted_mcp_status, 'shipping claim', text, false));
  }
  return findings;
}

function scanCompatibility(content, surface, contract) {
  var findings = [];
  var worksRegex = /\bWorks in[^\n.]*\b(?:Cursor|Windsurf|Codex)\b[^\n.]*/gi;
  var match;
  while ((match = worksRegex.exec(content)) !== null) {
    var text = match[0];
    if (/\bCodex\b/i.test(text) && contract.codex_cli_compat !== 'shipping') {
      findings.push(makeFinding(surface, 'codex_cli_compat', contract.codex_cli_compat, 'shipping claim', text, false));
    }
    if (/\b(?:Cursor|Windsurf)\b/i.test(text) && contract.cursor_windsurf_compat !== 'shipping') {
      findings.push(makeFinding(surface, 'cursor_windsurf_compat', contract.cursor_windsurf_compat, 'shipping claim', text, false));
    }
  }

  // Only flag MCP-only claims when contract isn't already "shipping" or "ready"
  if (contract.cursor_windsurf_compat !== 'shipping' && contract.cursor_windsurf_compat !== 'ready') {
    var mcpOnlyRegex = /\b(?:Cursor|Windsurf)[^\n|]*\|\s*MCP only\b/gi;
    while ((match = mcpOnlyRegex.exec(content)) !== null) {
      findings.push(makeFinding(surface, 'cursor_windsurf_compat', contract.cursor_windsurf_compat, 'MCP-only claim', match[0], false));
    }
  }

  // Only flag codex CLI mentions when contract isn't already "shipping"
  if (contract.codex_cli_compat !== 'shipping') {
    var codexCliRegex = /\bClaude Code,\s*Codex CLI\b/gi;
    while ((match = codexCliRegex.exec(content)) !== null) {
      findings.push(makeFinding(surface, 'codex_cli_compat', contract.codex_cli_compat, 'shipping claim', match[0], false));
    }
  }

  return findings;
}

function scanTextSurface(content, surface, contract) {
  var findings = [];
  makeNumberRules(contract).forEach(function(rule) {
    findings = findings.concat(scanNumberRule(content, surface, rule));
  });
  findings = findings.concat(scanVersionRule(content, surface, contract));
  findings = findings.concat(scanCommandPrefix(content, surface, contract));
  findings = findings.concat(scanPricing(content, surface, contract));
  findings = findings.concat(scanHostedMcp(content, surface, contract));
  findings = findings.concat(scanCompatibility(content, surface, contract));
  return findings;
}

function scanJsonSurface(rel, content, contract) {
  var findings = [];
  var json = JSON.parse(content);

  if (rel === 'commander/cowork-plugin/.claude-plugin/plugin.json') {
    compareDirect(findings, rel, 'plugin_name', contract.plugin_name, json.name);
    compareDirect(findings, rel, 'plugin_displayName', contract.plugin_displayName, json.displayName);
    compareDirect(findings, rel, 'version', contract.version, json.version);
    compareDirect(findings, rel, 'homepage', contract.homepage, json.homepage);
    compareDirect(findings, rel, 'repo', contract.repo, normalizeRepo(json.repository));
    compareDirect(findings, rel, 'license', contract.license, json.license);
  } else if (rel === '.claude-plugin/marketplace.json') {
    var marketplacePlugin = Array.isArray(json.plugins) ? json.plugins[0] : {};
    compareDirect(findings, rel, 'marketplace_name', contract.marketplace_name, json.name);
    compareDirect(findings, rel, 'plugin_name', contract.plugin_name, marketplacePlugin && marketplacePlugin.name);
    compareDirect(findings, rel, 'plugin_displayName', contract.plugin_displayName, marketplacePlugin && marketplacePlugin.displayName);
    compareDirect(findings, rel, 'version', contract.version, marketplacePlugin && marketplacePlugin.version);
    compareDirect(findings, rel, 'license', contract.license, marketplacePlugin && marketplacePlugin.license);
  } else if (rel === 'apps/mcp-server-cloud/package.json') {
    compareDirect(findings, rel, 'version', contract.version, json.version);
  }

  findings = findings.concat(scanTextSurface(content, rel, contract));
  return findings;
}

function replaceNamedNumber(content, regex, expected, min, guard) {
  regex.lastIndex = 0;
  return content.replace(regex, function() {
    var match = arguments[0];
    var groups = arguments[arguments.length - 1];
    var offset = arguments[arguments.length - 3];
    if (!groups || !groups.value) return match;
    if (min && Number(groups.value) < min) return match;
    // Mirror the checker's relevance filter so --patch only rewrites what --check flags
    // (never host CLI versions like "Claude Code v2.1.154", dep ranges, or historical refs).
    // match.length matters: isVersionRelevant inspects the text AFTER the match, and
    // without a length it would inspect the match itself, silently disabling every
    // trailing guard during --patch while --check kept working. That asymmetry is how
    // --patch kept corrupting historical refs the checker correctly left alone.
    if (guard && !guard(content, offset, groups.value, match.length)) return match;
    var index = match.indexOf(groups.value);
    if (index === -1) return match;
    return match.slice(0, index) + String(expected) + match.slice(index + groups.value.length);
  });
}

function patchText(content, contract) {
  var patched = content;
  makeNumberRules(contract).forEach(function(rule) {
    if (rule.patchable) {
      patched = replaceNamedNumber(patched, rule.regex, rule.expected, rule.min);
    }
  });
  var versionRule = makeVersionRule(contract);
  patched = replaceNamedNumber(patched, versionRule.regex, contract.version, versionRule.min, function(text, offset, value, matchLen) {
    // STRICTER than the checker on purpose — see isSafeToPatch. --check still
    // reports everything isVersionRelevant flags; --patch only rewrites the
    // unambiguous subset, so a missed rewrite is a TODO rather than falsified history.
    return value !== contract.version && isSafeToPatch(text, offset, matchLen);
  });
  return patched;
}

function scanSurfaces(root, contract) {
  var surfacePaths = getSurfacePaths(root);
  var findings = [];

  surfacePaths.forEach(function(rel) {
    var full = path.join(root, rel);
    var content = readFile(full);
    if (JSON_SURFACES.indexOf(rel) !== -1) {
      findings = findings.concat(scanJsonSurface(rel, content, contract));
    } else {
      findings = findings.concat(scanTextSurface(content, rel, contract));
    }
  });

  return {
    scanned: surfacePaths.length,
    findings: findings,
  };
}

function applyPatches(root, contract) {
  var surfacePaths = getSurfacePaths(root);
  var changed = [];

  surfacePaths.forEach(function(rel) {
    var full = path.join(root, rel);
    var before = readFile(full);
    var after = patchText(before, contract);
    if (after !== before) {
      fs.writeFileSync(full, after);
      changed.push(rel);
    }
  });

  return changed;
}

function groupFindings(findings) {
  var grouped = Object.create(null);
  findings.forEach(function(finding) {
    if (!grouped[finding.surface]) grouped[finding.surface] = [];
    grouped[finding.surface].push(finding);
  });
  return grouped;
}

function printReport(contract, scan, changed) {
  var findings = scan.findings;
  var grouped = groupFindings(findings);
  var surfaces = Object.keys(grouped).sort();
  var patchable = findings.filter(function(f) { return f.patchable; }).length;
  var unpatchable = findings.length - patchable;

  process.stdout.write('CC Commander product contract report\n');
  process.stdout.write('Contract: commander/contract.json @ ' + contract.version + '\n');
  process.stdout.write('Surfaces scanned: ' + scan.scanned + '\n');
  process.stdout.write('Findings: ' + findings.length + ' (' + patchable + ' patchable, ' + unpatchable + ' manual)\n');
  if (changed && changed.length > 0) {
    process.stdout.write('Patched files: ' + changed.length + '\n');
    changed.forEach(function(rel) {
      process.stdout.write('  - ' + rel + '\n');
    });
  }
  process.stdout.write('\n');

  if (findings.length === 0) {
    process.stdout.write('PASS: no product contract drift found\n');
    return;
  }

  surfaces.forEach(function(surface) {
    process.stdout.write(surface + '\n');
    grouped[surface].forEach(function(finding) {
      process.stdout.write('  - field: ' + finding.field + '\n');
      process.stdout.write('    expected: ' + JSON.stringify(finding.expected) + '\n');
      process.stdout.write('    actual: ' + JSON.stringify(finding.actual) + '\n');
      process.stdout.write('    patchable: ' + finding.patchable + '\n');
      process.stdout.write('    match: ' + JSON.stringify(finding.excerpt) + '\n');
    });
  });
}

function main() {
  var args = parseArgs(process.argv);
  var contractPath = path.join(args.root, 'commander/contract.json');
  if (!exists(contractPath)) {
    process.stderr.write('ERROR: Missing commander/contract.json\n');
    process.exit(1);
  }

  var contract = readJson(contractPath);
  var contractFindings = validateContract(contract);
  var fsFindings = scanFilesystemFacts(args.root, contract);

  if (args.mode === 'patch') {
    var changed = applyPatches(args.root, contract);
    var patchedScan = scanSurfaces(args.root, contract);
    patchedScan.findings = contractFindings.concat(fsFindings).concat(patchedScan.findings);
    printReport(contract, patchedScan, changed);
    process.exit(patchedScan.findings.length === 0 ? 0 : 1);
  }

  var scan = scanSurfaces(args.root, contract);
  scan.findings = contractFindings.concat(fsFindings).concat(scan.findings);
  printReport(contract, scan, []);

  if (args.mode === 'check' && scan.findings.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

// Only self-run as a CLI. Being require-able is what lets the patch-safety
// property be unit-tested instead of hand-verified once per audit round.
if (require.main === module) {
  main();
}

module.exports = {
  isVersionRelevant: isVersionRelevant,
  isSafeToPatch: isSafeToPatch,
  patchText: patchText,
};
