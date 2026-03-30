'use strict';

var https = require('https');
var API_HOST = 'api.linear.app';

function getAuth() {
  var k = process.env.LINEAR_API_KEY_PERSONAL || process.env.LINEAR_API_KEY;
  return k || null;
}

function validateAuth() {
  if (!getAuth()) return { error: 'LINEAR_API_KEY_PERSONAL not set. Get one at linear.app/settings/api.' };
  return null;
}

function graphql(query, variables) {
  var auth = getAuth();
  if (!auth) return Promise.reject(new Error('No Linear auth. Set LINEAR_API_KEY_PERSONAL.'));
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify({ query: query, variables: variables || {} });
    var req = https.request({ hostname: API_HOST, path: '/graphql', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth, 'Content-Length': Buffer.byteLength(body) }
    }, function(res) {
      var d = ''; res.on('data', function(c) { d += c; }); res.on('end', function() {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function checkConnection() {
  try {
    var authError = validateAuth();
    if (authError) return { connected: false, user: null, error: authError.error };
    var r = await graphql('{ viewer { name email } }');
    if (r.data && r.data.viewer) return { connected: true, user: r.data.viewer.name };
    return { connected: false, user: null };
  } catch (_e) { return { connected: false, user: null }; }
}

async function findProject(projectName, teamKey) {
  var authError = validateAuth();
  if (authError) return null;
  if (!projectName) projectName = process.env.KC_LINEAR_PROJECT || 'CC Commander';
  if (!teamKey) teamKey = process.env.KC_LINEAR_TEAM || 'CC';
  var r = await graphql('{ teams { nodes { id key projects { nodes { id name } } } } }');
  if (!r.data) return null;
  for (var i = 0; i < r.data.teams.nodes.length; i++) {
    var t = r.data.teams.nodes[i];
    if (t.key === teamKey) {
      var p = t.projects.nodes.find(function(p2) { return p2.name === projectName; });
      if (p) return { projectId: p.id, teamId: t.id, projectName: projectName };
    }
  }
  return null;
}

async function listProjects(teamKey) {
  var authError = validateAuth();
  if (authError) return [];
  if (!teamKey) teamKey = process.env.KC_LINEAR_TEAM || 'CC';
  var r = await graphql('{ teams { nodes { id key projects { nodes { id name state } } } } }');
  if (!r.data) return [];
  for (var i = 0; i < r.data.teams.nodes.length; i++) {
    if (r.data.teams.nodes[i].key === teamKey) return r.data.teams.nodes[i].projects.nodes;
  }
  return [];
}

async function createSessionIssue(session, project) {
  var authError = validateAuth();
  if (authError) throw new Error(authError.error);
  if (!project) project = await findProject();
  if (!project) throw new Error('CC Commander project not found');
  var title = (session.task || 'Untitled').slice(0, 100);
  var desc = 'CC Commander Session: ' + session.id + '\nStarted: ' + session.startTime + '\n\n' + (session.task || '');
  var r = await graphql('mutation($i: IssueCreateInput!) { issueCreate(input: $i) { success issue { id identifier url } } }',
    { i: { title: title, description: desc, teamId: project.teamId, projectId: project.projectId, priority: 3 } });
  if (r.data && r.data.issueCreate && r.data.issueCreate.issue) return r.data.issueCreate.issue;
  throw new Error('Failed: ' + JSON.stringify(r.errors || r));
}

async function updateIssue(issueId, input) {
  var r = await graphql('mutation($id: String!, $i: IssueUpdateInput!) { issueUpdate(id: $id, input: $i) { success } }', { id: issueId, i: input });
  return r.data && r.data.issueUpdate && r.data.issueUpdate.success;
}

async function addComment(issueId, body) {
  var r = await graphql('mutation($i: CommentCreateInput!) { commentCreate(input: $i) { success } }', { i: { issueId: issueId, body: body } });
  return r.data && r.data.commentCreate && r.data.commentCreate.success;
}

async function getProjectIssues() {
  var project = await findProject();
  if (!project) return [];
  var r = await graphql('query($id: String!) { project(id: $id) { issues { nodes { id identifier title state { name type } priority createdAt updatedAt } } } }', { id: project.projectId });
  return (r.data && r.data.project) ? r.data.project.issues.nodes : [];
}

async function getProgress() {
  var issues = await getProjectIssues();
  var done = 0, inProgress = 0, backlog = 0;
  issues.forEach(function(i) { if (i.state.type === 'completed') done++; else if (i.state.type === 'started') inProgress++; else backlog++; });
  return { total: issues.length, done: done, inProgress: inProgress, backlog: backlog };
}

async function getIssuesByStatus() {
  var issues = await getProjectIssues();
  var grouped = { started: [], unstarted: [], backlog: [], completed: [] };
  issues.forEach(function(i) {
    var bucket = grouped[i.state.type];
    if (!bucket) { grouped.backlog.push(i); return; }
    bucket.push(i);
  });
  return grouped;
}

async function quickCreateIssue(title, description) {
  var project = await findProject();
  if (!project) throw new Error('CC Commander project not found');
  var r = await graphql('mutation($i: IssueCreateInput!) { issueCreate(input: $i) { success issue { id identifier url title } } }',
    { i: { title: title.slice(0, 100), description: description || '', teamId: project.teamId, projectId: project.projectId, priority: 3 } });
  if (r.data && r.data.issueCreate && r.data.issueCreate.issue) return r.data.issueCreate.issue;
  throw new Error('Failed to create issue');
}

async function assignIssueToMe(issueId) {
  var viewer = await graphql('{ viewer { id } }');
  if (!viewer.data || !viewer.data.viewer) return false;
  return await updateIssue(issueId, { assigneeId: viewer.data.viewer.id });
}

async function findStateId(stateType) {
  var project = await findProject();
  if (!project) return null;
  var r = await graphql(
    'query($teamId: String!) { team(id: $teamId) { states { nodes { id name type } } } }',
    { teamId: project.teamId }
  );
  if (!r.data || !r.data.team) return null;
  var match = r.data.team.states.nodes.find(function(s) { return s.type === stateType; });
  return match ? match.id : null;
}

async function syncSession(session, outcome) {
  try {
    if (outcome === 'started') return await createSessionIssue(session);
    if (outcome === 'success' || outcome === 'error') {
      if (!session.linearIssueId) return null;
      var duration = session.duration ? Math.round(session.duration / 60) + 'm' : 'unknown';
      var cost = session.cost ? '$' + session.cost.toFixed(2) : '$0.00';
      var body = '**Session ' + outcome + '**\nDuration: ' + duration + '\nCost: ' + cost;
      if (session.filesChanged && session.filesChanged.length > 0) {
        body += '\nFiles: ' + session.filesChanged.length;
      }
      await addComment(session.linearIssueId, body);
      if (outcome === 'success') {
        var doneStateId = await findStateId('completed');
        if (doneStateId) await updateIssue(session.linearIssueId, { stateId: doneStateId });
      }
      return true;
    }
    return null;
  } catch (_e) { return null; }
}

module.exports = {
  checkConnection: checkConnection, validateAuth: validateAuth, findProject: findProject,
  listProjects: listProjects, createSessionIssue: createSessionIssue, updateIssue: updateIssue,
  addComment: addComment, getProjectIssues: getProjectIssues, getProgress: getProgress,
  getIssuesByStatus: getIssuesByStatus, quickCreateIssue: quickCreateIssue,
  assignIssueToMe: assignIssueToMe, findStateId: findStateId, syncSession: syncSession,
};
