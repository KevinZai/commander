'use strict';

var https = require('https');
var API_HOST = 'api.linear.app';

var _oauthCache = { token: null, expiry: 0 };

function getOAuthToken() {
  var id = process.env.LINEAR_CC_CLIENT_ID;
  var secret = process.env.LINEAR_CC_CLIENT_SECRET;
  if (!id || !secret) return Promise.resolve(null);
  if (_oauthCache.token && Date.now() < _oauthCache.expiry) return Promise.resolve(_oauthCache.token);

  return new Promise(function(resolve) {
    var qs = 'grant_type=client_credentials&client_id=' + id + '&client_secret=' + secret + '&scope=read,write';
    var req = https.request({ hostname: API_HOST, path: '/oauth/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(qs) }
    }, function(res) {
      var d = ''; res.on('data', function(c) { d += c; }); res.on('end', function() {
        try { var r = JSON.parse(d); if (r.access_token) { _oauthCache.token = r.access_token; _oauthCache.expiry = Date.now() + 3500000; resolve(r.access_token); } else resolve(null); }
        catch (_e) { resolve(null); }
      });
    });
    req.on('error', function() { resolve(null); });
    req.write(qs); req.end();
  });
}

function getAuth() {
  return getOAuthToken().then(function(t) {
    if (t) return 'Bearer ' + t;
    var k = process.env.LINEAR_API_KEY_PERSONAL || process.env.LINEAR_API_KEY;
    return k || null;
  });
}

function graphql(query, variables) {
  return getAuth().then(function(auth) {
    if (!auth) throw new Error('No Linear auth. Set LINEAR_CC_CLIENT_ID+SECRET or LINEAR_API_KEY_PERSONAL.');
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
  });
}

async function checkConnection() {
  try {
    var auth = await getAuth();
    if (!auth) return { connected: false, user: null };
    var r = await graphql('{ viewer { name email } }');
    if (r.data && r.data.viewer) return { connected: true, user: r.data.viewer.name };
    return { connected: false, user: null };
  } catch (_e) { return { connected: false, user: null }; }
}

async function findProject(teamKey) {
  if (!teamKey) teamKey = 'CC';
  var r = await graphql('{ teams { nodes { id key projects { nodes { id name } } } } }');
  if (!r.data) return null;
  for (var i = 0; i < r.data.teams.nodes.length; i++) {
    var t = r.data.teams.nodes[i];
    if (t.key === teamKey) {
      var p = t.projects.nodes.find(function(p2) { return p2.name === 'CC Commander'; });
      if (p) return { projectId: p.id, teamId: t.id };
    }
  }
  return null;
}

async function createSessionIssue(session, project) {
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
  var r = await graphql('{ project(id: "' + project.projectId + '") { issues { nodes { id identifier title state { name type } priority createdAt updatedAt } } } }');
  return (r.data && r.data.project) ? r.data.project.issues.nodes : [];
}

async function getProgress() {
  var issues = await getProjectIssues();
  var done = 0, inProgress = 0, backlog = 0;
  issues.forEach(function(i) { if (i.state.type === 'completed') done++; else if (i.state.type === 'started') inProgress++; else backlog++; });
  return { total: issues.length, done: done, inProgress: inProgress, backlog: backlog };
}

async function syncSession(session, outcome) {
  try { if (outcome === 'started') return await createSessionIssue(session); return null; }
  catch (_e) { return null; }
}

module.exports = { checkConnection: checkConnection, findProject: findProject, createSessionIssue: createSessionIssue, updateIssue: updateIssue, addComment: addComment, getProjectIssues: getProjectIssues, getProgress: getProgress, syncSession: syncSession, graphql: graphql };
