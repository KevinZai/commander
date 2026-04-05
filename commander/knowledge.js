'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');

var KNOWLEDGE_DIR = path.join(os.homedir(), '.claude', 'commander', 'knowledge');

function ensureDir() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}

/**
 * Extract lessons from a completed session and store them.
 * This is our CE /compound equivalent.
 * @param {object} session - Completed session object
 * @param {string} result - Claude Code output text
 * @returns {object} The saved lesson
 */
function extractAndStore(session, result) {
  ensureDir();
  var resultText = typeof result === 'string' ? result : JSON.stringify(result || '');

  var lesson = {
    id: 'kl-' + Date.now(),
    sessionId: session.id,
    timestamp: new Date().toISOString(),
    task: session.task || '',
    outcome: session.outcome || 'unknown',
    cost: session.cost || 0,
    duration: session.duration || 0,
    // Extract keywords from task for future matching
    keywords: extractKeywords(session.task || ''),
    // Categorize by task type
    category: categorizeTask(session.task || ''),
    // Store result summary (first 1000 chars)
    resultSummary: resultText.slice(0, 1000),
    // Extract patterns
    patterns: {
      techStack: extractTechMentions(session.task + ' ' + resultText),
      errorPatterns: extractErrors(resultText),
      successPatterns: extractSuccesses(resultText),
    },
  };

  var filePath = path.join(KNOWLEDGE_DIR, lesson.id + '.json');
  fs.writeFileSync(filePath, JSON.stringify(lesson, null, 2));
  return lesson;
}

/**
 * Search knowledge base for lessons relevant to a task.
 * Returns top N matches scored by keyword overlap.
 * @param {string} task - Task description to match against
 * @param {number} limit - Max results (default 3)
 * @returns {Array} Matching lessons sorted by relevance
 */
function searchRelevant(task, limit) {
  if (!limit) limit = 3;
  ensureDir();
  var taskKeywords = extractKeywords(task);
  if (taskKeywords.length === 0) return [];

  var lessons = listAll();
  var scored = lessons.map(function(lesson) {
    var overlap = 0;
    taskKeywords.forEach(function(kw) {
      if (lesson.keywords.indexOf(kw) >= 0) overlap++;
      // Also check category match
      if (lesson.category === categorizeTask(task)) overlap += 2;
    });
    return { lesson: lesson, score: overlap };
  });

  return scored
    .filter(function(s) { return s.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, limit)
    .map(function(s) { return s.lesson; });
}

/**
 * Build a system prompt injection from relevant past lessons.
 * "We hit this before, solution's here."
 * @param {string} task - Current task
 * @returns {string} System prompt addition (empty if no matches)
 */
function buildKnowledgePrompt(task) {
  if (!task) return '';
  var relevant = searchRelevant(task, 3);
  if (relevant.length === 0) return '';

  var parts = ['\n\n--- PAST LESSONS (from CC Commander knowledge base) ---'];
  relevant.forEach(function(lesson, i) {
    parts.push('\nLesson ' + (i + 1) + ': ' + lesson.task);
    parts.push('Outcome: ' + lesson.outcome + ' | Cost: $' + (lesson.cost || 0).toFixed(2));
    if (lesson.patterns.techStack.length > 0) {
      parts.push('Tech used: ' + lesson.patterns.techStack.join(', '));
    }
    if (lesson.patterns.errorPatterns.length > 0) {
      parts.push('Known issues: ' + lesson.patterns.errorPatterns.join('; '));
    }
    if (lesson.patterns.successPatterns.length > 0) {
      parts.push('What worked: ' + lesson.patterns.successPatterns.join('; '));
    }
    if (lesson.resultSummary) {
      parts.push('Summary: ' + lesson.resultSummary.slice(0, 300));
    }
  });
  parts.push('\n--- END PAST LESSONS ---');
  return parts.join('\n');
}

/**
 * Get all stored lessons.
 * @returns {Array}
 */
function listAll() {
  ensureDir();
  try {
    return fs.readdirSync(KNOWLEDGE_DIR)
      .filter(function(f) { return f.endsWith('.json'); })
      .map(function(f) {
        try { return JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, f), 'utf8')); }
        catch (_e) { return null; }
      })
      .filter(Boolean)
      .sort(function(a, b) { return b.timestamp.localeCompare(a.timestamp); });
  } catch (_e) { return []; }
}

/**
 * Get knowledge stats.
 * @returns {object}
 */
