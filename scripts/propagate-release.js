#!/usr/bin/env node
'use strict';

// Writes docs/release.json: the version and counts the site and docs consume,
// read from the two sources of truth (package.json and commander/contract.json).
// No timestamps, so the file is reproducible and `--check` can compare bytes.
//
//   node scripts/propagate-release.js           write docs/release.json
//   node scripts/propagate-release.js --check   exit 1 if it is missing or stale

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var OUT = path.join(ROOT, 'docs', 'release.json');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function build() {
  var pkg = readJson('package.json');
  var contract = readJson('commander/contract.json');
  if (pkg.version !== contract.version) {
    throw new Error('package.json (' + pkg.version + ') and commander/contract.json (' + contract.version + ') disagree on the version; run npm run check:version');
  }
  return {
    schema: 1,
    version: pkg.version,
    tag: 'v' + pkg.version,
    package_name: contract.package_name,
    plugin_name: contract.plugin_name,
    marketplace_name: contract.marketplace_name,
    repo: contract.repo,
    homepage: contract.homepage,
    license: contract.license,
    counts: {
      plugin_skills: contract.plugin_skills,
      specialist_agents: contract.specialist_agents,
      lifecycle_hooks: contract.lifecycle_hooks,
      hook_handlers: contract.hook_handlers,
      bundled_mcp_servers: contract.bundled_mcp_servers,
      opt_in_mcp_servers: contract.opt_in_mcp_servers,
      ecosystem_skills: contract.ecosystem_skills,
      ccc_domains: contract.ccc_domains,
    },
    sources: ['package.json', 'commander/contract.json'],
  };
}

function render(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function main(argv) {
  var check = argv.indexOf('--check') !== -1;
  var expected;
  try {
    expected = render(build());
  } catch (e) {
    console.error('propagate-release: ' + e.message);
    return 1;
  }
  if (check) {
    var current = '';
    try { current = fs.readFileSync(OUT, 'utf8'); } catch (e) { /* missing */ }
    if (current !== expected) {
      console.error('docs/release.json is missing or stale; run: node scripts/propagate-release.js');
      return 1;
    }
    console.log('docs/release.json is current');
    return 0;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, expected);
  console.log('wrote docs/release.json');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { build: build, render: render };
