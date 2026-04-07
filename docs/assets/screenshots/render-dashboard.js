#!/usr/bin/env node
'use strict';
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
  }
};

if (scenes[scenario]) scenes[scenario]();