function getStats() {
  var all = listAll();
  var categories = {};
  var totalCost = 0;
  all.forEach(function(l) {
    categories[l.category] = (categories[l.category] || 0) + 1;
    totalCost += l.cost || 0;
  });
  return { total: all.length, categories: categories, totalCost: totalCost };
}

// ─── Extraction Helpers ───────────────────────────────────────────

var STOP_WORDS = ['a','an','the','is','it','to','of','in','for','on','with','and','or','but','that','this','my','your','i','we','me','do','be','at','by','from','as'];

function extractKeywords(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(function(w) { return w.length > 2 && STOP_WORDS.indexOf(w) < 0; })
    .filter(function(w, i, arr) { return arr.indexOf(w) === i; }); // dedupe
}

function categorizeTask(task) {
  var t = task.toLowerCase();
  if (/\b(website|web app|landing|frontend|react|next|html|css|ui|ux)\b/.test(t)) return 'web';
  if (/\b(api|backend|server|rest|graphql|endpoint|database)\b/.test(t)) return 'api';
  if (/\b(cli|script|tool|automation|bash)\b/.test(t)) return 'cli';
  if (/\b(blog|article|content|writing|post|copy)\b/.test(t)) return 'content';
  if (/\b(social|twitter|linkedin|instagram|thread)\b/.test(t)) return 'social';
  if (/\b(email|campaign|newsletter|sequence)\b/.test(t)) return 'email';
  if (/\b(research|analysis|competitive|market|audit|seo)\b/.test(t)) return 'research';
  if (/\b(test|testing|e2e|unit|integration|qa)\b/.test(t)) return 'testing';
  if (/\b(deploy|ci|cd|docker|aws|infrastructure)\b/.test(t)) return 'devops';
  if (/\b(fix|bug|debug|error|issue|broken)\b/.test(t)) return 'bugfix';
  return 'general';
}

function extractTechMentions(text) {
  var techs = ['react','next','vue','angular','svelte','express','fastify','node','python','typescript',
    'javascript','tailwind','prisma','drizzle','postgres','mongodb','redis','docker','aws','vercel',
    'supabase','firebase','graphql','rest','websocket','playwright','vitest','jest'];
  var t = text.toLowerCase();
  return techs.filter(function(tech) { return t.indexOf(tech) >= 0; });
}

function extractErrors(text) {
  var patterns = [];
  var t = text.toLowerCase();
  if (t.indexOf('error') >= 0 || t.indexOf('failed') >= 0 || t.indexOf('bug') >= 0) {
    // Extract lines containing error keywords
    text.split('\n').forEach(function(line) {
      if (/error|failed|exception|crash|undefined|null/i.test(line) && line.length < 200) {
        patterns.push(line.trim().slice(0, 150));
      }
    });
  }
  return patterns.slice(0, 5);
}

function extractSuccesses(text) {
  var patterns = [];
  text.split('\n').forEach(function(line) {
    if (/✓|passed|success|complete|shipped|deployed|working/i.test(line) && line.length < 200) {
      patterns.push(line.trim().slice(0, 150));
    }
  });
  return patterns.slice(0, 5);
}

function loadAllLessons() {
  var dir = KNOWLEDGE_DIR;
  if (!fs.existsSync(dir)) return [];
  var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.json'); });
  var lessons = [];
  files.forEach(function(f) {
    try { lessons.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch(_) {}
  });
  return lessons;
}

function getModelPreference(category) {
  var lessons = loadAllLessons();
  var relevant = lessons.filter(function(l) { return l.category === category; });
  if (relevant.length < 3) return null;
  var successes = relevant.filter(function(l) { return l.outcome === 'success'; });
  var avgCost = successes.length > 0 ? successes.reduce(function(s, l) { return s + (l.cost || 0); }, 0) / successes.length : 0;
  var successRate = relevant.length > 0 ? successes.length / relevant.length : 0;
  return {
    category: category,
    sessions: relevant.length,
    successRate: Math.round(successRate * 100),
    avgCost: Math.round(avgCost * 100) / 100,
    suggestion: successRate > 0.8 ? 'High success rate for ' + category + ' tasks' : 'Consider more thorough specs for ' + category + ' tasks',
  };
}

module.exports = { getModelPreference: getModelPreference, loadAllLessons: loadAllLessons,
  KNOWLEDGE_DIR: KNOWLEDGE_DIR,
  extractAndStore: extractAndStore,
  searchRelevant: searchRelevant,
  buildKnowledgePrompt: buildKnowledgePrompt,
  listAll: listAll,
  getStats: getStats,
  extractKeywords: extractKeywords,
  categorizeTask: categorizeTask,
};
