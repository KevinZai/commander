'use strict';

var https = require('https');

var API_URL = 'api.linear.app';
var API_PATH = '/graphql';

function getApiKey() {
  return process.env.LINEAR_API_KEY_PERSONAL
    || process.env.LINEAR_API_KEY
    || null;
}

function graphql(query, variables) {
  return new Promise(function(resolve, reject) {
    var key = getApiKey();
    if (!key) { reject(new Error('No Linear API key. Set LINEAR_API_KEY_PERSONAL.')); return; }

    var body = JSON.stringify({ query: query, variables: variables || {} });
    var req = https.request({
      hostname: API_URL, path: API_PATH, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': key, 'Content-Length': Buffer.byteLength(body) },
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Check if Linear is configured and accessible.
 * @returns {Promise<{connected: boolean, user: string|null}>}
 */
async function checkConnection() {
  if (!getApiKey()) return { connected: false, user: null };
  try {
    var r = await graphql('{ viewer { name email } }');
    if (r.data && r.data.viewer) return { connected: true, user: r.data.viewer.name };
    return { connected: false, user: null };
  } catch (_e) { return { connected: false, user: null }; }
}

/**
 * Find the CC Commander project.
 * @param {string} teamKey - Team key (default: 'CC')
 * @returns {Promise<{projectId: string, teamId: string}|null>}
 */
async function findProject(teamKey) {
  if (!teamKey) teamKey = 'CC';
  var r = await graphql('{ teams { nodes { id key projects { nodes { id name } } } } }');
  if (!r.data) return null;
  var teams = r.data.teams.nodes;
  for (var i = 0; i < teams.length; i++) {
    if (teams[i].key === teamKey) {
      var proj = teams[i].projects.nodes.find(function(p) { return p.name === 'CC Commander'; });
      if (proj) return { projectId: proj.id, teamId: teams[i].id };
    }
  }
  return null;
}

/**
 * Create a Linear issue for a Commander session.
 * @param {object} session - Commander session object
 * @param {object} project - From findProject()
 * @returns {Promise<{identifier: string, id: string, url: string}>}
 */
async function createSessionIssue(session, project) {
  if (!project) project = await findProject();
  if (!project) throw new Error('CC Commander project not found in Linear');

  var title = (session.task || 'Untitled session').slice(0, 100);
  var desc = [
    'CC Commander Session: ' + session.id,
    'Started: ' + session.startTime,
    'Category: ' + (session.category || 'general'),
    '',
    session.task || '',
  ].join('\n');

  var r = await graphql(
    'mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }',
    { input: { title: title, description: desc, teamId: project.teamId, projectId: project.projectId, priority: 3 } }
  );

  if (r.data && r.data.issueCreate && r.data.issueCreate.issue) {
    return r.data.issueCreate.issue;
  }
  throw new Error('Failed to create Linear issue: ' + JSON.stringify(r.errors || r));
}

/**
 * Update a Linear issue (e.g., when session completes).
 * @param {string} issueId - Linear issue ID
 * @param {object} updates - Fields to update
 */
async function updateIssue(issueId, updates) {
  var input = {};
  if (updates.state) input.stateId = updates.state;
  if (updates.description) input.description = updates.description;
  if (updates.priority) input.priority = updates.priority;

  var r = await graphql(
    'mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }',
    { id: issueId, input: input }
  );
  return r.data && r.data.issueUpdate && r.data.issueUpdate.success;
}

/**
 * Add a comment to a Linear issue (for session updates, knowledge lessons).
 * @param {string} issueId
 * @param {string} body - Markdown comment body
 */
async function addComment(issueId, body) {
  var r = await graphql(
    'mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }',
    { input: { issueId: issueId, body: body } }
  );
  return r.data && r.data.commentCreate && r.data.commentCreate.success;
}

/**
 * Get all issues in the CC Commander project.
 * @returns {Promise<Array>}
 */
async function getProjectIssues() {
  var project = await findProject();
  if (!project) return [];

  var r = await graphql(
    '{ project(id: "' + project.projectId + '") { issues { nodes { id identifier title state { name type } priority description createdAt updatedAt } } } }'
  );
  if (r.data && r.data.project) return r.data.project.issues.nodes;
  return [];
}

/**
 * Get project progress summary.
 * @returns {Promise<{total: number, done: number, inProgress: number, backlog: number}>}
 */
async function getProgress() {
  var issues = await getProjectIssues();
  var done = 0, inProgress = 0, backlog = 0;
  issues.forEach(function(i) {
    if (i.state.type === 'completed') done++;
    else if (i.state.type === 'started') inProgress++;
    else backlog++;
  });
  return { total: issues.length, done: done, inProgress: inProgress, backlog: backlog };
}

/**
 * Sync a Commander session to Linear (create or update).
 * @param {object} session - Commander session
 * @param {string} outcome - 'started' | 'completed' | 'error'
 */
async function syncSession(session, outcome) {
  try {
    var project = await findProject();
    if (!project) return null;

    if (outcome === 'started') {
      var issue = await createSessionIssue(session, project);
      return issue;
    }

    // For completed/error — would need issueId stored in session
    // Future: store linearIssueId in session metadata
    return null;
  } catch (_e) {
    // Silently fail — Linear sync should never block Commander
    return null;
  }
}

module.exports = {
  checkConnection: checkConnection,
  findProject: findProject,
  createSessionIssue: createSessionIssue,
  updateIssue: updateIssue,
  addComment: addComment,
  getProjectIssues: getProjectIssues,
  getProgress: getProgress,
  syncSession: syncSession,
  graphql: graphql,
};
