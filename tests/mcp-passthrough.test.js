'use strict';
// MCP passthrough against a mocked hosted server (apps/mcp-server-cloud shape):
// JSON-RPC 2.0 over POST /mcp (initialize, notifications/initialized,
// tools/list, tools/call), Bearer auth, unauthenticated GET /health at the
// origin. Proves the client speaks the real protocol, never calls the old
// /tools/<name> REST shape, and keeps the local fallback on every failure.

const assert = require('node:assert');
const { test, beforeEach, afterEach } = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MODULE = path.join(__dirname, '..', 'commander', 'cowork-plugin', 'lib', 'mcp-passthrough.js');
const TOOLS = [
  'commander_list_skills', 'commander_get_skill', 'commander_search', 'commander_suggest_for',
  'commander_invoke_skill', 'commander_list_agents', 'commander_get_agent', 'commander_invoke_agent',
  'commander_status', 'commander_update', 'commander_init', 'commander_notes_pin',
  'commander_tasks_push', 'commander_plan_integrate', 'commander_install_skill',
  'commander_compatibility_check', 'commander_session_diagnose', 'commander_compose_plan',
];
const TOKEN = 'test-token-not-a-secret';

function mockServer(opts = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const entry = { method: req.method, url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null };
      requests.push(entry);
      const json = (status, obj, extra = {}) => {
        res.writeHead(status, { 'content-type': 'application/json', ...extra });
        res.end(JSON.stringify(obj));
      };
      if (req.method === 'GET' && req.url === '/health') {
        if (opts.health === false) return json(404, { error: 'Not found' });
        return json(200, { status: 'ok' });
      }
      if (req.url !== '/mcp' || req.method !== 'POST') return json(404, { error: 'Not found' });
      if (opts.requireAuth && req.headers.authorization !== `Bearer ${TOKEN}`) {
        return json(401, { error: 'unauthorized' }, { 'www-authenticate': 'Bearer realm="cc-commander"' });
      }
      const msg = entry.body;
      if (opts.delayMs) return setTimeout(() => json(200, { jsonrpc: '2.0', id: msg.id, result: {} }), opts.delayMs);
      if (msg.method === 'notifications/initialized') {
        res.writeHead(202);
        return res.end();
      }
      let result;
      if (msg.method === 'initialize') {
        result = { protocolVersion: msg.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'cc-commander', version: 't' } };
      } else if (msg.method === 'tools/list') {
        result = { tools: TOOLS.map((name) => ({ name, inputSchema: { type: 'object' } })) };
      } else if (msg.method === 'tools/call') {
        if (opts.rpcError) return json(200, { jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: 'boom' } });
        if (opts.toolError) result = { content: [{ type: 'text', text: 'Internal server error executing tool' }], isError: true };
        else result = { content: [{ type: 'text', text: JSON.stringify({ tool: msg.params.name, args: msg.params.arguments, skills: [{ name: 'remote-skill' }] }) }] };
      } else {
        return json(200, { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } });
      }
      const reply = { jsonrpc: '2.0', id: msg.id, result };
      if (opts.sse) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        return res.end(`event: message\ndata: ${JSON.stringify(reply)}\n\n`);
      }
      return json(200, reply);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, requests, origin: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

let tmp;
let savedCwd;
const savedEnv = {};
const ENV_KEYS = ['HOME', 'MCP_DISABLED', 'MCP_ENABLED', 'CCC_MCP_URL', 'CCC_MCP_TOKEN', 'COMMANDER_TOKEN'];

function writeConfig(entry) {
  fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.claude', 'mcp.json'), JSON.stringify({ mcpServers: { 'cc-commander': entry } }));
}

function fresh() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-mcp-pt-'));
  process.env.HOME = tmp; // keeps passthrough.jsonl and ~/.claude/mcp.json inside the sandbox
  savedCwd = process.cwd();
  process.chdir(tmp);
});

