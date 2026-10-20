'use strict';

// Pure preflight cost estimator (CC-318 slice 1). No I/O, no agent launch, no spend:
// callers pass a price table (fixture or settings) and the numbers it needs.

function round(n) { return Math.round(n * 100) / 100; }

function tierCost(tier, inTokens, outTokens) {
  return (inTokens * tier.inPerM + outTokens * tier.outPerM) / 1e6;
}

function estimate(task, table) {
  var mult = table.complexity[task.complexity || 'medium'];
  if (mult === undefined) throw new Error('unknown complexity: ' + task.complexity);
  var files = Math.max(0, task.fileCount || 0);
  var inTokens = (task.tokens !== undefined ? task.tokens : files * table.tokensPerFile) * mult;
  var outTokens = inTokens * table.outputRatio;
  var options = Object.keys(table.tiers).map(function(id) {
    var t = table.tiers[id];
    return { id: id, label: t.label, quality: t.quality, cost: tierCost(t, inTokens, outTokens) };
  });
  var h = table.hybrid;
  var plan = table.tiers[h.plan];
  var exec = table.tiers[h.exec];
  options.push({
    id: 'hybrid', label: 'Hybrid', quality: h.quality,
    cost: tierCost(plan, inTokens * h.planShare, outTokens * h.planShare) +
          tierCost(exec, inTokens * (1 - h.planShare), outTokens * (1 - h.planShare))
  });
  var top = Math.max.apply(null, options.map(function(o) { return o.cost; }));
  options.forEach(function(o) {
    o.savingsPct = top > 0 ? Math.round((1 - o.cost / top) * 100) : 0;
    o.cost = round(o.cost);
  });
  options.sort(function(a, b) { return b.cost - a.cost; });
  return { inTokens: inTokens, outTokens: outTokens, options: options };
}

// Spending exactly up to the limit is allowed; only exceeding it is declined.
function checkBudget(cost, budget) {
  budget = budget || {};
  var checks = [
    ['daily', budget.dailyLimit, budget.spentToday],
    ['monthly', budget.monthlyLimit, budget.spentMonth]
  ];
  for (var i = 0; i < checks.length; i++) {
    var name = checks[i][0], limit = checks[i][1], spent = checks[i][2] || 0;
    if (limit === undefined || limit === null) continue;
    if (round(spent + cost) > limit) {
      if (budget.override) return { allowed: true, overridden: true, reason: name + ' budget exceeded, overridden' };
      return { allowed: false, reason: name + ' budget exceeded' };
    }
  }
  return { allowed: true };
}

// Vibe mode trusts the agent: no gate, no prompt.
function preflight(task, table, budget, mode) {
  if (mode === 'vibe') return { gated: false, mode: 'vibe' };
  var est = estimate(task, table);
  var decisions = {};
  est.options.forEach(function(o) { decisions[o.id] = checkBudget(o.cost, budget); });
  return { gated: true, estimate: est, decisions: decisions };
}

module.exports = { estimate: estimate, checkBudget: checkBudget, preflight: preflight };
