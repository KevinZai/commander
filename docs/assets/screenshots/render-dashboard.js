#!/usr/bin/env node
var tui = require('../../../commander/tui');
var cockpit = require('../../../commander/cockpit');
var brand = require('../../../commander/branding');

var scenario = process.argv[2] || 'hero';

var scenes = {
  hero: function() {
    console.log(tui.renderLogo());
    console.log(cockpit.renderCockpitStatus({
      model: 'Opus4.6-1M', thinking: true, cost: 2.34,
      inputTokens: 640000, outputTokens: 84000, duration: '8m12s',
      contextPct: 45, ratePct: 23, sessionMinutes: 48,
      weekCost: 12.5, weekBudget: 50,
      linearTicket: 'CC-186', linearTitle: 'X Thread Launch',
      skillCount: 455, vendorCount: 17, activeSkill: 'ccc-marketing',
      cwd: '~/project'
    }));
    console.log(cockpit.renderCockpitFooter({
      model: 'Opus4.6-1M', cost: 2.34,
      inputTokens: 640000, outputTokens: 84000, totalMinutes: 48,
      contextPct: 45, sessionMinutes: 48, weekCost: 12.5, weekBudget: 50,
      skillCount: 455, linearTicket: 'CC-186', cwd: '~/project'
    }));
  },
  meters: function() {
    console.log(cockpit.renderCockpitStatus({
      model: 'Opus4.6-1M', thinking: true, cost: 4.87,
      inputTokens: 1200000, outputTokens: 194000, duration: '42m',
      contextPct: 72, ratePct: 58, sessionMinutes: 180,
      weekCost: 34, weekBudget: 50,
      linearTicket: 'CC-179', linearTitle: 'Nightwatch Build',
      skillCount: 455, vendorCount: 17, activeSkill: 'systematic-debugging',
      cwd: '~/myapp'
    }));
  },
  footer: function() {
    console.log(cockpit.renderCockpitFooter({
      model: 'Opus4.6-1M', cost: 2.34,
      inputTokens: 640000, outputTokens: 84000, totalMinutes: 48,
      contextPct: 45, sessionMinutes: 48, weekCost: 12.5, weekBudget: 50,
      skillCount: 455, linearTicket: 'CC-186', cwd: '~/project'
    }));
  },
  banner: function() {
    console.log(cockpit.renderBanner(brand.tagline, 'cc-commander'));
  },
  mainmenu: function() {
    var t = tui.getTheme();
    console.log(cockpit.renderBanner(brand.tagline, 'my-saas-app'));
    console.log('');
    var items = [
      { label: 'Build something new', desc: 'websites, APIs, CLI tools, SaaS' },
      { label: 'Review & improve code', desc: 'code review, refactor, security audit' },
      { label: 'Test & verify', desc: 'TDD, E2E, coverage, QA' },
      { label: 'Research & plan', desc: 'spec interview, architecture, competitive' },
      { label: 'Marketing & content', desc: '46 skills — SEO, social, email, CRO' },
      { label: 'DevOps & deploy', desc: 'CI/CD, Docker, AWS, monitoring' },
      { label: 'YOLO Mode', desc: 'autonomous overnight build with checkpoints' },
      { label: 'Browse 455+ skills', desc: '11 CCC domains, searchable catalog' },
      { label: 'Settings', desc: 'theme, model, Linear, skill tiers' },
    ];
    var BOLD = '\x1b[1m';
    var RESET = '\x1b[0m';
    var DIM = '\x1b[38;2;80;80;120m';
    for (var i = 0; i < items.length; i++) {
      if (i === 0) {
        process.stdout.write('  ' + tui.gradient('\u276f ' + items[i].label, t.logo.gradient) + DIM + '  ' + items[i].desc + RESET + '\n');
      } else {
        process.stdout.write('    ' + DIM + items[i].label + '  ' + items[i].desc + RESET + '\n');
      }
    }
    console.log('');
    console.log(cockpit.renderCockpitFooter({
      model: 'Opus4.6-1M', cost: 0.12, inputTokens: 42000, outputTokens: 8000,
      totalMinutes: 3, contextPct: 8, sessionMinutes: 3, weekCost: 4.2, weekBudget: 50,
      skillCount: 455, cwd: '~/my-saas-app'
    }));
  },
  domains: function() {
    console.log(cockpit.renderBanner('11 CCC Domains — one skill loads an entire specialty', 'cc-commander'));
    console.log('');
    var BOLD = '\x1b[1m';
    var RESET = '\x1b[0m';
    var DIM = '\x1b[38;2;80;80;120m';
    var CYAN = '\x1b[38;2;0;255;255m';
    var PINK = '\x1b[38;2;255;0;128m';
    var domains = [
      ['ccc-marketing', '46 skills', 'content, SEO, CRO, email, ads, analytics, launch'],
      ['ccc-design', '35+ skills', 'animations, SVG, polish suite, responsive, a11y'],
      ['ccc-devops', '20 skills', 'CI/CD, Docker, AWS, Terraform, monitoring'],
      ['ccc-saas', '20 skills', 'auth, billing, database, API, multi-tenant'],
      ['ccc-seo', '19 skills', 'technical SEO, AI search, schema, programmatic'],
      ['ccc-testing', '15 skills', 'TDD, E2E, visual testing, load testing, QA'],
      ['ccc-security', '9 skills', 'OWASP, pen-test, secrets, supply chain'],
      ['ccc-data', '8 skills', 'ETL, analytics, ML ops, data quality'],
      ['ccc-research', '8 skills', 'deep research, competitive, cross-model review'],
      ['ccc-mobile', '8 skills', 'React Native, Flutter, SwiftUI, ASO'],
      ['ccc-makeover', '3 skills', 'xray health audit + auto-fix + report card'],
    ];
    for (var i = 0; i < domains.length; i++) {
      var d = domains[i];
      process.stdout.write('  ' + CYAN + BOLD + d[0] + RESET + '  ' + PINK + d[1] + RESET + '  ' + DIM + d[2] + RESET + '\n');
    }
    console.log('');
    process.stdout.write('  ' + DIM + 'Load one domain. Get the entire specialty. /ccc-marketing loads 46 skills instantly.' + RESET + '\n');
  },
  intelligence: function() {
    console.log(cockpit.renderBanner('Intelligence Layer — CCC thinks before it acts', 'cc-commander'));
    console.log('');
    var BOLD = '\x1b[1m';
    var RESET = '\x1b[0m';
    var DIM = '\x1b[38;2;80;80;120m';
    var CYAN = '\x1b[38;2;0;255;255m';
    var PINK = '\x1b[38;2;255;0;128m';
    var GREEN = '\x1b[38;2;0;255;128m';
    var YELLOW = '\x1b[38;2;255;200;50m';
    console.log('  ' + BOLD + CYAN + 'Task Complexity Scoring' + RESET + '  ' + DIM + '47 keyword signals → 0-100 score' + RESET);
    console.log('  ' + DIM + '  "fix typo"         → ' + GREEN + '15/100' + RESET + DIM + '  →  Haiku, 15 turns, $2 cap' + RESET);
    console.log('  ' + DIM + '  "build auth system" → ' + YELLOW + '72/100' + RESET + DIM + '  →  Sonnet, 40 turns, $8 cap' + RESET);
    console.log('  ' + DIM + '  "redesign platform" → ' + PINK + '95/100' + RESET + DIM + '  →  Opus, 50 turns, $10 cap' + RESET);
    console.log('');
    console.log('  ' + BOLD + CYAN + 'Stack Detection' + RESET + '  ' + DIM + 'reads package.json, Dockerfile, go.mod' + RESET);
    console.log('  ' + DIM + '  Detected: Next.js, Prisma, Stripe, Docker, GitHub Actions' + RESET);
    console.log('  ' + DIM + '  Auto-loaded: ccc-saas, ccc-devops, ccc-testing' + RESET);
    console.log('');
    console.log('  ' + BOLD + CYAN + 'Skill Recommendations' + RESET + '  ' + DIM + 'ranked by stack match + usage history' + RESET);
    console.log('  ' + DIM + '  #1 ' + GREEN + 'better-auth' + RESET + DIM + '        score: 92  (stack: Next.js + Prisma)' + RESET);
    console.log('  ' + DIM + '  #2 ' + GREEN + 'billing-automation' + RESET + DIM + '  score: 85  (stack: Stripe detected)' + RESET);
    console.log('  ' + DIM + '  #3 ' + GREEN + 'database-designer' + RESET + DIM + '  score: 78  (stack: Prisma detected)' + RESET);
    console.log('');
    console.log('  ' + BOLD + CYAN + 'Knowledge Compounding' + RESET + '  ' + DIM + 'learns from every session' + RESET);
    console.log('  ' + DIM + '  12 lessons stored  |  fuzzy search  |  7-day: 2x boost  |  30-day: 1.5x' + RESET);
  },
  optimization: function() {
    console.log(cockpit.renderBanner('5-Layer Token Optimization Stack', 'cc-commander'));
    console.log('');
    var BOLD = '\x1b[1m';
    var RESET = '\x1b[0m';
    var DIM = '\x1b[38;2;80;80;120m';
    var CYAN = '\x1b[38;2;0;255;255m';
    var GREEN = '\x1b[38;2;0;255;128m';
    var PINK = '\x1b[38;2;255;0;128m';
    console.log('  ' + BOLD + '  Layer                  Tool              Savings' + RESET);
    console.log('  ' + DIM + '  ─────────────────────────────────────────────────' + RESET);
    console.log('  ' + CYAN + '  Tool output sandboxing' + RESET + '  context-mode     ' + BOLD + GREEN + '98%' + RESET);
    console.log('  ' + CYAN + '  CLI output filtering' + RESET + '   RTK               ' + BOLD + GREEN + '99.5%' + RESET);
    console.log('  ' + CYAN + '  Skill tiering' + RESET + '          _tiers.json       ' + BOLD + GREEN + '~10K tokens' + RESET);
    console.log('  ' + CYAN + '  Rate limit rotation' + RESET + '    ClaudeSwap         ' + BOLD + PINK + '2x capacity' + RESET);
    console.log('  ' + CYAN + '  Prompt caching' + RESET + '         Extended TTL       ' + BOLD + GREEN + '90% discount' + RESET);
    console.log('  ' + DIM + '  ─────────────────────────────────────────────────' + RESET);
    console.log('  ' + DIM + '  All automatic. Zero config. One install.' + RESET);
  }
};

if (scenes[scenario]) scenes[scenario]();