afterEach(() => {
  process.chdir(savedCwd);
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

const localFallback = async () => ({ source: 'local' });

test('call() speaks JSON-RPC on /mcp: initialize, initialized, tools/call', async () => {
  const srv = await mockServer();
  try {
    writeConfig({ type: 'http', url: `${srv.origin}/mcp` });
    const pt = fresh();
    const out = await pt.call('list_skills', { page: 2 }, { fallback: localFallback });
    assert.strictEqual(out.tool, 'commander_list_skills');
    assert.deepStrictEqual(out.args, { page: 2 });
    assert.deepStrictEqual(out.skills, [{ name: 'remote-skill' }]);
    assert.deepStrictEqual(srv.requests.map((r) => `${r.method} ${r.url} ${r.body && r.body.method}`), [
      'POST /mcp initialize',
      'POST /mcp notifications/initialized',
      'POST /mcp tools/call',
    ]);
    const callReq = srv.requests[2];
    assert.strictEqual(callReq.body.jsonrpc, '2.0');
    assert.ok(Number.isInteger(callReq.body.id));
    assert.match(callReq.headers.accept, /application\/json/);
    assert.match(callReq.headers.accept, /text\/event-stream/);
    assert.ok(callReq.headers['mcp-protocol-version']);
    assert.ok(!srv.requests.some((r) => r.url.includes('/tools/')), 'old REST /tools/<name> shape must not be used');
  } finally {
    await srv.close();
  }
});

test('handshake is cached: a second call is a single tools/call', async () => {
  const srv = await mockServer();
  try {
    writeConfig({ url: `${srv.origin}/mcp` });
    const pt = fresh();
    await pt.call('commander_status', {}, { fallback: localFallback });
    const before = srv.requests.length;
    const out = await pt.call('get_skill', { name: 'x' }, { fallback: localFallback });
    assert.strictEqual(out.tool, 'commander_get_skill');
    assert.strictEqual(srv.requests.length - before, 1);
  } finally {
    await srv.close();
  }
});

test('Bearer token from COMMANDER_TOKEN is sent; config ${VAR} headers expand', async () => {
  const srv = await mockServer({ requireAuth: true });
  try {
    writeConfig({ url: `${srv.origin}/mcp`, headers: { Authorization: 'Bearer ${COMMANDER_TOKEN}' } });
    process.env.COMMANDER_TOKEN = TOKEN;
    const pt = fresh();
    const out = await pt.call('list_skills', {}, { fallback: localFallback });
    assert.notStrictEqual(out.source, 'local');
    assert.ok(srv.requests.every((r) => r.headers.authorization === `Bearer ${TOKEN}`));
  } finally {
    await srv.close();
  }
});

test('CCC_MCP_TOKEN overrides a config Authorization header', async () => {
  const srv = await mockServer({ requireAuth: true });
  try {
    writeConfig({ url: `${srv.origin}/mcp`, headers: { Authorization: 'Bearer stale' } });
    process.env.CCC_MCP_TOKEN = TOKEN;
    const pt = fresh();
    const out = await pt.call('list_skills', {}, { fallback: localFallback });
    assert.notStrictEqual(out.source, 'local');
  } finally {
    await srv.close();
  }
});

test('no token: no Authorization header is sent, 401 falls back to local', async () => {
  const srv = await mockServer({ requireAuth: true });
  try {
    writeConfig({ url: `${srv.origin}/mcp`, headers: { Authorization: 'Bearer ${COMMANDER_TOKEN}' } });
    const pt = fresh();
    const out = await pt.call('list_skills', {}, { fallback: localFallback });
    assert.strictEqual(out.source, 'local');
    assert.strictEqual(srv.requests[0].headers.authorization, undefined);
  } finally {
    await srv.close();
  }
});

test('listTools() returns all 18 commander_* tools from tools/list', async () => {
  const srv = await mockServer();
  try {
    writeConfig({ url: `${srv.origin}/mcp` });
    const pt = fresh();
    const tools = await pt.listTools();
    assert.deepStrictEqual(tools.map((t) => t.name), TOOLS);
  } finally {
    await srv.close();
  }
});

test('SSE-framed responses are parsed', async () => {
  const srv = await mockServer({ sse: true });
  try {
    writeConfig({ url: `${srv.origin}/mcp` });
    const pt = fresh();
    const out = await pt.call('list_skills', {}, { fallback: localFallback });
    assert.strictEqual(out.tool, 'commander_list_skills');
  } finally {
    await srv.close();
  }
});

test('JSON-RPC error and tool isError fall back to local', async () => {
  for (const opts of [{ rpcError: true }, { toolError: true }]) {
    const srv = await mockServer(opts);
    try {
      writeConfig({ url: `${srv.origin}/mcp` });
      const pt = fresh();
      const out = await pt.call('list_skills', {}, { fallback: localFallback });
      assert.strictEqual(out.source, 'local', JSON.stringify(opts));
    } finally {
      await srv.close();
    }
  }
});

test('timeout falls back to local', async () => {
  const srv = await mockServer({ delayMs: 500 });
  try {
    writeConfig({ url: `${srv.origin}/mcp` });
    const pt = fresh();
    const out = await pt.call('list_skills', {}, { timeout: 50, fallback: localFallback });
    assert.strictEqual(out.source, 'local');
  } finally {
    await srv.close();
  }
});

test('unreachable server falls back; healthCheck is false', async () => {
  const srv = await mockServer();
  const dead = srv.origin;
  await srv.close();
  writeConfig({ url: `${dead}/mcp` });
  const pt = fresh();
  assert.strictEqual((await pt.call('list_skills', {}, { fallback: localFallback })).source, 'local');
  assert.strictEqual(await pt.healthCheck(), false);
  assert.strictEqual(await pt.listTools(), null);
});

test('healthCheck uses <origin>/health when the server has it (no /mcp/health, no handshake)', async () => {
  const srv = await mockServer();
  try {
    writeConfig({ url: `${srv.origin}/mcp` });
    const pt = fresh();
    assert.strictEqual(await pt.healthCheck(), true);
    assert.deepStrictEqual(srv.requests.map((r) => `${r.method} ${r.url}`), ['GET /health']);
  } finally {
    await srv.close();
  }
});

test('healthCheck falls back to initialize when /health is not served', async () => {
  const srv = await mockServer({ health: false });
  try {
    writeConfig({ url: `${srv.origin}/mcp` });
    const pt = fresh();
    assert.strictEqual(await pt.healthCheck(), true);
    assert.deepStrictEqual(srv.requests.map((r) => `${r.method} ${r.url} ${r.body ? r.body.method : ''}`.trim()), [
      'GET /health',
      'POST /mcp initialize',
      'POST /mcp notifications/initialized',
    ]);
  } finally {
    await srv.close();
  }
});

test('MCP_DISABLED=1 short-circuits with zero requests', async () => {
  const srv = await mockServer();
  try {
    writeConfig({ url: `${srv.origin}/mcp` });
    process.env.MCP_DISABLED = '1';
    const pt = fresh();
    assert.strictEqual((await pt.call('list_skills', {}, { fallback: localFallback })).source, 'local');
    assert.strictEqual(await pt.healthCheck(), false);
    assert.strictEqual(srv.requests.length, 0);
  } finally {
    await srv.close();
  }
});

test('endpoint resolution: bare origin and legacy /sse map to /mcp', () => {
  const { resolveEndpoint, resolveHealthUrl, mcpToolName } = fresh()._internal;
  assert.strictEqual(resolveEndpoint('https://mcp.commanderplugin.com'), 'https://mcp.commanderplugin.com/mcp');
  assert.strictEqual(resolveEndpoint('https://mcp.commanderplugin.com/sse'), 'https://mcp.commanderplugin.com/mcp');
  assert.strictEqual(resolveEndpoint('https://mcp.commanderplugin.com/mcp/'), 'https://mcp.commanderplugin.com/mcp');
  assert.strictEqual(resolveHealthUrl('https://mcp.commanderplugin.com/mcp'), 'https://mcp.commanderplugin.com/health');
  assert.strictEqual(mcpToolName('search_skills'), 'commander_search');
  assert.strictEqual(mcpToolName('commander_compose_plan'), 'commander_compose_plan');
});
