"use strict";

var knowledge = require("./knowledge");
var fs = require("fs");
var path = require("path");

var KNOWLEDGE_DIR = path.join(require("./lib/lane").resolveLane().stateDir, "knowledge");
var ARCHIVE_DIR = path.join(require("./lib/lane").resolveLane().stateDir, "knowledge-archive");

function consolidate() {
  var lessons = knowledge.loadAllLessons();
  if (lessons.length === 0) return { suggestions: [], archived: 0, stats: { total: 0 } };

  // Group by category
  var categories = {};
  lessons.forEach(function (l) {
    var cat = l.category || "general";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(l);
  });

  // Find repeated error patterns
  var suggestions = [];
  Object.keys(categories).forEach(function (cat) {
    var catLessons = categories[cat];
    var errorCounts = {};
    catLessons.forEach(function (l) {
      (l.patterns && l.patterns.errorPatterns || []).forEach(function (e) {
        var key = e.slice(0, 80).toLowerCase().replace(/[^a-z0-9 ]/g, "");
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });
    });
    Object.keys(errorCounts).forEach(function (err) {
      if (errorCounts[err] >= 3) {
        suggestions.push({
          category: cat,
          pattern: err,
          occurrences: errorCounts[err],
          suggestion: "Repeated error in " + cat + " tasks (" + errorCounts[err] + "x): " + err + ". Consider adding a CLAUDE.md rule or pre-check.",
        });
      }
    });
  });

  // Archive old lessons (>30 days)
  var archived = 0;
  var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  lessons.forEach(function (l) {
    if (new Date(l.timestamp).getTime() < cutoff) {
      var src = path.join(KNOWLEDGE_DIR, l.id + ".json");
      var dst = path.join(ARCHIVE_DIR, l.id + ".json");
      try {
        if (fs.existsSync(src)) { fs.renameSync(src, dst); archived++; }
      } catch (_) {}
    }
  });

  // Stats
  var successCount = lessons.filter(function (l) { return l.outcome === "success"; }).length;
  var totalCost = lessons.reduce(function (s, l) { return s + (l.cost || 0); }, 0);

  return {
    suggestions: suggestions,
    archived: archived,
    stats: {
      total: lessons.length,
      successRate: lessons.length > 0 ? Math.round((successCount / lessons.length) * 100) : 0,
      totalCost: Math.round(totalCost * 100) / 100,
      categories: Object.keys(categories).length,
    },
  };
}

module.exports = { consolidate: consolidate };
