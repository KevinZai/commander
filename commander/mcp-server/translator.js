'use strict';

/**
 * IDE-specific translation layer for MCP tool responses.
 * Normalizes Commander output to match IDE expectations.
 *
 * Supported IDEs: claude-code, cursor, windsurf, zed, generic
 */

function detectIde() {
  var agent = process.env.MCP_CLIENT_AGENT || '';
  if (agent.includes('cursor')) return 'cursor';
  if (agent.includes('windsurf')) return 'windsurf';
  if (agent.includes('zed')) return 'zed';
  if (agent.includes('claude')) return 'claude-code';
  return 'generic';
}

/**
 * Wrap a result payload into an MCP content block array.
 * @param {any} data
 * @param {string} [ide]
 * @returns {Array<{type: string, text: string}>}
 */
function toContent(data, ide) {
  var json = JSON.stringify(data, null, 2);
  // All supported IDEs accept text/plain content blocks
  return [{ type: 'text', text: json }];
}

/**
 * Format a skill entry for display in a given IDE.
 * @param {{id: string, name: string, domain: string, tier: string, description: string}} skill
 * @param {string} [ide]
 * @returns {string}
 */
function formatSkillEntry(skill, ide) {
  ide = ide || detectIde();
  var badge = skill.tier === 'pro' ? '[Pro]' : '[Free]';
  var domain = skill.domain !== 'general' ? ' (' + skill.domain + ')' : '';
  return skill.name + domain + ' ' + badge + '\n  ' + (skill.description || 'No description');
}

/**
 * Translate a tool call result to MCP response format.
 * @param {string} toolName
 * @param {any} result
 * @param {string} [ide]
 * @returns {{content: Array<{type: string, text: string}>}}
 */
function translateResult(toolName, result, ide) {
  ide = ide || detectIde();
  return { content: toContent(result, ide) };
}

/**
 * Translate an error to MCP error response format.
 * @param {Error|string} err
 * @returns {{content: Array<{type: string, text: string}>, isError: boolean}}
 */
function translateError(err) {
  var message = typeof err === 'string' ? err : (err && err.message) ? err.message : 'Unknown error';
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

module.exports = { detectIde, toContent, formatSkillEntry, translateResult, translateError };
